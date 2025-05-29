// js/monitor.js
const db = window.db; // Access the globally available Firestore instance

let selectedClassId = null; // Stores the Firestore document ID of the selected class (e.g., 'S.1')
let selectedDate = null; // Stores the selected date in YYYY-MM-DD format
let studentsData = []; // Stores the array of student objects currently loaded for the selected class

document.addEventListener('DOMContentLoaded', () => {
    // --- Password Gate Logic ---
    const passwordGate = document.getElementById('passwordGate');
    const monitorPasswordInput = document.getElementById('monitorPassword');
    const enterMonitorBtn = document.getElementById('enterMonitorBtn');
    const passwordMessage = document.getElementById('passwordMessage');
    const monitorContent = document.getElementById('monitorContent'); // The main content div

    const CORRECT_PASSWORD = "19972010"; // Hardcoded password

    function checkPassword() {
        if (monitorPasswordInput.value === CORRECT_PASSWORD) {
            passwordGate.classList.add('hidden'); // Hide password gate
            monitorContent.classList.remove('hidden'); // Show main content
            passwordMessage.textContent = ''; // Clear any previous message
            // Proceed with loading dashboard content after successful login
            initializeMonitorDashboard();
        } else {
            passwordMessage.textContent = 'Incorrect password. Please try again.';
            monitorPasswordInput.value = ''; // Clear input
        }
    }

    enterMonitorBtn.addEventListener('click', checkPassword);
    monitorPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });

    // If you want the monitor page to start with password gate visible:
    passwordGate.classList.remove('hidden'); // Ensure it's visible initially
    monitorContent.classList.add('hidden'); // Ensure main content is hidden initially

    // Place all your existing monitor dashboard initialization logic inside a function
    // that gets called ONLY after successful password entry.
    function initializeMonitorDashboard() {
        // Cache DOM elements (these should be within this function or globally accessible after content is visible)
        const attendanceDateMonitorInput = document.getElementById('attendanceDateMonitor');
        const loadAttendanceBtn = document.getElementById('loadAttendanceBtn');
        const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
        const addStudentBtn = document.getElementById('addStudentBtn');
        const removeStudentByNameBtn = document.getElementById('removeStudentByNameBtn');
        const classButtonsContainer = document.getElementById('classButtonsContainer');
        const monitorAttendanceTableBody = document.getElementById('monitorAttendanceTableBody');
        const selectedClassNameSpan = document.getElementById('selectedClassName');
        const displayDateSpan = document.getElementById('displayDate');
        const attendanceMessageSpan = document.getElementById('attendanceMessage');
        const addStudentMessageSpan = document.getElementById('addStudentMessage');
        const removeStudentMessageSpan = document.getElementById('removeStudentMessage');

        // Set default date to today
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        attendanceDateMonitorInput.value = `${yyyy}-${mm}-${dd}`;
        selectedDate = `${yyyy}-${mm}-${dd}`; // Initialize selectedDate

        // Load class buttons initially
        loadClasses();

        // --- Event Listeners ---
        loadAttendanceBtn.addEventListener('click', loadAttendanceForSelectedClassAndDate);
        attendanceDateMonitorInput.addEventListener('change', (event) => {
            selectedDate = event.target.value;
            loadAttendanceForSelectedClassAndDate(); // Reload attendance when date changes
        });
        saveAttendanceBtn.addEventListener('click', saveAttendance);
        addStudentBtn.addEventListener('click', addStudent);
        removeStudentByNameBtn.addEventListener('click', removeStudentPermanentlyByName);

        // Event delegation for class selection buttons
        classButtonsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('class-button-monitor')) {
                // Remove 'selected' class from all buttons
                document.querySelectorAll('.class-button-monitor').forEach(btn => {
                    btn.classList.remove('selected');
                });
                // Add 'selected' class to the clicked button
                e.target.classList.add('selected');
                selectedClassId = e.target.dataset.classId;
                selectedClassNameSpan.textContent = e.target.textContent; // Update display
                loadAttendanceForSelectedClassAndDate(); // Load attendance for the newly selected class
            }
        });

        // Event delegation for 'Quick Remove' student buttons in table
        monitorAttendanceTableBody.addEventListener('click', async (e) => {
            if (e.target.closest('.remove-student-btn')) { // Use closest to handle clicks on icon inside button
                const button = e.target.closest('.remove-student-btn');
                const studentId = button.dataset.studentId;
                // Confirm with user before quick removal
                if (confirm("Are you sure you want to permanently remove this student from the class and all their attendance records? This action cannot be undone.")) {
                    await removeStudentPermanentlyById(studentId);
                }
            }
        });

        // Initial display of the selected class and date
        selectedClassNameSpan.textContent = '[No Class Selected]';
        displayDateSpan.textContent = new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    // END of initializeMonitorDashboard function
}); // End of DOMContentLoaded

