
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCUrdHaGVzi2Xfp4AS56KiPtl74vxAOas0",
  authDomain: "liga4vs4oficial.firebaseapp.com",
  projectId: "liga4vs4oficial",
  storageBucket: "liga4vs4oficial.firebasestorage.app",
  messagingSenderId: "311758282181",
  appId: "1:311758282181:web:4ce4d9e4f9dde0d0a13fac",
  measurementId: "G-PLPXB120G0"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
