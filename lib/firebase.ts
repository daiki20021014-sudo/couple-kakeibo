import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCuiMgrb0412UcUlZUgf1QKesHotnjzobQ",
  authDomain: "test-4f8c5.firebaseapp.com",
  projectId: "test-4f8c5",
  storageBucket: "test-4f8c5.firebasestorage.app",
  messagingSenderId: "861813805584",
  appId: "1:861813805584:web:bedee755d76943e306b095",
  measurementId: "G-YESR0WGKB9"
};

// 起動時にエラーが出ないようにする大事な部分
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);