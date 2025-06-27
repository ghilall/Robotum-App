// Teacher Management Functions for Admin Dashboard

// --- ACTIVE/PASSIVE TOGGLE LOGIC ---
window.showingPassiveTeachers = false;
window.allPassiveTeachersData = [];

window.toggleTeacherActivePassive = async function toggleTeacherActivePassive() {
  window.showingPassiveTeachers = !window.showingPassiveTeachers;
  const btnText = document.getElementById('toggleTeacherActivePassiveBtnText');
  if (window.showingPassiveTeachers) {
    btnText.textContent = 'Aktif Öğretmenleri Göster';
    await window.loadPassiveTeachers();
  } else {
    btnText.textContent = 'Pasif Öğretmenleri Göster';
    await window.loadTeacherList();
  }
};

// Add a global showError function if not defined
if (typeof window.showError !== 'function') {
  window.showError = function(message) {
    alert(message);
  };
}

document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleTeacherActivePassiveBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', window.toggleTeacherActivePassive);
  }
  // loadTeachers();
  // loadCourses();
  // loadAssignments(); // <-- Remove or comment out this line (undefined)
  // setupEventListeners();
  // loadCategories();
  // renderAssignmentsTable();
  if (typeof loadTeachers === 'function') loadTeachers();
  if (typeof loadCourses === 'function') loadCourses();
  if (typeof setupEventListeners === 'function') setupEventListeners();
  if (typeof loadCategories === 'function') loadCategories();
  if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
});

// --- PASSIVE TEACHERS LOGIC ---
window.loadPassiveTeachers = async function loadPassiveTeachers() {
  const container = document.getElementById('teacherListContainer');
  container.innerHTML = '<div class="loading">Pasif öğretmen listesi yükleniyor...</div>';
  try {
    const response = await fetch('/api/admin/passive-teachers', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Pasif öğretmen listesi alınamadı');
    }
    const data = await response.json();
    window.allPassiveTeachersData = data.teachers;
    window.displayPassiveTeachers(data.teachers);
    await window.loadTeacherSearchFilters();
  } catch (error) {
    console.error('Error loading passive teachers:', error);
    container.innerHTML = '<div class="error">Pasif öğretmen listesi yüklenirken hata oluştu.</div>';
  }
};

