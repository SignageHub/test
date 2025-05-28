// js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Reference to the global auth object
    const auth = window.auth;

    // Check if user is already logged in (e.g., if they revisit login.html)
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is logged in, redirect to monitor.html
            window.location.href = 'monitor.html';
        }
    });

    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // Prevent default form submission if this were a form
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessage.textContent = ''; // Clear previous error

        if (!email || !password) {
            errorMessage.textContent = 'Please enter both email and password.';
            return;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            // On successful login, onAuthStateChanged listener will handle redirection
        } catch (error) {
            errorMessage.textContent = `Login failed: ${error.message}`;
            console.error("Login error:", error);
        }
    });
});
