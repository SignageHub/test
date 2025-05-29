// js/students.js
// Ensure Firebase is initialized in firebase-init.js
const db = window.db; // Access the globally available Firestore instance

let selectedClass = null; // To store the currently selected class ID (e.g., 'S.1')
let selectedDate = null; // To store the currently selected date (YYYY-MM-DD)

document.addEventListener('DOMContentLoaded', () => {
    const classButtonsContainer = document.getElementById('classButtonsContainer');
    const attendanceDateInput = document.getElementById('attendanceDate');
    const viewAttendanceBtn = document.getElementById('viewAttendanceBtn');
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    const displayClassSpan = document.getElementById('displayClass');
    const displayDateSpan = document.getElementById('displayDate');

    // Default classes to show if Firebase fails or is empty initially
    const defaultClasses = ['S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'];

    // --- Helper function to load class buttons into the UI ---
    function loadClassButtons(classes) {
        classButtonsContainer.innerHTML = ''; // Clear existing buttons
        classes.forEach(classId => {
            const button = document.createElement('button');
            button.classList.add('class-button');
            button.textContent = classId; // Display S.1, S.2 etc.
            button.setAttribute('data-class-id', classId); // Use data-class-id for consistency
            button.addEventListener('click', () => {
                // Remove 'selected' from previously selected button
                document.querySelectorAll('.class-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                // Add 'selected' to the clicked button
                button.classList.add('selected');
                selectedClass = classId; // Update selected class ID
                console.log('Student Portal: Selected Class:', selectedClass);
                displayAttendanceTable(selectedClass, selectedDate); // Re-display if date is already selected
            });
            classButtonsContainer.appendChild(button);
        });
    }

    // --- Initialize Class Buttons from Firebase or Defaults ---
    if (db) {
        db.collection('classes').orderBy('order').get().then((snapshot) => { // Order by 'order' field if present, else by 'name'
            if (!snapshot.empty) {
                const firebaseClasses = [];
                snapshot.forEach(doc => {
                    firebaseClasses.push(doc.id); // Use document ID (e.g., 'S.1') as classId
                });
                loadClassButtons(firebaseClasses);
            } else {
                console.warn("No classes found in Firebase 'classes' collection. Loading default classes.");
                loadClassButtons(defaultClasses); // Fallback to default
            }
        }).catch(error => {
            console.error("Error loading classes from Firebase:", error);
            loadClassButtons(defaultClasses); // Fallback to default on error
        });
    } else {
        console.warn("Firebase Firestore not initialized. Using default classes.");
        loadClassButtons(defaultClasses); // Fallback to default if Firebase isn't ready
    }

    // --- Date Selection and View Button Logic ---
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    attendanceDateInput.value = `${yyyy}-${mm}-${dd}`; // Set default date to today
    selectedDate = `${yyyy}-${mm}-${dd}`; // Initialize selectedDate

    attendanceDateInput.addEventListener('change', (event) => {
        selectedDate = event.target.value;
        console.log('Student Portal: Selected Date:', selectedDate);
        displayAttendanceTable(selectedClass, selectedDate); // Re-display if class is already selected
    });

    viewAttendanceBtn.addEventListener('click', () => {
        if (!selectedClass) {
            alert('Please select a class first.');
            return;
        }
        if (!selectedDate) {
            alert('Please select a date.');
            return;
        }
        displayAttendanceTable(selectedClass, selectedDate);
    });

    // --- Display Attendance Table (Live Data from Firebase) ---
    async function displayAttendanceTable(classId, date) {
        attendanceTableBody.innerHTML = '<tr><td colspan="3"><i class="fas fa-spinner fa-spin"></i> Loading attendance...</td></tr>'; // Loading message
        displayClassSpan.textContent = classId ? classId : '[Not Selected]';
        displayDateSpan.textContent = date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '[Not Selected]';


        if (!classId || !date) {
            attendanceTableBody.innerHTML = '<tr><td colspan="3">Please select a class and date to view attendance.</td></tr>';
            return;
        }

        if (!db) {
            console.error("Firestore instance is not available.");
            attendanceTableBody.innerHTML = '<tr><td colspan="3">System error: Firestore not connected.</td></tr>';
            return;
        }

        try {
            // 1. Fetch students for the selected class
            const studentsRef = db.collection('students').doc(classId).collection('students');
            const studentsSnapshot = await studentsRef.get();

            let studentsInClass = [];
            if (!studentsSnapshot.empty) {
                studentsSnapshot.forEach(doc => {
                    studentsInClass.push({ id: doc.id, ...doc.data() });
                });
                // Sort by roll number (ensure roll is a string for localeCompare)
                studentsInClass.sort((a, b) => (a.roll || '').localeCompare(b.roll || '', undefined, { numeric: true, sensitivity: 'base' }));
            } else {
                attendanceTableBody.innerHTML = `<tr><td colspan="3">No students found for ${classId}.</td></tr>`;
                return;
            }

            // 2. Fetch attendance records for the selected date and class
            const attendanceDocRef = db.collection('attendance_records').doc(date).collection('attendance').doc(classId);
            const attendanceDoc = await attendanceDocRef.get();
            const attendanceRecords = attendanceDoc.exists ? attendanceDoc.data() : {};

            attendanceTableBody.innerHTML = ''; // Clear loading message

            if (studentsInClass.length === 0) {
                attendanceTableBody.innerHTML = `<tr><td colspan="3">No students found for ${classId} on ${date}.</td></tr>`;
                return;
            }

            studentsInClass.forEach(student => {
                const row = document.createElement('tr');
                let statusIcon = '';
                let rowClass = '';
                const status = attendanceRecords[student.id] || 'N/A'; // Get status by student Firestore ID

                if (status === 'present') {
                    statusIcon = '<i class="fas fa-check-circle status-icon present"></i> Present';
                    rowClass = 'attendance-present';
                } else if (status === 'absent') {
                    statusIcon = '<i class="fas fa-times-circle status-icon absent"></i> Absent';
                    rowClass = 'attendance-absent';
                } else {
                    statusIcon = 'N/A';
                    rowClass = 'attendance-na';
                }

                row.classList.add(rowClass);
                row.innerHTML = `
                    <td>${student.roll || 'N/A'}</td>
                    <td>${student.name || 'N/A'}</td>
                    <td>${statusIcon}</td>
                `;
                attendanceTableBody.appendChild(row);
            });

        } catch (error) {
            console.error("Error fetching attendance data from Firebase: ", error);
            attendanceTableBody.innerHTML = `<tr><td colspan="3">Error loading attendance data. Please check your browser's console for details.</td></tr>`;
        }
    }

    // Initial display call (will show "Select a class and date" initially)
    displayAttendanceTable(selectedClass, selectedDate);
});
