import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "TAMARI_FIREBASE_API_KEY",
  authDomain: "TAMARI_PROJECT.firebaseapp.com",
  projectId: "TAMARI_PROJECT_ID",
  storageBucket: "TAMARI_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);