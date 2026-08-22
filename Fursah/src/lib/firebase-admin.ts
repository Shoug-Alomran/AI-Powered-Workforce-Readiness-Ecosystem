import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID ?? process.env.project_id;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? process.env.client_email;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY ?? process.env.private_key;

export const firebaseAdminConfigured = Boolean(
  firebaseProjectId &&
  (firebaseClientEmail && firebasePrivateKey || process.env.GOOGLE_APPLICATION_CREDENTIALS)
);

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  if (!firebaseAdminConfigured) throw new Error("Firebase Admin configuration is missing");
  const credential = firebaseClientEmail && firebasePrivateKey
    ? cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey.replace(/\\n/g, "\n"),
      })
    : applicationDefault();
  return initializeApp({ credential, projectId: firebaseProjectId, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET });
}

export function getFirebaseAdminAuth() { return getAuth(getAdminApp()); }
export function getFirebaseAdminDb() { return getFirestore(getAdminApp()); }
export function getFirebaseAdminBucket() { return getStorage(getAdminApp()).bucket(); }
