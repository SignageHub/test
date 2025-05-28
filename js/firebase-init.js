// js/firebase-init.js

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBORErIHguWArjbF9irs3lzYjL074G6PRM",
    authDomain: "caringheart-0.firebaseapp.com",
    databaseURL: "https://caringheart-0-default-rtdb.firebaseio.com", // For Realtime Database, not used by Firestore
    projectId: "caringheart-0",
    storageBucket: "caringheart-0.firebasestorage.app",
    messagingSenderId: "497188534198",
    appId: "1:497188534198:web:b4a3637548a6e8f6473317",
    measurementId: "G-SWNEQQ78JV" // For Google Analytics
};

// Initialize Firebase and make auth and db objects globally accessible
window.firebaseApp = firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.firestore();

console.log("Firebase initialized!");
