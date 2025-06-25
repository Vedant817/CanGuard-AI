const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { register, login, validateMpin } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/mpin',authMiddleware,validateMpin);

module.exports = router;
