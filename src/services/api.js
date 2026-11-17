import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

/**
 * Which account the dashboard is working in.
 *
 * Empty for the usual case — a person in their own account. Someone invited
 * into another organiser's team sets it, and every request then says so, which
 * is what the server checks their membership against.
 */
export const getAccountId = () => {
    try {
        const stored = localStorage.getItem('regx_account');

        return stored ? Number(stored) : null;
    } catch {
        return null;
    }
};

export const setAccountId = (id) => {
    try {
        if (id) localStorage.setItem('regx_account', String(id));
        else localStorage.removeItem('regx_account');
    } catch {
        // A browser that refuses storage simply stays in its own account.
    }
};

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('regx_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const account = getAccountId();
        if (account) {
            config.headers['X-Account-Id'] = account;
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response.data; // Return only data to make things simpler
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Handle unauthorized globally
            localStorage.removeItem('regx_token');
            localStorage.removeItem('regx_user');
            
            // Only redirect if not already on login page to avoid loops
            if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
