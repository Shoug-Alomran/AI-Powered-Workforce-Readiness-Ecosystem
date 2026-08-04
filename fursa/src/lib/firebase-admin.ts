import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export const firebaseAdminConfigured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS)
);

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  if (!firebaseAdminConfigured) throw new Error("Firebase Admin configuration is missing");
  const credential = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
    ? cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      })
    : applicationDefault();
  return initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET });
}

export function getFirebaseAdminAuth() { return getAuth(getAdminApp()); }
export function getFirebaseAdminDb() { return getFirestore(getAdminApp()); }
export function getFirebaseAdminBucket() { return getStorage(getAdminApp()).bucket(); }
