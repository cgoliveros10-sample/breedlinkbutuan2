// vet.js — vet application, vet review queue, admin approvals
(async function () {
  const sb = await window.waitForSupabase();
  const view = document.getElementById('view'), tabs = document.getElementById('tabs');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'login.html'; return; }
  const { data: me } = await sb.from('profiles').select('id,name,account_type,vet_status,clinic_name,is_admin').eq('id', user.id).single();
  const canReview = me.vet_status === 'approved' || me.is_admin;
  const tabList = [];
  if (canReview) tabList.push(['queue', 'Review queue']);
  if (me.is_admin) tabList.push(['admin', 'Vet applications']);
  if (me.account_type === 'vet') tabList.push(['apply', 'My vet status']);
  if (!tabList.length) { view.innerHTML = '<div class="vet-empty"><strong>This panel is for vets and admins</strong>Choose the Veterinarian account type when you sign up to apply.</div>'; return; }
  tabs.innerHTML = '<div class="vet-tabs-inner">' + tabList.map(([k, l]) => `<button data-k="${k}">${l}</button>`).join('') + '</div>';
  tabs.onclick = e => e.target.dataset.k && show(e.target.dataset.k);
  const act = async (fn, args) => { const { error } = await sb.rpc(fn, args); if (error) return alert(error.message); show(current); };
  let current;

  async function show(k) {
    current = k;
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    if (k === 'queue') return queue();
    if (k === 'admin') return admin();
    return apply();
  }

  async function queue() {
    const { data: reqs } = await sb.from('verification_requests').select('*').eq('status', 'pending').order('created_at');
    if (!reqs || !reqs.length) { view.innerHTML = '<div class="vet-empty"><strong>No requests waiting</strong>New verification requests will show up here.</div>'; return; }
    const html = [];
    for (const r of reqs) {
      const table = r.target_type === 'animal' ? 'animals' : 'posts';
      const { data: t } = await sb.from(table).select('*').eq('id', r.target_id).single();
      const { data: o } = await sb.from('profiles').select('name').eq('id', r.owner_id).single();
      if (!t) continue;
      const docs = (t.health_documents || []).map((d, i) => `<a href="${esc(d.url || d)}" target="_blank" rel="noopener">${esc(d.name || 'Document ' + (i + 1))}</a>`).join(' · ') || (r.target_type === 'animal' ? 'No documents attached' : '');
      const title = r.target_type === 'animal' ? `${esc(t.name)} (${esc(t.breed)}, ${esc(t.age)})` : esc((t.text || 'Post').slice(0, 80));
      const img = t.image_url || (Array.isArray(t.images) && t.images[0]) || '';
      html.push(`<div class="vet-card"><div class="vet-row">${img ? `<img src="${esc(img)}" alt="">` : ''}<div>
        <div class="vet-title">${title}</div><div class="vet-meta"><span class="vet-tag">${r.target_type}</span>Owner: ${esc(o && o.name)}</div><div class="vet-meta">
        ${r.target_type === 'animal' ? `<div>Vaccinated: ${t.is_vaccinated ? 'Yes' : 'No'} · Dewormed: ${t.is_dewormed ? 'Yes' : 'No'}</div>` : ''}
        <div>${docs}</div></div></div></div>
        <input id="why-${r.id}" placeholder="Reason (required to reject)">
        <div class="vet-actions"><button class="vet-approve" data-a="${r.id}">Approve</button><button class="vet-reject" data-r="${r.id}">Reject</button></div></div>`);
    }
    view.innerHTML = html.join('') || '<div class="vet-empty"><strong>No requests waiting</strong>New verification requests will show up here.</div>';
    view.onclick = e => {
      if (e.target.dataset.a) act('review_verification', { _req: e.target.dataset.a, _approve: true, _reason: null });
      if (e.target.dataset.r) {
        const why = document.getElementById('why-' + e.target.dataset.r).value.trim();
        if (!why) return alert('Enter a reason before rejecting.');
        act('review_verification', { _req: e.target.dataset.r, _approve: false, _reason: why });
      }
    };
  }

  async function admin() {
    const { data } = await sb.from('profiles').select('id,name,clinic_name,license_no').eq('vet_status', 'pending');
    view.innerHTML = (data && data.length) ? data.map(v => `<div class="vet-card"><div class="vet-title">${esc(v.name)}</div>
      <div class="vet-meta">Clinic: ${esc(v.clinic_name)} · Licence: ${esc(v.license_no || 'not given')}</div>
      <div class="vet-actions"><button class="vet-approve" data-a="${v.id}">Approve vet</button><button class="vet-reject" data-r="${v.id}">Reject</button></div></div>`).join('')
      : '<div class="vet-empty"><strong>No applications waiting</strong>Vet applications will show up here.</div>';
    view.onclick = e => {
      if (e.target.dataset.a) act('admin_review_vet', { _user: e.target.dataset.a, _approve: true });
      if (e.target.dataset.r) act('admin_review_vet', { _user: e.target.dataset.r, _approve: false });
    };
  }

  function apply() {
    const s = me.vet_status;
    if (s === 'approved') { view.innerHTML = `<div class="vet-card">Approved vet at <strong>${esc(me.clinic_name)}</strong>.</div>`; return; }
    if (s === 'pending') { view.innerHTML = '<div class="vet-card">Your application is waiting for admin approval.</div>'; return; }
    view.innerHTML = `<div class="vet-card">${s === 'rejected' ? '<p>Your last application was rejected. You can apply again.</p>' : ''}
      <input id="clinic" placeholder="Clinic name"><input id="lic" placeholder="Licence number">
      <div class="vet-actions"><button class="vet-approve" id="go">Apply as vet</button></div></div>`;
    document.getElementById('go').onclick = async () => {
      const { error } = await sb.rpc('apply_as_vet', { _clinic: document.getElementById('clinic').value, _license: document.getElementById('lic').value });
      if (error) return alert(error.message);
      me.vet_status = 'pending'; apply();
    };
  }
  show(tabList[0][0]);
})();
