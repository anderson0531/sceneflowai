import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

let app: FirebaseApp | undefined

export function getFirebaseApp() {
  const apps = getApps()
  if (apps.length) {
    // Reuse existing app instance
    app = apps[0]
  } else {
    const cfg = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
    // Soft guard: if missing config, return undefined and let callers degrade gracefully
    if (!cfg.apiKey || !cfg.projectId || !cfg.appId) {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[Firebase] Missing NEXT_PUBLIC_FIREBASE_* env. Chat features are disabled.')
      }
      app = undefined
    } else {
      app = initializeApp(cfg)
    }
  }
  return app
}

export function getDb() {
  const a = getFirebaseApp()
  return a ? getFirestore(a) : null as any
}

export function getClientAuth() {
  const a = getFirebaseApp()
  return a ? getAuth(a) : null as any
}


