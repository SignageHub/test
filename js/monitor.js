// Ensure Firebase is initialized in firebase-init.js
// For Firestore access
const db = firebase.firestore();

let selectedClassId = null;
let selectedDate = null;
let studentsData = []; // To store current students in the selected class

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('attendanceDate').value = `${yyyy}-${mm}-${dd}`;

    loadClasses(); // Load class buttons initially

    // Event Listeners
    document.getElementById('loadAttendanceBtn').addEventListener('click', loadAttendanceForSelectedClassAndDate);
    document.getElementById('saveAttendanceBtn').addEventListener('click', saveAttendance);
    document.getElementById('addStudentBtn').addEventListener('click', addStudent);

    // Event delegation for class selection buttons
    document.getElementById('classSelection').addEventListener('click', (e) => {
        if (e.target.classList.contains('class-button-monitor')) {
            // Remove 'selected' class from all buttons
            document.querySelectorAll('.class-button-monitor').forEach(btn => {
                btn.classList.remove('selected');
            });
            // Add 'selected' class to the clicked button
            e.target.classList.add('selected');
            selectedClassId = e.target.dataset.classId;
            document.getElementById('selectedClassName').textContent = e.target.textContent; // Update display
            loadAttendanceForSelectedClassAndDate(); // Load attendance for the newly selected class
        }
    });

    // Event delegation for 'Remove' student buttons (NEW)
    document.getElementById('attendanceTableBody').addEventListener('click', async (e) => {
        if (e.target.closest('.remove-student-btn')) { // Use closest to handle clicks on icon inside button
            const button = e.target.closest('.remove-student-btn');
            const studentId = button.dataset.studentId;
            await removeStudent(studentId);
        }
    });
});

async function loadClasses() {
    const classSelectionDiv = document.getElementById('classSelection');
    classSelectionDiv.innerHTML = '<p>Loading classes...</p>';
    try {
        const classesSnapshot = await db.collection('classes').get();
        if (classesSnapshot.empty) {
            classSelectionDiv.innerHTML = '<p>No classes found. Please add classes in Firebase.</p>';
            return;
        }

        classSelectionDiv.innerHTML = ''; // Clear loading message
        classesSnapshot.forEach(doc => {
            const classId = doc.id;
            const className = doc.data().name || classId;
            const button = document.createElement('button');
            button.classList.add('class-button-monitor');
            button.dataset.classId = classId;
            button.textContent = className;
            classSelectionDiv.appendChild(button);
        });

        // Automatically select the first class if none is selected
        if (!selectedClassId && classesSnapshot.docs.length > 0) {
            const firstButton = classSelectionDiv.querySelector('.class-button-monitor');
            if (firstButton) {
                firstButton.classList.add('selected');
                selectedClassId = firstButton.dataset.classId;
                document.getElementById('selectedClassName').textContent = firstButton.textContent;
                loadAttendanceForSelectedClassAndDate();
            }
        }
    } catch (error) {
        console.error("Error loading classes:", error);
        classSelectionDiv.innerHTML = '<p class="error-message">Error loading classes.</p>';
    }
}

async function loadAttendanceForSelectedClassAndDate() {
    selectedDate = document.getElementById('attendanceDate').value;

    if (!selectedClassId) {
        document.getElementById('attendanceMessage').textContent = 'Please select a class.';
        document.getElementById('attendanceTableBody').innerHTML = ''; // Clear table
        document.getElementById('saveAttendanceBtn').style.display = 'none';
        return;
    }
    if (!selectedDate) {
        document.getElementById('attendanceMessage').textContent = 'Please select a date.';
        document.getElementById('attendanceTableBody').innerHTML = ''; // Clear table
        document.getElementById('saveAttendanceBtn').style.display = 'none';
        return;
    }

    document.getElementById('displayDate').textContent = new Date(selectedDate).toLocaleDateString();
    document.getElementById('attendanceMessage').textContent = 'Loading attendance...';
    document.getElementById('saveAttendanceBtn').style.display = 'none'; // Hide save button while loading
    document.getElementById('attendanceTableBody').innerHTML = ''; // Clear table

    try {
        // 1. Get current list of students for the selected class
        const studentsSnapshot = await db.collection('students').doc(selectedClassId).collection('students').get();
        studentsData = []; // Reset students data
        if (studentsSnapshot.empty) {
            document.getElementById('attendanceMessage').textContent = 'No students found for this class.';
            document.getElementById('saveAttendanceBtn').style.display = 'none';
            return;
        }
        studentsSnapshot.forEach(doc => {
            studentsData.push({ id: doc.id, ...doc.data() });
        });

        // Sort students by name
        studentsData.sort((a, b) => a.name.localeCompare(b.name));

        // 2. Get attendance records for the selected date and class
        const attendanceDocRef = db.collection('attendance_records').doc(selectedDate).collection('attendance').doc(selectedClassId);
        const attendanceDoc = await attendanceDocRef.get();
        const attendanceRecords = attendanceDoc.exists ? attendanceDoc.data() : {};

        displayAttendanceTable(studentsData, attendanceRecords);
        document.getElementById('saveAttendanceBtn').style.display = 'inline-block'; // Show save button
        document.getElementById('attendanceMessage').textContent = '';

    } catch (error) {
        console.error("Error loading attendance:", error);
        document.getElementById('attendanceMessage').textContent = 'Error loading attendance data.';
        document.getElementById('saveAttendanceBtn').style.display = 'none';
    }
}

