// config.js - Direct REST API version (no library needed)
const SUPABASE_URL = 'https://fhlpalxmrppxgprippmj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jaYuGH-G93af-qBpB8yjRA_ZrnfGVPB';

// Create a simple Supabase client using fetch
const supabase = {
    auth: {
        async signUp({ email, password, options }) {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_PUBLISHABLE_KEY
                },
                body: JSON.stringify({
                    email,
                    password,
                    data: options?.data || {}
                })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Signup failed');
            return { data, error: null };
        },
        
        async signInWithPassword({ email, password }) {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_PUBLISHABLE_KEY
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Login failed');
            return { data, error: null };
        },
        
        async signOut() {
            // Optional: Call signout endpoint
            return { error: null };
        },
        
        async getSession() {
            const token = localStorage.getItem('breedlink_token');
            return { data: { session: token ? { access_token: token } : null }, error: null };
        }
    },
    
    from(table) {
        return {
            select: (columns = '*') => ({
                eq: async (column, value) => {
                    const response = await fetch(
                        `${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`,
                        {
                            headers: {
                                'apikey': SUPABASE_PUBLISHABLE_KEY,
                                'Authorization': `Bearer ${localStorage.getItem('breedlink_token') || ''}`
                            }
                        }
                    );
                    const data = await response.json();
                    return { data, error: response.ok ? null : data };
                },
                single: async () => {
                    const response = await fetch(
                        `${SUPABASE_URL}/rest/v1/${table}?select=${columns}`,
                        {
                            headers: {
                                'apikey': SUPABASE_PUBLISHABLE_KEY,
                                'Authorization': `Bearer ${localStorage.getItem('breedlink_token') || ''}`
                            }
                        }
                    );
                    const data = await response.json();
                    return { data: data[0], error: response.ok ? null : data };
                }
            }),
            insert: async (data) => {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_PUBLISHABLE_KEY,
                        'Authorization': `Bearer ${localStorage.getItem('breedlink_token') || ''}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                return { data: result, error: response.ok ? null : result };
            },
            update: (data) => ({
                eq: async (column, value) => {
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_PUBLISHABLE_KEY,
                            'Authorization': `Bearer ${localStorage.getItem('breedlink_token') || ''}`
                        },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();
                    return { data: result, error: response.ok ? null : result };
                }
            }),
            delete: () => ({
                eq: async (column, value) => {
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
                        method: 'DELETE',
                        headers: {
                            'apikey': SUPABASE_PUBLISHABLE_KEY,
                            'Authorization': `Bearer ${localStorage.getItem('breedlink_token') || ''}`
                        }
                    });
                    return { data: null, error: response.ok ? null : await response.json() };
                }
            })
        };
    }
};

window.supabase = supabase;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
window.API_BASE = SUPABASE_URL + '/rest/v1';

console.log('Supabase REST client initialized (no external library needed)');
