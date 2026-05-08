// config.js - Make sure supabase is properly initialized
const SUPABASE_URL = 'https://fhlpalxmrppxgprippmj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jaYuGH-G93af-qBpB8yjRA_ZrnfGVPB';

let supabase = null;

// Initialize supabase
function initSupabase() {
    try {
        if (typeof createClient !== 'undefined') {
            supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
            console.log('Supabase initialized via createClient');
        } else if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
            console.log('Supabase initialized via window.supabase');
        } else {
            console.error('Supabase library not loaded yet, waiting...');
            setTimeout(initSupabase, 100);
            return;
        }
        
        window.SUPABASE_URL = SUPABASE_URL;
        window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
        window.supabase = supabase;
        window.API_BASE = SUPABASE_URL + '/rest/v1';
        
        // Dispatch an event when supabase is ready
        window.dispatchEvent(new Event('supabase-ready'));
        console.log('Supabase ready event dispatched');
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
}

// Start initialization
initSupabase();
