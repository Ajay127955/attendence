'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/class.validator');
const ctrl = require('../controllers/class.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', validate(v.list), ctrl.list);
router.get('/options', ctrl.options);
router.get('/:id', validate(v.byId), ctrl.getOne);
router.post('/', authorize('admin'), validate(v.create), ctrl.create);
router.patch('/:id', authorize('admin'), validate(v.update), ctrl.update);
router.delete('/:id', authorize('admin'), validate(v.byId), ctrl.remove);
router.put('/:id/teachers', authorize('admin'), validate(v.assignTeachers), ctrl.assignTeachers);
router.put('/:id/students', authorize('admin'), ctrl.addStudents);

module.exports = router;
