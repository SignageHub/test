// js/firebase-init.js
// Your web app's Firebase configuration (provided by you)
const firebaseConfig = {
    apiKey: "AIzaSyBORErIHguWArjbF9irs3lzYjL074G6PRM",
    authDomain: "caringheart-0.firebaseapp.com",
    databaseURL: "https://caringheart-0-default-rtdb.firebaseio.com",
    projectId: "caringheart-0",
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

// Ensure Firestore is accessible when page loads
db.enablePersistence().catch(err => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one.
        console.warn('Firestore persistence failed: Multiple tabs open. Data will be cached per session.');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence.
        console.warn('Firestore persistence not supported in this browser.');
    }
});