window.displayPassiveTeachers = function displayPassiveTeachers(teachers) {
  const container = document.getElementById('teacherListContainer');
  if (!teachers || teachers.length === 0) {
    container.innerHTML = '<div class="no-teachers">Pasif öğretmen bulunmuyor.</div>';
    return;
  }
  // Group teachers by category
  const grouped = {};
  teachers.forEach(teacher => {
    const category = teacher.CategoryName || 'Kategori Yok';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(teacher);
  });
  const sortedCategories = Object.keys(grouped).sort();
  let html = '';
  sortedCategories.forEach(category => {
    const sortedTeachers = grouped[category].sort((a, b) => {
      const expA = parseInt(a.Experience) || 0;
      const expB = parseInt(b.Experience) || 0;
      if (expA !== expB) return expB - expA;
      const nameA = `${a.First_Name} ${a.Last_Name}`.toLocaleLowerCase('tr-TR');
      const nameB = `${b.First_Name} ${b.Last_Name}`.toLocaleLowerCase('tr-TR');
      return nameA.localeCompare(nameB, 'tr-TR');
    });
    html += `
      <div class="course-group">
        <div class="course-title">${category}</div>
    `;
    sortedTeachers.forEach(teacher => {
      const startDate = teacher.StartDate ? new Date(teacher.StartDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
      const endDate = teacher.EndDate ? new Date(teacher.EndDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
      html += `
        <div class="teacher-item">
          <div class="teacher-info">
            <div class="teacher-name">${teacher.First_Name} ${teacher.Last_Name}</div>
            <div class="teacher-details">📧 ${teacher.Email || 'Belirtilmemiş'}</div>
            <div class="teacher-details">📞 ${teacher.Phone || 'Belirtilmemiş'}</div>
            <div class="teacher-details">🎓 Deneyim: ${teacher.Experience ? teacher.Experience : ''}</div>
            <div class="teacher-details">📅 Başlangıç: ${startDate} | Bitiş: ${endDate}</div>
            <div class="teacher-status">❌ Durum: Pasif</div>
          </div>
          <div class="teacher-actions">
            <button class="reactivate-btn" onclick="window.reactivateTeacher(${teacher.Teacher_ID}, '${teacher.First_Name} ${teacher.Last_Name}')">
              ✅ Aktifleştir
            </button>
            <button class="delete-btn" onclick="window.permanentlyDeleteTeacher(${teacher.Teacher_ID}, '${teacher.First_Name} ${teacher.Last_Name}')">
              🗑️ Kalıcı Sil
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
  });
  container.innerHTML = html;
};

window.searchPassiveTeachers = function searchPassiveTeachers() {
  const nameSearch = document.getElementById('teacherNameSearch').value.toLocaleLowerCase('tr-TR');
  const categorySearch = document.getElementById('teacherCategorySearch').value;
  const experienceSearch = document.getElementById('teacherExperienceSearch').value;
  if (!window.allPassiveTeachersData || window.allPassiveTeachersData.length === 0) {
    alert('Pasif öğretmen verisi henüz yüklenmedi.');
    return;
  }
  if (!nameSearch && !categorySearch && !experienceSearch) {
    window.displayPassiveTeacherSearchResults(0, nameSearch, categorySearch, experienceSearch);
    window.displayPassiveTeachers(window.allPassiveTeachersData);
    return;
  }
  const filteredTeachers = window.allPassiveTeachersData.filter(teacher => {
    let shouldInclude = true;
    if (nameSearch) {
      const fullName = `${teacher.First_Name} ${teacher.Last_Name}`.toLocaleLowerCase('tr-TR');
      if (!fullName.includes(nameSearch)) shouldInclude = false;
    }
    if (categorySearch && shouldInclude) {
      const teacherCategory = teacher.CategoryName || 'Kategori Yok';
      if (teacherCategory !== categorySearch) shouldInclude = false;
    }
    if (experienceSearch && shouldInclude) {
      if (teacher.Experience !== experienceSearch) shouldInclude = false;
    }
    return shouldInclude;
  });
  window.displayPassiveTeacherSearchResults(filteredTeachers.length, nameSearch, categorySearch, experienceSearch);
  window.displayPassiveTeachers(filteredTeachers);
};

window.displayPassiveTeacherSearchResults = function displayPassiveTeacherSearchResults(totalResults, nameSearch, categorySearch, experienceSearch) {
  const searchResultsDiv = document.getElementById('teacherSearchResults');
  let searchCriteria = [];
  if (nameSearch) searchCriteria.push(`Öğretmen Adı: "${nameSearch}"`);
  if (categorySearch) searchCriteria.push(`Kategori: "${categorySearch}"`);
  if (experienceSearch) searchCriteria.push(`Deneyim: "${experienceSearch}"`);
  if (searchCriteria.length > 0) {
    searchResultsDiv.innerHTML = `
      <div class="search-results">
        🔍 Arama kriterleri: ${searchCriteria.join(', ')} | 
        📊 Bulunan sonuç: ${totalResults} öğretmen
      </div>
    `;
    searchResultsDiv.style.display = 'block';
  } else {
    searchResultsDiv.style.display = 'none';
  }
};

window.clearPassiveTeacherSearch = function clearPassiveTeacherSearch() {
  document.getElementById('teacherNameSearch').value = '';
  document.getElementById('teacherCategorySearch').value = '';
  document.getElementById('teacherExperienceSearch').value = '';
  document.getElementById('teacherSearchResults').style.display = 'none';
  if (window.allPassiveTeachersData) {
    window.displayPassiveTeachers(window.allPassiveTeachersData);
  }
};

window.reactivateTeacher = async function reactivateTeacher(teacherId, teacherName) {
  if (confirm(`"${teacherName}" adlı öğretmeni aktif hale getirmek istediğinizden emin misiniz?`)) {
    try {
      const response = await fetch(`/api/admin/reactivate-teacher/${teacherId}`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Öğretmen aktifleştirilirken hata oluştu');
      }
      const result = await response.json();
      alert(result.message);
      window.loadPassiveTeachers();
    } catch (error) {
      console.error('Error reactivating teacher:', error);
      alert('Öğretmen aktifleştirilirken hata oluştu: ' + error.message);
    }
  }
};

window.permanentlyDeleteTeacher = async function permanentlyDeleteTeacher(teacherId, teacherName) {
  if (confirm(`"${teacherName}" adlı öğretmeni KALICI olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
    try {
      const response = await fetch(`/api/admin/permanently-delete-teacher/${teacherId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Öğretmen kalıcı olarak silinirken hata oluştu');
      }
      const result = await response.json();
      alert(result.message);
      window.loadPassiveTeachers();
    } catch (error) {
      console.error('Error permanently deleting teacher:', error);
      alert('Öğretmen kalıcı olarak silinirken hata oluştu: ' + error.message);
    }
  }
};

window.loadTeacherList = async function loadTeacherList() {
  const container = document.getElementById('teacherListContainer');
  container.innerHTML = '<div class="loading">Öğretmen listesi yükleniyor...</div>';
  try {
    const response = await fetch('/api/admin/teachers', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Öğretmen listesi alınamadı');
    }
    const data = await response.json();
    window.allTeachersData = data.teachers;
    window.displayTeacherList(data.teachers);
    await window.loadTeacherSearchFilters();
  } catch (error) {
    console.error('Error loading teachers:', error);
    container.innerHTML = '<div class="error">Öğretmen listesi yüklenirken hata oluştu.</div>';
  }
}

window.loadTeacherSearchFilters = async function loadTeacherSearchFilters() {
  try {
    const catResponse = await fetch('/api/categories', { credentials: 'include' });
    const catData = await catResponse.json();
    const categorySelect = document.getElementById('teacherCategorySearch');
    categorySelect.innerHTML = '<option value="">Tüm kategoriler</option>';
    catData.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.Category_Name;
      option.textContent = cat.Category_Name;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading teacher search filters:', error);
  }
}

window.displayTeacherList = function displayTeacherList(teachers) {
  const container = document.getElementById('teacherListContainer');
  if (!teachers || teachers.length === 0) {
    container.innerHTML = '<div class="no-students">Henüz öğretmen bulunmuyor.</div>';
    return;
  }
  const grouped = {};
  teachers.forEach(teacher => {
    const category = teacher.CategoryName || 'Kategori Yok';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(teacher);
  });
  const sortedCategories = Object.keys(grouped).sort();
  let html = '';
  sortedCategories.forEach(category => {
    const sortedTeachers = grouped[category].sort((a, b) => {
      const expA = parseInt(a.Experience) || 0;
      const expB = parseInt(b.Experience) || 0;
      if (expA !== expB) return expB - expA;
      const nameA = `${a.First_Name} ${a.Last_Name}`.toLocaleLowerCase('tr-TR');
      const nameB = `${b.First_Name} ${b.Last_Name}`.toLocaleLowerCase('tr-TR');
      return nameA.localeCompare(nameB, 'tr-TR');
    });
    html += `
      <div class="course-group">
        <div class="course-title">${category}</div>
    `;
    sortedTeachers.forEach(teacher => {
      const startDate = teacher.StartDate ? new Date(teacher.StartDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
      const endDate = teacher.EndDate ? new Date(teacher.EndDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
      html += `
        <div class="teacher-item">
          <div class="teacher-info">
            <div class="teacher-name">${teacher.First_Name} ${teacher.Last_Name}</div>
            <div class="teacher-details">📧 ${teacher.Email || 'Belirtilmemiş'}</div>
            <div class="teacher-details">📞 ${teacher.Phone || 'Belirtilmemiş'}</div>
            <div class="teacher-details">🎓 Deneyim: ${teacher.Experience ? teacher.Experience : ''}</div>
            <div class="teacher-details">📅 Başlangıç: ${startDate} | Bitiş: ${endDate}</div>
          </div>
          <div class="teacher-actions">
            <button class="edit-btn" onclick="editTeacher(${teacher.Teacher_ID}, '${teacher.First_Name} ${teacher.Last_Name}')">
              ✏️ Düzenle
            </button>
            <button class="delete-btn" onclick="deleteTeacher(${teacher.Teacher_ID}, '${teacher.First_Name} ${teacher.Last_Name}')">
              ⏸️ Pasife Al
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
  });
  container.innerHTML = html;
}

window.deleteTeacher = async function deleteTeacher(teacherId, teacherName) {
  if (confirm(`"${teacherName}" adlı öğretmeni pasife almak istediğinizden emin misiniz?`)) {
    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Öğretmen pasife alınırken hata oluştu');
      }
      const result = await response.json();
      alert(result.message);
      window.loadTeacherList();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert('Öğretmen pasife alınırken hata oluştu: ' + error.message);
    }
  }
}

window.editTeacher = function editTeacher(teacherId, teacherName) {
  // Find teacher data from the currently loaded list
  let teacher = null;
  if (window.allTeachersData) {
    teacher = window.allTeachersData.find(t => t.Teacher_ID === teacherId);
  }
  if (!teacher) {
    alert('Öğretmen verisi bulunamadı.');
    return;
  }
  document.getElementById('editTeacherFirstName').value = teacher.First_Name || '';
  document.getElementById('editTeacherLastName').value = teacher.Last_Name || '';
  document.getElementById('editTeacherEmail').value = teacher.Email || '';
  document.getElementById('editTeacherPhone').value = teacher.Phone || '';
  document.getElementById('editTeacherSalary').value = teacher.Salary || '';
  document.getElementById('editTeacherSSN').value = teacher.SocialSecurityNumber || '';
  document.getElementById('editTeacherEmploymentType').value = teacher.EmploymentType || '';
  document.getElementById('editTeacherStartDate').value = teacher.StartDate ? teacher.StartDate.split('T')[0] : '';
  document.getElementById('editTeacherEndDate').value = teacher.EndDate ? teacher.EndDate.split('T')[0] : '';
  document.getElementById('editTeacherExperience').value = teacher.Experience || '';
  window.editingTeacherId = teacherId;
  // Load categories into the category select
  fetch('/api/categories', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      const catSelect = document.getElementById('editTeacherCategoryId');
      catSelect.innerHTML = '<option value="">Kategori Seçiniz</option>';
      data.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.Category_ID;
        opt.textContent = cat.Category_Name;
        catSelect.appendChild(opt);
      });
      if (teacher.Category_ID) catSelect.value = teacher.Category_ID;
    });
  document.getElementById('editTeacherModal').style.display = 'flex';
}

// Modal open/close logic for edit teacher
const editTeacherModal = document.getElementById('editTeacherModal');
const closeEditTeacherModalBtn = document.getElementById('closeEditTeacherModalBtn');
if (editTeacherModal && closeEditTeacherModalBtn) {
  closeEditTeacherModalBtn.addEventListener('click', () => {
    editTeacherModal.style.display = 'none';
  });
  window.addEventListener('click', (e) => {
    if (e.target === editTeacherModal) editTeacherModal.style.display = 'none';
  });
}

// Submit edit teacher form
const editTeacherForm = document.getElementById('editTeacherForm');
if (editTeacherForm) {
  editTeacherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teacherId = window.editingTeacherId;
    const data = {
      firstName: editTeacherForm.editTeacherFirstName.value.trim(),
      lastName: editTeacherForm.editTeacherLastName.value.trim(),
      email: editTeacherForm.editTeacherEmail.value.trim(),
      phone: editTeacherForm.editTeacherPhone.value.trim(),
      salary: editTeacherForm.editTeacherSalary.value.trim() || null,
      socialSecurityNumber: editTeacherForm.editTeacherSSN.value.trim() || null,
      employmentType: editTeacherForm.editTeacherEmploymentType.value || null,
      categoryId: editTeacherForm.editTeacherCategoryId.value || null,
      startDate: editTeacherForm.editTeacherStartDate.value || null,
      endDate: editTeacherForm.editTeacherEndDate.value || null,
      experience: editTeacherForm.editTeacherExperience.value || null
    };
    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok) {
        alert('Öğretmen bilgileri güncellendi.');
        editTeacherModal.style.display = 'none';
        if (typeof window.loadTeacherList === 'function') window.loadTeacherList();
      } else {
        alert(result.error || 'Güncelleme başarısız.');
      }
    } catch (err) {
      alert('Sunucu hatası: ' + err.message);
    }
  });
}

