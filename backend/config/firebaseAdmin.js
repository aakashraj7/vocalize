const admin = require('firebase-admin');

let firebaseAdmin = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Unescape newlines if needed
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const hasCredentials = projectId && 
                         clientEmail && 
                         privateKey && 
                         !projectId.includes('your-firebase-project-id') &&
                         !clientEmail.includes('your-firebase-admin-client-email') &&
                         !privateKey.includes('UN-ESCAPED-PRIVATE-KEY');

  if (hasCredentials) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('Firebase Admin SDK Initialized.');
    firebaseAdmin = admin;
  } else {
    console.log('Firebase Admin credentials not set or using placeholders. Mock auth fallback will be active.');
  }
} catch (error) {
  console.error('Firebase Admin SDK initialization error:', error.message);
}

module.exports = firebaseAdmin;
