// js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');

    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessage.textContent = ''; // Clear previous error

        try {
            await auth.signInWithEmailAndPassword(email, password);
            // On successful login, redirect to monitor.html
            window.location.href = 'monitor.html';
        } catch (error) {
            errorMessage.textContent = `Login failed: ${error.message}`;
            console.error("Login error:", error);
        }
    });

    // Optional: Auto-redirect if already logged in (for monitor)
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is logged in, redirect to monitor.html
            window.location.href = 'monitor.html';
        }
    });
});