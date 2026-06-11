//upload API route

const express = require('express');
const multer = require('multer');
const { uploadFile } = require('../services/cloudinaryService.js'); // Verify this path matches your folder structure
const Upload = require('../models/Upload'); 

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); 

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Pass the local path string to your service
    const cloudinaryResult = await uploadFile(req.file.path);

    const newMedia = new Upload({
      name: req.body.name || req.file.originalname, // Falls back to filename if no name is sent in body
      cloudinaryUrl: cloudinaryResult.secure_url    // The live internet link
    });

    const savedMedia = await newMedia.save(); // Pushes it directly into MongoDB Atlas

    // 3. Return the saved database document back to the client
    return res.status(201).json({
      message: "Uploaded to Cloudinary and saved to MongoDB successfully!",
      data: savedMedia
    });

  } catch (error) {
    console.error("Upload & DB Route Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;



// const express = require('express');
// const router = express.Router();
// const multer = require('multer');

// const upload = require('../middleware/uploadMiddleware');
// const cloudinary = require('../config/cloudinary');

// router.post('/upload', upload.single('file'), async (req, res) => {
//   try {
//     // 1. Verify Multer actually caught the file
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file detected by the server. Check your Thunder Client field name."
//       });
//     }

//     console.log('File received, sending to Cloudinary...');

//     // 2. Convert the file buffer to a base64 string for Cloudinary
//     const fileBase64 = req.file.buffer.toString('base64');
//     const dataUri = `data:${req.file.mimetype};base64,${fileBase64}`;

//     // 3. Upload to Cloudinary
//     const result = await cloudinary.uploader.upload(dataUri, {
//       folder: 'vocalize'
//     });

//     console.log('UPLOAD SUCCESS:', result.secure_url);

//     // 4. Send back the success response WITH the live image link
//     res.status(200).json({
//       success: true,
//       message: "File uploaded successfully!",
//       url: result.secure_url
//     });

//   } catch (error) {
//     console.error("CLOUDINARY UPLOAD ERROR:", error);

//     res.status(500).json({
//       success: false,
//       message: "Cloudinary upload failed.",
//       error: error.message
//     });
//   }
// });

// module.exports = router;