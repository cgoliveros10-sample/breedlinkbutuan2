const SUPABASE_URL = 'https://fhlpalxmrppxgprippmj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jaYuGH-G93af-qBpB8yjRA_ZrnfGVPB';

let supabase;

if (typeof createClient !== 'undefined') {
    // Global createClient from UMD build
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
} else if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    // Fallback if attached to window.supabase
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
} else {
    console.error('Supabase library not loaded. Make sure the CDN script is included before config.js');
}

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
window.supabase = supabase;
window.API_BASE = SUPABASE_URL + '/rest/v1';
