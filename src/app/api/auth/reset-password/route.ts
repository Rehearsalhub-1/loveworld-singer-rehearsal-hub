import { NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const privateKey = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY
      ? process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.NEXT_PUBLIC_FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    })
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, email, storedKingschatId, verifiedKingschatId, newPassword, firstName, zoneCode } = body

    if (action !== 'reset' && action !== 'security_reset') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    if (!email || !newPassword) {
      return NextResponse.json({ success: false, error: 'Email and new password are required' }, { status: 400 })
    }

    if (action === 'reset') {
      if (!storedKingschatId || !verifiedKingschatId || storedKingschatId !== verifiedKingschatId) {
        return NextResponse.json({ success: false, error: 'KingsChat verification failed or mismatched' }, { status: 400 })
      }
    } else if (action === 'security_reset') {
      if (!firstName || !zoneCode) {
        return NextResponse.json({ success: false, error: 'First name and zonal invitation code are required' }, { status: 400 })
      }

      // Query firestore to verify details
      const db = admin.firestore()
      const profilesRef = db.collection('profiles')
      const snapshot = await profilesRef.where('email', '==', email.trim().toLowerCase()).get()

      if (snapshot.empty) {
        return NextResponse.json({ success: false, error: 'No account found with this email' }, { status: 404 })
      }

      const profileDoc = snapshot.docs[0]
      const profileData = profileDoc.data()

      const storedFirstName = (profileData.first_name || '').trim().toLowerCase()
      const storedZoneCode = (profileData.zone_code || '').trim().toUpperCase()

      if (storedFirstName !== firstName.trim().toLowerCase() || storedZoneCode !== zoneCode.trim().toUpperCase()) {
        return NextResponse.json({ success: false, error: 'Verification failed. Name or Zonal Invitation Code is incorrect.' }, { status: 400 })
      }
    }

    const auth = admin.auth()

    try {
      // Find the user by email in Firebase Auth
      const userRecord = await auth.getUserByEmail(email)

      // Update the user's password
      await auth.updateUser(userRecord.uid, {
        password: newPassword,
      })

      return NextResponse.json({ success: true })
    } catch (authError: any) {
      console.error('Firebase Admin Auth error:', authError)
      if (authError.code === 'auth/user-not-found') {
        return NextResponse.json({ success: false, error: 'No Firebase Auth account found for this email' }, { status: 404 })
      }
      return NextResponse.json({ success: false, error: authError.message || 'Failed to update password in Firebase Auth' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Reset password API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error during password reset' }, { status: 500 })
  }
}
