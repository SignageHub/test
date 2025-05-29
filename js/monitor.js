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

    // NEW: Event listener for the permanent remove student button
    document.getElementById('removeStudentPermanentlyBtn').addEventListener('click', removeStudentByName);


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

    // Event delegation for 'Quick Remove' student buttons in table (NEW)
    document.getElementById('attendanceTableBody').addEventListener('click', async (e) => {
        if (e.target.closest('.remove-student-btn')) { // Use closest to handle clicks on icon inside button
            const button = e.target.closest('.remove-student-btn');
            const studentId = button.dataset.studentId;
            // The existing removeStudent function already handles the "forever" part now
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

        // Add the Quick Remove (trash) button cell
        const removeCell = row.insertCell();
        removeCell.innerHTML = `
            <button class="remove-student-btn" data-student-id="${student.id}" aria-label="Quick remove student ${student.name}">
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

// Function to permanently remove a student and their attendance records for the selected class
// This function is called by both the table's trash icon and the new "Remove Student" button.
async function removeStudent(studentId) {
    if (!selectedClassId) {
        alert('Error: No class selected.');
        document.getElementById('removeStudentMessage').textContent = 'Please select a class.';
        return;
    }

    const studentToRemove = studentsData.find(s => s.id === studentId);
    if (!studentToRemove) {
        alert('Error: Student not found in current list.');
        document.getElementById('removeStudentMessage').textContent = 'Student not found in this class.';
        return;
    }

    const confirmRemoval = confirm(`WARNING: Are you sure you want to permanently remove ${studentToRemove.name} from all records in ${document.getElementById('selectedClassName').textContent}? This includes their student profile AND all historical attendance records for this class. This action cannot be undone.`);

    if (!confirmRemoval) {
        document.getElementById('removeStudentMessage').textContent = 'Student removal cancelled.';
        return; // User cancelled
    }

    document.getElementById('attendanceMessage').textContent = `Permanently removing ${studentToRemove.name} and their attendance records...`;
    document.getElementById('removeStudentMessage').textContent = `Permanently removing ${studentToRemove.name}...`;


    try {
        // 1. Delete student document from the 'students' subcollection
        const studentDocRef = db.collection('students').doc(selectedClassId).collection('students').doc(studentId);
        await studentDocRef.delete();

        // 2. Remove student's attendance entries from all relevant daily attendance records
        // This process iterates through ALL date documents in 'attendance_records'.
        // For a very large dataset (e.g., years of daily attendance), this can be slow
        // and incur many read/write operations. For robust, large-scale deletions,
        // consider implementing this logic using Firebase Cloud Functions.
        const attendanceRecordsCollectionRef = db.collection('attendance_records');
        const allDateAttendanceSnap = await attendanceRecordsCollectionRef.get();

        const batch = db.batch(); // Use a batch write for efficiency (up to 500 operations per batch)
        let operationsInBatch = 0;

        for (const dateDoc of allDateAttendanceSnap.docs) {
            const date = dateDoc.id;
            const classAttendanceDocRef = attendanceRecordsCollectionRef.doc(date).collection('attendance').doc(selectedClassId);

            // Check if the class attendance document exists and contains the student's record
            const classAttendanceSnap = await classAttendanceDocRef.get();

            if (classAttendanceSnap.exists && classAttendanceSnap.data()[studentId] !== undefined) {
                // If it exists and has an entry for this student, remove that specific field
                batch.update(classAttendanceDocRef, {
                    [studentId]: firebase.firestore.FieldValue.delete()
                });
                operationsInBatch++;

                // Commit batch if it gets too large to avoid exceeding the 500 operation limit
                if (operationsInBatch === 499) { // Save one slot for safety
                    await batch.commit();
                    operationsInBatch = 0; // Reset batch counter
                }
            }
        }

        // Commit any remaining operations in the last batch
        if (operationsInBatch > 0) {
            await batch.commit();
        }

        document.getElementById('attendanceMessage').textContent = `${studentToRemove.name} permanently removed from all records in this class.`;
        document.getElementById('removeStudentMessage').textContent = `${studentToRemove.name} permanently removed.`;

        // Remove the row from the HTML table (UI update)
        const rowToRemove = document.querySelector(`#attendanceTableBody tr[data-student-id="${studentId}"]`);
        if (rowToRemove) {
            rowToRemove.remove();
        }

        // Update studentsData array to reflect removal in current session
        studentsData = studentsData.filter(s => s.id !== studentId);

        // Clear messages after a longer duration for permanent actions
        setTimeout(() => {
            document.getElementById('attendanceMessage').textContent = '';
            document.getElementById('removeStudentMessage').textContent = '';
        }, 5000);
    } catch (error) {
        console.error("Error permanently removing student:", error);
        document.getElementById('attendanceMessage').textContent = `Error permanently removing ${studentToRemove.name}. Check console for details.`;
        document.getElementById('removeStudentMessage').textContent = `Error removing ${studentToRemove.name}.`;
    }
}

// NEW: Function to handle removal via the 'Remove Student' button (by name)
async function removeStudentByName() {
    const studentNameInput = document.getElementById('studentToRemoveName');
    const studentName = studentNameInput.value.trim();
    const removeStudentMessage = document.getElementById('removeStudentMessage');

    if (!selectedClassId) {
        removeStudentMessage.textContent = 'Please select a class first.';
        return;
    }

    if (!studentName) {
        removeStudentMessage.textContent = 'Please enter the student\'s name to remove.';
        return;
    }

    // Find the student ID based on the name in the currently loaded studentsData
    const studentToRemove = studentsData.find(s => s.name.toLowerCase() === studentName.toLowerCase());

    if (!studentToRemove) {
        removeStudentMessage.textContent = `Student "${studentName}" not found in ${document.getElementById('selectedClassName').textContent}. Please ensure the name is exact.`;
        return;
    }

    // Call the main removeStudent function with the found ID
    await removeStudent(studentToRemove.id);

    // Clear the input field after attempting removal
    studentNameInput.value = '';
}
