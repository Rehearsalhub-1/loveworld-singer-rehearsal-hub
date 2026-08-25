const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

let privateKey = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY;
if (privateKey) {
  privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.NEXT_PUBLIC_FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});

const db = admin.firestore();

async function checkProfiles() {
  console.log("Fetching profiles from Firestore...");
  const snapshot = await db.collection('profiles').get();
  
  if (snapshot.empty) {
    console.log("No profiles found.");
    return;
  }
  
  console.log(`Found ${snapshot.docs.length} profiles:\n`);
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Name: ${data.first_name || data.firstName} ${data.last_name || data.lastName}`);
    console.log(`Email: ${data.email}`);
    console.log(`KingsChat ID: ${data.kingschat_id || data.kingsChatId}`);
    console.log(`Role: ${data.role}`);
    console.log(`Zone Code: ${data.zone_code || data.zoneCode}`);
    console.log('----------------------------------------------------');
  });
}

checkProfiles().catch(console.error);
