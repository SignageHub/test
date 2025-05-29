// js/firebase-init.js
// Your web app's Firebase configuration (provided by you)
const firebaseConfig = {
    apiKey: "AIzaSyBORErIHguWArjbF9irs3lzYjL074G6PRM", // <--- REPLACE WITH YOUR ACTUAL API KEY
    authDomain: "caringheart-0.firebaseapp.com",
    databaseURL: "https://caringheart-0-default-rtdb.firebaseio.com",
    projectId: "caringheart-0", // <--- REPLACE WITH YOUR ACTUAL PROJECT ID
    storageBucket: "caringheart-0.firebasestorage.app",
    messagingSenderId: "497188534198",
    appId: "1:497188534198:web:b4a3637548a6e8f6473317",
    measurementId: "G-SWNEQQ78JV"
};

// Initialize Firebase and make the db object globally accessible
if (!firebase.apps.length) {
    window.firebaseApp = firebase.initializeApp(firebaseConfig);
    console.log("Firebase app initialized!");
} else {
    window.firebaseApp = firebase.app();
    console.log("Firebase app already initialized, reusing existing instance.");
}

window.db = firebase.firestore(); // Cloud Firestore instance
console.log("Firestore instance available as window.db!");
