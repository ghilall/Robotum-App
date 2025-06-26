// Guardian Management Functions for Admin Dashboard

// --- ACTIVE/PASSIVE TOGGLE LOGIC ---
window.showingPassiveGuardians = false;
window.allPassiveGuardiansData = [];

window.toggleGuardianActivePassive = async function toggleGuardianActivePassive() {
  window.showingPassiveGuardians = !window.showingPassiveGuardians;
  const btnText = document.getElementById('toggleGuardianActivePassiveBtnText');
  if (window.showingPassiveGuardians) {
    btnText.textContent = 'Aktif Velileri Göster';
    await window.loadPassiveGuardians();
  } else {
    btnText.textContent = 'Pasif Velileri Göster';
    await window.loadGuardianList();
  }
};

document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleGuardianActivePassiveBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', window.toggleGuardianActivePassive);
  }
});

// --- PASSIVE GUARDIANS LOGIC ---
window.loadPassiveGuardians = async function loadPassiveGuardians() {
  const container = document.getElementById('guardianListContainer');
  container.innerHTML = '<div class="loading">Pasif veli listesi yükleniyor...</div>';
  try {
    const response = await fetch('/api/admin/passive-guardians', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Pasif veli listesi alınamadı');
    }
    const data = await response.json();
    window.allPassiveGuardiansData = data.guardians;
    window.displayPassiveGuardians(data.guardians);
  } catch (error) {
    console.error('Error loading passive guardians:', error);
    container.innerHTML = '<div class="error">Pasif veli listesi yüklenirken hata oluştu.</div>';
  }
};

