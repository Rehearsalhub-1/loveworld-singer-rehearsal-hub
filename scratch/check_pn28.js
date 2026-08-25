
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPraiseNight() {
  const snapshot = await db.collection('praise_nights').where('name', '==', 'Praise Night 28').get();
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  snapshot.forEach(doc => {
    console.log(doc.id, '=>', JSON.stringify(doc.data(), null, 2));
  });
}

checkPraiseNight();
