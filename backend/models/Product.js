const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'pcs'
  },
  price: {
    type: Number,
    required: false
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Uniqueness of product name per user
ProductSchema.index({ name: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Product', ProductSchema);
