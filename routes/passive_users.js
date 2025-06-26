// Passive User Management Logic (extracted from test_passive_users.html)

// API endpoints
const API_ENDPOINTS = {
    passiveStudents: '/api/admin/passive-students',
    passiveGuardians: '/api/admin/passive-guardians',
    passiveTeachers: '/api/admin/passive-teachers',
    reactivateStudent: '/api/admin/reactivate-student',
    reactivateGuardian: '/api/admin/reactivate-guardian',
    reactivateTeacher: '/api/admin/reactivate-teacher'
};

// Load passive students
top.loadPassiveStudents = async function(containerId = 'passiveStudentsContainer', statsId = 'passiveStudentsCount') {
    const container = document.getElementById(containerId);
    try {
        const response = await fetch(API_ENDPOINTS.passiveStudents, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        top.displayPassiveStudents(data.students, containerId);
        if (statsId) top.updateStats(statsId, data.students.length);
    } catch (error) {
        console.error('Error loading passive students:', error);
        container.innerHTML = `<div class="error">Hata: ${error.message}</div>`;
    }
}

// Display passive students
top.displayPassiveStudents = function(students, containerId = 'passiveStudentsContainer') {
    const container = document.getElementById(containerId);
    if (!students || students.length === 0) {
        container.innerHTML = '<div class="no-data">Pasif öğrenci bulunmuyor.</div>';
        return;
    }
    let html = '';
    students.forEach(student => {
        const guardianName = student.Guardian_First_Name && student.Guardian_Last_Name 
            ? `${student.Guardian_First_Name} ${student.Guardian_Last_Name}`
            : 'Belirtilmemiş';
        const createdDate = student.Created_At ? new Date(student.Created_At).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
        const lastLogin = student.Last_Login ? new Date(student.Last_Login).toLocaleDateString('tr-TR') : 'Hiç giriş yapmamış';
        html += `
            <div class="user-item">
                <div class="user-name">${student.First_Name} ${student.Last_Name}</div>
                <div class="user-details">📧 Email: ${student.Email || 'Belirtilmemiş'}</div>
                <div class="user-details">📞 Telefon: ${student.Phone || 'Belirtilmemiş'}</div>
                <div class="user-details">👥 Veli: ${guardianName}</div>
                <div class="user-details">📅 Kayıt Tarihi: ${createdDate}</div>
                <div class="user-details">🕒 Son Giriş: ${lastLogin}</div>
                <div class="status">❌ Durum: Pasif</div>
                <button class="reactivate-btn" onclick="reactivateUser('student', ${student.Student_ID}, '${student.First_Name} ${student.Last_Name}')">
                    ✅ Aktifleştir
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Load passive guardians
top.loadPassiveGuardians = async function(containerId = 'passiveGuardiansContainer', statsId = 'passiveGuardiansCount') {
    const container = document.getElementById(containerId);
    try {
        const response = await fetch(API_ENDPOINTS.passiveGuardians, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        top.displayPassiveGuardians(data.guardians, containerId);
        if (statsId) top.updateStats(statsId, data.guardians.length);
    } catch (error) {
        console.error('Error loading passive guardians:', error);
        container.innerHTML = `<div class="error">Hata: ${error.message}</div>`;
    }
}

top.displayPassiveGuardians = function(guardians, containerId = 'passiveGuardiansContainer') {
    const container = document.getElementById(containerId);
    if (!guardians || guardians.length === 0) {
        container.innerHTML = '<div class="no-data">Pasif veli bulunmuyor.</div>';
        return;
    }
    let html = '';
    guardians.forEach(guardian => {
        let studentText = '';
        if (guardian.Students && guardian.Students.length > 0) {
            const studentNames = guardian.Students.map(s => `${s.First_Name} ${s.Last_Name}`).join(', ');
            studentText = `<div class="user-details">👥 Öğrenciler: ${studentNames}</div>`;
        } else {
            studentText = '<div class="user-details">👥 Öğrenci yok</div>';
        }
        html += `
            <div class="user-item">
                <div class="user-name">${guardian.First_Name} ${guardian.Last_Name}</div>
                <div class="user-details">📧 Email: ${guardian.Email || 'Belirtilmemiş'}</div>
                <div class="user-details">📞 Telefon: ${guardian.Phone || 'Belirtilmemiş'}</div>
                ${studentText}
                <div class="status">❌ Durum: Pasif</div>
                <button class="reactivate-btn" onclick="reactivateUser('guardian', ${guardian.Guardian_ID}, '${guardian.First_Name} ${guardian.Last_Name}')">
                    ✅ Aktifleştir
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Load passive teachers
top.loadPassiveTeachers = async function(containerId = 'passiveTeachersContainer', statsId = 'passiveTeachersCount') {
    const container = document.getElementById(containerId);
    try {
        const response = await fetch(API_ENDPOINTS.passiveTeachers, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        top.displayPassiveTeachers(data.teachers, containerId);
        if (statsId) top.updateStats(statsId, data.teachers.length);
    } catch (error) {
        console.error('Error loading passive teachers:', error);
        container.innerHTML = `<div class="error">Hata: ${error.message}</div>`;
    }
}

top.displayPassiveTeachers = function(teachers, containerId = 'passiveTeachersContainer') {
    const container = document.getElementById(containerId);
    if (!teachers || teachers.length === 0) {
        container.innerHTML = '<div class="no-data">Pasif öğretmen bulunmuyor.</div>';
        return;
    }
    let html = '';
    teachers.forEach(teacher => {
        const startDate = teacher.StartDate ? new Date(teacher.StartDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
        const endDate = teacher.EndDate ? new Date(teacher.EndDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
        html += `
            <div class="user-item">
                <div class="user-name">${teacher.First_Name} ${teacher.Last_Name}</div>
                <div class="user-details">📧 Email: ${teacher.Email || 'Belirtilmemiş'}</div>
                <div class="user-details">📞 Telefon: ${teacher.Phone || 'Belirtilmemiş'}</div>
                <div class="user-details">🎓 Deneyim: ${teacher.Experience || '0'} yıl</div>
                <div class="user-details">📚 Kategori: ${teacher.CategoryName || 'Belirtilmemiş'}</div>
                <div class="user-details">📅 Başlangıç: ${startDate} | Bitiş: ${endDate}</div>
                <div class="status">❌ Durum: Pasif</div>
                <button class="reactivate-btn" onclick="reactivateUser('teacher', ${teacher.Teacher_ID}, '${teacher.First_Name} ${teacher.Last_Name}')">
                    ✅ Aktifleştir
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Reactivate user function
top.reactivateUser = async function(type, id, name) {
    if (!confirm(`"${name}" adlı ${type === 'student' ? 'öğrenciyi' : type === 'guardian' ? 'veliyi' : 'öğretmeni'} aktif hale getirmek istediğinizden emin misiniz?`)) {
        return;
    }
    try {
        const endpoint = API_ENDPOINTS[`reactivate${type.charAt(0).toUpperCase() + type.slice(1)}`];
        const response = await fetch(`${endpoint}/${id}`, {
            method: 'PUT',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Aktifleştirme işlemi başarısız');
        const result = await response.json();
        alert(result.message);
        // Reload the data
        if (type === 'student') top.loadPassiveStudents();
        else if (type === 'guardian') top.loadPassiveGuardians();
        else if (type === 'teacher') top.loadPassiveTeachers();
    } catch (error) {
        console.error('Error reactivating user:', error);
        alert('Aktifleştirme işlemi sırasında hata oluştu: ' + error.message);
    }
}

// Update statistics
top.updateStats = function(elementId, count) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = count;
    }
} 