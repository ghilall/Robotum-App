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
    // Assume API returns: { courses: [{ Course_ID, Course_Name, Level, Category_ID, Status, Difficulty }] }
    allCourses = data.courses.map(c => ({
      id: c.Course_ID,
      name: c.Course_Name,
      categoryId: c.Category_ID || '',
      status: c.Status || 'Aktif',
      level: c.Level || '',
      difficulty: c.Difficulty || ''
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
  const difficultyFilter = document.getElementById('courseDifficultySearch').value;
  
  const filtered = allCourses.filter(course =>
    (showActiveCourses ? course.status.toLowerCase() === 'aktif' : course.status.toLowerCase() === 'pasif') &&
    course.name.toLowerCase().includes(searchTerm) &&
    (!levelFilter || course.level === levelFilter) &&
    (!difficultyFilter || course.difficulty === difficultyFilter)
  );
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-students">Kurs bulunamadı.</div>';
    return;
  }
  let html = '';
  filtered.forEach(course => {
    const categoryName = categoryMap[course.categoryId] || 'Kategori Yok';
    const levelText = course.level ? `Seviye: ${course.level}` : '';
    const difficultyText = course.difficulty ? `Zorluk: ${course.difficulty}` : '';
    const statusClass = course.status === 'Aktif' ? 'status-active' : 'status-passive';
    const toggleText = course.status === 'Aktif' ? '⏸️ Pasife Al' : '✅ Aktifleştir';
    const toggleClass = course.status === 'Aktif' ? 'toggle-passive' : 'toggle-active';
    
    html += `
      <div class="student-item">
        <div>
          <div class="student-name">${course.name}</div>
          <div class="student-details">Kategori: ${categoryName}</div>
          ${levelText ? `<div class="student-details">${levelText}</div>` : ''}
          ${difficultyText ? `<div class="student-details">${difficultyText}</div>` : ''}
          <div class="student-status ${statusClass}">${course.status}</div>
        </div>
        <div class="student-actions">
          ${course.status === 'Aktif' ? 
            `<button class="edit-btn" onclick="editCourse(${course.id})">
              ✏️ Düzenle
            </button>` : 
            `<button class="toggle-status-btn toggle-active" onclick="toggleCourseStatus(${course.id})">
              Aktifleştir
            </button>
            <button class="delete-btn" onclick="permanentlyDeleteCourse(${course.id}, '${course.name}')">
              🗑️ Kalıcı Sil
            </button>`
          }
          ${course.status === 'Aktif' ? 
            `<button class="toggle-status-btn ${toggleClass}" onclick="toggleCourseStatus(${course.id})">
              ${toggleText}
            </button>` : ''
          }
          <button class="action-btn secondary" onclick="viewCoursePrograms('${course.name}', '${course.level}', '${course.difficulty}')" style="margin-left: auto;">
            📅 Programlar
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
  const course = allCourses.find(c => c.id === courseId);
  if (!course) {
    alert('Kurs bulunamadı.');
    return;
  }
  // Eğer kurs aktifse ve pasife alınacaksa, onay iste
  if (course.status === 'Aktif') {
    const confirmed = confirm(`"${course.name}" kursunu pasife almak istediğinizden emin misiniz?`);
    if (!confirmed) return;
  }
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

// Edit course function
async function editCourse(courseId) {
  const course = allCourses.find(c => c.id === courseId);
  if (!course) {
    alert('Kurs bulunamadı.');
    return;
  }
  
  // Populate edit form
  document.getElementById('editCourseId').value = course.id;
  document.getElementById('editCourseName').value = course.name;
  document.getElementById('editCourseCategory').value = course.categoryId;
  document.getElementById('editCourseLevel').value = course.level;
  document.getElementById('editCourseDifficulty').value = course.difficulty;
  document.getElementById('editCourseStatus').value = course.status;
  
  // Show edit modal
  document.getElementById('editCourseModal').style.display = 'block';
}

// Permanently delete course function
async function permanentlyDeleteCourse(courseId, courseName) {
  if (!confirm(`"${courseName}" kursunu kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Kurs silinemedi');
    }
    
    alert('Kurs kalıcı olarak silindi.');
    
    // Refresh the course list to show updated status
    await refreshCourseList();
  } catch (err) {
    alert('Hata: ' + err.message);
    console.error('Kurs silme hatası:', err);
  }
}

// Global function to force close course modal (can be called from browser console)
window.closeCourseModal = function() {
  const modal = document.getElementById('courseModal');
  if (modal) {
    modal.style.display = 'none';
    console.log('Course modal force closed');
  } else {
    console.log('Course modal not found');
  }
};

// Global function to force close edit course modal
window.closeEditCourseModal = function() {
  const modal = document.getElementById('editCourseModal');
  if (modal) {
    modal.style.display = 'none';
    console.log('Edit course modal force closed');
  } else {
    console.log('Edit course modal not found');
  }
};

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
  const closeCourseModalBtn = document.getElementById('closeCourseModalBtn');
  
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
  
  // Multiple ways to close the course modal
  if (closeCourseModalBtn) {
    // Method 1: Event listener
    closeCourseModalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Close button clicked - method 1');
      courseModal.style.display = 'none';
    });
    
    // Method 2: Direct onclick (backup)
    closeCourseModalBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Close button clicked - method 2');
      courseModal.style.display = 'none';
    };
  }
  
  // Method 3: Click outside modal
  window.addEventListener('click', function(e) {
    if (e.target === courseModal) {
      console.log('Clicked outside modal');
      courseModal.style.display = 'none';
    }
  });
  
  // Method 4: Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && courseModal.style.display === 'flex') {
      console.log('Escape key pressed');
      courseModal.style.display = 'none';
    }
  });

  // Edit course modal open/close
  const editCourseModal = document.getElementById('editCourseModal');
  document.getElementById('closeEditCourseModalBtn').addEventListener('click', function() {
    editCourseModal.style.display = 'none';
  });
  window.addEventListener('click', function(e) {
    if (e.target === editCourseModal) editCourseModal.style.display = 'none';
  });

  // Edit course form submit
  document.getElementById('editCourseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const courseId = this.getAttribute('data-course-id');
    const name = document.getElementById('editCourseName').value.trim();
    const category = document.getElementById('editCourseCategory').value;
    const level = document.getElementById('editCourseLevel').value;
    const difficulty = document.getElementById('editCourseDifficulty').value;
    const status = document.getElementById('editCourseStatus').value;
    
    if (!name || !category || !level || !difficulty || !status) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, category, level, difficulty, status })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kurs güncellenemedi');
      }
      
      const result = await response.json();
      console.log('Kurs güncellendi:', result);
      
      // Refresh course list
      await fetchCourses();
      renderCourseList();
      
      // Close modal
      document.getElementById('editCourseModal').style.display = 'none';
      
      alert('Kurs başarıyla güncellendi!');
    } catch (error) {
      console.error('Kurs güncelleme hatası:', error);
      alert('Kurs güncellenirken hata oluştu: ' + error.message);
    }
  });

  // Add course form submit
  document.getElementById('addCourseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('courseName').value.trim();
    const category = document.getElementById('courseCategory').value;
    const level = document.getElementById('courseLevel').value;
    const difficulty = document.getElementById('courseDifficulty').value;
    const status = document.getElementById('courseStatus').value;
    
    if (!name || !category || !level || !difficulty || !status) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, category, level, difficulty, status })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kurs eklenemedi');
      }
      
      const result = await response.json();
      console.log('Kurs eklendi:', result);
      
      // Reset form
      document.getElementById('addCourseForm').reset();
      
      // Refresh course list
      await fetchCourses();
      renderCourseList();
      
      // Close modal
      document.getElementById('courseModal').style.display = 'none';
      
      alert('Kurs başarıyla eklendi!');
    } catch (error) {
      console.error('Kurs ekleme hatası:', error);
      alert('Kurs eklenirken hata oluştu: ' + error.message);
    }
  });
});
