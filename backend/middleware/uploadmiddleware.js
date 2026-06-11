//Multer -> process and manage file uploads 
// (such as images, PDFs, and documents) 
// from the client-side to the server

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

module.exports = upload;

//memoryStorage() used to upload directly to Cloudinary without saving files on server