// js/students.js
let selectedClass = '';
let selectedDate = '';

document.addEventListener('DOMContentLoaded', () => {
    const classButtons = document.querySelectorAll('#studentClassSelection .class-button');
    const dateSelectionDiv = document.getElementById('dateSelection');
    const attendanceDateInput = document.getElementById('attendanceDateStudent');
    const viewAttendanceBtn = document.getElementById('viewAttendanceBtn');
    const attendanceTableContainer = document.getElementById('attendanceTableContainer');
    const attendanceTableBody = document.querySelector('#attendanceTable tbody');
    const selectedClassSpan = document.getElementById('selectedClassStudent');
    const selectedClassHeaderSpan = document.getElementById('selectedClassStudentHeader'); // For the H2
    const selectedDateSpan = document.getElementById('selectedDateStudent');

    // Reference to the global db object
    const db = window.db;

    // --- Class Selection ---
    classButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'selected' class from all buttons
            classButtons.forEach(btn => btn.classList.remove('selected'));
            // Add 'selected' class to the clicked button
            button.classList.add('selected');

            selectedClass = button.dataset.class;
            selectedClassHeaderSpan.textContent = selectedClass; // Update H2 in date selection
            dateSelectionDiv.style.display = 'block'; // Show date selection
            attendanceTableContainer.style.display = 'none'; // Hide table until date is selected
            attendanceTableBody.innerHTML = ''; // Clear previous table data
            attendanceDateInput.value = ''; // Clear previous date selection
            console.log(`Class selected: ${selectedClass}`);
        });
    });

    // --- View Attendance for Selected Date ---
    viewAttendanceBtn.addEventListener('click', async () => {
        selectedDate = attendanceDateInput.value;

        if (!selectedClass) {
            alert('Please select a class first to view attendance.');
            return;
        }
        if (!selectedDate) {
             alert('Please select a date to view attendance.');
             return;
        }

        selectedClassSpan.textContent = selectedClass;
        selectedDateSpan.textContent = selectedDate;
        attendanceTableContainer.style.display = 'block'; // Show attendance table
        console.log(`Loading attendance for Class: ${selectedClass}, Date: ${selectedDate}`);

        await loadStudentAttendance();
    });

    async function loadStudentAttendance() {
        attendanceTableBody.innerHTML = '<tr><td colspan="2"><i class="fas fa-spinner fa-spin"></i> Loading attendance...</td></tr>'; // Loading message

        try {
            // Fetch students for the selected class
            const classDocRef = db.collection('classes').doc(selectedClass);
            const classDoc = await classDocRef.get();

            let students = [];
            if (classDoc.exists && classDoc.data().students) {
                students = classDoc.data().students; // Array of student names
                console.log(`Students found for ${selectedClass}:`, students);
            } else {
                attendanceTableBody.innerHTML = '<tr><td colspan="2">No students found for this class.</td></tr>';
                console.warn(`No student list in 'classes/${selectedClass}' document.`);
                return;
            }

            // Fetch attendance for the selected class and date
            const attendanceDocId = `${selectedClass}_${selectedDate}`; // e.g., S.1_2023-10-26
            const attendanceDocRef = db.collection('attendance').doc(attendanceDocId);
            const attendanceDoc = await attendanceDocRef.get();
            const attendanceData = attendanceDoc.exists ? attendanceDoc.data().records : {};
            console.log(`Attendance data for ${attendanceDocId}:`, attendanceData);

            attendanceTableBody.innerHTML = ''; // Clear loading message

            if (students.length === 0) {
                 attendanceTableBody.innerHTML = '<tr><td colspan="2">No students added to this class yet.</td></tr>';
                 return;
            }

            students.sort((a, b) => a.localeCompare(b)); // Sort students alphabetically

            students.forEach(studentName => {
                const row = attendanceTableBody.insertRow();
                const nameCell = row.insertCell(0);
                const statusCell = row.insertCell(1);

                nameCell.textContent = studentName;

                const status = attendanceData[studentName];
                if (status === 'present') {
                    statusCell.innerHTML = '<i class="fas fa-check status-icon present"></i> Present';
                    row.classList.add('attendance-present'); // Add class for styling
                } else if (status === 'absent') {
                    statusCell.innerHTML = '<i class="fas fa-times status-icon absent"></i> Absent';
                    row.classList.add('attendance-absent'); // Add class for styling
                } else {
                    statusCell.innerHTML = 'N/A <span class="info-icon" title="No record found for this student on this date."><i class="fas fa-info-circle"></i></span>'; // More informative N/A
                    row.classList.add('attendance-na'); // Add class for styling
                }
            });

        } catch (error) {
            console.error("Error loading student attendance:", error);
            attendanceTableBody.innerHTML = '<tr><td colspan="2" style="color: red;">Error loading attendance data. Please try again.</td></tr>';
        }
    }
});
