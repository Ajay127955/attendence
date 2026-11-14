'use strict';

const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/student.validator');
const ctrl = require('../controllers/student.controller');

const router = express.Router();

// Keep the CSV in memory (max 5 MB) — it is parsed immediately, never stored.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /csv|text\/plain|excel/.test(file.mimetype) || /\.csv$/i.test(file.originalname);
    cb(ok ? null : new Error('Only .csv files are allowed'), ok);
  },
});

router.use(authenticate);

router.get('/', authorize('admin', 'teacher'), validate(v.list), ctrl.list);
router.get('/import/template', authorize('admin'), ctrl.downloadTemplate);
router.post('/import', authorize('admin'), upload.single('file'), validate(v.importQuery), ctrl.importCSV);
router.post('/', authorize('admin'), validate(v.create), ctrl.create);
router.get('/:id', authorize('admin', 'teacher'), validate(v.byId), ctrl.getOne);
router.patch('/:id', authorize('admin'), validate(v.update), ctrl.update);
router.delete('/:id', authorize('admin'), validate(v.byId), ctrl.remove);
router.delete('/:id/hard', authorize('admin'), validate(v.byId), ctrl.hardRemove);

module.exports = router;
