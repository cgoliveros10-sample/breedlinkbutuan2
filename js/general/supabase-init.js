// supabase-init.js - ESM version
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fhlpalxmrppxgprippmj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jaYuGH-G93af-qBpB8yjRA_ZrnfGVPB';

// Create the supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Make it globally available
window.supabase = supabase;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
window.API_BASE = SUPABASE_URL + '/rest/v1';

// Dispatch event when ready
window.dispatchEvent(new CustomEvent('supabase-ready', { detail: { supabase } }));

console.log('Supabase initialized via ESM module');

// Also expose createClient for compatibility
window.createClient = createClient;