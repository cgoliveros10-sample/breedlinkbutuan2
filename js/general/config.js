const SUPABASE_URL = 'https://fhlpalxmrppxgprippmj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jaYuGH-G93af-qBpB8yjRA_ZrnfGVPB';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
window.supabase = supabase;
window.API_BASE = SUPABASE_URL + '/rest/v1';
