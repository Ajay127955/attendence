import { io } from 'socket.io-client';
import { getAccessToken, apiUrl } from './api';

/**
 * Socket.IO client. Resolves the server origin from VITE_SOCKET_URL, then
 * VITE_API_URL (minus the /api/v1 suffix), else same-origin (Vite proxy).
 */
function socketOrigin() {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit;
  const api = import.meta.env.VITE_API_URL;
  if (api) {
    try {
      return new URL(api, window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  }
  return window.location.origin;
}

let socket = null;

/** Listeners notified whenever the shared socket is created or destroyed. */
const changeListeners = new Set();

function emitChange() {
  for (const cb of changeListeners) {
    try {
      cb(socket);
    } catch {
      /* a listener must never break socket handling */
    }
  }
}

/**
 * Subscribe to socket instance changes. Needed because the socket is created
 * by AuthContext (a parent) after child effects have already run, so consumers
 * must be told when it appears. Returns an unsubscribe function.
 */
export function onSocketChange(cb) {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}

export function connectSocket() {
  const token = getAccessToken();
  if (!token) return null;
  if (socket?.connected) return socket;

  if (socket) socket.disconnect();
  socket = io(socketOrigin(), {
    path: '/socket.io',
    // Polling only: the app is served behind the portfolio's same-origin proxy
    // (Vercel), which does not forward WebSocket upgrades. A websocket-first
    // list fails to connect, and polling-first still logs a failed upgrade, so
    // stay on the always-working polling transport. Switch back to
    // ['websocket', 'polling'] if the API is ever exposed on its own host.
    transports: ['polling'],
    auth: { token },
    withCredentials: true,
    reconnectionAttempts: 5,
  });
  emitChange();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    emitChange();
  }
}

export function getSocket() {
  return socket;
}

export { apiUrl };