function displayAttendanceTable(students, attendanceRecords) {
    const tableBody = document.getElementById('attendanceTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    if (students.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">No students to display.</td></tr>';
        return;
    }

    students.forEach(student => {
        const row = tableBody.insertRow();
        row.dataset.studentId = student.id; // Store student ID on the row

        const studentNameCell = row.insertCell();
        studentNameCell.textContent = student.name;

        const statusCell = row.insertCell();
        const currentStatus = attendanceRecords[student.id] || 'N/A'; // Default to N/A

        statusCell.innerHTML = `
            <div class="monitor-attendance-status">
                <input type="radio" id="present-${student.id}" name="status-${student.id}" value="present" ${currentStatus === 'present' ? 'checked' : ''}>
                <label for="present-${student.id}">Present</label>

                <input type="radio" id="absent-${student.id}" name="status-${student.id}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''}>
                <label for="absent-${student.id}">Absent</label>
            </div>
        `;

        // NEW: Add the Remove button cell
        const removeCell = row.insertCell();
        removeCell.innerHTML = `
            <button class="remove-student-btn" data-student-id="${student.id}" aria-label="Remove student ${student.name}">
                <i class="fas fa-trash-alt"></i> </button>
        `;
    });
}


async function saveAttendance() {
    if (!selectedClassId || !selectedDate) {
        document.getElementById('attendanceMessage').textContent = 'Please select a class and date first.';
        return;
    }

    const attendanceData = {};
    const rows = document.querySelectorAll('#attendanceTableBody tr');

    rows.forEach(row => {
        const studentId = row.dataset.studentId;
        const selectedRadio = row.querySelector(`input[name="status-${studentId}"]:checked`);
        if (selectedRadio) {
            attendanceData[studentId] = selectedRadio.value;
        } else {
            // If no status is selected (e.g., newly added student, not yet marked)
            // You might want to default to 'N/A' or ensure all are marked
            attendanceData[studentId] = 'N/A';
        }
    });

    document.getElementById('attendanceMessage').textContent = 'Saving attendance...';

    try {
        const attendanceDocRef = db.collection('attendance_records').doc(selectedDate).collection('attendance').doc(selectedClassId);
        await attendanceDocRef.set(attendanceData, { merge: true }); // Use merge to update existing fields without overwriting others

        document.getElementById('attendanceMessage').textContent = 'Attendance saved successfully!';
        setTimeout(() => document.getElementById('attendanceMessage').textContent = '', 3000); // Clear message after 3 seconds
    } catch (error) {
        console.error("Error saving attendance:", error);
        document.getElementById('attendanceMessage').textContent = 'Error saving attendance.';
    }
}

async function addStudent() {
    const newStudentNameInput = document.getElementById('newStudentName');
    const newStudentName = newStudentNameInput.value.trim();
    const addStudentMessage = document.getElementById('addStudentMessage');

    if (!selectedClassId) {
        addStudentMessage.textContent = 'Please select a class before adding a student.';
        return;
    }

    if (!newStudentName) {
        addStudentMessage.textContent = 'Please enter a student name.';
        return;
    }

    addStudentMessage.textContent = 'Adding student...';

    try {
        const studentsRef = db.collection('students').doc(selectedClassId).collection('students');
        const newStudentRef = await studentsRef.add({
            name: newStudentName,
            classId: selectedClassId,
            // Add any other default student properties here if needed
        });

        addStudentMessage.textContent = `Student "${newStudentName}" added successfully to ${selectedClassId}!`;
        newStudentNameInput.value = ''; // Clear input field

        // Reload attendance to include the new student in the table
        await loadAttendanceForSelectedClassAndDate();

        setTimeout(() => addStudentMessage.textContent = '', 3000);
    } catch (error) {
        console.error("Error adding student:", error);
        addStudentMessage.textContent = 'Error adding student.';
    }
}

// NEW: Function to remove a student
async function removeStudent(studentId) {
    if (!selectedClassId) {
        alert('Error: No class selected.');
        return;
    }

    const studentToRemove = studentsData.find(s => s.id === studentId);
    if (!studentToRemove) {
        alert('Error: Student not found in current list.');
        return;
    }

    const confirmRemoval = confirm(`Are you sure you want to remove ${studentToRemove.name} from ${document.getElementById('selectedClassName').textContent}? This action cannot be undone.`);

    if (!confirmRemoval) {
        return; // User cancelled
    }

    document.getElementById('attendanceMessage').textContent = `Removing ${studentToRemove.name}...`;

    try {
        // Delete student document from the 'students' subcollection
        const studentDocRef = db.collection('students').doc(selectedClassId).collection('students').doc(studentId);
        await studentDocRef.delete();

        // Optional: Delete their attendance records for the currently viewed date if desired.
        // If attendance is marked per student ID in a date-class document,
        // you would update that specific field. For now, we assume deleting student
        // from 'students' collection is enough, as past attendance remains for historical
        // purposes, but the student won't appear in future attendance lists.
        // If you want to remove past attendance records for *this specific student* across *all dates*:
        // This is complex and requires iterating through all attendance_records,
        // which can be costly and slow. Generally, for a student leaving,
        // removing them from the active student list is sufficient.

        document.getElementById('attendanceMessage').textContent = `${studentToRemove.name} removed successfully.`;
        // Remove the row from the HTML table
        const rowToRemove = document.querySelector(`#attendanceTableBody tr[data-student-id="${studentId}"]`);
        if (rowToRemove) {
            rowToRemove.remove();
        }

        // Update studentsData array
        studentsData = studentsData.filter(s => s.id !== studentId);

        setTimeout(() => document.getElementById('attendanceMessage').textContent = '', 3000);
    } catch (error) {
        console.error("Error removing student:", error);
        document.getElementById('attendanceMessage').textContent = `Error removing ${studentToRemove.name}.`;
    }
}
