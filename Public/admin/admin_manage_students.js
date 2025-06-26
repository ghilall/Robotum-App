// Student Management Functions for Admin Dashboard
window.loadStudentList = async function loadStudentList() {
    const container = document.getElementById('studentListContainer');
    container.innerHTML = '<div class="loading">Öğrenci listesi yükleniyor...</div>';

    try {
      const response = await fetch('/api/admin/student-list', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Öğrenci listesi alınamadı');
      }
      
      const data = await response.json();
      console.log('Received student data:', data);
      
      // Debug: Check time formats
      if (data.grouped) {
        for (const courseName in data.grouped) {
          const students = data.grouped[courseName];
          for (const studentId in students) {
            const student = students[studentId];
            if (student.program && student.program.length > 0) {
              console.log('Sample program times:', student.program[0]);
              break;
            }
          }
          break;
        }
      }
      // Store the original data for search functionality
      window.allStudentsData = data.grouped;
      window.displayStudentList(data.grouped);
      
      // Load search filter options
      await window.loadSearchFilters();
    } catch (error) {
      console.error('Error loading students:', error);
      container.innerHTML = '<div class="error">Öğrenci listesi yüklenirken hata oluştu.</div>';
    }
}

// Öğrenci düzenleme için global değişken
// TODO: Implement editStudent and deleteStudent modals/pages if needed

// Ensure deleteStudent is global for button onclick
window.deleteStudent = async function deleteStudent(studentId, studentName) {
  if (confirm(`"${studentName}" adlı öğrenciyi pasife almak istediğinizden emin misiniz?`)) {
    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Öğrenci pasife alınırken hata oluştu');
      }
      const result = await response.json();
      alert(result.message);
      if (typeof window.loadStudentList === 'function') window.loadStudentList();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Öğrenci pasife alınırken hata oluştu: ' + error.message);
    }
  }
}

// --- ACTIVE/PASSIVE TOGGLE LOGIC ---
window.showingPassiveStudents = false;
window.allPassiveStudentsData = [];

window.toggleStudentActivePassive = async function toggleStudentActivePassive() {
  window.showingPassiveStudents = !window.showingPassiveStudents;
  const btnText = document.getElementById('toggleStudentActivePassiveBtnText');
  if (window.showingPassiveStudents) {
    btnText.textContent = 'Aktif Öğrencileri Göster';
    await window.loadPassiveStudents();
  } else {
    btnText.textContent = 'Pasif Öğrencileri Göster';
    await window.loadStudentList();
  }
};

document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleStudentActivePassiveBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', window.toggleStudentActivePassive);
  }
});

// --- PASSIVE STUDENTS LOGIC ---
window.loadPassiveStudents = async function loadPassiveStudents() {
  const container = document.getElementById('studentListContainer');
  container.innerHTML = '<div class="loading">Pasif öğrenci listesi yükleniyor...</div>';
  try {
    const response = await fetch('/api/admin/passive-students', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Pasif öğrenci listesi alınamadı');
    }
    const data = await response.json();
    window.allPassiveStudentsData = data.students;
    window.displayPassiveStudents(data.students);
    await window.loadSearchFilters();
  } catch (error) {
    console.error('Error loading passive students:', error);
    container.innerHTML = '<div class="error">Pasif öğrenci listesi yüklenirken hata oluştu.</div>';
  }
};