window.searchTeachers = function searchTeachers() {
  if (window.showingPassiveTeachers) {
    window.searchPassiveTeachers();
    return;
  }
  const nameSearch = document.getElementById('teacherNameSearch').value.toLocaleLowerCase('tr-TR');
  const categorySearch = document.getElementById('teacherCategorySearch').value;
  const experienceSearch = document.getElementById('teacherExperienceSearch').value;
  if (!window.allTeachersData) {
    alert('Öğretmen verisi henüz yüklenmedi.');
    return;
  }
  if (!nameSearch && !categorySearch && !experienceSearch) {
    window.displayTeacherSearchResults(0, nameSearch, categorySearch, experienceSearch);
    window.displayTeacherList(window.allTeachersData);
    return;
  }
  const filteredTeachers = window.allTeachersData.filter(teacher => {
    let shouldInclude = true;
    if (nameSearch) {
      const fullName = `${teacher.First_Name} ${teacher.Last_Name}`.toLocaleLowerCase('tr-TR');
      if (!fullName.includes(nameSearch)) shouldInclude = false;
    }
    if (categorySearch && shouldInclude) {
      const teacherCategory = teacher.CategoryName || 'Kategori Yok';
      if (teacherCategory !== categorySearch) shouldInclude = false;
    }
    if (experienceSearch && shouldInclude) {
      if (teacher.Experience !== experienceSearch) shouldInclude = false;
    }
    return shouldInclude;
  });
  window.displayTeacherSearchResults(filteredTeachers.length, nameSearch, categorySearch, experienceSearch);
  window.displayTeacherList(filteredTeachers);
}

