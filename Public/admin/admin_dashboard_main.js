// admin_dashboard.js

// Loads the current user's info and updates the sidebar
async function loadUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    alert('Lütfen giriş yapınız.');
    window.location.href = '/';
    return;
  }

  const user = JSON.parse(userStr);
  const email = encodeURIComponent(user.email);

  try {
    const response = await fetch(`/api/user?email=${email}`);
    if (!response.ok) {
      throw new Error('Kullanıcı bilgisi alınamadı');
    }
    const data = await response.json();

    document.getElementById('userName').textContent = data.name;
    document.getElementById('userEmail').textContent = data.email;
    document.getElementById('userPhone').textContent = data.phone;
    document.getElementById('lastLogin').textContent = data.lastLogin
      ? new Date(data.lastLogin).toLocaleString('tr-TR')
      : 'Bilinmiyor';

  } catch (error) {
    alert('Kullanıcı bilgisi yüklenirken hata oluştu.');
    console.error(error);
  }
}
//load the dashboard stats
async function loadDashboardStats() {
    try {
      const response = await fetch('/api/admin/dashboard-stats', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Dashboard istatistikleri alınamadı');
      }
      
      const stats = await response.json();
      
      document.getElementById('totalStudents').textContent = stats.totalStudents;
      document.getElementById('totalGuardians').textContent = stats.totalGuardians;
      document.getElementById('totalTeachers').textContent = stats.totalTeachers;
      document.getElementById('totalCourses').textContent = stats.totalCourses;
      
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Set error values
      document.getElementById('totalStudents').textContent = '?';
      document.getElementById('totalGuardians').textContent = '?';
      document.getElementById('totalTeachers').textContent = '?';
      document.getElementById('totalCourses').textContent = '?';
    }
  }
    // Section navigation
    function showSection(sectionName, event) {
    // Hide all sections
    const sections = ['dashboard', 'guardians', 'students', 'teachers', 'courses'];
        sections.forEach(section => {
        document.getElementById(`${section}-section`).style.display = 'none';
    });
  
    // Show selected section
    document.getElementById(`${sectionName}-section`).style.display = 'block';
  
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event && event.target && typeof event.target.closest === 'function') {
        const menuItem = event.target.closest('.menu-item');
        if (menuItem) menuItem.classList.add('active');
    }
  
    // Load dashboard stats if dashboard section is selected
    if (sectionName === 'dashboard') {
        loadDashboardStats();
    }
  
    // Load students if students section is selected
    if (sectionName === 'students') {
        loadStudentList();
    }
  
    // Load guardians if guardians section is selected
    if (sectionName === 'guardians') {
        loadGuardianList();
    }
  
    // Load teachers if teachers section is selected
    if (sectionName === 'teachers') {
        loadTeacherList();
    }
  
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}


