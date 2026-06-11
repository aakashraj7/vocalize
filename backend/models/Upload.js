const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Untitled Upload'
  },
  cloudinaryUrl: {
    type: String,
    required: true // This enforces that we must have the Cloudinary link to save
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Media', MediaSchema);