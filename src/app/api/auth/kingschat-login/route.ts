import { NextResponse } from 'next/server'
import * as admin from 'firebase-admin'
import https from 'https'

const KINGSCHAT_API_KEY = process.env.KINGSCHAT_API_KEY || process.env.NEXT_PUBLIC_KINGSCHAT_API_KEY || 'cjAOL6hByMN3QA8CQ59K5MtG+4PdR2E6NbRL7hVa8po='

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    let privateKey = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY
    if (privateKey) {
      // Remove wrapping quotes if they exist, and replace literal \n with real newlines
      privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.NEXT_PUBLIC_FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    })

    // Force Firestore to use REST instead of gRPC to prevent Vercel hanging issues (44 second timeouts)
    admin.firestore().settings({ preferRest: true })
  } catch (error) {
    console.error('Firebase Admin initialization error in KingsChat Login API:', error)
  }
}

export async function POST(req: Request) {
  try {
    const { accessToken, kingschatUserId: clientKingschatUserId, email } = await req.json()

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Access token is required' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY) {
      console.error('CRITICAL: Firebase Admin Private Key is missing in environment variables!');
      return NextResponse.json({ success: false, error: 'Server configuration error: Missing Firebase Admin credentials in Vercel.' }, { status: 500 })
    }

    // 1. Verify access token with KingsChat profile API to prevent spoofing
    const profileRes = await fetch('https://connect.kingsch.at/developer/api/user/profile', {
      method: 'GET',
      headers: {
        'api-key': KINGSCHAT_API_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!profileRes.ok) {
      const errorText = await profileRes.text()
      throw new Error(`Failed to fetch profile: Status ${profileRes.status} - ${errorText}`)
    }

    const profile: any = await profileRes.json()

    const verifiedKingschatId = profile?.profile?.id
    console.log('[KingsChat Login] Verified profile:', JSON.stringify(profile?.profile, null, 2))
    if (!verifiedKingschatId) {
      return NextResponse.json({ success: false, error: 'Could not verify KingsChat identity' }, { status: 401 })
    }

    // Use the verified ID from KingsChat API (more secure than trusting client)
    const kingschatUserId = verifiedKingschatId

    const verifiedEmail = profile?.profile?.email
    const kingsChatProfile = {
      kingschatId: verifiedKingschatId,
      email: verifiedEmail || '',
      firstName: profile?.profile?.name?.split(' ')[0] || '',
      lastName: profile?.profile?.name?.split(' ').slice(1).join(' ') || '',
      username: profile?.profile?.username || ''
    }

    // 2. Query Firestore profiles collection to find the user
    const db = admin.firestore()
    let querySnapshot;

    if (email) {
      // Find the specific profile by email
      querySnapshot = await db.collection('profiles').where('email', '==', email.toLowerCase()).get()
      
      if (!querySnapshot.empty) {
        // Verify this profile belongs to this KingsChat ID, or matches KingsChat verified email
        const doc = querySnapshot.docs.find(d => {
          const data = d.data()
          return data.kingschat_id === kingschatUserId || 
                 data.kingsChatId === kingschatUserId || 
                 (data.email && verifiedEmail && data.email.toLowerCase() === verifiedEmail.toLowerCase())
        })

        if (!doc) {
          return NextResponse.json({ success: false, error: 'Selected profile is not linked to this KingsChat account' }, { status: 403 })
        }

        // Auto link if not fully linked
        const data = doc.data()
        if (!data.kingschat_id || !data.kingsChatId) {
          await doc.ref.update({
            kingschat_id: kingschatUserId,
            kingsChatId: kingschatUserId
          })
        }

        querySnapshot = { docs: [doc], empty: false } as any
      }
    } else {
      // Find all profiles linked to this KingsChat ID (check both casings)
      let docs: admin.firestore.QueryDocumentSnapshot[] = []
      
      const [resById1, resById2] = await Promise.all([
        db.collection('profiles').where('kingschat_id', '==', kingschatUserId).get(),
        db.collection('profiles').where('kingsChatId', '==', kingschatUserId).get()
      ])
      
      resById1.forEach(d => docs.push(d))
      resById2.forEach(d => {
        if (!docs.some(existing => existing.id === d.id)) {
          docs.push(d)
        }
      })

      // If still not found by ID, try finding by verified email
      if (docs.length === 0 && verifiedEmail) {
        const resByEmail = await db.collection('profiles').where('email', '==', verifiedEmail.toLowerCase()).get()
        resByEmail.forEach(d => docs.push(d))
        
        // Auto-link found email profile(s)
        for (const doc of docs) {
          await doc.ref.update({
            kingschat_id: kingschatUserId,
            kingsChatId: kingschatUserId
          })
        }
      }

      // Format querySnapshot-like wrapper
      querySnapshot = { docs, empty: docs.length === 0 } as any
    }

    // Handle multiple accounts
    if (querySnapshot.docs.length > 1) {
      let resolvedDoc = null;
      if (verifiedEmail) {
        const matchingDocs = querySnapshot.docs.filter((doc: any) => doc.data().email?.toLowerCase() === verifiedEmail.toLowerCase());
        if (matchingDocs.length === 1) resolvedDoc = matchingDocs[0];
      }

      if (!resolvedDoc) {
        const accountsList = querySnapshot.docs.map((doc: any) => {
          const data = doc.data()
          return {
            id: doc.id,
            email: data.email || '',
            firstName: data.firstName || data.first_name || '',
            lastName: data.lastName || data.last_name || '',
            kingschatId: kingschatUserId
          }
        })
        return NextResponse.json({
          success: false,
          code: 'MULTIPLE_ACCOUNTS',
          accounts: accountsList,
          kingschatUserId
        })
      }
      
      // Smartly resolved!
      querySnapshot = { docs: [resolvedDoc], empty: false } as any;
    }

    if (querySnapshot.empty) {
      return NextResponse.json({
        success: false,
        code: 'NO_ACCOUNT',
        profile: kingsChatProfile,
        kingschatUserId
      })
    }

    const firebaseUid = querySnapshot.docs[0].id

    // 3. Generate a Firebase custom auth token for this user
    const customToken = await admin.auth().createCustomToken(firebaseUid)

    return NextResponse.json({ success: true, customToken })

  } catch (error: any) {
    console.error('KingsChat secure login error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal server error during login' }, { status: 500 })
  }
}