window.displayPassiveStudents = function displayPassiveStudents(students) {
  const container = document.getElementById('studentListContainer');
  if (!students || students.length === 0) {
    container.innerHTML = '<div class="no-students">Pasif öğrenci bulunmuyor.</div>';
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
      <div class="student-item">
        <div class="student-info">
          <div class="student-name">${student.First_Name} ${student.Last_Name}</div>
          <div class="student-details">📧 ${student.Email || 'Belirtilmemiş'}</div>
          <div class="student-details">📞 ${student.Phone || 'Belirtilmemiş'}</div>
          <div class="student-details">👥 Veli: ${guardianName}</div>
          <div class="student-details">📅 Kayıt Tarihi: ${createdDate}</div>
          <div class="student-details">🕒 Son Giriş: ${lastLogin}</div>
          <div class="student-status">❌ Durum: Pasif</div>
        </div>
        <div class="student-actions">
          <button class="reactivate-btn" onclick="window.reactivateStudent(${student.Student_ID}, '${student.First_Name} ${student.Last_Name}')">
            ✅ Aktifleştir
          </button>
          <button class="delete-btn" onclick="window.permanentlyDeleteStudent(${student.Student_ID}, '${student.First_Name} ${student.Last_Name}')">
            🗑️ Kalıcı Sil
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
};

// --- STUDENT SEARCH LOGIC MOVED FROM admin_dashboard.html ---
window.searchStudents = function searchStudents() {
  if (window.showingPassiveStudents) {
    window.searchPassiveStudents();
    return;
  }
  const categorySearch = document.getElementById('categorySearch').value;
  const courseSearch = document.getElementById('courseSearch').value;
  const daySearch = document.getElementById('daySearch').value;
  const nameSearch = document.getElementById('nameSearch').value.toLocaleLowerCase('tr-TR');
  if (!window.allStudentsData) {
    alert('Öğrenci verisi henüz yüklenmedi.');
    return;
  }
  if (!categorySearch && !courseSearch && !daySearch && !nameSearch) {
    window.displaySearchResults(0, categorySearch, '', courseSearch, '', daySearch);
    window.displayStudentList(window.allStudentsData);
    return;
  }
  const filteredData = {};
  let totalResults = 0;
  for (const courseName in window.allStudentsData) {
    const students = window.allStudentsData[courseName];
    const filteredStudents = {};
    for (const studentId in students) {
      const student = students[studentId];
      let shouldInclude = true;
      if (courseSearch) {
        const courseSelect = document.getElementById('courseSearch');
        const selectedCourseName = courseSelect.options[courseSelect.selectedIndex].text;
        if (courseName !== selectedCourseName) {
          shouldInclude = false;
        }
      }
      if (nameSearch && shouldInclude) {
        const fullName = `${student.firstName} ${student.lastName}`.toLocaleLowerCase('tr-TR');
        if (!fullName.includes(nameSearch)) {
          shouldInclude = false;
        }
      }
      if (shouldInclude && student.program && student.program.length > 0) {
        const matchingPrograms = student.program.filter(program => {
          let matches = true;
          if (daySearch && program.day !== daySearch) {
            matches = false;
          }
          return matches;
        });
        if (daySearch && matchingPrograms.length === 0) {
          shouldInclude = false;
        }
      } else if (daySearch) {
        shouldInclude = false;
      }
      if (shouldInclude) {
        filteredStudents[studentId] = student;
        totalResults++;
      }
    }
    if (Object.keys(filteredStudents).length > 0) {
      filteredData[courseName] = filteredStudents;
    }
  }
  window.displaySearchResults(totalResults, categorySearch, '', courseSearch, '', daySearch);
  window.displayStudentList(filteredData);
};

window.displaySearchResults = function displaySearchResults(totalResults, categorySearch, levelSearch, courseSearch, hoursSearch, daySearch) {
  const searchResultsDiv = document.getElementById('searchResults');
  let searchCriteria = [];
  if (categorySearch) {
    const categorySelect = document.getElementById('categorySearch');
    const categoryText = categorySelect.options[categorySelect.selectedIndex].text;
    searchCriteria.push(`Kategori: "${categoryText}"`);
  }
  if (courseSearch) {
    const courseSelect = document.getElementById('courseSearch');
    const courseText = courseSelect.options[courseSelect.selectedIndex].text;
    searchCriteria.push(`Kurs: "${courseText}"`);
  }
  if (daySearch) searchCriteria.push(`Gün: "${daySearch}"`);
  if (nameSearch) searchCriteria.push(`Ad: "${nameSearch}"`);
  if (searchCriteria.length > 0) {
    searchResultsDiv.innerHTML = `
      <div class="search-results">
        🔍 Arama kriterleri: ${searchCriteria.join(', ')} | 
        📊 Bulunan sonuç: ${totalResults} öğrenci
      </div>
    `;
    searchResultsDiv.style.display = 'block';
  } else {
    searchResultsDiv.style.display = 'none';
  }
};

window.clearSearch = function clearSearch() {
  document.getElementById('categorySearch').value = '';
  document.getElementById('courseSearch').value = '';
  document.getElementById('daySearch').value = '';
  document.getElementById('nameSearch').value = '';
  document.getElementById('searchResults').style.display = 'none';
  window.loadAllCourses();
  if (window.allStudentsData) {
    window.displayStudentList(window.allStudentsData);
  }
};

// Add event listeners for search inputs when DOM is loaded

document.addEventListener('DOMContentLoaded', function() {
  const searchInputs = ['categorySearch', 'courseSearch', 'daySearch', 'nameSearch'];
  searchInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          window.searchStudents();
        }
      });
    }
  });
});