// --- Class Loading Functions ---
async function loadClasses() {
    const classSelectionDiv = document.getElementById('classButtonsContainer');
    classSelectionDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading classes...</p>';

    const defaultClasses = ['S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'];

    if (!db) {
        console.error("Firestore instance not available. Cannot load classes.");
        loadClassButtonsFromDefaults(defaultClasses);
        return;
    }

    try {
        const classesSnapshot = await db.collection('classes').orderBy('order').get(); // Order by 'order' field first
        let classesToLoad = [];
        if (!classesSnapshot.empty) {
            classesSnapshot.forEach(doc => {
                classesToLoad.push({ id: doc.id, name: doc.data().name || doc.id });
            });
            // If 'order' field was not used for sorting, sort by name (ID)
            classesToLoad.sort((a,b) => (a.name).localeCompare(b.name));
        } else {
            console.warn("No classes found in Firebase 'classes' collection. Loading default classes.");
            classesToLoad = defaultClasses.map(name => ({ id: name, name: name }));
        }

        classSelectionDiv.innerHTML = ''; // Clear loading message
        classesToLoad.forEach(classObj => {
            const button = document.createElement('button');
            button.classList.add('class-button-monitor');
            button.dataset.classId = classObj.id;
            button.textContent = classObj.name;
            classSelectionDiv.appendChild(button);
        });

        // Automatically select the first class if none is selected
        if (!selectedClassId && classesToLoad.length > 0) {
            const firstButton = classSelectionDiv.querySelector('.class-button-monitor');
            if (firstButton) {
                firstButton.classList.add('selected');
                selectedClassId = firstButton.dataset.classId;
                document.getElementById('selectedClassName').textContent = firstButton.textContent;
                loadAttendanceForSelectedClassAndDate(); // Load attendance for the auto-selected class
            }
        }
    } catch (error) {
        console.error("Error loading classes from Firebase:", error);
        loadClassButtonsFromDefaults(defaultClasses); // Fallback to default on error
    }

    function loadClassButtonsFromDefaults(classes) {
        classSelectionDiv.innerHTML = '';
        classes.forEach(className => {
            const button = document.createElement('button');
            button.classList.add('class-button-monitor');
            button.dataset.classId = className; // Use class name as ID for defaults
            button.textContent = className;
            classSelectionDiv.appendChild(button);
        });
    }
}

