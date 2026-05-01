const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// // POST /api/users/login
// router.post('/login', userController.loginUser);

// Public Route (No token required)
// POST /api/users/register
router.post('/register', userController.registerUser);

// POST /api/users/sync
router.post('/sync', authMiddleware, userController.syncAuthenticatedUser);

// Protected Routes (Token required in Authorization header)
// GET /api/users/profile
router.get('/profile', authMiddleware, userController.getUserProfile);

// GET /api/users/sos-history
router.get('/sos-history', authMiddleware, userController.getSOSHistory);

// PUT /api/users/profile
// Used for CompleteProfile.tsx, MedicalProfile.tsx, and Emergency Contacts
router.put('/profile', authMiddleware, userController.updateProfile);

// PUT /api/users/device
router.put('/device', authMiddleware, userController.updateDevice);

// PUT /api/users/status
router.put('/status', authMiddleware, userController.updateStatus);

// PUT /api/users/security-pin
router.put('/security-pin', authMiddleware, userController.setSecurityPin);

// POST /api/users/security-pin/verify
router.post('/security-pin/verify', authMiddleware, userController.verifySecurityPin);

// POST /api/users/delete-account
router.post('/delete-account', authMiddleware, userController.deleteAccount);

module.exports = router;
