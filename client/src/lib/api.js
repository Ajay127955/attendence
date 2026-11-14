import axios from 'axios';

/**
 * Single axios instance for the whole app.
 *  - attaches the in-memory access token to every request
 *  - transparently refreshes an expired access token once (queueing parallel
 *    requests so we never fire several refreshes at the same time)
 *  - normalises errors into `Error` objects with a readable message
 */

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive the httpOnly refresh cookie
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token || null;
}
export function getAccessToken() {
  return accessToken;
}
/** Register a callback fired when refresh fails (used to force sign-out). */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;

/**
 * Refreshes the session using the httpOnly cookie.
 *
 * Refresh tokens rotate, so two parallel refreshes would make the second one
 * present an already-used token and fail. Every caller therefore shares a
 * single in-flight request.
 */
export function refreshSession() {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((r) => {
        const token = r.data?.data?.accessToken;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    const original = config || {};

    // Attempt a single refresh on 401 (never for the auth endpoints themselves).
    if (
      response?.status === 401 &&
      !original._retry &&
      !String(original.url || '').includes('/auth/refresh') &&
      !String(original.url || '').includes('/auth/login')
    ) {
      original._retry = true;
      try {
        const token = await refreshSession();
        if (token) {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          return api(original);
        }
      } catch {
        setAccessToken(null);
        if (onUnauthorized) onUnauthorized();
      }
    }

    const message =
      response?.data?.message ||
      (error.code === 'ECONNABORTED' ? 'Request timed out' : null) ||
      error.message ||
      'Something went wrong';

    const err = new Error(message);
    err.status = response?.status;
    err.details = response?.data?.details;
    err.data = response?.data;
    return Promise.reject(err);
  }
);

/** Unwraps the `{ success, data, message, meta }` envelope. */
export async function request(promise) {
  const res = await promise;
  return { data: res.data?.data, meta: res.data?.meta, message: res.data?.message };
}

export const apiUrl = API_URL;
export default api;
