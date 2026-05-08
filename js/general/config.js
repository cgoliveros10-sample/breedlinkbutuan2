// Supabase configuration
const SUPABASE_URL = 'https://your-project-id.supabase.co';  // Get from Supabase dashboard
const SUPABASE_ANON_KEY = 'sb_publishable_jaYuGH-G93af-qBpB8yjRA_ZrnfGVPB';  // Get from Supabase dashboard

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// API Base (not used for Supabase, but kept for compatibility)
const API_BASE = SUPABASE_URL + '/rest/v1';

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.supabase = supabase;
window.API_BASE = API_BASE;
