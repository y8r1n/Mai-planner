// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
 apiKey: "AIzaSyDHFzJYsEwhpmpv83apXaOb9e4qE1u-zk0",
  authDomain: "mai-planner.firebaseapp.com",
  projectId: "mai-planner",
  storageBucket: "mai-planner.firebasestorage.app",
  messagingSenderId: "995353408662",
  appId: "1:995353408662:web:d555fddf6984e38d613eb7",
  measurementId: "G-RKGC26KVT7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
