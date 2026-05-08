// config.js - Direct REST API version (no library needed)
const SUPABASE_URL = 'https://fhlpalxmrppxgprippmj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jaYuGH-G93af-qBpB8yjRA_ZrnfGVPB';

// Helper to get auth token
function getToken() {
    return localStorage.getItem('breedlink_token') || '';
}

// Build a chainable query object for SELECT
function buildQuery(table) {
    const state = {
        columns: '*',
        filters: [],
        isSingle: false,
        orderCol: null,
        orderAsc: true,
        limitVal: null,
    };

    function buildUrl() {
        let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(state.columns)}`;
        for (const [col, val] of state.filters) {
            url += `&${encodeURIComponent(col)}=eq.${encodeURIComponent(val)}`;
        }
        if (state.orderCol) {
            url += `&order=${encodeURIComponent(state.orderCol)}.${state.orderAsc ? 'asc' : 'desc'}`;
        }
        if (state.limitVal !== null) {
            url += `&limit=${state.limitVal}`;
        }
        return url;
    }

    async function execute() {
        const headers = {
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${getToken()}`
        };
        if (state.isSingle) {
            headers['Accept'] = 'application/vnd.pgrst.object+json';
        }
        const response = await fetch(buildUrl(), { headers });
        const data = await response.json();
        if (!response.ok) return { data: null, error: data };
        return { data, error: null };
    }

    const chain = {
        select(columns = '*') {
            state.columns = columns;
            return chain;
        },
        eq(column, value) {
            state.filters.push([column, value]);
            return chain;
        },
        order(column, { ascending = true } = {}) {
            state.orderCol = column;
            state.orderAsc = ascending;
            return chain;
        },
        limit(n) {
            state.limitVal = n;
            return chain;
        },
        async single() {
            state.isSingle = true;
            return execute();
        },
        // Allows: const { data } = await supabase.from(...).select(...).eq(...)
        then(resolve, reject) {
            return execute().then(resolve, reject);
        }
    };

    return chain;
}

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
            const raw = await response.json();
            if (!response.ok) throw new Error(raw.error_description || raw.msg || 'Signup failed');
            // Normalise to { data: { user, session } } so auth.js works either way.
            return {
                data: {
                    user: raw.user ?? raw,
                    session: raw.access_token
                        ? { access_token: raw.access_token, refresh_token: raw.refresh_token }
                        : null
                },
                error: null
            };
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
            const raw = await response.json();
            if (!response.ok) throw new Error(raw.error_description || raw.msg || 'Login failed');
            // Supabase token endpoint returns a flat object: { access_token, user, ... }
            // Wrap it into the shape auth.js expects: { data: { user, session: { access_token } } }
            return {
                data: {
                    user: raw.user,
                    session: { access_token: raw.access_token, refresh_token: raw.refresh_token }
                },
                error: null
            };
        },

        async signOut() {
            return { error: null };
        },

        async getSession() {
            const token = localStorage.getItem('breedlink_token');
            return { data: { session: token ? { access_token: token } : null }, error: null };
        }
    },

    from(table) {
        return {
            // Returns a chainable query — supports .eq(), .single(), .order(), .limit(), and awaiting directly
            select(columns = '*') {
                return buildQuery(table).select(columns);
            },

            insert: async (data) => {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_PUBLISHABLE_KEY,
                        'Authorization': `Bearer ${getToken()}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                return { data: result, error: response.ok ? null : result };
            },

            update: (data) => ({
                eq: async (column, value) => {
                    const response = await fetch(
                        `${SUPABASE_URL}/rest/v1/${table}?${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': SUPABASE_PUBLISHABLE_KEY,
                                'Authorization': `Bearer ${getToken()}`
                            },
                            body: JSON.stringify(data)
                        }
                    );
                    const result = await response.json();
                    return { data: result, error: response.ok ? null : result };
                }
            }),

            delete: () => ({
                eq: async (column, value) => {
                    const response = await fetch(
                        `${SUPABASE_URL}/rest/v1/${table}?${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'apikey': SUPABASE_PUBLISHABLE_KEY,
                                'Authorization': `Bearer ${getToken()}`
                            }
                        }
                    );
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