window.displayTeacherSearchResults = function displayTeacherSearchResults(totalResults, nameSearch, categorySearch, experienceSearch) {
  const searchResultsDiv = document.getElementById('teacherSearchResults');
  let searchCriteria = [];
  if (nameSearch) searchCriteria.push(`Öğretmen Adı: "${nameSearch}"`);
  if (categorySearch) searchCriteria.push(`Kategori: "${categorySearch}"`);
  if (experienceSearch) searchCriteria.push(`Deneyim: "${experienceSearch}"`);
  if (searchCriteria.length > 0) {
    searchResultsDiv.innerHTML = `
      <div class="search-results">
        🔍 Arama kriterleri: ${searchCriteria.join(', ')} | 
        📊 Bulunan sonuç: ${totalResults} öğretmen
      </div>
    `;
    searchResultsDiv.style.display = 'block';
  } else {
    searchResultsDiv.style.display = 'none';
  }
}

window.clearTeacherSearch = function clearTeacherSearch() {
  if (window.showingPassiveTeachers) {
    window.clearPassiveTeacherSearch();
    return;
  }
  document.getElementById('teacherNameSearch').value = '';
  document.getElementById('teacherCategorySearch').value = '';
  document.getElementById('teacherExperienceSearch').value = '';
  document.getElementById('teacherSearchResults').style.display = 'none';
  if (window.allTeachersData) {
    window.displayTeacherList(window.allTeachersData);
  }
}

