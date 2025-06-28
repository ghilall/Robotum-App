async function loadUser() { //biliyorum loadUser kısmı admin_dashboard_main.js ile aynı ama admin ve teacher için ayrı ayrı olması daha doğru geldi
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
      if (!response.ok) throw new Error('Kullanıcı bilgisi alınamadı');
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

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  });
