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
    const selectedDateSpan = document.getElementById('selectedDateStudent');

    classButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'selected' class from all buttons
            classButtons.forEach(btn => btn.classList.remove('selected'));
            // Add 'selected' class to the clicked button
            button.classList.add('selected');

            selectedClass = button.dataset.class;
            dateSelectionDiv.style.display = 'block'; // Show date selection
            attendanceTableContainer.style.display = 'none'; // Hide table until date is selected
            attendanceTableBody.innerHTML = ''; // Clear previous table data
        });
    });

    viewAttendanceBtn.addEventListener('click', async () => {
        selectedDate = attendanceDateInput.value;

        if (!selectedClass || !selectedDate) {
            alert('Please select a class and a date.');
            return;
        }

        selectedClassSpan.textContent = selectedClass;
        selectedDateSpan.textContent = selectedDate;
        attendanceTableContainer.style.display = 'block'; // Show attendance table

        await loadStudentAttendance();
    });

    async function loadStudentAttendance() {
        attendanceTableBody.innerHTML = ''; // Clear existing rows

        try {
            // Fetch students for the selected class
            const classDocRef = db.collection('classes').doc(selectedClass);
            const classDoc = await classDocRef.get();

            if (!classDoc.exists || !classDoc.data().students) {
                attendanceTableBody.innerHTML = '<tr><td colspan="2">No students found for this class or no attendance data for this date.</td></tr>';
                return;
            }

            const students = classDoc.data().students; // Array of student names

            // Fetch attendance for the selected class and date
            const attendanceDocId = `${selectedClass}_${selectedDate}`; // e.g., S.1_2023-10-26
            const attendanceDocRef = db.collection('attendance').doc(attendanceDocId);
            const attendanceDoc = await attendanceDocRef.get();
            const attendanceData = attendanceDoc.exists ? attendanceDoc.data().records : {};

            students.forEach(studentName => {
                const row = attendanceTableBody.insertRow();
                const nameCell = row.insertCell(0);
                const statusCell = row.insertCell(1);

                nameCell.textContent = studentName;

                const status = attendanceData[studentName];
                if (status === 'present') {
                    statusCell.innerHTML = '<i class="fas fa-check status-icon present"></i> Present';
                } else if (status === 'absent') {
                    statusCell.innerHTML = '<i class="fas fa-times status-icon absent"></i> Absent';
                } else {
                    statusCell.innerHTML = 'N/A'; // No attendance record for this student on this date
                }
            });

        } catch (error) {
            console.error("Error loading student attendance:", error);
            attendanceTableBody.innerHTML = '<tr><td colspan="2">Error loading attendance data.</td></tr>';
        }
    }
});