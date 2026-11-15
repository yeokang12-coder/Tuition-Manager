import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSWOVsMKIk0BTyvjOjSIGg4AURe4UFn1U",
  authDomain: "receipt-maker-3ac45.firebaseapp.com",
  projectId: "receipt-maker-3ac45",
  storageBucket: "receipt-maker-3ac45.firebasestorage.app",
  messagingSenderId: "488112728463",
  appId: "1:488112728463:web:509744af9c1177a1db03fa",
  measurementId: "G-71P5E298VN"
};

export const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
