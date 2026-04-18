const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// POST /api/users/login
router.post('/login', userController.loginUser);

// Public Route (No token required)
// POST /api/users/register
router.post('/register', userController.registerUser);

// Protected Routes (Token required in Authorization header)
// GET /api/users/profile
router.get('/profile', authMiddleware, userController.getUserProfile);

// PUT /api/users/profile
// Used for CompleteProfile.tsx, MedicalProfile.tsx, and Emergency Contacts
router.put('/profile', authMiddleware, userController.updateProfile);

// POST /api/users/delete-account
router.post('/delete-account', authMiddleware, userController.deleteAccount);

module.exports = router;