// --- Attendance Loading and Display Functions ---
async function loadAttendanceForSelectedClassAndDate() {
    selectedDate = document.getElementById('attendanceDateMonitor').value;
    const monitorAttendanceTableBody = document.getElementById('monitorAttendanceTableBody');
    const selectedClassNameSpan = document.getElementById('selectedClassName');
    const displayDateSpan = document.getElementById('displayDate');
    const attendanceMessageSpan = document.getElementById('attendanceMessage');
    const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');

    displayDateSpan.textContent = selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '[Not Selected]';

    if (!selectedClassId) {
        attendanceMessageSpan.textContent = 'Please select a class.';
        monitorAttendanceTableBody.innerHTML = '<tr><td colspan="4">Please select a class.</td></tr>';
        saveAttendanceBtn.style.display = 'none';
        return;
    }
    if (!selectedDate) {
        attendanceMessageSpan.textContent = 'Please select a date.';
        monitorAttendanceTableBody.innerHTML = '<tr><td colspan="4">Please select a date.</td></tr>';
        saveAttendanceBtn.style.display = 'none';
        return;
    }

    attendanceMessageSpan.textContent = '<i class="fas fa-spinner fa-spin"></i> Loading attendance...';
    saveAttendanceBtn.style.display = 'none'; // Hide save button while loading
    monitorAttendanceTableBody.innerHTML = '<tr><td colspan="4"><i class="fas fa-spinner fa-spin"></i> Loading students and attendance...</td></tr>';

    if (!db) {
        console.error("Firestore instance is not available.");
        monitorAttendanceTableBody.innerHTML = '<tr><td colspan="4">System error: Firestore not connected.</td></tr>';
        attendanceMessageSpan.textContent = 'Error: Firebase not connected.';
        return;
    }

    try {
        // 1. Get current list of students for the selected class
        const studentsRef = db.collection('students').doc(selectedClassId).collection('students');
        const studentsSnapshot = await studentsRef.get();
        studentsData = []; // Reset students data array
        if (!studentsSnapshot.empty) {
            studentsSnapshot.forEach(doc => {
                studentsData.push({ id: doc.id, ...doc.data() });
            });
            // Sort by roll number (ensure roll is a string for localeCompare)
            studentsData.sort((a, b) => (a.roll || '').localeCompare(b.roll || '', undefined, { numeric: true, sensitivity: 'base' }));
        } else {
            attendanceMessageSpan.textContent = 'No students found for this class. Use "Add New Student" below.';
            monitorAttendanceTableBody.innerHTML = '<tr><td colspan="4">No students found for this class.</td></tr>';
            saveAttendanceBtn.style.display = 'none';
            return;
        }

        // 2. Get attendance records for the selected date and class
        const attendanceDocRef = db.collection('attendance_records').doc(selectedDate).collection('attendance').doc(selectedClassId);
        const attendanceDoc = await attendanceDocRef.get();
        const attendanceRecords = attendanceDoc.exists ? attendanceDoc.data() : {};

        displayAttendanceTable(studentsData, attendanceRecords);
        saveAttendanceBtn.style.display = 'inline-block'; // Show save button
        attendanceMessageSpan.textContent = ''; // Clear loading message

    } catch (error) {
        console.error("Error loading attendance:", error);
        attendanceMessageSpan.textContent = 'Error loading attendance data. Please check your browser console.';
        monitorAttendanceTableBody.innerHTML = '<tr><td colspan="4">Error loading data. Please check console.</td></tr>';
        saveAttendanceBtn.style.display = 'none';
    }
}

