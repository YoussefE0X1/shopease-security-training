import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Silent session renewal: when a request comes back 401 (access token expired),
// the refresh token is exchanged for a fresh pair and the original request is
// retried — the user never gets kicked back to the login page.
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post('/api/auth/refresh', { refreshToken });
    localStorage.setItem('token', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    return data.data.accessToken;
  } catch {
    return null;
  }
};

let sessionExpiredHandled = false;

export const markSessionExpiredHandled = () => { sessionExpiredHandled = true; };

const clearSession = () => {
  sessionExpiredHandled = false;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.setItem('sessionExpired', '1');
  window.dispatchEvent(new Event('app:session-expired'));
  setTimeout(() => {
    if (!sessionExpiredHandled && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }, 0);
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as (import('axios').InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    if (status === 401) {
      clearSession();
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;