const mongoose = require('mongoose');

const TypingSessionSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  keyStrokeData: [mongoose.Schema.Types.Mixed],
  behavioralMetrics:[mongoose.Schema.Types.Mixed],
  typingStats:[mongoose.Schema.Types.Mixed],
  sessionData: {
    timestamp: Date,
    textLength: Number,
    completionTime: Number,
  },
},{timestamps: true});


module.exports = mongoose.model('TypingSession',TypingSessionSchema);
