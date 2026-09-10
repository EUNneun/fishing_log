import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTj5g9UIy8FzOLbONGyUV18P-4XubanvA",
  authDomain: "fishinglog-abd95.firebaseapp.com",
  projectId: "fishinglog-abd95",
  storageBucket: "fishinglog-abd95.firebasestorage.app",
  messagingSenderId: "822438552311",
  appId: "1:822438552311:web:9237bbd5b706b81638e9f2",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
