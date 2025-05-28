// js/monitor.js
let monitorSelectedClass = '';
let monitorSelectedDate = '';
let currentStudents = []; // To store students loaded for the current class
let currentAttendance = {}; // To store attendance status for the current date

document.addEventListener('DOMContentLoaded', () => {
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

    // Reference to the global db object. Authentication is not used here.
    const db = window.db;

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
            attendanceDateMonitorInput.value = ''; // Clear date input for new class selection
            console.log(`Monitor selected class: ${monitorSelectedClass}`);
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
        console.log(`Monitor loading students for Class: ${monitorSelectedClass}, Date: ${monitorSelectedDate}`);

        await loadStudentsAndAttendanceForMonitor();
    });

    async function loadStudentsAndAttendanceForMonitor() {
        monitorAttendanceTableBody.innerHTML = '<tr><td colspan="2"><i class="fas fa-spinner fa-spin"></i> Loading students and attendance...</td></tr>';
        currentStudents = [];
        currentAttendance = {};

        try {
            // 1. Fetch students for the selected class
            const classDocRef = db.collection('classes').doc(monitorSelectedClass);
            const classDoc = await classDocRef.get();

            if (classDoc.exists && classDoc.data().students) {
                currentStudents = classDoc.data().students;
                console.log(`Students in ${monitorSelectedClass}:`, currentStudents);
            } else {
                console.log(`No students found for class ${monitorSelectedClass} yet.`);
                alert(`No students found for class ${monitorSelectedClass}. You can add them below.`);
            }

            // 2. Fetch existing attendance for the selected class and date
            const attendanceDocId = `${monitorSelectedClass}_${monitorSelectedDate}`;
            const attendanceDocRef = db.collection('attendance').doc(attendanceDocId);
            const attendanceDoc = await attendanceDocRef.get();

            if (attendanceDoc.exists && attendanceDoc.data().records) {
                currentAttendance = attendanceDoc.data().records;
                console.log(`Existing attendance for ${attendanceDocId}:`, currentAttendance);
            } else {
                console.log(`No existing attendance for ${attendanceDocId}. Starting fresh.`);
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

                    // Sanitize student name for HTML IDs (remove spaces, dots, etc.)
                    const sanitizedStudentName = studentName.replace(/[^a-zA-Z0-9]/g, '_');

                    statusCell.innerHTML = `
                        <div class="monitor-attendance-status" role="radiogroup" aria-label="Attendance status for ${studentName}">
                            <input type="radio" id="present-${sanitizedStudentName}" name="status-${sanitizedStudentName}" value="present" ${currentStatus === 'present' ? 'checked' : ''} aria-checked="${currentStatus === 'present'}">
                            <label for="present-${sanitizedStudentName}">Present (<i class="fas fa-check"></i>)</label>

                            <input type="radio" id="absent-${sanitizedStudentName}" name="status-${sanitizedStudentName}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''} aria-checked="${currentStatus === 'absent'}">
                            <label for="absent-${sanitizedStudentName}">Absent (<i class="fas fa-times"></i>)</label>
                        </div>
                    `;
                });
            }

        } catch (error) {
            console.error("Error loading students and attendance:", error);
            monitorAttendanceTableBody.innerHTML = '<tr><td colspan="2" style="color: red;">Error loading data. Please try again or check console.</td></tr>';
        }
    }

    // --- Add New Student ---
    addNewStudentBtn.addEventListener('click', async () => {
        const newStudentName = newStudentNameInput.value.trim();

        if (!monitorSelectedClass) {
            alert('Please select a class before adding a student.');
            return;
        }

        if (newStudentName === '') {
            alert('Please enter a student name.');
            return;
        }

        // Check for existing student (case-insensitive)
        if (currentStudents.some(student => student.toLowerCase() === newStudentName.toLowerCase())) {
            alert(`Student "${newStudentName}" already exists in ${monitorSelectedClass}.`);
            newStudentNameInput.value = ''; // Clear input even if exists
            return;
        }

        try {
            const classDocRef = db.collection('classes').doc(monitorSelectedClass);

            // Use arrayUnion to add new student name to the 'students' array
            await classDocRef.set({
                students: firebase.firestore.FieldValue.arrayUnion(newStudentName)
            }, { merge: true }); // Use merge: true to avoid overwriting other fields

            newStudentNameInput.value = ''; // Clear input field
            console.log(`Student "${newStudentName}" added to ${monitorSelectedClass}.`);
            alert(`Student "${newStudentName}" added to ${monitorSelectedClass}.`);

            // Reload students and attendance to show the newly added student
            await loadStudentsAndAttendanceForMonitor();

        } catch (error) {
            console.error("Error adding new student:", error);
            alert("Error adding student. Please try again.");
        }
    });

    // --- Save Attendance ---
    saveAttendanceBtn.addEventListener('click', async () => {
        if (!monitorSelectedClass || !monitorSelectedDate) {
            alert('Please select a class and date, and load students before saving attendance.');
            return;
        }
        if (currentStudents.length === 0) {
            alert('No students loaded to save attendance for. Add students first.');
            return;
        }

        const attendanceRecords = {};
        currentStudents.forEach(studentName => {
            const sanitizedStudentName = studentName.replace(/[^a-zA-Z0-9]/g, '_'); // Re-sanitize name for radio button name attribute
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
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // Add a server timestamp
            }, { merge: true }); // Use merge: true to avoid overwriting the entire document if other fields exist

            alert('Attendance saved successfully!');
            console.log(`Attendance saved for ${attendanceDocId}:`, attendanceRecords);

        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("Error saving attendance. Please try again.");
        }
    });
});
