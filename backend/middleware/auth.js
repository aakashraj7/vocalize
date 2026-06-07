const firebaseAdmin = require('../config/firebaseAdmin');

const authMiddleware = async (req, res, next) => {
  // If Firebase Admin is not initialized, fallback to mock authenticated user
  if (!firebaseAdmin) {
    req.user = { 
      uid: 'mock_user_123', 
      email: 'demo_owner@vocalize.com', 
      name: 'Demo Store Owner' 
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Support frontend requesting mock mode explicitly via a header or token format
  if (token === 'mock-token-123') {
    req.user = { 
      uid: 'mock_user_123', 
      email: 'demo_owner@vocalize.com', 
      name: 'Demo Store Owner' 
    };
    return next();
  }

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;
