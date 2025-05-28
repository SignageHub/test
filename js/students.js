// js/students.js
document.addEventListener('DOMContentLoaded', async () => {
    const datesListDiv = document.getElementById('datesList');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessageDiv = document.getElementById('errorMessage');
    const dateFilterInput = document.getElementById('dateFilterInput');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const dateCountInfo = document.getElementById('dateCountInfo');

    const db = window.db; // Access the globally initialized Firestore instance

    if (!db) {
        displayError('Firebase not initialized. Please ensure `firebase-init.js` is correctly configured and loaded.');
        hideLoading();
        return;
    }

    let allUniqueDates = []; // Store all fetched dates for filtering

    // Helper functions for UI feedback
    function showLoading() {
        loadingIndicator.style.display = 'block';
        datesListDiv.innerHTML = ''; // Clear previous content
        errorMessageDiv.style.display = 'none';
        dateCountInfo.textContent = '';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    function displayError(message) {
        errorMessageDiv.textContent = `Error: ${message}`;
        errorMessageDiv.style.display = 'flex'; // Use flex for icon alignment
    }

    function hideError() {
        errorMessageDiv.style.display = 'none';
        errorMessageDiv.textContent = '';
    }

    // Function to load and display dates
    async function loadAndDisplayDates() {
        showLoading();
        hideError();

        try {
            // Fetch all documents from the 'attendance' collection
            const attendanceSnapshot = await db.collection('attendance').get();
            const uniqueDates = new Set();

            if (attendanceSnapshot.empty) {
                datesListDiv.innerHTML = '<p class="no-data-row">No attendance records found yet. The monitor needs to add some.</p>';
                hideLoading();
                dateCountInfo.textContent = '0 dates available.';
                return;
            }

            attendanceSnapshot.forEach(doc => {
                // Ensure doc.data() is not null/undefined and has a 'date' field
                const data = doc.data();
                if (data && data.date) {
                    uniqueDates.add(data.date); // Use the 'date' field directly if it exists
                } else {
                    // Fallback to extracting from doc ID if 'date' field is missing
                    const dateFromId = doc.id.split('_')[1];
                    if (dateFromId) {
                        uniqueDates.add(dateFromId);
                    }
                }
            });

            allUniqueDates = Array.from(uniqueDates).sort((a, b) => new Date(b) - new Date(a)); // Sort descending

            renderDates(allUniqueDates); // Initial render
            dateCountInfo.textContent = `${allUniqueDates.length} unique dates found.`;

        } catch (error) {
            console.error("Error loading attendance dates:", error);
            displayError(`Failed to load attendance dates. ${error.message}`);
            datesListDiv.innerHTML = '<p class="no-data-row" style="color:red;">Failed to load dates. Please try again later.</p>';
        } finally {
            hideLoading();
        }
    }

    // Function to render dates to the DOM (used for initial load and filtering)
    function renderDates(datesToRender) {
        datesListDiv.innerHTML = ''; // Clear existing dates
        if (datesToRender.length === 0) {
            datesListDiv.innerHTML = '<p class="no-data-row">No dates match your filter criteria.</p>';
            return;
        }

        datesToRender.forEach(date => {
            const dateButton = document.createElement('a');
            dateButton.href = `attendance-detail.html?date=${date}`;
            dateButton.classList.add('class-button');
            dateButton.innerHTML = `<i class="fas fa-calendar-day"></i> ${date}`; // Added icon
            datesListDiv.appendChild(dateButton);
        });
    }

    // Event listeners for date filtering
    dateFilterInput.addEventListener('input', () => {
        const filterText = dateFilterInput.value.trim().toLowerCase();
        const filteredDates = allUniqueDates.filter(date => date.includes(filterText));
        renderDates(filteredDates);
        dateCountInfo.textContent = `${filteredDates.length} of ${allUniqueDates.length} dates shown.`;
    });

    clearFilterBtn.addEventListener('click', () => {
        dateFilterInput.value = '';
        renderDates(allUniqueDates);
        dateCountInfo.textContent = `${allUniqueDates.length} unique dates found.`;
    });

    // Initial load
    loadAndDisplayDates();
});
