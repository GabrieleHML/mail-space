const express = require('express');
const path = require('node:path');
const multer = require('multer');
const { requireAuth } = require('../middlewares/auth');
const { authLimiter, aiLimiter } = require('../middlewares/rateLimits');
const HttpError = require('../utils/httpError');
const auth = require('../controllers/authController');
const emails = require('../controllers/emailController');
const folders = require('../controllers/folderController');
const labels = require('../controllers/labelController');

// .eml files are parsed in memory: at most one file of 10 MB per request
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.eml') {
      return cb(new HttpError(400, 'Only .eml files are accepted', 'UnsupportedFile'));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public: authentication with Amazon Cognito
const authRouter = express.Router();
authRouter.post('/signup', auth.signUp);
authRouter.post('/confirm', auth.confirmSignUp);
authRouter.post('/login', auth.login);
authRouter.post('/refresh', auth.refresh);
authRouter.post('/logout', auth.logout);
authRouter.post('/forgot-password', auth.forgotPassword);
authRouter.post('/reset-password', auth.resetPassword);
authRouter.post('/change-password', requireAuth, auth.changePassword);
router.use('/auth', authLimiter, authRouter);

// Everything below requires a valid Cognito ID token
router.use(requireAuth);

router.get('/emails', emails.list);
router.post('/emails', aiLimiter, emails.create);
router.post('/emails/upload', aiLimiter, upload.single('file'), emails.upload);
router.delete('/emails', emails.remove);

router.get('/folders', folders.list);
router.post('/folders', folders.create);
router.delete('/folders/:id', folders.remove);
router.get('/folders/:id/emails', folders.listEmails);
router.post('/folders/:id/emails', folders.addEmails);
router.delete('/folders/:id/emails', folders.removeEmails);

router.get('/labels', labels.get);
router.put('/labels', aiLimiter, labels.update);

module.exports = router;
