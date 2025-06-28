// Course Management Logic

let showActiveCourses = true;
let allCourses = [];
let categoryMap = {};

// Fetch categories and build a map from ID to Name
async function fetchCategories() {
  try {
    const response = await fetch('/api/categories', { credentials: 'include' });
    if (!response.ok) throw new Error('Kategoriler alınamadı');
    const data = await response.json();
    // Build a map: { Category_ID: Category_Name }
    categoryMap = {};
    data.categories.forEach(cat => {
      categoryMap[cat.Category_ID] = cat.Category_Name;
    });
  } catch (err) {
    categoryMap = {};
    console.error('Kategoriler yüklenemedi:', err);
  }
}

// Fetch courses from backend
async function fetchCourses() {
  try {
    // You can add query params for category/level if needed
    const response = await fetch('/api/courses', { credentials: 'include' });
    if (!response.ok) throw new Error('Kurslar alınamadı');
    const data = await response.json();
    // Assume API returns: { courses: [{ Course_ID, Course_Name, Level, Category_ID, Status }] }
    allCourses = data.courses.map(c => ({
      id: c.Course_ID,
      name: c.Course_Name,
      categoryId: c.Category_ID || '',
      status: c.Status || 'Aktif',
      level: c.Level || ''
    }));
  } catch (err) {
    allCourses = [];
    document.getElementById('courseListContainer').innerHTML = '<div class="error">Kurslar yüklenemedi.</div>';
    console.error(err);
  }
}

function renderCourseList() {
  const container = document.getElementById('courseListContainer');
  const searchTerm = (document.getElementById('courseNameSearch').value || '').toLowerCase();
  const levelFilter = document.getElementById('courseLevelSearch').value;
  
  const filtered = allCourses.filter(course =>
    (showActiveCourses ? course.status.toLowerCase() === 'aktif' : course.status.toLowerCase() === 'pasif') &&
    course.name.toLowerCase().includes(searchTerm) &&
    (!levelFilter || course.level === levelFilter)
  );
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-students">Kurs bulunamadı.</div>';
    return;
  }
  let html = '';
  filtered.forEach(course => {
    const categoryName = categoryMap[course.categoryId] || 'Kategori Yok';
    const levelText = course.level ? `Seviye: ${course.level}` : '';
    const statusClass = course.status === 'Aktif' ? 'status-active' : 'status-passive';
    const toggleText = course.status === 'Aktif' ? 'Pasife Al' : 'Aktifleştir';
    const toggleClass = course.status === 'Aktif' ? 'toggle-passive' : 'toggle-active';
    
    html += `
      <div class="student-item">
        <div>
          <div class="student-name">${course.name}</div>
          <div class="student-details">Kategori: ${categoryName}</div>
          ${levelText ? `<div class="student-details">${levelText}</div>` : ''}
          <div class="student-status ${statusClass}">${course.status}</div>
        </div>
        <div class="student-actions">
          <button class="toggle-status-btn ${toggleClass}" onclick="toggleCourseStatus(${course.id})">
            ${toggleText}
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function refreshCourseList() {
  document.getElementById('courseListContainer').innerHTML = '<div class="loading">Kurs listesi yükleniyor...</div>';
  await fetchCategories();
  await fetchCourses();
  renderCourseList();
}

// Toggle course status (activate/deactivate)
async function toggleCourseStatus(courseId) {
  try {
    const response = await fetch(`/api/courses/${courseId}/toggle-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Kurs durumu değiştirilemedi');
    }
    
    const result = await response.json();
    alert(result.message);
    
    // Refresh the course list to show updated status
    await refreshCourseList();
  } catch (err) {
    alert('Hata: ' + err.message);
    console.error('Kurs durumu değiştirme hatası:', err);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Initial render
  refreshCourseList();

  // Toggle active/passive
  document.getElementById('toggleCourseActivePassiveBtn').addEventListener('click', function() {
    showActiveCourses = !showActiveCourses;
    document.getElementById('toggleCourseActivePassiveBtnText').textContent =
      showActiveCourses ? "Pasif Kursları Göster" : "Aktif Kursları Göster";
    renderCourseList();
  });

  // Search
  document.getElementById('searchCourseBtn').addEventListener('click', renderCourseList);
  document.getElementById('clearCourseSearchBtn').addEventListener('click', function() {
    document.getElementById('courseNameSearch').value = '';
    renderCourseList();
  });
  document.getElementById('courseNameSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      renderCourseList();
    }
  });

  // Modal open/close
  const courseModal = document.getElementById('courseModal');
  document.getElementById('openCourseModalBtn').addEventListener('click', function() {
    courseModal.style.display = 'flex';
    document.getElementById('addCourseForm').reset();
    // Populate category dropdown
    const categorySelect = document.getElementById('courseCategory');
    categorySelect.innerHTML = '<option value="">Kategori seçiniz</option>';
    Object.entries(categoryMap).forEach(([id, name]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = name;
      categorySelect.appendChild(option);
    });
  });
  document.getElementById('closeCourseModalBtn').addEventListener('click', function() {
    courseModal.style.display = 'none';
  });
  window.addEventListener('click', function(e) {
    if (e.target === courseModal) courseModal.style.display = 'none';
  });

  // Add course form submit
  document.getElementById('addCourseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('courseName').value;
    const category = document.getElementById('courseCategory').value;
    const level = document.getElementById('courseLevel').value;
    const status = document.getElementById('courseStatus').value;
    
    if (!name || !category || !level || !status) {
      alert('Tüm alanlar zorunludur.');
      return;
    }
    
    // Here you would send a POST request to your backend to add the course
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, category, level, status })
      });
      if (!response.ok) throw new Error('Kurs eklenemedi');
      courseModal.style.display = 'none';
      await refreshCourseList();
    } catch (err) {
      alert('Kurs eklenemedi.');
      console.error(err);
    }
  });
});
