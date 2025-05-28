// js/attendance-detail.js
document.addEventListener('DOMContentLoaded', async () => {
    const displayDateSpan = document.getElementById('displayDate');
    const attendanceTableBody = document.querySelector('#attendanceTable tbody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessageDiv = document.getElementById('errorMessage');
    const studentSearchInput = document.getElementById('studentSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    const presentCountSpan = document.getElementById('presentCount');
    const absentCountSpan = document.getElementById('absentCount');
    const naCountSpan = document.getElementById('naCount');
    const totalStudentsCountSpan = document.getElementById('totalStudentsCount');
    const studentCountInfo = document.getElementById('studentCountInfo');


    const db = window.db; // Access the globally initialized Firestore instance

    let currentAttendanceRecords = []; // Stores all records for filtering

    // Helper functions for UI feedback
    function showLoading() {
        loadingIndicator.style.display = 'block';
        attendanceTableBody.innerHTML = ''; // Clear previous content
        errorMessageDiv.style.display = 'none';
        resetSummaryCounts();
        studentCountInfo.textContent = '';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    function displayError(message) {
        errorMessageDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error: ${message}`;
        errorMessageDiv.style.display = 'flex';
    }

    function hideError() {
        errorMessageDiv.style.display = 'none';
        errorMessageDiv.textContent = '';
    }

    function resetSummaryCounts() {
        presentCountSpan.textContent = '0';
        absentCountSpan.textContent = '0';
        naCountSpan.textContent = '0';
        totalStudentsCountSpan.textContent = '0';
    }

    // Function to load and display attendance details
    async function loadAndDisplayAttendance() {
        showLoading();
        hideError();
        const urlParams = new URLSearchParams(window.location.search);
        const selectedDate = urlParams.get('date');

        if (!selectedDate) {
            displayDateSpan.textContent = 'Not Selected';
            displayError('No date was provided in the URL. Please go back to the previous page and select a date.');
            attendanceTableBody.innerHTML = '<tr><td colspan="3" class="no-data-row">No date selected.</td></tr>';
            hideLoading();
            return;
        }

        displayDateSpan.textContent = selectedDate;

        try {
            // Fetch all attendance documents that match the selected date
            const attendanceSnapshot = await db.collection('attendance')
                                           .where('date', '==', selectedDate)
                                           .get();

            if (attendanceSnapshot.empty) {
                attendanceTableBody.innerHTML = '<tr><td colspan="3" class="no-data-row">No attendance records found for this date across any class.</td></tr>';
                hideLoading();
                resetSummaryCounts();
                return;
            }

            currentAttendanceRecords = [];
            let presentCount = 0;
            let absentCount = 0;
            let naCount = 0;
            let totalStudents = 0;

            attendanceSnapshot.forEach(doc => {
                const classId = doc.data().class;
                const records = doc.data().records;

                if (records) { // Ensure records exist
                    for (const studentName in records) {
                        if (records.hasOwnProperty(studentName)) {
                            const status = records[studentName];
                            currentAttendanceRecords.push({
                                class: classId,
                                student: studentName,
                                status: status
                            });
                            totalStudents++;
                            if (status === 'present') {
                                presentCount++;
                            } else if (status === 'absent') {
                                absentCount++;
                            } else {
                                naCount++;
                            }
                        }
                    }
                }
            });

            // Update summary cards
            presentCountSpan.textContent = presentCount;
            absentCountSpan.textContent = absentCount;
            naCountSpan.textContent = naCount;
            totalStudentsCountSpan.textContent = totalStudents;

            // Sort records by class, then by student name
            currentAttendanceRecords.sort((a, b) => {
                if (a.class !== b.class) {
                    return a.class.localeCompare(b.class);
                }
                return a.student.localeCompare(b.student);
            });

            renderTable(currentAttendanceRecords); // Initial render
            studentCountInfo.textContent = `Displaying ${currentAttendanceRecords.length} student records.`;

        } catch (error) {
            console.error("Error loading attendance details:", error);
            displayError(`Failed to load attendance data for ${selectedDate}. ${error.message}`);
            attendanceTableBody.innerHTML = '<tr><td colspan="3" class="no-data-row" style="color:red;">Error loading attendance data.</td></tr>';
        } finally {
            hideLoading();
        }
    }

    // Function to render table rows (used for initial load and filtering)
    function renderTable(recordsToRender) {
        attendanceTableBody.innerHTML = ''; // Clear existing rows
        if (recordsToRender.length === 0) {
            attendanceTableBody.innerHTML = '<tr><td colspan="3" class="no-data-row">No students match your search criteria for this date.</td></tr>';
            return;
        }

        recordsToRender.forEach(record => {
            const row = attendanceTableBody.insertRow();
            const classCell = row.insertCell(0);
            const nameCell = row.insertCell(1);
            const statusCell = row.insertCell(2);

            classCell.textContent = record.class;
            nameCell.textContent = record.student;

            if (record.status === 'present') {
                statusCell.innerHTML = '<i class="fas fa-check status-icon present"></i> Present';
            } else if (record.status === 'absent') {
                statusCell.innerHTML = '<i class="fas fa-times status-icon absent"></i> Absent';
            } else {
                statusCell.innerHTML = '<i class="fas fa-question-circle status-icon na"></i> Not Recorded (N/A)';
            }
        });
    }

    // Event listeners for student search
    studentSearchInput.addEventListener('input', () => {
        const searchText = studentSearchInput.value.trim().toLowerCase();
        const filteredRecords = currentAttendanceRecords.filter(record =>
            record.student.toLowerCase().includes(searchText) ||
            record.class.toLowerCase().includes(searchText)
        );
        renderTable(filteredRecords);
        studentCountInfo.textContent = `Displaying ${filteredRecords.length} of ${currentAttendanceRecords.length} student records.`;
    });

    clearSearchBtn.addEventListener('click', () => {
        studentSearchInput.value = '';
        renderTable(currentAttendanceRecords);
        studentCountInfo.textContent = `Displaying ${currentAttendanceRecords.length} student records.`;
    });

    // Initial load
    loadAndDisplayAttendance();
});
