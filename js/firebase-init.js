// js/firebase-init.js

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBORErIHguWArjbF9irs3lzYjL074G6PRM",
    authDomain: "caringheart-0.firebaseapp.com",
    databaseURL: "https://caringheart-0-default-rtdb.firebaseio.com", // This is for Realtime Database, not strictly needed for Firestore
    projectId: "caringheart-0",
    storageBucket: "caringheart-0.firebasestorage.app",
    messagingSenderId: "497188534198",
    appId: "1:497188534198:web:b4a3637548a6e8f6473317",
    measurementId: "G-SWNEQQ78JV" // This is for Google Analytics
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); // This initializes Cloud Firestore

console.log("Firebase initialized!");