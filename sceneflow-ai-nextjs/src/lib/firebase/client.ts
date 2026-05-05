import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

let appPromise: Promise<FirebaseApp | null> | null = null
let authPromise: Promise<Auth | null> | null = null
let dbPromise: Promise<Firestore | null> | null = null

export function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (appPromise) return appPromise
  appPromise = (async () => {
    const { initializeApp, getApps } = await import('firebase/app')
    const apps = getApps()
    if (apps.length) return apps[0]

    const cfg = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }

    if (!cfg.apiKey || !cfg.projectId || !cfg.appId) {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[Firebase] Missing NEXT_PUBLIC_FIREBASE_* env. Chat features are disabled.')
      }
      return null
    }
    return initializeApp(cfg)
  })()
  return appPromise
}

export function getDb(): Promise<Firestore | null> {
  if (dbPromise) return dbPromise
  dbPromise = (async () => {
    const a = await getFirebaseApp()
    if (!a) return null
    const { getFirestore } = await import('firebase/firestore')
    return getFirestore(a)
  })()
  return dbPromise
}

export function getClientAuth(): Promise<Auth | null> {
  if (authPromise) return authPromise
  authPromise = (async () => {
    const a = await getFirebaseApp()
    if (!a) return null
    const { getAuth } = await import('firebase/auth')
    return getAuth(a)
  })()
  return authPromise
}
