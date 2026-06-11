//Functions to upload or delete files -> uploadFile() & deleteFile()

const cloudinary = require('../config/cloudinary.js'); // Changed from import to require

const uploadFile = async (filePath) => {
  return await cloudinary.uploader.upload(filePath);
};

// Exporting using CommonJS syntax
module.exports = {
  uploadFile
};