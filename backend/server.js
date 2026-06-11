require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const inventoryRouter = require('./routes/inventory');
//Added upload route for Cloudinary
const uploadRouter = require('./routes/uploadRoutes');


const app = express();
const PORT = process.env.PORT || 5000;


// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: '*', // Allow connections from frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '25mb' }));

// Route mapping
app.use('/api', inventoryRouter);
app.use('/api', uploadRouter);


// Health check endpoint
app.get('/health', (req, res) => {
  const firebaseAdmin = require('./config/firebaseAdmin');
  res.json({ 
    status: 'UP', 
    env: process.env.NODE_ENV || 'development',
    firebaseMockActive: firebaseAdmin === null,
    geminiMockActive: !process.env.GEMINI_API_KEY || 
                      process.env.GEMINI_API_KEY === 'your_gemini_api_key_here' || 
                      process.env.GEMINI_API_KEY.trim() === ''
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
