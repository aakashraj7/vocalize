const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  originalTranscript: {
    type: String,
    required: true
  },
  parsedAction: {
    type: String,
    required: true,
    enum: ['ADD_STOCK', 'REMOVE_STOCK', 'SET_STOCK']
  },
  calculationDetail: {
    type: String,
    required: true
  },
  targetProduct: {
    type: String,
    required: true
  },
  quantityChanged: {
    type: Number,
    required: true
  },
  finalQuantity: {
    type: Number,
    required: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
