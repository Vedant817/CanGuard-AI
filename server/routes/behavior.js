const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const behaviorController = require('../controllers/behaviorController');

router.post('/typing-with-vectors', auth, behaviorController.saveTypingDataWithVectors);

router.post('/typing', auth, behaviorController.saveTypingData);

router.get('/data', auth, behaviorController.getBehavioralData);

// Blockchain-related routes
router.post('/analyze-secure', behaviorController.analyzeUserDataSecurely);
router.post('/request-permission', behaviorController.requestDataPermission);

module.exports = router;
