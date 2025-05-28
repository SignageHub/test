// js/monitor.js
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
    const selectedClassInfo = document.getElementById('selectedClassInfo');

    const managementLoadingIndicator = document.getElementById('managementLoadingIndicator');
    const managementErrorMessage = document.getElementById('managementErrorMessage');

    const db = window.db;

    let monitorSelectedClass = '';
    let monitorSelectedDate = '';
    let currentStudents = []; // To store students loaded for the current class
    let currentAttendance = {}; // To store attendance status for the current date

    // Helper functions for UI feedback (toasts)
    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.classList.add(type === 'success' ? 'success-toast' : 'error-toast');
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10); // Small delay to trigger transition

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000); // Hide after 3 seconds
    }

    // Helper functions for section loading/error
    function showManagementLoading() {
        managementLoadingIndicator.style.display = 'block';
        monitorAttendanceTableBody.innerHTML = '';
        managementErrorMessage.style.display = 'none';
    }

    function hideManagementLoading() {
        managementLoadingIndicator.style.display = 'none';
    }

    function displayManagementError(message) {
        managementErrorMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error: ${message}`;
        managementErrorMessage.style.display = 'flex';
    }

    function hideManagementError() {
        managementErrorMessage.style.display = 'none';
        managementErrorMessage.textContent = '';
    }

    // Set default date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const dd = String(today.getDate()).padStart(2, '0');
    attendanceDateMonitorInput.value = `${yyyy}-${mm}-${dd}`;


    // --- Class Selection ---
    classButtonsMonitor.forEach(button => {
        button.addEventListener('click', () => {
            classButtonsMonitor.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');

            monitorSelectedClass = button.dataset.class;
            selectedClassInfo.textContent = `Selected Class: ${monitorSelectedClass}`;
            addStudentClassSpan.textContent = monitorSelectedClass; // Update add student section
            monitorDateSelectionDiv.style.display = 'flex'; // Show date selection
            monitorAttendanceManagementDiv.style.display = 'none'; // Hide management table
            monitorAttendanceTableBody.innerHTML = '<tr><td colspan="2" class="no-data-row">Select a date and click "Load Students" to manage attendance.</td></tr>';
            currentStudents = []; // Clear loaded students
            currentAttendance = {}; // Clear attendance records
            hideManagementError();
        });
    });

    // --- Load Students for Date ---
    loadStudentsBtn.addEventListener('click', async () => {
        monitorSelectedDate = attendanceDateMonitorInput.value;

        if (!monitorSelectedClass) {
            showToast('Please select a class first.', 'error');
            return;
        }
        if (!monitorSelectedDate) {
            showToast('Please select a date.', 'error');
            return;
        }

        monitorSelectedClassSpan.textContent = monitorSelectedClass;
        monitorSelectedDateSpan.textContent = monitorSelectedDate;
        monitorAttendanceManagementDiv.style.display = 'block'; // Show management table

        await loadStudentsAndAttendanceForMonitor();
    });

    async function loadStudentsAndAttendanceForMonitor() {
        showManagementLoading();
        hideManagementError();
        currentStudents = [];
        currentAttendance = {};

        try {
            // 1. Fetch students for the selected class
            const classDocRef = db.collection('classes').doc(monitorSelectedClass);
            const classDoc = await classDocRef.get();

            if (classDoc.exists && classDoc.data().students && classDoc.data().students.length > 0) {
                currentStudents = classDoc.data().students;
            } else {
                console.log(`No students found for class ${monitorSelectedClass} yet. User will need to add them.`);
            }

            // 2. Fetch existing attendance for the selected class and date
            const attendanceDocId = `${monitorSelectedClass}_${monitorSelectedDate}`;
            const attendanceDocRef = db.collection('attendance').doc(attendanceDocId);
            const attendanceDoc = await attendanceDocRef.get();

            if (attendanceDoc.exists && attendanceDoc.data().records) {
                currentAttendance = attendanceDoc.data().records;
            }

            // 3. Populate the table
            monitorAttendanceTableBody.innerHTML = ''; // Clear loading message

            if (currentStudents.length === 0) {
                monitorAttendanceTableBody.innerHTML = '<tr><td colspan="2" class="no-data-row">No students added to this class yet. Use "Add New Student" below.</td></tr>';
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
                            <input type="radio" id="present-${sanitizedId(studentName)}" name="status-${sanitizedId(studentName)}" value="present" ${currentStatus === 'present' ? 'checked' : ''}>
                            <label for="present-${sanitizedId(studentName)}"><i class="fas fa-check"></i> Present</label>

                            <input type="radio" id="absent-${sanitizedId(studentName)}" name="status-${sanitizedId(studentName)}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''}>
                            <label for="absent-${sanitizedId(studentName)}"><i class="fas fa-times"></i> Absent</label>
                        </div>
                    `;
                });
            }

        } catch (error) {
            console.error("Error loading students and attendance:", error);
            displayManagementError(`Failed to load data. ${error.message}. Please try again.`);
            monitorAttendanceTableBody.innerHTML = '<tr><td colspan="2" class="no-data-row" style="color:red;">Error loading data.</td></tr>';
        } finally {
            hideManagementLoading();
        }
    }

    // Function to sanitize student names for HTML IDs
    function sanitizedId(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }

    // --- Add New Student ---
    addNewStudentBtn.addEventListener('click', async () => {
        const newStudentName = newStudentNameInput.value.trim();

        if (!monitorSelectedClass) {
            showToast('Please select a class before adding a student.', 'error');
            return;
        }

        if (newStudentName === '') {
            showToast('Please enter a student name.', 'error');
            return;
        }

        if (currentStudents.some(student => student.toLowerCase() === newStudentName.toLowerCase())) {
            showToast(`Student "${newStudentName}" already exists in ${monitorSelectedClass}.`, 'warning');
            return;
        }

        // Basic input validation
        if (!/^[a-zA-Z\s.-]+$/.test(newStudentName)) {
            showToast('Student name can only contain letters, spaces, dots, or hyphens.', 'error');
            return;
        }

        try {
            const classDocRef = db.collection('classes').doc(monitorSelectedClass);

            await classDocRef.set({
                students: firebase.firestore.FieldValue.arrayUnion(newStudentName)
            }, { merge: true });

            newStudentNameInput.value = ''; // Clear input
            showToast(`Student "${newStudentName}" added to ${monitorSelectedClass} successfully!`, 'success');

            // Reload students to update the table immediately
            await loadStudentsAndAttendanceForMonitor();

        } catch (error) {
            console.error("Error adding new student:", error);
            showToast(`Error adding student. ${error.message}`, 'error');
        }
    });

    // --- Save Attendance ---
    saveAttendanceBtn.addEventListener('click', async () => {
        if (!monitorSelectedClass || !monitorSelectedDate || currentStudents.length === 0) {
            showToast('Please load students and set attendance before saving.', 'error');
            return;
        }

        if (!confirm('Are you sure you want to save attendance for this date? This will overwrite previous records for today.')) {
            return; // User cancelled
        }

        const attendanceRecords = {};
        currentStudents.forEach(studentName => {
            const sanitizedStudentName = sanitizedId(studentName);
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
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(attendanceDocRef);
                if (!doc.exists) {
                    transaction.set(attendanceDocRef, {
                        class: monitorSelectedClass,
                        date: monitorSelectedDate,
                        records: attendanceRecords,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Merge new records with existing ones, preserving other fields if any
                    transaction.update(attendanceDocRef, {
                        records: attendanceRecords,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            showToast('Attendance saved successfully!', 'success');
            // Optionally, you might want to reload to reflect saved state
            await loadStudentsAndAttendanceForMonitor();

        } catch (error) {
            console.error("Error saving attendance:", error);
            showToast(`Error saving attendance. ${error.message}`, 'error');
        }
    });
});
