import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDhKv3z5Ww8xFECUTbQiZrobrFvyND5bJc",
  authDomain: "group-polarization-tool.firebaseapp.com",
  projectId: "group-polarization-tool",
  storageBucket: "group-polarization-tool.firebasestorage.app",
  messagingSenderId: "86822159190",
  appId: "1:86822159190:web:4972a7412f6370c3d3ccf7",
  measurementId: "G-9M67FY2S0P"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);