window.loadSearchFilters = async function loadSearchFilters() {
  try {
    const catResponse = await fetch('/api/categories', { credentials: 'include' });
    const catData = await catResponse.json();
    const categorySelect = document.getElementById('categorySearch');
    catData.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.Category_ID;
      option.textContent = cat.Category_Name;
      categorySelect.appendChild(option);
    });
    await window.loadAllCourses();
    document.getElementById('categorySearch').addEventListener('change', window.updateCourseOptions);
  } catch (error) {
    console.error('Error loading search filters:', error);
  }
}

window.loadAllCourses = async function loadAllCourses() {
  const courseSelect = document.getElementById('courseSearch');
  courseSelect.innerHTML = '<option value="">Tüm kurslar</option>';
  try {
    const response = await fetch('/api/courses', { credentials: 'include' });
    const data = await response.json();
    data.courses.forEach(course => {
      const option = document.createElement('option');
      option.value = course.Course_ID;
      option.textContent = course.Course_Name;
      courseSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading courses:', error);
  }
}

window.updateCourseOptions = async function updateCourseOptions() {
  const categoryId = document.getElementById('categorySearch').value;
  const courseSelect = document.getElementById('courseSearch');
  courseSelect.innerHTML = '<option value="">Tüm kurslar</option>';
  if (!categoryId) {
    await window.loadAllCourses();
    return;
  }
  try {
    const params = new URLSearchParams();
    params.append('categoryId', categoryId);
    const response = await fetch(`/api/courses?${params.toString()}`, { credentials: 'include' });
    const data = await response.json();
    data.courses.forEach(course => {
      const option = document.createElement('option');
      option.value = course.Course_ID;
      option.textContent = course.Course_Name;
      courseSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading filtered courses:', error);
  }
}

window.loadStudentModalCategoriesAndLevels = async function loadStudentModalCategoriesAndLevels() {
  const catSelect = document.getElementById('categoryFilter');
  catSelect.innerHTML = '<option value="">Tümü</option>';
  try {
    const [catRes, levelRes] = await Promise.all([
      fetch('/api/categories', { credentials: 'include' }),
      fetch('/api/course-levels', { credentials: 'include' })
    ]);
    const cats = await catRes.json();
    const levels = await levelRes.json();
    if (cats.categories && cats.categories.length > 0) {
      cats.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.Category_ID;
        opt.textContent = c.Category_Name;
        catSelect.appendChild(opt);
      });
    }
    const levelSelect = document.getElementById('levelFilter');
    levelSelect.innerHTML = '<option value="">Tümü</option>';
    levels.levels.forEach(lvl => {
      const opt = document.createElement('option');
      opt.value = lvl;
      opt.textContent = lvl;
      levelSelect.appendChild(opt);
    });
  } catch (err) {
    catSelect.innerHTML = '<option value="">Kategoriler yüklenemedi</option>';
    console.error('Kategoriler yüklenemedi:', err);
  }
}

async function loadStudentModalCourses(categoryId = "") {
  const courseSelect = document.getElementById('courseId');
  courseSelect.innerHTML = '<option value=\"\">Yükleniyor...</option>';
  let url = '/api/courses';
  if (categoryId) {
    url += '?categoryId=' + encodeURIComponent(categoryId);
  }
  try {
    const response = await fetch(url, { credentials: 'include' });
    const data = await response.json();
    courseSelect.innerHTML = '<option value=\"\">Kurs seçiniz</option>';
    data.courses.forEach(course => {
      const opt = document.createElement('option');
      opt.value = course.Course_ID;
      opt.textContent = course.Course_Name;
      courseSelect.appendChild(opt);
    });
  } catch (err) {
    courseSelect.innerHTML = '<option value=\"\">Kurslar yüklenemedi</option>';
  }
}

// Modal açma/kapama ve form reset işlemlerini DOMContentLoaded ile sarmala

document.addEventListener('DOMContentLoaded', function() {
  const openStudentModalBtn = document.getElementById('openStudentModalBtn');
  const studentModal = document.getElementById('studentModal');
  const closeStudentModalBtn = document.getElementById('closeStudentModalBtn');
  const form = document.getElementById('studentRegistrationForm');
  const categoryFilter = document.getElementById('categoryFilter');
  const levelFilter = document.getElementById('levelFilter');
  const courseSelect = document.getElementById('courseId');
  const programSelect = document.getElementById('programId');
  const guardianSearch = document.getElementById('guardianSearch');
  const guardianResults = document.getElementById('guardianResults');
  const guardianIdInput = document.getElementById('guardianId');

  // Modal open/close
  if (openStudentModalBtn && studentModal && closeStudentModalBtn && form) {
    openStudentModalBtn.addEventListener('click', () => {
      document.querySelector('#studentModal h1').textContent = 'Öğrenci Kayıt Formu';
      form.reset();
      guardianIdInput.value = '';
      guardianSearch.value = '';
      studentModal.style.display = 'flex';
      loadCategoriesAndLevels();
      programSelect.innerHTML = '<option value="">Saat seçiniz</option>';
    });
    closeStudentModalBtn.addEventListener('click', () => {
      studentModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
      if (e.target === studentModal) studentModal.style.display = 'none';
    });
  }

  // Load categories and levels, then all courses
  async function loadCategoriesAndLevels() {
    categoryFilter.innerHTML = '<option value="">Tümü</option>';
    try {
      const [catRes, levelRes] = await Promise.all([
        fetch('/api/categories', { credentials: 'include' }),
        fetch('/api/course-levels', { credentials: 'include' })
      ]);
      const cats = await catRes.json();
      const levels = await levelRes.json();
      if (cats.categories && cats.categories.length > 0) {
        cats.categories.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.Category_ID;
          opt.textContent = c.Category_Name;
          categoryFilter.appendChild(opt);
        });
      }
      levelFilter.innerHTML = '<option value="">Tümü</option>';
      levels.levels.forEach(lvl => {
        const opt = document.createElement('option');
        opt.value = lvl;
        opt.textContent = lvl;
        levelFilter.appendChild(opt);
      });
      await loadAllCourses();
    } catch (err) {
      categoryFilter.innerHTML = '<option value="">Kategoriler yüklenemedi</option>';
      console.error('Kategoriler yüklenemedi:', err);
    }
  }

  // Fetch and filter courses based on selected category & level
  async function updateCourseOptions() {
    const categoryId = categoryFilter.value;
    const level = levelFilter.value;
    courseSelect.innerHTML = '<option value="">Yükleniyor...</option>';
    try {
      const params = new URLSearchParams();
      if (categoryId) params.append('categoryId', categoryId);
      if (level) params.append('level', level);
      const response = await fetch(`/api/courses?${params.toString()}`, { credentials: 'include' });
      const data = await response.json();
      courseSelect.innerHTML = '';
      if (!data.courses || data.courses.length === 0) {
        courseSelect.innerHTML = '<option value="">Uygun kurs bulunamadı</option>';
      } else {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Kurs seçiniz';
        courseSelect.appendChild(defaultOption);
        data.courses.forEach(course => {
          const option = document.createElement('option');
          option.value = course.Course_ID;
          option.textContent = course.Course_Name;
          courseSelect.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Kurslar yüklenemedi:', err);
      courseSelect.innerHTML = '<option value="">Kurslar alınamadı</option>';
    }
    programSelect.innerHTML = '<option value="">Saat seçiniz</option>';
  }

  // Load all courses without filters
  async function loadAllCourses() {
    courseSelect.innerHTML = '<option value="">Yükleniyor...</option>';
    try {
      const response = await fetch('/api/courses', { credentials: 'include' });
      const data = await response.json();
      courseSelect.innerHTML = '';
      if (!data.courses || data.courses.length === 0) {
        courseSelect.innerHTML = '<option value="">Kurs bulunamadı</option>';
      } else {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Kurs seçiniz';
        courseSelect.appendChild(defaultOption);
        data.courses.forEach(course => {
          const option = document.createElement('option');
          option.value = course.Course_ID;
          option.textContent = course.Course_Name;
          courseSelect.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Kurslar yüklenemedi:', err);
      courseSelect.innerHTML = '<option value="">Kurslar alınamadı</option>';
    }
    programSelect.innerHTML = '<option value="">Saat seçiniz</option>';
  }

  // Update courses when category or level changes
  categoryFilter.addEventListener('change', updateCourseOptions);
  levelFilter.addEventListener('change', updateCourseOptions);

  // Load program hours when a course is selected
  courseSelect.addEventListener('change', async function () {
    const courseId = this.value;
    programSelect.innerHTML = '';
    if (!courseId) {
      programSelect.innerHTML = '<option value="">Saat seçiniz</option>';
      return;
    }
    try {
      const res = await fetch(`/api/programs/by-course/${courseId}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.programs || data.programs.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'Saat bulunamadı';
        option.disabled = true;
        programSelect.appendChild(option);
        return;
      }
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Program saati seçiniz';
      defaultOption.disabled = true;
      defaultOption.selected = true;
      programSelect.appendChild(defaultOption);
      data.programs.forEach(p => {
        const current = parseInt(p.Current_Count);
        const capacity = parseInt(p.Capacity);
        const isFull = current >= capacity;
        const option = document.createElement('option');
        option.value = p.Program_ID;
        option.textContent = `${p.Day} - ${p.Start_Time.slice(0, 5)}-${p.End_Time.slice(0, 5)} (${current}/${capacity})`;
        if (isFull) {
          option.disabled = true;
          option.style.color = 'red';
          option.textContent += ' (DOLU)';
        }
        programSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Saatler alınamadı:', err);
      programSelect.innerHTML = '<option value="">Saatler alınamadı</option>';
    }
  });

  // Guardian live search
  guardianSearch.addEventListener('input', async () => {
    const query = guardianSearch.value.trim();
    const queryNormalized = query.toLocaleLowerCase('tr');
    guardianResults.innerHTML = '';
    guardianResults.style.display = 'none';
    if (query.length < 2) return;
    try {
      const response = await fetch(`/api/guardians/search?query=${encodeURIComponent(queryNormalized)}`, { credentials: 'include' });
      const results = await response.json();
      if (results.length === 0) {
        guardianResults.innerHTML = '<div>Veli bulunamadı</div>';
      } else {
        results.forEach(guardian => {
          const div = document.createElement('div');
          div.textContent = `${guardian.First_Name} ${guardian.Last_Name} (${guardian.Email})`;
          div.dataset.id = guardian.Guardian_ID;
          div.addEventListener('click', () => {
            guardianSearch.value = `${guardian.First_Name} ${guardian.Last_Name}`;
            guardianIdInput.value = guardian.Guardian_ID;
            guardianResults.style.display = 'none';
          });
          guardianResults.appendChild(div);
        });
      }
      guardianResults.style.display = 'block';
    } catch (err) {
      console.error('Veli arama hatası:', err);
    }
  });
  document.addEventListener('click', e => {
    if (!guardianSearch.contains(e.target) && !guardianResults.contains(e.target)) {
      guardianResults.style.display = 'none';
    }
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const birthDate = form.birthDate.value;
    const courseId = form.courseId.value;
    const guardianId = form.guardianId.value;
    const programId = form.programId.value;
    if (!guardianId) {
      alert('Lütfen bir veli seçiniz.');
      return;
    }
    if (!programId) {
      alert('Lütfen bir program saati seçiniz.');
      return;
    }
    const data = { firstName, lastName, birthDate, courseId, guardianId, selectedProgramIds: [programId] };
    fetch('/student_register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
      .then(response => response.json())
      .then(result => {
        if (result.message) {
          alert(result.message);
          studentModal.style.display = 'none';
          // Optionally reload student list
          if (typeof window.loadStudentList === 'function') window.loadStudentList();
        } else if (result.error) {
          alert(result.error);
        }
      })
      .catch(error => {
        console.error('Request error:', error);
        alert('Sunucuya bağlanılamadı.');
      });
  });
});

window.displayStudentList = function displayStudentList(groupedStudents) {
  const container = document.getElementById('studentListContainer');
  if (!groupedStudents || Object.keys(groupedStudents).length === 0) {
    container.innerHTML = '<div class="no-students">Henüz öğrenci bulunmuyor.</div>';
    return;
  }

  // Day order for sorting
  const dayOrder = {
    'Pazartesi': 1,
    'Salı': 2,
    'Çarşamba': 3,
    'Perşembe': 4,
    'Cuma': 5,
    'Cumartesi': 6,
    'Pazar': 7
  };

  let html = '';
  for (const courseName in groupedStudents) {
    const students = groupedStudents[courseName];
    const studentsArr = Object.values(students);

    // Sort by earliest (day, start time)
    studentsArr.sort((a, b) => {
      function getEarliestProgram(student) {
        if (!student.program || student.program.length === 0) return null;
        return student.program
          .map(p => ({
            day: dayOrder[p.day] || 99,
            start: p.start
          }))
          .sort((p1, p2) => {
            if (p1.day !== p2.day) return p1.day - p2.day;
            return p1.start.localeCompare(p2.start);
          })[0];
      }
      const aEarliest = getEarliestProgram(a);
      const bEarliest = getEarliestProgram(b);
      if (aEarliest && bEarliest) {
        if (aEarliest.day !== bEarliest.day) return aEarliest.day - bEarliest.day;
        return aEarliest.start.localeCompare(bEarliest.start);
      } else if (aEarliest) {
        return -1;
      } else if (bEarliest) {
        return 1;
      } else {
        return 0;
      }
    });

    html += `
      <div class="course-group">
        <div class="course-title">${courseName}</div>
    `;
    for (const student of studentsArr) {
      let programText = '';
      if (student.program && student.program.length > 0) {
        programText = student.program
          .map(p => `${p.day}: ${p.start} - ${p.end} (${p.room})`)
          .join(', ');
      }
      html += `
        <div class="student-item">
          <div class="student-info">
            <div class="student-name">${student.firstName} ${student.lastName}</div>
            <div class="student-details">
              Öğrenci ID: ${student.studentId}
            </div>
            ${programText ? `<div class="program-info">📅 ${programText}</div>` : ''}
          </div>
          <div class="student-actions">
            <button class="edit-btn" onclick="editStudent(${student.studentId})">
              ✏️ Düzenle
            </button>
            <button class="delete-btn" onclick="deleteStudent(${student.studentId}, '${student.firstName} ${student.lastName}')">
              ⏸️ Pasife Al
            </button>
          </div>
        </div>
      `;
    }
    html += '</div>';
  }
  container.innerHTML = html;
}

window.searchPassiveStudents = function searchPassiveStudents() {
  const categorySearch = document.getElementById('categorySearch').value;
  const courseSearch = document.getElementById('courseSearch').value;
  const daySearch = document.getElementById('daySearch').value;
  const nameSearch = document.getElementById('nameSearch').value.toLocaleLowerCase('tr-TR');
  if (!window.allPassiveStudentsData || window.allPassiveStudentsData.length === 0) {
    alert('Pasif öğrenci verisi henüz yüklenmedi.');
    return;
  }
  if (!categorySearch && !courseSearch && !daySearch && !nameSearch) {
    window.displayPassiveStudentSearchResults(0, categorySearch, courseSearch, daySearch, nameSearch);
    window.displayPassiveStudents(window.allPassiveStudentsData);
    return;
  }
  const filteredStudents = window.allPassiveStudentsData.filter(student => {
    let shouldInclude = true;
    if (nameSearch) {
      const fullName = `${student.First_Name} ${student.Last_Name}`.toLocaleLowerCase('tr-TR');
      if (!fullName.includes(nameSearch)) {
        shouldInclude = false;
      }
    }
    // Note: For passive students, category and course filters may not work unless backend supports it
    return shouldInclude;
  });
  window.displayPassiveStudentSearchResults(filteredStudents.length, categorySearch, courseSearch, daySearch, nameSearch);
  window.displayPassiveStudents(filteredStudents);
};

window.displayPassiveStudentSearchResults = function displayPassiveStudentSearchResults(totalResults, categorySearch, courseSearch, daySearch, nameSearch) {
  const searchResultsDiv = document.getElementById('searchResults');
  let searchCriteria = [];
  if (categorySearch) {
    const categorySelect = document.getElementById('categorySearch');
    const categoryText = categorySelect.options[categorySelect.selectedIndex].text;
    searchCriteria.push(`Kategori: "${categoryText}"`);
  }
  if (courseSearch) {
    const courseSelect = document.getElementById('courseSearch');
    const courseText = courseSelect.options[courseSelect.selectedIndex].text;
    searchCriteria.push(`Kurs: "${courseText}"`);
  }
  if (daySearch) searchCriteria.push(`Gün: "${daySearch}"`);
  if (nameSearch) searchCriteria.push(`Öğrenci Adı: "${nameSearch}"`);
  if (searchCriteria.length > 0) {
    searchResultsDiv.innerHTML = `
      <div class="search-results">
        🔍 Arama kriterleri: ${searchCriteria.join(', ')} | 
        📊 Bulunan sonuç: ${totalResults} öğrenci
      </div>
    `;
    searchResultsDiv.style.display = 'block';
  } else {
    searchResultsDiv.style.display = 'none';
  }
};

window.clearPassiveStudentSearch = function clearPassiveStudentSearch() {
  document.getElementById('categorySearch').value = '';
  document.getElementById('courseSearch').value = '';
  document.getElementById('daySearch').value = '';
  document.getElementById('nameSearch').value = '';
  document.getElementById('searchResults').style.display = 'none';
  window.loadAllCourses();
  if (window.allPassiveStudentsData) {
    window.displayPassiveStudents(window.allPassiveStudentsData);
  }
};

window.reactivateStudent = async function reactivateStudent(studentId, studentName) {
  if (confirm(`"${studentName}" adlı öğrenciyi aktif hale getirmek istediğinizden emin misiniz?`)) {
    try {
      const response = await fetch(`/api/admin/reactivate-student/${studentId}`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Öğrenci aktifleştirilirken hata oluştu');
      }
      const result = await response.json();
      alert(result.message);
      window.loadPassiveStudents();
    } catch (error) {
      console.error('Error reactivating student:', error);
      alert('Öğrenci aktifleştirilirken hata oluştu: ' + error.message);
    }
  }
};

window.permanentlyDeleteStudent = async function permanentlyDeleteStudent(studentId, studentName) {
  if (confirm(`"${studentName}" adlı öğrenciyi KALICI olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
    try {
      const response = await fetch(`/api/admin/permanently-delete-student/${studentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Öğrenci kalıcı olarak silinirken hata oluştu');
      }
      const result = await response.json();
      alert(result.message);
      window.loadPassiveStudents();
    } catch (error) {
      console.error('Error permanently deleting student:', error);
      alert('Öğrenci kalıcı olarak silinirken hata oluştu: ' + error.message);
    }
  }
};
