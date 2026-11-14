'use strict';

/**
 * Barrel file — `require('../models')` gives access to every model.
 */
module.exports = {
  User: require('./User'),
  Class: require('./Class'),
  Student: require('./Student'),
  Subject: require('./Subject'),
  Attendance: require('./Attendance'),
  AuditLog: require('./AuditLog'),
  Settings: require('./Settings'),
};
