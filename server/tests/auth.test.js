'use strict';

const { request, app, createUser, login, authToken } = require('./helpers');

describe('Auth API', () => {
  describe('POST /api/v1/auth/login', () => {
    it('signs in with email and returns an access token + sets refresh cookie', async () => {
      const { user, password } = await createUser({ email: 'admin@test.dev', role: 'admin' });
      const res = await login(user.email, password);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.user.email).toBe('admin@test.dev');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toContain('refreshToken=');
      expect(cookies).toContain('HttpOnly');
    });

    it('signs in with a roll number (student)', async () => {
      const { password } = await createUser({ rollNo: 'S0001', role: 'student' });
      const res = await login('s0001', password);
      expect(res.status).toBe(200);
      expect(res.body.data.user.rollNo).toBe('S0001');
    });

    it('rejects a wrong password with 401', async () => {
      const { user } = await createUser({ email: 'a@b.dev' });
      const res = await login(user.email, 'WrongPass123');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it('rejects an unknown user with 401', async () => {
      const res = await login('nobody@test.dev', 'Whatever123');
      expect(res.status).toBe(401);
    });

    it('rejects an inactive account with 403', async () => {
      const { user, password } = await createUser({ email: 'off@test.dev', isActive: false });
      const res = await login(user.email, password);
      expect(res.status).toBe(403);
    });

    it('validates the request body (400)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ identifier: '' });
      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(expect.any(Array));
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns the current user for a valid token', async () => {
      const { token } = await authToken({ email: 'me@test.dev', role: 'teacher' });
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('me@test.dev');
      expect(res.body.data.user.role).toBe('teacher');
    });

    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with a malformed token', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not.a.jwt');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates the refresh token using the httpOnly cookie', async () => {
      const { user, password } = await createUser({ email: 'refresh@test.dev' });
      const loginRes = await login(user.email, password);
      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookies);
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.accessToken).not.toBe(loginRes.body.data.accessToken);
    });

    it('rejects a missing refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('changes the password and invalidates the old one', async () => {
      const { token, user } = await authToken({ email: 'cp@test.dev', password: 'OldPass123' });
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'OldPass123', newPassword: 'NewPass123' });
      expect(res.status).toBe(200);

      const oldLogin = await login(user.email, 'OldPass123');
      expect(oldLogin.status).toBe(401);
      const newLogin = await login(user.email, 'NewPass123');
      expect(newLogin.status).toBe(200);
    });

    it('rejects an incorrect current password', async () => {
      const { token } = await authToken({ email: 'cp2@test.dev', password: 'OldPass123' });
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'Nope12345', newPassword: 'NewPass123' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('always responds 200 (does not leak account existence)', async () => {
      const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'ghost@test.dev' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('forbids non-admins from creating accounts', async () => {
      const { token } = await authToken({ email: 'teacher@test.dev', role: 'teacher' });
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Teacher', email: 'new@test.dev', password: 'Passw0rd123', role: 'teacher' });
      expect(res.status).toBe(403);
    });

    it('allows an admin to create a teacher', async () => {
      const { token } = await authToken({ email: 'admin2@test.dev', role: 'admin' });
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Teacher', email: 'newteacher@test.dev', password: 'Passw0rd123', role: 'teacher' });
      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('teacher');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears the session', async () => {
      const { token } = await authToken({ email: 'logout@test.dev' });
      const res = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });
});
