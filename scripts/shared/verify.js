// verify.js — Vet-Verified badge + owner request helper
window.VerifyUI = {
  badge(item) {
    const s = item && item.verification_status;
    const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    if (s === 'verified') return `<span class="vbadge vbadge-verified">✓ Vet-Verified${item.verified_clinic ? ' by ' + esc(item.verified_clinic) : ''}</span>`;
    if (s === 'pending') return `<span class="vbadge vbadge-pending">Verification pending</span>`;
    if (s === 'rejected') return `<span class="vbadge vbadge-rejected" title="${esc(item.rejection_reason)}">Verification rejected${item.rejection_reason ? ': ' + esc(item.rejection_reason) : ''}</span>`;
    return '';
  },
  async request(type, id, btn) {
    if (btn) btn.disabled = true;
    const { error } = await window.supabase.rpc('request_verification', { _type: type, _id: String(id) });
    if (error) { alert(error.message); if (btn) btn.disabled = false; return false; }
    alert('Sent to vets for review.');
    location.reload();
    return true;
  },
  button(type, item) {
    const s = item.verification_status;
    if (s === 'pending' || s === 'verified') return '';
    return `<button type="button" class="btn-primary vreq-btn" onclick="VerifyUI.request('${type}','${item.id}',this)">${s === 'rejected' ? 'Resubmit for vet verification' : 'Request vet verification'}</button>`;
  }
};

// Adds a "Vet Panel" entry to the profile dropdown for vets and admins.
(function () {
  const base = location.pathname.indexOf('/pages/') !== -1 ? '' : 'pages/';
  async function addPanelLink() {
    const dd = document.getElementById('profileDropdown');
    if (!dd) return console.warn('[VerifyUI] no #profileDropdown on this page');
    if (dd.querySelector('.vet-panel-link')) return;
    if (!window.waitForSupabase) return console.warn('[VerifyUI] waitForSupabase missing');
    const sb = await window.waitForSupabase();
    if (!sb) return console.warn('[VerifyUI] supabase not ready');
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return console.warn('[VerifyUI] not logged in');
    const { data: me, error: meErr } = await sb.from('profiles').select('account_type,vet_status,is_admin').eq('id', user.id).single();
    if (meErr || !me) return console.warn('[VerifyUI] profile lookup failed', meErr);
    const canReview = me.is_admin || me.vet_status === 'approved';
    if (!canReview && me.account_type !== 'vet') return console.warn('[VerifyUI] not a vet/admin', me);
    let count = 0;
    if (canReview) {
      const q = await sb.from('verification_requests').select('id').eq('status', 'pending');
      count += (q.data || []).length;
    }
    if (me.is_admin) {
      const q = await sb.from('profiles').select('id').eq('vet_status', 'pending');
      count += (q.data || []).length;
    }
    const a = document.createElement('a');
    a.className = 'profile-dropdown-item vet-panel-link';
    a.href = base + 'vet.html';
    a.innerHTML = (canReview ? 'Vet Panel' : 'Apply as Vet') + (count ? ' <span class="vbadge-count">' + count + '</span>' : '');
    const anchor = dd.querySelector('.profile-dropdown-divider');
    dd.insertBefore(a, anchor || dd.firstChild);
  }
  const run = () => addPanelLink().catch(e => console.warn('[VerifyUI] failed', e));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  // second try in case login state settles after page load
  setTimeout(run, 2500);
})();
