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
    const { error } = await window.supabase.rpc('request_verification', { _type: type, _id: id });
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
