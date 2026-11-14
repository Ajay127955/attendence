'use strict';

const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/tokens');
const env = require('../config/env');
const logger = require('../config/logger');

let io = null;

/**
 * Socket.IO bootstrap. Clients connect with `auth: { token }`; the JWT is
 * verified during the handshake and the socket joins role/class rooms so the
 * dashboard only receives relevant events.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      socket.user = { id: payload.sub, role: payload.role, name: payload.name };
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    logger.debug(`socket connected: ${id} (${role})`);

    socket.on('subscribe:class', (classId) => {
      if (classId) socket.join(`class:${classId}`);
    });
    socket.on('unsubscribe:class', (classId) => {
      if (classId) socket.leave(`class:${classId}`);
    });
    socket.on('disconnect', () => logger.debug(`socket disconnected: ${id}`));
  });

  return io;
}

/** Emit an event to the whole app (or specific rooms). Safe before init. */
function emitEvent(event, payload, rooms = null) {
  if (!io) return;
  const target = rooms ? io.to(rooms) : io;
  target.emit(event, { ...payload, at: new Date().toISOString() });
}

/**
 * Broadcast helper used after attendance mutations.
 *  - dashboard refresh for admins/teachers
 *  - class-specific refresh for subscribers
 *  - personal refresh for the affected student
 */
function broadcastAttendance(payload) {
  emitEvent('attendance:updated', payload, ['role:admin', 'role:teacher']);
  if (payload.classId) emitEvent('attendance:updated', payload, `class:${payload.classId}`);
  if (payload.studentId) emitEvent('attendance:updated', payload, `user:${payload.studentId}`);
  emitEvent('dashboard:refresh', { scope: 'dashboard' }, ['role:admin', 'role:teacher']);
}

function getIO() {
  return io;
}

module.exports = { initSocket, emitEvent, broadcastAttendance, getIO };
