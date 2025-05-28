// js/firebase-init.js
// Your web app's Firebase configuration (provided by you)
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

// Initialize Firebase and make the db object globally accessible
// Authentication related initialization (firebase.auth()) has been removed
if (!firebase.apps.length) { // Prevent re-initialization if already initialized
    window.firebaseApp = firebase.initializeApp(firebaseConfig);
}
window.db = firebase.firestore(); // Cloud Firestore instance
console.log("Firebase initialized and Firestore instance available as window.db!");
