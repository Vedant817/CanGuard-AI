const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {saveTypingData} = require('../controllers/behaviorController');

router.post('/typing', authMiddleware, saveTypingData);
module.exports = router;

