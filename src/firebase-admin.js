const admin = require('firebase-admin');

// Firebase Admin SDK yapılandırması
// Service Account Key'i Firebase Console'dan indirip buraya ekleyin
// https://console.firebase.google.com/project/teatube-2f814/settings/serviceaccounts/adminsdk

const serviceAccount = {
  "type": "service_account",
  "project_id": "teatube-2f814",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "YOUR_PRIVATE_KEY",
  "client_email": "firebase-adminsdk-xxxxx@teatube-2f814.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "YOUR_CERT_URL"
};

// Firebase Admin'i başlat
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://teatube-2f814-default-rtdb.firebaseio.com"
  });
  console.log('✅ Firebase Admin SDK başlatıldı');
} catch (error) {
  console.error('❌ Firebase Admin SDK başlatılamadı:', error.message);
}

// Realtime Database referansı
const db = admin.database();

module.exports = {
  admin,
  db
};
