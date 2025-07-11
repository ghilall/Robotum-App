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
      
      // Category filter
      if (categorySearch && shouldInclude) {
        if (student.categoryId != categorySearch) {
          shouldInclude = false;
        }
      }
      
      // Course filter
      if (courseSearch && shouldInclude) {
        const courseSelect = document.getElementById('courseSearch');
        const selectedCourseName = courseSelect.options[courseSelect.selectedIndex].text;
        if (courseName !== selectedCourseName) {
          shouldInclude = false;
        }
      }
      
      // Name filter
      if (nameSearch && shouldInclude) {
        const fullName = `${student.firstName} ${student.lastName}`.toLocaleLowerCase('tr-TR');
        if (!fullName.includes(nameSearch)) {
          shouldInclude = false;
        }
      }
      
      // Day filter
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
  const nameSearch = document.getElementById('nameSearch').value;
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
    
    // Clear existing options first to prevent duplicates
    categorySelect.innerHTML = '<option value="">Tüm kategoriler</option>';
    
    catData.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.Category_ID;
      option.textContent = cat.Category_Name;
      categorySelect.appendChild(option);
    });
    await window.loadAllCourses();
    
    // Remove existing event listener before adding new one to prevent duplicates
    const categorySearchElement = document.getElementById('categorySearch');
    categorySearchElement.removeEventListener('change', window.updateCourseOptions);
    categorySearchElement.addEventListener('change', window.updateCourseOptions);
    
  } catch (error) {
    console.error('Error loading search filters:', error);
  }
}

async function loadAllCourses() {
  const courseSelect = document.getElementById('courseSearch');
  const programSelect = document.getElementById('programId');
  courseSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Tüm kurslar';
  courseSelect.appendChild(defaultOption);
  try {
    const response = await fetch('/api/courses', { credentials: 'include' });
    const data = await response.json();
    if (!data.courses || data.courses.length === 0) {
      courseSelect.innerHTML = '<option value="">Kurs bulunamadı</option>';
    } else {
      data.courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.Course_ID;
        option.textContent = course.Course_Name;
        courseSelect.appendChild(option);
      });
    }
  } catch (error) {
    courseSelect.innerHTML = '<option value="">Kurslar alınamadı</option>';
  }
  programSelect.innerHTML = '<option value="">Saat seçiniz</option>';
}

