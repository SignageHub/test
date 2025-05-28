// js/students.js
document.addEventListener('DOMContentLoaded', async () => {
    const datesListDiv = document.getElementById('datesList');
    const db = window.db;

    if (!db) {
        datesListDiv.innerHTML = '<p style="color: red;">Firebase not initialized. Check firebase-init.js.</p>';
        return;
    }

    datesListDiv.innerHTML = '<p>Loading available dates...</p>';

    try {
        // Fetch all documents from the 'attendance' collection
        const attendanceSnapshot = await db.collection('attendance').get();
        const uniqueDates = new Set();

        attendanceSnapshot.forEach(doc => {
            const date = doc.id.split('_')[1]; // Extract date from doc ID (e.g., S.1_2023-10-26 -> 2023-10-26)
            if (date) {
                uniqueDates.add(date);
            }
        });

        if (uniqueDates.size === 0) {
            datesListDiv.innerHTML = '<p>No attendance records found yet.</p>';
            return;
        }

        // Sort dates in descending order (most recent first)
        const sortedDates = Array.from(uniqueDates).sort((a, b) => new Date(b) - new Date(a));

        datesListDiv.innerHTML = ''; // Clear loading message

        sortedDates.forEach(date => {
            const dateButton = document.createElement('a');
            dateButton.href = `attendance-detail.html?date=${date}`; // Link to the new detail page
            dateButton.classList.add('class-button'); // Reusing the button style
            dateButton.textContent = date; // Display the date
            datesListDiv.appendChild(dateButton);
        });

    } catch (error) {
        console.error("Error loading attendance dates:", error);
        datesListDiv.innerHTML = '<p style="color: red;">Error loading dates. Please check console.</p>';
    }
});
