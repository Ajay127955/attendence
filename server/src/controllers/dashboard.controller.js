'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const dashboardService = require('../services/dashboard.service');

/** Admin dashboard (teachers get a scoped view). */
const get = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 30));
  if (req.user.role === 'teacher') {
    const data = await dashboardService.getTeacherDashboard(req.user);
    return ok(res, { ...data, scope: 'teacher' }, 'Teacher dashboard');
  }
  const data = await dashboardService.getDashboard({ days });
  return ok(res, { ...data, scope: 'admin' }, 'Dashboard');
});

module.exports = { get };
