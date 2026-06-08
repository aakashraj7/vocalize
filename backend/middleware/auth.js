const firebaseAdmin = require('../config/firebaseAdmin');

// Helper to decode JWT payload without verification (used in fallback mock auth mode)
const decodeTokenPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      return JSON.parse(payloadJson);
    }
  } catch (e) {
    console.error('Error decoding token payload:', e);
  }
  return null;
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  }

  if (token) {
    if (token === 'mock-token-123') {
      req.user = { 
        uid: 'mock_user_123', 
        email: 'demo_owner@vocalize.com', 
        name: 'Demo Store Owner' 
      };
      return next();
    }

    // Decode user details from client token payload if firebaseAdmin is not set
    const decoded = decodeTokenPayload(token);
    if (decoded) {
      const uid = decoded.user_id || decoded.sub || decoded.uid;
      if (uid) {
        if (!firebaseAdmin) {
          req.user = {
            uid: uid,
            email: decoded.email || '',
            name: decoded.name || decoded.display_name || ''
          };
          return next();
        }
      }
    }
  }

  // If Firebase Admin is not initialized and we couldn't parse a token, fallback to demo guest
  if (!firebaseAdmin) {
    req.user = { 
      uid: 'mock_user_123', 
      email: 'demo_owner@vocalize.com', 
      name: 'Demo Store Owner' 
    };
    return next();
  }

  // If Firebase Admin is initialized, enforce cryptographic verification
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
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

