'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/auth.validator');
const ctrl = require('../controllers/user.controller');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/teachers', ctrl.teachers);
router.get('/', validate(v.listUsers), ctrl.list);
router.post('/', validate(v.createUser), ctrl.create);
router.get('/:id', ctrl.getOne);
router.patch('/:id', validate(v.updateUser), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
