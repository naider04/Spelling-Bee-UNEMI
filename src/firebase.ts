import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';

/**
 * 🔥 Firebase config (your real project)
 */
const firebaseConfig = {
  apiKey: "AIzaSyAEl5bMnrbtdzEXsAOYuzkEtlGssHCP5JY",
  authDomain: "spelling-bee-tracker.firebaseapp.com",
  projectId: "spelling-bee-tracker",
  storageBucket: "spelling-bee-tracker.firebasestorage.app",
  messagingSenderId: "962028460996",
  appId: "1:962028460996:web:cb784176f238bec0c8e291"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * ✅ SAFE AUTH RESOLVER
 * Guarantees UID exists before any DB operation
 */
const getUser = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (user) {
        resolve(user.uid);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user.uid);
        } catch (err) {
          console.error("Auth error:", err);
          resolve(null);
        }
      }
    });
  });
};

interface ProgressData {
  name: string;
  correctTotal: number;
  streak: number;
  maxStreak: number;
  totalTime: number;
  mistakes: { word: string; guess: string }[];
}

/**
 * 💾 SAVE PROGRESS
 */
export const saveUserProgress = async (data: ProgressData) => {
  try {
    const uid = await getUser();
    if (!uid) return;

    const userRef = doc(db, 'progress', uid);

    const avgSpeed =
      data.correctTotal > 0
        ? data.totalTime / data.correctTotal
        : 0;

    await setDoc(
      userRef,
      {
        name: data.name,
        correctTotal: data.correctTotal,
        streak: data.streak,
        maxStreak: data.maxStreak,
        totalTime: data.totalTime,
        avgSpeed: parseFloat(avgSpeed.toFixed(2)),
        mistakes: data.mistakes.slice(0, 50),
        lastUpdated: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error saving progress:", error);
  }
};

/**
 * 📥 LOAD PROGRESS
 */
export const loadUserProgress = async () => {
  try {
    const uid = await getUser();
    if (!uid) return null;

    const userRef = doc(db, 'progress', uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error("Error loading progress:", error);
  }

  return null;
};