window.displayPassiveGuardians = function displayPassiveGuardians(guardians) {
  const container = document.getElementById('guardianListContainer');
  if (!guardians || guardians.length === 0) {
    container.innerHTML = '<div class="no-guardians">Pasif veli bulunmuyor.</div>';
    return;
  }
  let html = '';
  guardians.forEach(guardian => {
    let studentText = '';
    if (guardian.Students && guardian.Students.length > 0) {
      const studentNames = guardian.Students.map(s => `${s.First_Name} ${s.Last_Name}`).join(', ');
      studentText = `<div class="student-info">👥 Öğrenciler: ${studentNames}</div>`;
    } else {
      studentText = '<div class="student-info">👥 Öğrenci yok</div>';
    }
    html += `
      <div class="guardian-item">
        <div class="guardian-info">
          <div class="guardian-name">${guardian.First_Name} ${guardian.Last_Name}</div>
          <div class="guardian-details">📧 ${guardian.Email || 'Belirtilmemiş'}</div>
          <div class="guardian-details">📞 ${guardian.Phone || 'Belirtilmemiş'}</div>
          ${studentText}
          <div class="guardian-status">❌ Durum: Pasif</div>
        </div>
        <div class="guardian-actions">
          <button class="reactivate-btn" onclick="window.reactivateGuardian(${guardian.Guardian_ID}, '${guardian.First_Name} ${guardian.Last_Name}')">
            ✅ Aktifleştir
          </button>
          <button class="delete-btn" onclick="window.permanentlyDeleteGuardian(${guardian.Guardian_ID}, '${guardian.First_Name} ${guardian.Last_Name}')">
            🗑️ Kalıcı Sil
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
};

window.searchPassiveGuardians = function searchPassiveGuardians() {
  const nameSearch = document.getElementById('guardianNameSearch').value.toLocaleLowerCase('tr-TR');
  const phoneSearch = document.getElementById('guardianPhoneSearch').value.toLocaleLowerCase('tr-TR');
  const studentNameSearch = document.getElementById('studentNameSearch').value.toLocaleLowerCase('tr-TR');
  if (!window.allPassiveGuardiansData || window.allPassiveGuardiansData.length === 0) {
    alert('Pasif veli verisi henüz yüklenmedi.');
    return;
  }
  if (!nameSearch && !phoneSearch && !studentNameSearch) {
    window.displayPassiveGuardianSearchResults(0, nameSearch, phoneSearch, studentNameSearch);
    window.displayPassiveGuardians(window.allPassiveGuardiansData);
    return;
  }
  const filteredGuardians = window.allPassiveGuardiansData.filter(guardian => {
    let shouldInclude = true;
    if (nameSearch) {
      const fullName = `${guardian.First_Name} ${guardian.Last_Name}`.toLocaleLowerCase('tr-TR');
      if (!fullName.includes(nameSearch)) shouldInclude = false;
    }
    if (phoneSearch && shouldInclude) {
      if (!guardian.Phone.toLocaleLowerCase('tr-TR').includes(phoneSearch)) shouldInclude = false;
    }
    if (studentNameSearch && shouldInclude) {
      if (!guardian.Students || guardian.Students.length === 0) {
        shouldInclude = false;
      } else {
        const hasMatchingStudent = guardian.Students.some(student => {
          const studentName = `${student.First_Name} ${student.Last_Name}`.toLocaleLowerCase('tr-TR');
          return studentName.includes(studentNameSearch);
        });
        if (!hasMatchingStudent) shouldInclude = false;
      }
    }
    return shouldInclude;
  });
  window.displayPassiveGuardianSearchResults(filteredGuardians.length, nameSearch, phoneSearch, studentNameSearch);
  window.displayPassiveGuardians(filteredGuardians);
};

window.displayPassiveGuardianSearchResults = function displayPassiveGuardianSearchResults(totalResults, nameSearch, phoneSearch, studentNameSearch) {
  const searchResultsDiv = document.getElementById('guardianSearchResults');
  let searchCriteria = [];
  if (nameSearch) searchCriteria.push(`Veli Adı: "${nameSearch}"`);
  if (phoneSearch) searchCriteria.push(`Telefon: "${phoneSearch}"`);
  if (studentNameSearch) searchCriteria.push(`Öğrenci Adı: "${studentNameSearch}"`);
  if (searchCriteria.length > 0) {
    searchResultsDiv.innerHTML = `
      <div class="search-results">
        🔍 Arama kriterleri: ${searchCriteria.join(', ')} | 
        📊 Bulunan sonuç: ${totalResults} veli
      </div>
    `;
    searchResultsDiv.style.display = 'block';
  } else {
    searchResultsDiv.style.display = 'none';
  }
};

window.clearPassiveGuardianSearch = function clearPassiveGuardianSearch() {
  document.getElementById('guardianNameSearch').value = '';
  document.getElementById('guardianPhoneSearch').value = '';
  document.getElementById('studentNameSearch').value = '';
  document.getElementById('guardianSearchResults').style.display = 'none';
  if (window.allPassiveGuardiansData) {
    window.displayPassiveGuardians(window.allPassiveGuardiansData);
  }
};

window.reactivateGuardian = async function reactivateGuardian(guardianId, guardianName) {
  if (confirm(`"${guardianName}" adlı veliyi aktif hale getirmek istediğinizden emin misiniz?`)) {
    try {
      const response = await fetch(`/api/admin/reactivate-guardian/${guardianId}`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Veli aktifleştirilirken hata oluştu');
      }
      const result = await response.json();
      alert(result.message);
      window.loadPassiveGuardians();
    } catch (error) {
      console.error('Error reactivating guardian:', error);
      alert('Veli aktifleştirilirken hata oluştu: ' + error.message);
    }
  }
};

window.permanentlyDeleteGuardian = async function permanentlyDeleteGuardian(guardianId, guardianName) {
  if (confirm(`"${guardianName}" adlı veliyi KALICI olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
    try {
      const response = await fetch(`/api/admin/permanently-delete-guardian/${guardianId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Veli kalıcı olarak silinirken hata oluştu');
      }
      const result = await response.json();
      alert(result.message);
      window.loadPassiveGuardians();
    } catch (error) {
      console.error('Error permanently deleting guardian:', error);
      alert('Veli kalıcı olarak silinirken hata oluştu: ' + error.message);
    }
  }
};

window.loadGuardianList = async function loadGuardianList() {
  const container = document.getElementById('guardianListContainer');
  container.innerHTML = '<div class="loading">Veli listesi yükleniyor...</div>';
  try {
    const response = await fetch('/api/admin/guardians', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Veli listesi alınamadı');
    }
    const data = await response.json();
    window.allGuardiansData = data.guardians;
    window.displayGuardianList(data.guardians);
  } catch (error) {
    console.error('Error loading guardians:', error);
    container.innerHTML = '<div class="error">Veli listesi yüklenirken hata oluştu.</div>';
  }
}

window.displayGuardianList = function displayGuardianList(guardians) {
  const container = document.getElementById('guardianListContainer');
  if (!guardians || guardians.length === 0) {
    container.innerHTML = '<div class="no-guardians">Veli bulunmuyor.</div>';
    return;
  }
  let html = '';
  guardians.forEach(guardian => {
    let studentText = '';
    let activeStudents = [];
    if (guardian.Students && guardian.Students.length > 0) {
      activeStudents = guardian.Students.filter(s => !s.Status || s.Status === 'Aktif');
    }
    if (activeStudents.length > 0) {
      const studentNames = activeStudents.map(s => `${s.First_Name} ${s.Last_Name}`).join(', ');
      studentText = `<div class="student-info">👥 Öğrenciler: ${studentNames}</div>`;
    } else {
      studentText = '<div class="student-info">👥 Aktif öğrenci yok</div>';
    }
    html += `
      <div class="guardian-item">
        <div class="guardian-info">
          <div class="guardian-name">${guardian.First_Name} ${guardian.Last_Name}</div>
          <div class="guardian-details">📧 ${guardian.Email || 'Belirtilmemiş'}</div>
          <div class="guardian-details">📞 ${guardian.Phone || 'Belirtilmemiş'}</div>
          ${studentText}
          <div class="guardian-status">❌ Durum: Pasif</div>
        </div>
        <div class="guardian-actions">
          <button class="reactivate-btn" onclick="window.reactivateGuardian(${guardian.Guardian_ID}, '${guardian.First_Name} ${guardian.Last_Name}')">
            ✅ Aktifleştir
          </button>
          <button class="delete-btn" onclick="window.permanentlyDeleteGuardian(${guardian.Guardian_ID}, '${guardian.First_Name} ${guardian.Last_Name}')">
            🗑️ Kalıcı Sil
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

window.deleteGuardian = async function deleteGuardian(guardianId, guardianName) {
  if (confirm(`"${guardianName}" adlı veliyi pasife almak istediğinizden emin misiniz?`)) {
    try {
      const response = await fetch(`/api/guardians/${guardianId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Veli pasife alınırken hata oluştu');
      }
      const result = await response.json();
      alert(result.message);
      window.loadGuardianList();
    } catch (error) {
      console.error('Error deleting guardian:', error);
      alert('Veli pasife alınırken hata oluştu: ' + error.message);
    }
  }
}

window.editGuardian = function editGuardian(guardianId, guardianName) {
  localStorage.setItem('editGuardianId', guardianId);
  alert('Veli düzenleme eklemedim daha ' + guardianId); 
  // window.location.href = '/edit_guardian.html';
}

window.searchGuardians = function searchGuardians() {
  const nameSearch = document.getElementById('guardianNameSearch').value.toLocaleLowerCase('tr-TR');
  const phoneSearch = document.getElementById('guardianPhoneSearch').value.toLocaleLowerCase('tr-TR');
  const studentNameSearch = document.getElementById('studentNameSearch').value.toLocaleLowerCase('tr-TR');
  if (!window.allGuardiansData) {
    alert('Veli verisi henüz yüklenmedi.');
    return;
  }
  if (!nameSearch && !phoneSearch && !studentNameSearch) {
    window.displayGuardianSearchResults(0, nameSearch, phoneSearch, studentNameSearch);
    window.displayGuardianList(window.allGuardiansData);
    return;
  }
  const filteredGuardians = window.allGuardiansData.filter(guardian => {
    let shouldInclude = true;
    if (nameSearch) {
      const fullName = `${guardian.First_Name} ${guardian.Last_Name}`.toLocaleLowerCase('tr-TR');
      if (!fullName.includes(nameSearch)) shouldInclude = false;
    }
    if (phoneSearch && shouldInclude) {
      if (!guardian.Phone.toLocaleLowerCase('tr-TR').includes(phoneSearch)) shouldInclude = false;
    }
    if (studentNameSearch && shouldInclude) {
      if (!guardian.Students || guardian.Students.length === 0) {
        shouldInclude = false;
      } else {
        const hasMatchingStudent = guardian.Students.some(student => {
          const studentName = `${student.First_Name} ${student.Last_Name}`.toLocaleLowerCase('tr-TR');
          return studentName.includes(studentNameSearch);
        });
        if (!hasMatchingStudent) shouldInclude = false;
      }
    }
    return shouldInclude;
  });
  window.displayGuardianSearchResults(filteredGuardians.length, nameSearch, phoneSearch, studentNameSearch);
  window.displayGuardianList(filteredGuardians);
}

window.displayGuardianSearchResults = function displayGuardianSearchResults(totalResults, nameSearch, phoneSearch, studentNameSearch) {
  const searchResultsDiv = document.getElementById('guardianSearchResults');
  let searchCriteria = [];
  if (nameSearch) searchCriteria.push(`Veli Adı: "${nameSearch}"`);
  if (phoneSearch) searchCriteria.push(`Telefon: "${phoneSearch}"`);
  if (studentNameSearch) searchCriteria.push(`Öğrenci Adı: "${studentNameSearch}"`);
  if (searchCriteria.length > 0) {
    searchResultsDiv.innerHTML = `
      <div class="search-results">
        🔍 Arama kriterleri: ${searchCriteria.join(', ')} | 
        📊 Bulunan sonuç: ${totalResults} veli
      </div>
    `;
    searchResultsDiv.style.display = 'block';
  } else {
    searchResultsDiv.style.display = 'none';
  }
}

window.clearGuardianSearch = function clearGuardianSearch() {
  document.getElementById('guardianNameSearch').value = '';
  document.getElementById('guardianPhoneSearch').value = '';
  document.getElementById('studentNameSearch').value = '';
  document.getElementById('guardianSearchResults').style.display = 'none';
  if (window.allGuardiansData) {
    window.displayGuardianList(window.allGuardiansData);
  }
}

// Modal açma/kapama ve form işlemleri
window.initGuardianModal = function initGuardianModal() {
  let guardianIti;
  const openGuardianModalBtn = document.getElementById('openGuardianModalBtn');
  const guardianModal = document.getElementById('guardianModal');
  const closeGuardianModalBtn = document.getElementById('closeGuardianModalBtn');
  const guardianForm = document.getElementById('registerGuardianForm');
  const guardianPhoneError = document.getElementById('guardianPhoneError');
  const guardianEmailError = document.getElementById('guardianEmailError');
  const guardianRegisterError = document.getElementById('guardianRegisterError');

  if (openGuardianModalBtn && guardianModal && closeGuardianModalBtn) {
    openGuardianModalBtn.addEventListener('click', () => {
      guardianModal.style.display = 'flex';
      setTimeout(() => {
        const guardianPhoneInput = document.getElementById('guardianPhone');
        if (guardianPhoneInput) {
          if (guardianIti) guardianIti.destroy();
          guardianIti = window.intlTelInput(guardianPhoneInput, {
            initialCountry: 'tr',
            separateDialCode: true,
            nationalMode: true,
            autoPlaceholder: 'polite',
            formatOnDisplay: true,
            utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.5.2/build/js/utils.js'
          });
        }
      }, 0);
    });
    closeGuardianModalBtn.addEventListener('click', () => {
      guardianModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
      if (e.target === guardianModal) guardianModal.style.display = 'none';
    });
  }

  if (guardianForm) {
    guardianForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      guardianPhoneError.style.display = 'none';
      guardianEmailError.style.display = 'none';
      guardianRegisterError.style.display = 'none';
      if (!guardianIti || !guardianIti.isValidNumber()) {
        guardianPhoneError.style.display = 'block';
        return;
      }
      const data = {
        firstName: guardianForm.guardianFirstName.value,
        lastName: guardianForm.guardianLastName.value,
        phone: guardianIti.getNumber(),
        email: guardianForm.guardianEmail.value,
        password: guardianForm.guardianPassword.value,
        confirmPassword: guardianForm.guardianConfirmPassword.value,
        occupation: guardianForm.guardianOccupation.value
      };
      try {
        const response = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
          if (result.error && result.error.toLowerCase().includes('email')) {
            guardianEmailError.style.display = 'block';
            guardianForm.reset();
          } else {
            guardianRegisterError.textContent = result.error || 'Kayıt başarısız oldu.';
            guardianRegisterError.style.display = 'block';
          }
        } else {
          guardianModal.style.display = 'none';
        }
      } catch (err) {
        guardianRegisterError.textContent = 'Bağlantı hatası. Lütfen daha sonra tekrar deneyin.';
        guardianRegisterError.style.display = 'block';
      }
    });
    document.querySelectorAll('#guardianModal .togglePassword').forEach(button => {
      button.addEventListener('click', () => {
        const input = button.previousElementSibling;
        if (input.type === "password") {
          input.type = "text";
          button.textContent = "Gizle";
        } else {
          input.type = "password";
          button.textContent = "Göster";
        }
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  window.initGuardianModal();
  window.loadGuardianList();
});
