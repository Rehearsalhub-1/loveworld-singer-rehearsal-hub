
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local from the current directory
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

async function checkPraiseNight() {
  console.log('Searching for Praise Night 28...');
  const snapshot = await db.collection('praise_nights').where('name', '==', 'Praise Night 28').get();
  
  if (snapshot.empty) {
    console.log('No matching documents found for "Praise Night 28".');
    // List all to see what we have
    const all = await db.collection('praise_nights').limit(10).get();
    console.log('Recent 10 praise nights:');
    all.forEach(doc => console.log(`- ${doc.data().name} (ID: ${doc.id}, Date: ${doc.data().date})`));
    return;
  }

  snapshot.forEach(doc => {
    console.log(`\nDocument ID: ${doc.id}`);
    const data = doc.data();
    console.log('Data:', JSON.stringify(data, null, 2));
    
    // Check if date is valid
    const date = new Date(data.date);
    console.log(`\nParsed Date: ${date.toString()}`);
    console.log(`Is Valid: ${!isNaN(date.getTime())}`);
    console.log(`Is Future: ${date.getTime() > Date.now()}`);
  });
}

checkPraiseNight();
