// js/monitor.js

let monitorSelectedClass = '';
let monitorSelectedDate = '';
let currentStudents = []; // To store students loaded for the current class
let currentAttendance = {}; // To store attendance status for the current date

document.addEventListener('DOMContentLoaded', () => {
    const monitorEmailSpan = document.getElementById('monitorEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const classButtonsMonitor = document.querySelectorAll('#monitorClassSelection .class-button-monitor');
    const monitorDateSelectionDiv = document.getElementById('monitorDateSelection');
    const attendanceDateMonitorInput = document.getElementById('attendanceDateMonitor');
    const loadStudentsBtn = document.getElementById('loadStudentsBtn');
    const monitorAttendanceManagementDiv = document.getElementById('monitorAttendanceManagement');
    const monitorAttendanceTableBody = document.querySelector('#monitorAttendanceTable tbody');
    const monitorSelectedClassSpan = document.getElementById('monitorSelectedClass');
    const monitorSelectedDateSpan = document.getElementById('monitorSelectedDate');
    const newStudentNameInput = document.getElementById('newStudentName');
    const addNewStudentBtn = document.getElementById('addNewStudentBtn');
    const addStudentClassSpan = document.getElementById('addStudentClass');
    const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');

    // Reference to the global auth and db objects
    const auth = window.auth;
    const db = window.db;

    // --- Authentication Check ---
    auth.onAuthStateChanged(user => {
        if (user) {
            monitorEmailSpan.textContent = user.email;
        } else {
            // Not logged in, redirect to login page
            window.location.href = 'login.html';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'login.html'; // Redirect to login page after logout
        } catch (error) {
            console.error("Logout error:", error);
            alert("Error logging out.");
        }
    });

    // --- Class Selection ---
    classButtonsMonitor.forEach(button => {
        button.addEventListener('click', () => {
            classButtonsMonitor.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');

            monitorSelectedClass = button.dataset.class;
            addStudentClassSpan.textContent = monitorSelectedClass; // Update add student section
            monitorDateSelectionDiv.style.display = 'block'; // Show date selection
            monitorAttendanceManagementDiv.style.display = 'none'; // Hide management table
            monitorAttendanceTableBody.innerHTML = ''; // Clear previous table data
            currentStudents = []; // Clear loaded students
            currentAttendance = {}; // Clear attendance records
        });
    });

    // --- Load Students for Date ---
    loadStudentsBtn.addEventListener('click', async () => {
        monitorSelectedDate = attendanceDateMonitorInput.value;

        if (!monitorSelectedClass) {
            alert('Please select a class first.');
            return;
        }
        if (!monitorSelectedDate) {
            alert('Please select a date.');
            return;
        }


        monitorSelectedClassSpan.textContent = monitorSelectedClass;
        monitorSelectedDateSpan.textContent = monitorSelectedDate;
        monitorAttendanceManagementDiv.style.display = 'block'; // Show management table

        await loadStudentsAndAttendanceForMonitor();
    });

    async function loadStudentsAndAttendanceForMonitor() {
        monitorAttendanceTableBody.innerHTML = '<tr><td colspan="2">Loading students and attendance...</td></tr>'; // Loading message
        currentStudents = []; // Reset students array
        currentAttendance = {}; // Reset attendance object

        try {
            // 1. Fetch students for the selected class
            const classDocRef = db.collection('classes').doc(monitorSelectedClass);
            const classDoc = await classDocRef.get();

            if (classDoc.exists && classDoc.data().students) {
                currentStudents = classDoc.data().students;
            } else {
                console.log(`No students found for class ${monitorSelectedClass} yet.`);
            }

            // 2. Fetch existing attendance for the selected class and date
            const attendanceDocId = `${monitorSelectedClass}_${monitorSelectedDate}`;
            const attendanceDocRef = db.collection('attendance').doc(attendanceDocId);
            const attendanceDoc = await attendanceDocRef.get();

            if (attendanceDoc.exists && attendanceDoc.data().records) {
                currentAttendance = attendanceDoc.data().records;
            }

            monitorAttendanceTableBody.innerHTML = ''; // Clear loading message

            // 3. Populate the table
            if (currentStudents.length === 0) {
                monitorAttendanceTableBody.innerHTML = '<tr><td colspan="2">No students added to this class yet. Use "Add New Student" below.</td></tr>';
            } else {
                currentStudents.sort((a, b) => a.localeCompare(b)); // Sort students alphabetically

                currentStudents.forEach(studentName => {
                    const row = monitorAttendanceTableBody.insertRow();
                    const nameCell = row.insertCell(0);
                    const statusCell = row.insertCell(1);

                    nameCell.textContent = studentName;

                    const currentStatus = currentAttendance[studentName] || 'absent'; // Default to absent if no record

                    statusCell.innerHTML = `
                        <div class="monitor-attendance-status">
                            <input type="radio" id="present-${studentName.replace(/[\s\.]/g, '_')}" name="status-${studentName.replace(/[\s\.]/g, '_')}" value="present" ${currentStatus === 'present' ? 'checked' : ''}>
                            <label for="present-${studentName.replace(/[\s\.]/g, '_')}">Present (✓)</label>

                            <input type="radio" id="absent-${studentName.replace(/[\s\.]/g, '_')}" name="status-${studentName.replace(/[\s\.]/g, '_')}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''}>
                            <label for="absent-${studentName.replace(/[\s\.]/g, '_')}">Absent (X)</label>
                        </div>
                    `;
                });
            }

        } catch (error) {
            console.error("Error loading students and attendance:", error);
            monitorAttendanceTableBody.innerHTML = '<tr><td colspan="2">Error loading data. Please try again.</td></tr>';
        }
    }

    // --- Add New Student ---
    addNewStudentBtn.addEventListener('click', async () => {
        const newStudentName = newStudentNameInput.value.trim();

        if (!monitorSelectedClass) {
            alert('Please select a class first.');
            return;
        }

        if (newStudentName === '') {
            alert('Please enter a student name.');
            return;
        }

        // Check for duplicates (case-insensitive)
        if (currentStudents.some(student => student.toLowerCase() === newStudentName.toLowerCase())) {
            alert(`Student "${newStudentName}" already exists in ${monitorSelectedClass}.`);
            return;
        }

        try {
            const classDocRef = db.collection('classes').doc(monitorSelectedClass);

            // Add the new student to the array in the 'students' field
            await classDocRef.set({
                students: firebase.firestore.FieldValue.arrayUnion(newStudentName)
            }, { merge: true }); // Use merge: true to avoid overwriting other fields

            newStudentNameInput.value = ''; // Clear input

            // Refresh the table to show the new student
            await loadStudentsAndAttendanceForMonitor();
            alert(`Student "${newStudentName}" added to ${monitorSelectedClass}.`);

        } catch (error) {
            console.error("Error adding new student:", error);
            alert("Error adding student. Please try again.");
        }
    });

    // --- Save Attendance ---
    saveAttendanceBtn.addEventListener('click', async () => {
        if (!monitorSelectedClass || !monitorSelectedDate || currentStudents.length === 0) {
            alert('Please load students and set attendance before saving.');
            return;
        }

        const attendanceRecords = {};
        currentStudents.forEach(studentName => {
            // Replace spaces and dots for consistent ID/name attribute in HTML radios
            const sanitizedStudentName = studentName.replace(/[\s\.]/g, '_');
            const radioButtons = document.getElementsByName(`status-${sanitizedStudentName}`);
            for (const radio of radioButtons) {
                if (radio.checked) {
                    attendanceRecords[studentName] = radio.value;
                    break;
                }
            }
        });

        const attendanceDocId = `${monitorSelectedClass}_${monitorSelectedDate}`;
        const attendanceDocRef = db.collection('attendance').doc(attendanceDocId);

        try {
            await attendanceDocRef.set({
                class: monitorSelectedClass,
                date: monitorSelectedDate,
                records: attendanceRecords,
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // To record when it was last saved
            }, { merge: true }); // Merge ensures other fields (if any) are not overwritten

            alert('Attendance saved successfully!');
            // Optionally, reload to confirm saved state or provide visual feedback
            // await loadStudentsAndAttendanceForMonitor(); // Can uncomment if you want an immediate reload

        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("Error saving attendance. Please try again.");
        }
    });
});
