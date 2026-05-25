import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDT-EMPzrk-6zilZyK04QFOQf5bZ4a6l7E",
  authDomain: "vyapaarbills-2814f.firebaseapp.com",
  projectId: "vyapaarbills-2814f",
  storageBucket: "vyapaarbills-2814f.firebasestorage.app",
  messagingSenderId: "429890027704",
  appId: "1:429890027704:web:0e2fa0cafa06c106ed344d",
  measurementId: "G-ZEFMZ7ELHK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