// Modal açma/kapama ve form işlemleri
window.initTeacherModal = function initTeacherModal() {
  let teacherIti;
  const openTeacherModalBtn = document.getElementById('openTeacherModalBtn');
  const teacherModal = document.getElementById('teacherModal');
  const closeTeacherModalBtn = document.getElementById('closeTeacherModalBtn');
  const teacherForm = document.getElementById('registerTeacherForm');
  const teacherPasswordError = document.getElementById('teacherPasswordError');
  const teacherEmailError = document.getElementById('teacherEmailError');
  const teacherRegisterError = document.getElementById('teacherRegisterError');
  const teacherPhoneError = document.getElementById('teacherPhoneError');

  if (openTeacherModalBtn && teacherModal && closeTeacherModalBtn) {
    openTeacherModalBtn.addEventListener('click', () => {
      teacherModal.style.display = 'flex';
      setTimeout(() => {
        const teacherPhoneInput = document.getElementById('teacherPhone');
        if (teacherPhoneInput) {
          if (teacherIti) teacherIti.destroy();
          teacherIti = window.intlTelInput(teacherPhoneInput, {
            initialCountry: 'tr',
            separateDialCode: true,
            nationalMode: true,
            autoPlaceholder: 'polite',
            formatOnDisplay: true,
            utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.5.2/build/js/utils.js'
          });
        }
        // Şifre göster/gizle butonlarını her açılışta tekrar bağla
        document.querySelectorAll('#teacherModal .togglePassword').forEach(button => {
          button.onclick = function() {
            const input = button.parentElement.querySelector('input[type="password"], input[type="text"]');
            if (!input) return;
            if (input.type === "password") {
              input.type = "text";
              button.textContent = "Gizle";
            } else {
              input.type = "password";
              button.textContent = "Göster";
            }
          };
        });
      }, 0);
    });
    closeTeacherModalBtn.addEventListener('click', () => {
      teacherModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
      if (e.target === teacherModal) teacherModal.style.display = 'none';
    });
  }

  if (teacherForm) {
    teacherForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      teacherPasswordError.style.display = 'none';
      teacherEmailError.style.display = 'none';
      teacherRegisterError.style.display = 'none';
      teacherPhoneError.style.display = 'none';
      if (!teacherIti || !teacherIti.isValidNumber()) {
        teacherPhoneError.style.display = 'block';
        return;
      }
      const password = teacherForm.teacherPassword.value;
      const confirmPassword = teacherForm.teacherConfirmPassword.value;
      if (password !== confirmPassword) {
        teacherPasswordError.style.display = 'block';
        return;
      }
      const data = {
        firstName: teacherForm.teacherFirstName.value,
        lastName: teacherForm.teacherLastName.value,
        phone: teacherIti.getNumber(),
        email: teacherForm.teacherEmail.value,
        password: password,
        salary: teacherForm.teacherSalary.value,
        socialSecurityNumber: teacherForm.teacherSSN.value,
        employmentType: teacherForm.teacherEmploymentType.value,
        categoryId: teacherForm.teacherCategoryId.value,
        startDate: teacherForm.teacherStartDate.value,
        endDate: teacherForm.teacherEndDate.value,
        experience: teacherForm.teacherExperience.value
      };
      try {
        const response = await fetch('/register_teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
          if (result.error && result.error.toLowerCase().includes('email')) {
            teacherEmailError.style.display = 'block';
          } else {
            teacherRegisterError.textContent = result.error || 'Kayıt başarısız oldu.';
            teacherRegisterError.style.display = 'block';
          }
        } else {
          teacherModal.style.display = 'none';
        }
      } catch (err) {
        teacherRegisterError.textContent = 'Bağlantı hatası. Lütfen daha sonra tekrar deneyin.';
        teacherRegisterError.style.display = 'block';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  window.initTeacherModal();
  window.loadTeacherList();
});
//öğretmen atama için kategori yükleme
window.loadCategories = async function loadCategories() {
  try {
    const response = await fetch('/api/categories', { credentials: 'include' });
    if (!response.ok) throw new Error('Kategoriler alınamadı');
    const data = await response.json();
    const categorySelect = document.getElementById('teacherCategoryFilter');
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">Tümü</option>';
      data.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.Category_ID;
        option.textContent = cat.Category_Name;
        categorySelect.appendChild(option);
      });
    }
  } catch (error) {
    showError('Kategoriler yüklenirken hata oluştu: ' + error.message);
  }
}

    // Load teachers for dropdown
    async function loadTeachers() {
      try {
        const response = await fetch('/api/admin/teachers', { credentials: 'include' });
        if (!response.ok) throw new Error('Öğretmenler alınamadı');
        const data = await response.json();
        window.allAssignmentTeachers = data.teachers; // Store globally
        window.populateExperienceDropdown(window.allAssignmentTeachers, 'teacherExperienceFilter');
        populateTeacherDropdown(); // Populate initially
        // Optionally, also populate filterTeacher if needed
      } catch (error) {
        showError('Öğretmenler yüklenirken hata oluştu: ' + error.message);
      }
    }

    // Populate teacher dropdown based on selected category and experience
    function populateTeacherDropdown() {
      const teacherSelect = document.getElementById('teacherId');
      if (!teacherSelect) return;
      const categoryIdElem = document.getElementById('teacherCategoryFilter');
      const experienceElem = document.getElementById('teacherExperienceFilter');
      const categoryId = categoryIdElem ? categoryIdElem.value : '';
      const experience = experienceElem ? experienceElem.value : '';
      teacherSelect.innerHTML = '<option value="">Öğretmen seçiniz</option>';
      let filtered = window.allAssignmentTeachers || [];
      if (categoryId) {
        filtered = filtered.filter(t => String(t.Category_ID) === String(categoryId));
      }
      if (experience) {
        filtered = filtered.filter(t => t.Experience === experience);
      }
      filtered.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.Teacher_ID;
        option.textContent = `${teacher.First_Name} ${teacher.Last_Name}`;
        teacherSelect.appendChild(option);
      });
    }

    // Add event listeners for filtering
    const teacherCategoryFilter = document.getElementById('teacherCategoryFilter');
    if (teacherCategoryFilter) {
      teacherCategoryFilter.addEventListener('change', populateTeacherDropdown);
    }
    const teacherExperienceFilter = document.getElementById('teacherExperienceFilter');
    if (teacherExperienceFilter) {
      teacherExperienceFilter.addEventListener('change', populateTeacherDropdown);
    }

    // Load courses for dropdown
    async function loadCourses() {
      try {
        const response = await fetch('/api/courses', { credentials: 'include' });
        if (!response.ok) throw new Error('Kurslar alınamadı');
        
        const data = await response.json();
        window.courses = data.courses;
        
        const courseSelect = document.getElementById('courseId');
        const filterCourse = document.getElementById('filterCourse');
        
        if (courseSelect) courseSelect.innerHTML = '';
        if (filterCourse) filterCourse.innerHTML = '';
        
        data.courses.forEach(course => {
          const option = document.createElement('option');
          option.value = course.Course_ID;
          option.textContent = course.Course_Name;
          if (courseSelect) courseSelect.appendChild(option.cloneNode(true));
          if (filterCourse) filterCourse.appendChild(option);
        });
      } catch (error) {
        showError('Kurslar yüklenirken hata oluştu: ' + error.message);
      }
    }
  // Render assignments table
  function renderAssignmentsTable() {
    const tbody = document.getElementById('assignmentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!Array.isArray(assignments) || assignments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6b7280;">Atama bulunamadı</td></tr>';
      return;
    }

    assignments.forEach(group => {
      const rolesArr = Array.isArray(group.roles) ? group.roles : [];
      const asil = rolesArr.find(r => r.role === 'Asıl') || {};
      const yardimci = rolesArr.find(r => r.role === 'Yardımcı') || {};
      const stajyer = rolesArr.find(r => r.role === 'Stajyer') || {};

      // Teacher names or 'Atanmamış'
      const asilName = asil.assignment ? `${asil.assignment.Teacher_First_Name} ${asil.assignment.Teacher_Last_Name}` : 'Atanmamış';
      const yardimciName = yardimci.assignment ? `${yardimci.assignment.Teacher_First_Name} ${yardimci.assignment.Teacher_Last_Name}` : 'Atanmamış';
      const stajyerName = stajyer.assignment ? `${stajyer.assignment.Teacher_First_Name} ${stajyer.assignment.Teacher_Last_Name}` : 'Atanmamış';

      // Delete buttons (if assignment exists)
      const asilDelete = asil.assignment ? `<button class=\"delete-btn\" onclick=\"deleteAssignment(${asil.assignment.Program_Teacher_ID})\">Sil</button>` : '';
      const yardimciDelete = yardimci.assignment ? `<button class=\"delete-btn\" onclick=\"deleteAssignment(${yardimci.assignment.Program_Teacher_ID})\">Sil</button>` : '';
      const stajyerDelete = stajyer.assignment ? `<button class=\"delete-btn\" onclick=\"deleteAssignment(${stajyer.assignment.Program_Teacher_ID})\">Sil</button>` : '';
      const islemCell = [asilDelete, yardimciDelete, stajyerDelete].filter(Boolean).join(' ');

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${group.Course_Name} (${group.Level || ''})</td>
        <td>${asilName}</td>
        <td>${yardimciName}</td>
        <td>${stajyerName}</td>
        <td>${new Date(group.Date).toLocaleDateString('tr-TR')}</td>
        <td>${islemCell}</td>
      `;
      tbody.appendChild(row);
    });
  }

// Global function to populate experience dropdown for teacher assignment page
window.populateExperienceDropdown = function populateExperienceDropdown(teachers, dropdownId = 'teacherExperienceFilter') {
  const experienceSelect = document.getElementById(dropdownId);
  if (!experienceSelect) return;
  const experiences = Array.from(new Set(teachers.map(t => t.Experience).filter(Boolean)));
  experienceSelect.innerHTML = '<option value="">Tümü</option>';
  experiences.forEach(exp => {
    const option = document.createElement('option');
    option.value = exp;
    option.textContent = exp;
    experienceSelect.appendChild(option);
  });
};
