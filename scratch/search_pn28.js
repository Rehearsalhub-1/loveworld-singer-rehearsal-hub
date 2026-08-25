
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    })
  });
}

const db = admin.firestore();

async function searchPraiseNight() {
  console.log('Searching for any praise night containing "28"...');
  const snapshot = await db.collection('praise_nights').get();
  
  let found = false;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.name?.includes('28')) {
      console.log(`\nDocument ID: ${doc.id}`);
      console.log('Data:', JSON.stringify(data, null, 2));
      found = true;
    }
  });

  if (!found) {
    console.log('No documents found with "28" in name.');
  }
}

searchPraiseNight();
