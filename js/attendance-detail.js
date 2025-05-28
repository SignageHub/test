// js/attendance-detail.js
document.addEventListener('DOMContentLoaded', async () => {
    const displayDateSpan = document.getElementById('displayDate');
    const attendanceTableBody = document.querySelector('#attendanceTable tbody');
    const db = window.db;

    if (!db) {
        attendanceTableBody.innerHTML = '<tr><td colspan="3" style="color: red;">Firebase not initialized. Check firebase-init.js.</td></tr>';
        return;
    }

    // Get the date from the URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDate = urlParams.get('date');

    if (!selectedDate) {
        displayDateSpan.textContent = 'N/A';
        attendanceTableBody.innerHTML = '<tr><td colspan="3">No date selected.</td></tr>';
        return;
    }

    displayDateSpan.textContent = selectedDate;
    attendanceTableBody.innerHTML = '<tr><td colspan="3">Loading attendance for this date...</td></tr>';

    try {
        // Fetch all attendance documents that match the selected date
        // Note: This fetches documents like "S.1_2023-10-26", "S.2_2023-10-26", etc.
        const attendanceSnapshot = await db.collection('attendance')
                                           .where('date', '==', selectedDate)
                                           .get();

        if (attendanceSnapshot.empty) {
            attendanceTableBody.innerHTML = '<tr><td colspan="3">No attendance records found for this date.</td></tr>';
            return;
        }

        attendanceTableBody.innerHTML = ''; // Clear loading message

        let allAttendanceRecords = [];

        attendanceSnapshot.forEach(doc => {
            const classId = doc.data().class;
            const records = doc.data().records; // { "Student A": "present", "Student B": "absent" }

            for (const studentName in records) {
                if (records.hasOwnProperty(studentName)) {
                    allAttendanceRecords.push({
                        class: classId,
                        student: studentName,
                        status: records[studentName]
                    });
                }
            }
        });

        // Sort records by class, then by student name
        allAttendanceRecords.sort((a, b) => {
            if (a.class !== b.class) {
                return a.class.localeCompare(b.class);
            }
            return a.student.localeCompare(b.student);
        });

        allAttendanceRecords.forEach(record => {
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
                statusCell.innerHTML = 'N/A'; // Should ideally not happen if data is consistently 'present'/'absent'
            }
        });

    } catch (error) {
        console.error("Error loading attendance details:", error);
        attendanceTableBody.innerHTML = '<tr><td colspan="3" style="color: red;">Error loading attendance data. Please check console.</td></tr>';
    }
});