window.updateCourseOptions = async function updateCourseOptions() {
  const categoryId = document.getElementById('categorySearch').value;
  const courseSelect = document.getElementById('courseSearch');
  const programSelect = document.getElementById('programId');
  courseSelect.innerHTML = '';
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
  programSelect.innerHTML = '<option value="">Saat seçiniz</option>';
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
  const programDaySelect = document.getElementById('studentProgramDay');
  const guardianSearch = document.getElementById('guardianSearch');
  const guardianResults = document.getElementById('guardianResults');
  const guardianIdInput = document.getElementById('guardianId');
  const programsContainer = document.getElementById('programsContainer');
  const addProgramBtn = document.getElementById('addProgramBtn');

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
      if (programDaySelect) programDaySelect.value = '';
      document.getElementById('selectedGuardianDisplay').textContent = '';
    });
    closeStudentModalBtn.addEventListener('click', () => {
      studentModal.style.display = 'none';
      document.getElementById('selectedGuardianDisplay').textContent = '';
    });
    window.addEventListener('click', (e) => {
      if (e.target === studentModal) studentModal.style.display = 'none';
    });
  }

  function createProgramRow() {
    const row = document.createElement('div');
    row.className = 'program-row';
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.style.marginBottom = '14px';
    row.style.background = '#f8f9fa';
    row.style.padding = '16px 12px';
    row.style.borderRadius = '10px';
    row.style.alignItems = 'center';
    row.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
    row.innerHTML = `
      <select class="category-select" required style="min-width:120px; flex:1; padding:6px 8px; border-radius:6px; border:1px solid #bbb;"></select>
      <select class="level-select" required style="min-width:100px; flex:1; padding:6px 8px; border-radius:6px; border:1px solid #bbb;"></select>
      <select class="course-select" required style="min-width:140px; flex:2; padding:6px 8px; border-radius:6px; border:1px solid #bbb;"></select>
      <select class="day-select" style="min-width:110px; flex:1; padding:6px 8px; border-radius:6px; border:1px solid #bbb;">
        <option value="">Gün</option>
        <option value="Pazartesi">Pazartesi</option>
        <option value="Salı">Salı</option>
        <option value="Çarşamba">Çarşamba</option>
        <option value="Perşembe">Perşembe</option>
        <option value="Cuma">Cuma</option>
        <option value="Cumartesi">Cumartesi</option>
        <option value="Pazar">Pazar</option>
      </select>
      <select class="program-select" required style="min-width:160px; flex:2; padding:6px 8px; border-radius:6px; border:1px solid #bbb;"></select>
      <button type="button" class="remove-program-btn" style="background:#ffefef; color:#d33; border:1px solid #d33; border-radius:6px; padding:6px 12px; font-size:1.1em; cursor:pointer;">-</button>
    `;
    loadCategories(row.querySelector('.category-select'));
    loadLevels(row.querySelector('.level-select'));
    row.querySelector('.category-select').addEventListener('change', function() {
      loadCourses(row.querySelector('.course-select'), this.value, row.querySelector('.level-select').value);
    });
    row.querySelector('.level-select').addEventListener('change', function() {
      loadCourses(row.querySelector('.course-select'), row.querySelector('.category-select').value, this.value);
    });
    // When course or day changes, update programs
    const courseSelect = row.querySelector('.course-select');
    const daySelect = row.querySelector('.day-select');
    const programSelect = row.querySelector('.program-select');
    function updatePrograms() {
      loadPrograms(programSelect, courseSelect.value, daySelect.value);
    }
    courseSelect.addEventListener('change', updatePrograms);
    daySelect.addEventListener('change', updatePrograms);
    row.querySelector('.remove-program-btn').onclick = () => row.remove();
    return row;
  }
  // Add first row by default
  programsContainer.appendChild(createProgramRow());
  addProgramBtn.onclick = () => {
    programsContainer.appendChild(createProgramRow());
  };
  function loadCategories(select) {
    fetch('/api/categories').then(res => res.json()).then(data => {
      select.innerHTML = '<option value="">Kategori</option>' +
        data.categories.map(cat => `<option value="${cat.Category_ID}">${cat.Category_Name}</option>`).join('');
    });
  }
  function loadLevels(select) {
    fetch('/api/course-levels').then(res => res.json()).then(data => {
      select.innerHTML = '<option value="">Seviye</option>' +
        data.levels.map(level => `<option value="${level}">${level}</option>`).join('');
    });
  }
  function loadCourses(select, categoryId, level) {
    let url = '/api/courses?';
    if (categoryId) url += `categoryId=${categoryId}&`;
    if (level) url += `level=${level}`;
    fetch(url).then(res => res.json()).then(data => {
      select.innerHTML = '<option value="">Kurs</option>' +
        data.courses.map(course => `<option value="${course.Course_ID}">${course.Course_Name}</option>`).join('');
    });
  }
  function loadPrograms(select, courseId, day) {
    if (!courseId) {
      select.innerHTML = '<option value="">Program</option>';
      return;
    }
    fetch(`/api/programs/by-course/${courseId}`).then(res => res.json()).then(data => {
      let programs = data.programs;
      if (day) {
        programs = programs.filter(p => p.Day === day);
      }
      select.innerHTML = '<option value="">Program</option>' +
        programs.map(p => `<option value="${p.Program_ID}">${p.Day} ${p.Start_Time} - ${p.End_Time}</option>`).join('');
    });
  }
  // On form submit, gather all selected program IDs
  const studentForm = document.getElementById('studentRegistrationForm');
  studentForm.addEventListener('submit', function(e) {
    // ...existing validation...
    const selectedProgramIds = Array.from(programsContainer.querySelectorAll('.program-select'))
      .map(sel => sel.value)
      .filter(val => val);
    // Add to form data before sending to backend
    // Example: formData.append('selectedProgramIds', JSON.stringify(selectedProgramIds));
    // Or, if using fetch: body: JSON.stringify({ ..., selectedProgramIds })
    // ...rest of your submit logic...
  });

  guardianSearch.addEventListener('input', async () => {
    const query = guardianSearch.value.trim();
    const queryNormalized = query.toLocaleLowerCase('tr');
    guardianResults.innerHTML = '';
    guardianResults.style.display = 'none';
    if (query.length < 2) return;
    try {
      const response = await fetch(`/api/guardians/search?query=${encodeURIComponent(queryNormalized)}`, { credentials: 'include' });
      const results = await response.json();
      // Enhanced filtering: match if query is in first name, last name, or their combination (any order)
      const filteredResults = results.filter(guardian => {
        const first = guardian.First_Name.toLocaleLowerCase('tr');
        const last = guardian.Last_Name.toLocaleLowerCase('tr');
        const full1 = `${first} ${last}`;
        const full2 = `${last} ${first}`;
        return (
          first.includes(queryNormalized) ||
          last.includes(queryNormalized) ||
          full1.includes(queryNormalized) ||
          full2.includes(queryNormalized)
        );
      });
      if (filteredResults.length === 0) {
        guardianResults.innerHTML = '<div>Veli bulunamadı</div>';
      } else {
        filteredResults.forEach(guardian => {
          const div = document.createElement('div');
          div.textContent = `${guardian.First_Name} ${guardian.Last_Name} (${guardian.Email})`;
          div.dataset.id = guardian.Guardian_ID;
          div.addEventListener('click', () => {
            guardianSearch.value = `${guardian.First_Name} ${guardian.Last_Name}`;
            guardianIdInput.value = guardian.Guardian_ID;
            guardianResults.style.display = 'none';
            document.getElementById('selectedGuardianDisplay').textContent = `Seçili Veli: ${guardian.First_Name} ${guardian.Last_Name}`;
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

  // Collect all students into a flat array with their course and earliest program day
  let allStudents = [];
  for (const courseName in groupedStudents) {
    const students = groupedStudents[courseName];
    for (const studentId in students) {
      const student = students[studentId];
      let earliestDay = null;
      let earliestStart = null;
      if (student.program && student.program.length > 0) {
        // Find the earliest program (by day, then by start time)
        const sortedPrograms = student.program.slice().sort((a, b) => {
          const dayA = dayOrder[a.day] || 99;
          const dayB = dayOrder[b.day] || 99;
          if (dayA !== dayB) return dayA - dayB;
          return a.start.localeCompare(b.start);
        });
        earliestDay = sortedPrograms[0].day;
        earliestStart = sortedPrograms[0].start;
      }
      allStudents.push({
        ...student,
        courseName,
        earliestDay,
        earliestStart
      });
    }
  }

  // Group students by day, then by course
  const studentsByDayCourse = {};
  allStudents.forEach(student => {
    const day = student.earliestDay || 'Diğer';
    if (!studentsByDayCourse[day]) studentsByDayCourse[day] = {};
    if (!studentsByDayCourse[day][student.courseName]) studentsByDayCourse[day][student.courseName] = [];
    studentsByDayCourse[day][student.courseName].push(student);
  });

  // Sort days by dayOrder
  const sortedDays = Object.keys(studentsByDayCourse).sort((a, b) => {
    return (dayOrder[a] || 99) - (dayOrder[b] || 99);
  });

  let html = '';
  for (const day of sortedDays) {
    html += `<div class="day-group"><div class="day-title">${day}</div>`;
    const courses = studentsByDayCourse[day];
    // Sort courses alphabetically
    const sortedCourses = Object.keys(courses).sort();
    for (const courseName of sortedCourses) {
      html += `<div class="course-group"><div class="course-title">${courseName}</div>`;
      // Sort students by earliest start time within the day
      const studentsArr = courses[courseName].slice().sort((a, b) => {
        if (a.earliestStart && b.earliestStart) {
          return a.earliestStart.localeCompare(b.earliestStart);
        } else if (a.earliestStart) {
          return -1;
        } else if (b.earliestStart) {
          return 1;
        } else {
          return 0;
        }
      });
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

window.editStudent = function editStudent(studentId) {
  // Find student data from the currently loaded list
  let student = null;
  if (window.allStudentsData) {
    for (const courseName in window.allStudentsData) {
      const students = window.allStudentsData[courseName];
      if (students[studentId]) {
        student = students[studentId];
        break;
      }
    }
  }
  if (!student) {
    alert('Öğrenci verisi bulunamadı.');
    return;
  }
  // Populate modal fields
  document.getElementById('editFirstName').value = student.firstName || '';
  document.getElementById('editLastName').value = student.lastName || '';
  document.getElementById('editBirthDate').value = student.birthDate ? student.birthDate.split('T')[0] : '';
  // Store editing student id
  window.editingStudentId = studentId;
  document.getElementById('editStudentModal').style.display = 'flex';
};

// Modal open/close logic for edit student
const editStudentModal = document.getElementById('editStudentModal');
const closeEditStudentModalBtn = document.getElementById('closeEditStudentModalBtn');
if (editStudentModal && closeEditStudentModalBtn) {
  closeEditStudentModalBtn.addEventListener('click', () => {
    editStudentModal.style.display = 'none';
  });
  window.addEventListener('click', (e) => {
    if (e.target === editStudentModal) editStudentModal.style.display = 'none';
  });
}

// Submit edit student form
const editStudentForm = document.getElementById('editStudentForm');
if (editStudentForm) {
  editStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = window.editingStudentId;
    const data = {
      firstName: editStudentForm.editFirstName.value.trim(),
      lastName: editStudentForm.editLastName.value.trim(),
      birthDate: editStudentForm.editBirthDate.value
      // Add other fields if needed
    };
    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok) {
        alert('Öğrenci bilgileri güncellendi.');
        editStudentModal.style.display = 'none';
        if (typeof window.loadStudentList === 'function') window.loadStudentList();
      } else {
        alert(result.error || 'Güncelleme başarısız.');
      }
    } catch (err) {
      alert('Sunucu hatası: ' + err.message);
    }
  });
}

// Change Course logic
window.changeStudentCourse = function changeStudentCourse(studentId) {
  // Find student data from the currently loaded list
  let student = null;
  let courseName = '';
  if (window.allStudentsData) {
    for (const cName in window.allStudentsData) {
      const students = window.allStudentsData[cName];
      if (students[studentId]) {
        student = students[studentId];
        courseName = cName;
        break;
      }
    }
  }
  if (!student) {
    alert('Öğrenci verisi bulunamadı.');
    return;
  }
  // Set student info at the top of the modal
  document.getElementById('changeCourseStudentInfo').innerHTML =
    `<strong>${student.firstName} ${student.lastName}</strong><br>Mevcut Kurs: <strong>${courseName}</strong>`;
  // Pre-select current course and program if possible
  window.changingCourseStudentId = studentId;
  document.getElementById('changeCourseModal').style.display = 'flex';
  // Always load categories and levels when opening the modal
  loadChangeModalCategoriesAndLevels();
  // Pre-fill course and program after loading options
  setTimeout(() => {
    if (student.courseLevel) {
      changeLevelFilter.value = student.courseLevel;
      updateChangeCourseOptions();
    }
    // Try to select the current course
    if (student.categoryId) {
      changeCategoryFilter.value = student.categoryId;
      updateChangeCourseOptions();
    }
    setTimeout(() => {
      if (student.program && student.program.length > 0) {
        const prog = student.program[0];
        // Try to select course, day, and program
        for (let i = 0; i < changeCourseSelect.options.length; i++) {
          if (changeCourseSelect.options[i].text === courseName) {
            changeCourseSelect.selectedIndex = i;
            break;
          }
        }
        changeProgramDaySelect.value = prog.day;
        loadAndFilterChangePrograms().then(() => {
          for (let i = 0; i < changeProgramSelect.options.length; i++) {
            if (changeProgramSelect.options[i].text.includes(prog.start) && changeProgramSelect.options[i].text.includes(prog.end)) {
              changeProgramSelect.selectedIndex = i;
              break;
            }
          }
        });
      }
    }, 300);
  }, 300);
};

// Modal open/close logic for change course
const changeCourseModal = document.getElementById('changeCourseModal');
const closeChangeCourseModalBtn = document.getElementById('closeChangeCourseModalBtn');
if (changeCourseModal && closeChangeCourseModalBtn) {
  closeChangeCourseModalBtn.addEventListener('click', () => {
    changeCourseModal.style.display = 'none';
  });
  window.addEventListener('click', (e) => {
    if (e.target === changeCourseModal) changeCourseModal.style.display = 'none';
  });
}

// Change course form logic (same as registration logic, but for editing)
const changeCategoryFilter = document.getElementById('changeCategoryFilter');
const changeLevelFilter = document.getElementById('changeLevelFilter');
const changeCourseSelect = document.getElementById('changeCourseId');
const changeProgramDaySelect = document.getElementById('changeProgramDay');
const changeProgramSelect = document.getElementById('changeProgramId');

async function loadChangeModalCategoriesAndLevels() {
  changeCategoryFilter.innerHTML = '<option value="">Tümü</option>';
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
        changeCategoryFilter.appendChild(opt);
      });
    }
    changeLevelFilter.innerHTML = '<option value="">Tümü</option>';
    levels.levels.forEach(lvl => {
      const opt = document.createElement('option');
      opt.value = lvl;
      opt.textContent = lvl;
      changeLevelFilter.appendChild(opt);
    });
    await loadAllChangeCourses();
  } catch (err) {
    changeCategoryFilter.innerHTML = '<option value="">Kategoriler yüklenemedi</option>';
    console.error('Kategoriler yüklenemedi:', err);
  }
}

async function loadAllChangeCourses() {
  changeCourseSelect.innerHTML = '<option value="">Yükleniyor...</option>';
  try {
    const response = await fetch('/api/courses', { credentials: 'include' });
    const data = await response.json();
    changeCourseSelect.innerHTML = '';
    if (!data.courses || data.courses.length === 0) {
      changeCourseSelect.innerHTML = '<option value="">Kurs bulunamadı</option>';
    } else {
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Kurs seçiniz';
      changeCourseSelect.appendChild(defaultOption);
      data.courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.Course_ID;
        option.textContent = course.Course_Name;
        changeCourseSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Kurslar yüklenemedi:', err);
    changeCourseSelect.innerHTML = '<option value="">Kurslar alınamadı</option>';
  }
  changeProgramSelect.innerHTML = '<option value="">Saat seçiniz</option>';
}

async function updateChangeCourseOptions() {
  const categoryId = changeCategoryFilter.value;
  const level = changeLevelFilter.value;
  changeCourseSelect.innerHTML = '<option value="">Yükleniyor...</option>';
  try {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (level) params.append('level', level);
    const response = await fetch(`/api/courses?${params.toString()}`, { credentials: 'include' });
    const data = await response.json();
    changeCourseSelect.innerHTML = '';
    if (!data.courses || data.courses.length === 0) {
      changeCourseSelect.innerHTML = '<option value="">Uygun kurs bulunamadı</option>';
    } else {
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Kurs seçiniz';
      changeCourseSelect.appendChild(defaultOption);
      data.courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.Course_ID;
        option.textContent = course.Course_Name;
        changeCourseSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Kurslar yüklenemedi:', err);
    changeCourseSelect.innerHTML = '<option value="">Kurslar alınamadı</option>';
  }
  changeProgramSelect.innerHTML = '<option value="">Saat seçiniz</option>';
}

changeCategoryFilter.addEventListener('change', updateChangeCourseOptions);
changeLevelFilter.addEventListener('change', updateChangeCourseOptions);

changeCourseSelect.addEventListener('change', loadAndFilterChangePrograms);
changeProgramDaySelect.addEventListener('change', loadAndFilterChangePrograms);

async function loadAndFilterChangePrograms() {
  const courseId = changeCourseSelect.value;
  const selectedDay = changeProgramDaySelect.value;
  changeProgramSelect.innerHTML = '';
  if (!courseId) {
    changeProgramSelect.innerHTML = '<option value="">Saat seçiniz</option>';
    return;
  }
  try {
    const res = await fetch(`/api/programs/by-course/${courseId}`, { credentials: 'include' });
    const data = await res.json();
    let programs = data.programs || [];
    if (selectedDay) {
      programs = programs.filter(p => p.Day === selectedDay);
    }
    if (programs.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'Saat bulunamadı';
      option.disabled = true;
      changeProgramSelect.appendChild(option);
      return;
    }
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Program saati seçiniz';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    changeProgramSelect.appendChild(defaultOption);
    programs.forEach(p => {
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
      changeProgramSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Saatler alınamadı:', err);
    changeProgramSelect.innerHTML = '<option value="">Saatler alınamadı</option>';
  }
}

// When change course modal opens, reset selects
const openChangeCourseModal = () => {
  if (changeCategoryFilter) changeCategoryFilter.value = '';
  if (changeLevelFilter) changeLevelFilter.value = '';
  if (changeCourseSelect) changeCourseSelect.innerHTML = '<option value="">Saat seçiniz</option>';
  if (changeProgramDaySelect) changeProgramDaySelect.value = '';
  if (changeProgramSelect) changeProgramSelect.innerHTML = '<option value="">Saat seçiniz</option>';
  loadChangeModalCategoriesAndLevels();
};
if (changeCourseModal) {
  changeCourseModal.addEventListener('show', openChangeCourseModal);
}

// Submit change course form
const changeCourseForm = document.getElementById('changeCourseForm');
if (changeCourseForm) {
  changeCourseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = window.changingCourseStudentId;
    const data = {
      courseId: changeCourseForm.changeCourseId.value,
      programId: changeCourseForm.changeProgramId.value
    };
    try {
      const response = await fetch(`/api/admin/students/${studentId}/change-course`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok) {
        alert('Kurs ve program güncellendi.');
        changeCourseModal.style.display = 'none';
        if (typeof window.loadStudentList === 'function') window.loadStudentList();
      } else {
        alert(result.error || 'Kurs değiştirilemedi.');
      }
    } catch (err) {
      alert('Sunucu hatası: ' + err.message);
    }
  });
}

// Add 'Kurs Değiştir' button to student actions in displayStudentList
const originalDisplayStudentList = window.displayStudentList;
window.displayStudentList = function displayStudentListWithEdit(groupedStudents) {
  // Use the same logic as before, but add the new button
  const container = document.getElementById('studentListContainer');
  if (!groupedStudents || Object.keys(groupedStudents).length === 0) {
    container.innerHTML = '<div class="no-students">Henüz öğrenci bulunmuyor.</div>';
    return;
  }
  const dayOrder = {
    'Pazartesi': 1,
    'Salı': 2,
    'Çarşamba': 3,
    'Perşembe': 4,
    'Cuma': 5,
    'Cumartesi': 6,
    'Pazar': 7
  };
  let allStudents = [];
  for (const courseName in groupedStudents) {
    const students = groupedStudents[courseName];
    for (const studentId in students) {
      const student = students[studentId];
      let earliestDay = null;
      let earliestStart = null;
      if (student.program && student.program.length > 0) {
        const sortedPrograms = student.program.slice().sort((a, b) => {
          const dayA = dayOrder[a.day] || 99;
          const dayB = dayOrder[b.day] || 99;
          if (dayA !== dayB) return dayA - dayB;
          return a.start.localeCompare(b.start);
        });
        earliestDay = sortedPrograms[0].day;
        earliestStart = sortedPrograms[0].start;
      }
      allStudents.push({
        ...student,
        courseName,
        earliestDay,
        earliestStart
      });
    }
  }
  const studentsByDayCourse = {};
  allStudents.forEach(student => {
    const day = student.earliestDay || 'Diğer';
    if (!studentsByDayCourse[day]) studentsByDayCourse[day] = {};
    if (!studentsByDayCourse[day][student.courseName]) studentsByDayCourse[day][student.courseName] = [];
    studentsByDayCourse[day][student.courseName].push(student);
  });
  const sortedDays = Object.keys(studentsByDayCourse).sort((a, b) => {
    return (dayOrder[a] || 99) - (dayOrder[b] || 99);
  });
  let html = '';
  for (const day of sortedDays) {
    html += `<div class="day-group"><div class="day-title">${day}</div>`;
    const courses = studentsByDayCourse[day];
    const sortedCourses = Object.keys(courses).sort();
    for (const courseName of sortedCourses) {
      html += `<div class="course-group"><div class="course-title">${courseName}</div>`;
      const studentsArr = courses[courseName].slice().sort((a, b) => {
        if (a.earliestStart && b.earliestStart) {
          return a.earliestStart.localeCompare(b.earliestStart);
        } else if (a.earliestStart) {
          return -1;
        } else if (b.earliestStart) {
          return 1;
        } else {
          return 0;
        }
      });
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
              <button class="change-course-btn" onclick="changeStudentCourse(${student.studentId})">
                🔄 Kurs Değiştir
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
    html += '</div>';
  }
  container.innerHTML = html;
};

// Make sure the student list always uses the version with the Kurs Değiştir button
window.displayStudentList = window.displayStudentListWithEdit;

let currentAssignStudentId = null;

// Open assign programs modal after registration or from edit
function openAssignProgramsModal(studentId) {
  currentAssignStudentId = studentId;
  document.getElementById('assignProgramsModal').style.display = 'flex';
  const container = document.getElementById('assignProgramsContainer');
  container.innerHTML = '';
  container.appendChild(createAssignProgramRow());
}

document.getElementById('closeAssignProgramsModalBtn').onclick = function() {
  document.getElementById('assignProgramsModal').style.display = 'none';
  currentAssignStudentId = null;
};

function createAssignProgramRow() {
  const row = document.createElement('div');
  row.className = 'program-row';
  row.style.display = 'flex';
  row.style.flexWrap = 'wrap';
  row.style.gap = '12px';
  row.style.marginBottom = '14px';
  row.style.background = '#f8f9fa';
  row.style.padding = '16px 12px';
  row.style.borderRadius = '10px';
  row.style.alignItems = 'center';
  row.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
  row.innerHTML = `
    <div style="display:flex; flex-direction:column; flex:1; min-width:120px;">
      <label style="font-size:0.95em; margin-bottom:2px;">Kategori</label>
      <select class="category-select" required style="padding:6px 8px; border-radius:6px; border:1px solid #bbb;"></select>
    </div>
    <div style="display:flex; flex-direction:column; flex:1; min-width:100px;">
      <label style="font-size:0.95em; margin-bottom:2px;">Seviye</label>
      <select class="level-select" required style="padding:6px 8px; border-radius:6px; border:1px solid #bbb;"></select>
    </div>
    <div style="display:flex; flex-direction:column; flex:2; min-width:140px;">
      <label style="font-size:0.95em; margin-bottom:2px;">Kurs</label>
      <select class="course-select" required style="padding:6px 8px; border-radius:6px; border:1px solid #bbb;"></select>
    </div>
    <div style="display:flex; flex-direction:column; flex:1; min-width:110px;">
      <label style="font-size:0.95em; margin-bottom:2px;">Gün</label>
      <select class="day-select" style="padding:6px 8px; border-radius:6px; border:1px solid #bbb;">
        <option value="">Gün</option>
        <option value="Pazartesi">Pazartesi</option>
        <option value="Salı">Salı</option>
        <option value="Çarşamba">Çarşamba</option>
        <option value="Perşembe">Perşembe</option>
        <option value="Cuma">Cuma</option>
        <option value="Cumartesi">Cumartesi</option>
        <option value="Pazar">Pazar</option>
      </select>
    </div>
    <div style="display:flex; flex-direction:column; flex:2; min-width:160px;">
      <label style="font-size:0.95em; margin-bottom:2px;">Program</label>
      <select class="program-select" required style="padding:6px 8px; border-radius:6px; border:1px solid #bbb;"></select>
    </div>
    <div style="display:flex; flex-direction:column; justify-content:flex-end;">
      <button type="button" class="remove-program-btn" style="background:#ffefef; color:#d33; border:1px solid #d33; border-radius:6px; padding:6px 12px; font-size:1.1em; cursor:pointer; margin-top:18px;">-</button>
    </div>
  `;
  loadCategories(row.querySelector('.category-select'));
  loadLevels(row.querySelector('.level-select'));
  const courseSelect = row.querySelector('.course-select');
  const daySelect = row.querySelector('.day-select');
  const programSelect = row.querySelector('.program-select');
  row.querySelector('.category-select').addEventListener('change', function() {
    loadCourses(courseSelect, this.value, row.querySelector('.level-select').value);
  });
  row.querySelector('.level-select').addEventListener('change', function() {
    loadCourses(courseSelect, row.querySelector('.category-select').value, this.value);
  });
  function updatePrograms() {
    loadPrograms(programSelect, courseSelect.value, daySelect.value);
  }
  courseSelect.addEventListener('change', updatePrograms);
  daySelect.addEventListener('change', updatePrograms);
  row.querySelector('.remove-program-btn').onclick = () => row.remove();
  return row;
}

document.getElementById('assignProgramsForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!currentAssignStudentId) return;
  const selectedProgramIds = Array.from(document.getElementById('assignProgramsContainer').querySelectorAll('.program-select'))
    .map(sel => sel.value)
    .filter(val => val);
  if (selectedProgramIds.length === 0) {
    alert('Lütfen en az bir program seçin.');
    return;
  }
  // Send to backend
  const res = await fetch(`/api/admin/students/${currentAssignStudentId}/enrollments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ programIds: selectedProgramIds })
  });
  const data = await res.json();
  if (data.success) {
    alert('Programlar başarıyla eklendi!');
    document.getElementById('assignProgramsModal').style.display = 'none';
    currentAssignStudentId = null;
    // Optionally reload student list
    if (typeof window.loadStudentList === 'function') window.loadStudentList();
  } else {
    alert(data.error || 'Bir hata oluştu.');
  }
});

// Open assign programs modal from edit modal
if (document.getElementById('openAssignProgramsModalBtn')) {
  document.getElementById('openAssignProgramsModalBtn').onclick = function() {
    const studentId = window.editingStudentId;
    if (studentId) openAssignProgramsModal(studentId);
  };
}

// After student registration, call openAssignProgramsModal(newStudentId)
// ... existing code ...

document.addEventListener('DOMContentLoaded', function() {
  const addAssignProgramBtn = document.getElementById('addAssignProgramBtn');
  if (addAssignProgramBtn) {
    addAssignProgramBtn.onclick = function() {
      document.getElementById('assignProgramsContainer').appendChild(createAssignProgramRow());
    };
  }
});
