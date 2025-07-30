const mongoose = require('mongoose');

const blockchainAccessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accessToken: {
    type: String,
    required: true,
    index: true
  },
  cids: [{
    type: String,
    required: true
  }],
  permissionSignature: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  purpose: {
    type: String,
    enum: ['payment_verification', 'security_check']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h' // auto-delete after 24 hours
  }
});

const BlockchainAccess = mongoose.model('BlockchainAccess', blockchainAccessSchema);

module.exports = BlockchainAccess;