function displayAttendanceTable(students, attendanceRecords) {
    const tableBody = document.getElementById('monitorAttendanceTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    if (students.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">No students to display.</td></tr>';
        return;
    }

    students.forEach(student => {
        const row = tableBody.insertRow();
        row.dataset.studentId = student.id; // Store student Firestore ID on the row

        const studentRollCell = row.insertCell();
        studentRollCell.textContent = student.roll || 'N/A'; // Display roll number

        const studentNameCell = row.insertCell();
        studentNameCell.textContent = student.name;

        const statusCell = row.insertCell();
        // Default to 'absent' if no record for the student on this date
        const currentStatus = attendanceRecords[student.id] || 'absent';

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

// --- Save Attendance Changes ---
async function saveAttendance() {
    if (!selectedClassId || !selectedDate) {
        document.getElementById('attendanceMessage').textContent = 'Please select a class and date before saving.';
        return;
    }

    const attendanceData = {};
    const rows = document.querySelectorAll('#monitorAttendanceTableBody tr');

    rows.forEach(row => {
        const studentId = row.dataset.studentId;
        const selectedRadio = row.querySelector(`input[name="status-${studentId}"]:checked`);
        if (selectedRadio) {
            attendanceData[studentId] = selectedRadio.value;
        } else {
            // Default to absent if no status is selected (e.g., newly added student)
            attendanceData[studentId] = 'absent';
        }
    });

    document.getElementById('attendanceMessage').textContent = '<i class="fas fa-spinner fa-spin"></i> Saving attendance...';

    if (!db) {
        console.error("Firestore instance not available. Cannot save attendance.");
        document.getElementById('attendanceMessage').textContent = 'Error: Firebase not connected. Cannot save.';
        return;
    }

    try {
        const attendanceDocRef = db.collection('attendance_records').doc(selectedDate).collection('attendance').doc(selectedClassId);
        await attendanceDocRef.set(attendanceData, { merge: true }); // Use merge to update existing fields without overwriting others

        document.getElementById('attendanceMessage').textContent = 'Attendance saved successfully!';
        // No need to reload table as changes are only to radio buttons, not student list
        setTimeout(() => document.getElementById('attendanceMessage').textContent = '', 3000);
    } catch (error) {
        console.error("Error saving attendance:", error);
        document.getElementById('attendanceMessage').textContent = 'Error saving attendance. Please check console.';
    }
}

// --- Add Student Logic ---
async function addStudent() {
    const newStudentRollInput = document.getElementById('newStudentRoll');
    const newStudentNameInput = document.getElementById('newStudentName');
    const addStudentMessageSpan = document.getElementById('addStudentMessage');

    if (!selectedClassId) {
        addStudentMessageSpan.textContent = 'Please select a class before adding a student.';
        return;
    }

    const roll = newStudentRollInput.value.trim();
    const name = newStudentNameInput.value.trim();

    if (!roll || !name) {
        addStudentMessageSpan.textContent = 'Please enter both roll number and student name.';
        return;
    }

    // Basic validation for roll number (e.g., numeric, non-empty)
    if (!/^\d+$/.test(roll)) {
        addStudentMessageSpan.textContent = 'Roll Number must be numeric.';
        return;
    }

    addStudentMessageSpan.textContent = '<i class="fas fa-spinner fa-spin"></i> Adding student...';

    if (!db) {
        console.error("Firestore instance not available. Cannot add student.");
        addStudentMessageSpan.textContent = 'Error: Firebase not connected. Cannot add student.';
        return;
    }

    try {
        const studentsRef = db.collection('students').doc(selectedClassId).collection('students');

        // Check if roll number already exists in this class
        const existingStudentSnap = await studentsRef.where('roll', '==', roll).limit(1).get();
        if (!existingStudentSnap.empty) {
            addStudentMessageSpan.textContent = `A student with roll number "${roll}" already exists in ${document.getElementById('selectedClassName').textContent}.`;
            return;
        }

        await studentsRef.add({
            name: name,
            roll: roll, // Store roll number explicitly
            classId: selectedClassId, // Store classId for easier queries if needed later
        });

        addStudentMessageSpan.textContent = `Student "${name}" (Roll: ${roll}) added successfully!`;
        newStudentRollInput.value = ''; // Clear input field
        newStudentNameInput.value = ''; // Clear input field

        // Reload attendance table to include the new student
        await loadAttendanceForSelectedClassAndDate();

        setTimeout(() => addStudentMessageSpan.textContent = '', 3000);
    } catch (error) {
        console.error("Error adding student:", error);
        addStudentMessageSpan.textContent = 'Error adding student. Please check console.';
    }
}

// --- Remove Student by ID (used by quick remove button) ---
async function removeStudentPermanentlyById(studentId) {
    const removeStudentMessageSpan = document.getElementById('removeStudentMessage');
    const attendanceMessageSpan = document.getElementById('attendanceMessage');

    if (!selectedClassId) {
        removeStudentMessageSpan.textContent = 'Error: No class selected for removal.';
        return;
    }

    const studentToRemove = studentsData.find(s => s.id === studentId);
    if (!studentToRemove) {
        removeStudentMessageSpan.textContent = 'Error: Student not found in current list.';
        return;
    }

    attendanceMessageSpan.textContent = `<i class="fas fa-spinner fa-spin"></i> Permanently removing ${studentToRemove.name} and records...`;
    removeStudentMessageSpan.textContent = `<i class="fas fa-spinner fa-spin"></i> Permanently removing ${studentToRemove.name}...`;

    if (!db) {
        console.error("Firestore instance not available. Cannot remove student.");
        attendanceMessageSpan.textContent = 'Error: Firebase not connected. Cannot remove.';
        removeStudentMessageSpan.textContent = 'Error: Firebase not connected. Cannot remove.';
        return;
    }

    try {
        const batch = db.batch();

        // 1. Delete student document from the 'students' subcollection
        const studentDocRef = db.collection('students').doc(selectedClassId).collection('students').doc(studentId);
        batch.delete(studentDocRef);

        // 2. Remove student's attendance entries from all relevant daily attendance records for this class
        // This is simplified to only remove from the SELECTED CLASS's attendance records.
        // For a full system, you might iterate through all dates the student could have attended.
        // However, iterating *all* date documents and *all* class attendance documents for *every* student
        // could be extremely expensive. A Cloud Function is recommended for large-scale deletions.
        // For now, we'll try to find and update attendance for this specific student in existing date records.
        const attendanceDatesSnapshot = await db.collection('attendance_records').get(); // Get all date documents

        for (const dateDoc of attendanceDatesSnapshot.docs) {
            const date = dateDoc.id;
            const classAttendanceDocRef = db.collection('attendance_records').doc(date).collection('attendance').doc(selectedClassId);

            // Fetch the attendance for this specific class and date
            const classAttendanceSnap = await classAttendanceDocRef.get();

            if (classAttendanceSnap.exists && classAttendanceSnap.data()[studentId] !== undefined) {
                // If the class attendance document exists and has an entry for this student, remove that specific field
                batch.update(classAttendanceDocRef, {
                    [studentId]: firebase.firestore.FieldValue.delete()
                });
            }
        }

        await batch.commit();

        attendanceMessageSpan.textContent = `${studentToRemove.name} permanently removed.`;
        removeStudentMessageSpan.textContent = `${studentToRemove.name} permanently removed.`;

        // Reload attendance table to reflect the removal
        await loadAttendanceForSelectedClassAndDate();

        setTimeout(() => {
            attendanceMessageSpan.textContent = '';
            removeStudentMessageSpan.textContent = '';
        }, 5000); // Keep message longer for permanent action
    } catch (error) {
        console.error("Error permanently removing student by ID:", error);
        attendanceMessageSpan.textContent = `Error permanently removing ${studentToRemove.name}. Check console.`;
        removeStudentMessageSpan.textContent = `Error removing ${studentToRemove.name}.`;
    }
}

// --- Remove Student Permanently by Name (used by the dedicated button) ---
async function removeStudentPermanentlyByName() {
    const studentNameInput = document.getElementById('studentToRemoveName');
    const studentName = studentNameInput.value.trim();
    const removeStudentMessageSpan = document.getElementById('removeStudentMessage');

    if (!selectedClassId) {
        removeStudentMessageSpan.textContent = 'Please select a class first.';
        return;
    }

    if (!studentName) {
        removeStudentMessageSpan.textContent = 'Please enter the student\'s name to remove.';
        return;
    }

    removeStudentMessageSpan.textContent = '<i class="fas fa-spinner fa-spin"></i> Searching for student...';

    if (!db) {
        console.error("Firestore instance not available. Cannot remove student.");
        removeStudentMessageSpan.textContent = 'Error: Firebase not connected. Cannot remove.';
        return;
    }

    try {
        // Find the student by name and selected class ID
        // Note: This relies on matching names. For a robust system, use a unique ID for removal.
        const studentsRef = db.collection('students').doc(selectedClassId).collection('students');
        const querySnapshot = await studentsRef.where('name', '==', studentName).limit(1).get();

        if (querySnapshot.empty) {
            removeStudentMessageSpan.textContent = `Student "${studentName}" not found in ${document.getElementById('selectedClassName').textContent}. Please ensure the name is exact.`;
            return;
        }

        const studentDoc = querySnapshot.docs[0];
        const studentId = studentDoc.id; // Get the Firestore auto-generated ID
        const studentData = studentDoc.data();

        // Confirm with the user, showing roll number for clarity
        if (confirm(`WARNING: You are about to permanently remove ${studentData.name} (Roll: ${studentData.roll}) from ${document.getElementById('selectedClassName').textContent}. This action will delete their profile and all attendance records for this class. Are you sure?`)) {
            await removeStudentPermanentlyById(studentId); // Call the core removal function
            studentNameInput.value = ''; // Clear input field
        } else {
            removeStudentMessageSpan.textContent = 'Student removal cancelled.';
            setTimeout(() => removeStudentMessageSpan.textContent = '', 3000);
        }

    } catch (error) {
        console.error("Error finding student by name for removal:", error);
        removeStudentMessageSpan.textContent = 'Error finding student for removal. Check console.';
    }
}
