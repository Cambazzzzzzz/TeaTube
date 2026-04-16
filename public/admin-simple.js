// Admin Panel JavaScript
const API = window.location.hostname === 'localhost' ? 'http://localhost:3456/api' : window.location.origin + '/api';
let adminData = null;

function adminLogin() {
  const password = document.getElementById('adminPassword').value;
  const ADMIN_PASSWORD = 'bcics316';
  
  if (password === ADMIN_PASSWORD) {
    adminData = { token: 'admin-token-' + Date.now() };
    localStorage.setItem('adminData', JSON.stringify(adminData));
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'block';
    showSection('dashboard');
  } else {
    document.getElementById('loginError').textContent = 'Yanlış şifre!';
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('adminPassword').value = '';
  }
}

function adminLogout() {
  localStorage.removeItem('adminData');
  location.reload();
}

function showSection(section) {
  // Aktif nav item'ı güncelle
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  event.target.closest('.nav-item').classList.add('active');
  
  // Topbar başlığını güncelle
  const titles = {
    'dashboard': 'Dashboard',
    'users': 'Kullanıcılar',
    'channels': 'Kanallar',
    'personal': 'Kişisel Hesaplar',
    'ip-bans': 'IP Banları',
    'videos': 'Videolar',
    'groups': 'Gruplar',
    'messages': 'Mesajlaşmalar',
    'music-applications': 'TS Music Başvuruları',
    'music-artists': 'TS Music Sanatçıları',
    'music-songs': 'TS Music Şarkıları',
    'announcements': 'Duyurular',
    'badges': 'Rozetler',
    'admin-settings': 'Admin Ayarları'
  };
  
  document.getElementById('topbarTitle').textContent = titles[section] || section;
  
  const content = document.getElementById('mainContent');
  
  switch(section) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'users':
      loadUsers();
      break;
    case 'channels':
      loadChannels();
      break;
    case 'personal':
      loadPersonal();
      break;
    case 'ip-bans':
      loadIPBans();
      break;
    case 'videos':
      loadVideos();
      break;
    case 'groups':
      loadGroups();
      break;
    case 'messages':
      loadMessages();
      break;
    case 'music-applications':
      loadMusicApplications();
      break;
    case 'music-artists':
      loadMusicArtists();
      break;
    case 'music-songs':
      loadMusicSongs();
      break;
    case 'announcements':
      loadAnnouncements();
      break;
    case 'badges':
      loadBadges();
      break;
    case 'admin-settings':
      loadAdminSettings();
      break;
    default:
      content.innerHTML = `<h2>${titles[section]}</h2><p>Bu bölüm yakında gelecek...</p>`;
  }
}

async function loadDashboard() {
  const content = document.getElementById('mainContent');
  
  try {
    const usersRes = await fetch(API + '/admin/stats/users', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    const videosRes = await fetch(API + '/admin/stats/videos', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    const users = await usersRes.json();
    const videos = await videosRes.json();
    
    content.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="s-icon" style="background:#ff003315">
            <i class="fas fa-users" style="color:#ff0033"></i>
          </div>
          <div class="val">${users.total || 0}</div>
          <div class="lbl">Toplam Kullanıcı</div>
        </div>
        <div class="stat-card">
          <div class="s-icon" style="background:#1db95415">
            <i class="fas fa-video" style="color:#1db954"></i>
          </div>
          <div class="val">${videos.total || 0}</div>
          <div class="lbl">Toplam Video</div>
        </div>
        <div class="stat-card">
          <div class="s-icon" style="background:#ffc80015">
            <i class="fas fa-layer-group" style="color:#ffc800"></i>
          </div>
          <div class="val">0</div>
          <div class="lbl">Toplam Grup</div>
        </div>
        <div class="stat-card">
          <div class="s-icon" style="background:#00bfff15">
            <i class="fas fa-comment-dots" style="color:#00bfff"></i>
          </div>
          <div class="val">0</div>
          <div class="lbl">Toplam Mesaj</div>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466">Dashboard yüklenemedi: ${e.message}</p>`;
  }
}

async function loadUsers() {
  const content = document.getElementById('mainContent');
  
  try {
    const res = await fetch(API + '/admin/users', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    const users = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>Kullanıcılar</h2>
      </div>
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Kullanıcı Adı</th>
              <th>Takma Ad</th>
              <th>Oluşturma Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    users.forEach(user => {
      html += `
        <tr>
          <td>${user.id}</td>
          <td>${user.username}</td>
          <td>${user.nickname}</td>
          <td>${new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
          <td>
            <button class="a-btn a-btn-sm a-btn-gray" onclick="alert('Detaylar: ${user.username}')">Detay</button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466">Kullanıcılar yüklenemedi: ${e.message}</p>`;
  }
}

async function loadVideos() {
  const content = document.getElementById('mainContent');
  
  try {
    const res = await fetch(API + '/admin/videos', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    const videos = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>Videolar</h2>
      </div>
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Başlık</th>
              <th>Yükleyen</th>
              <th>Yükleme Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    videos.forEach(video => {
      html += `
        <tr>
          <td>${video.id}</td>
          <td>${video.title}</td>
          <td>${video.uploader}</td>
          <td>${new Date(video.created_at).toLocaleDateString('tr-TR')}</td>
          <td>
            <button class="a-btn a-btn-sm a-btn-gray" onclick="alert('Video: ${video.title}')">Detay</button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466">Videolar yüklenemedi: ${e.message}</p>`;
  }
}

function loadAdminSettings() {
  const content = document.getElementById('mainContent');
  
  content.innerHTML = `
    <h2>Admin Ayarları</h2>
    <div style="background:#1a1a1a;border-radius:8px;padding:20px;max-width:480px">
      <h4 style="margin:0 0 12px">Admin Şifresi Değiştir</h4>
      <input id="adminCurrentPw" class="a-input" type="password" placeholder="Mevcut şifre" style="width:100%;margin-bottom:8px">
      <input id="adminNewPw" class="a-input" type="password" placeholder="Yeni şifre" style="width:100%;margin-bottom:8px">
      <input id="adminNewPwConfirm" class="a-input" type="password" placeholder="Yeni şifre (tekrar)" style="width:100%;margin-bottom:12px">
      <button class="a-btn" style="width:100%" onclick="saveAdminPassword()">Şifreyi Değiştir</button>
    </div>
  `;
}

function saveAdminPassword() {
  const current = document.getElementById('adminCurrentPw').value;
  const newPw = document.getElementById('adminNewPw').value;
  const confirm = document.getElementById('adminNewPwConfirm').value;
  
  if (current !== 'bcics316') {
    showToast('Mevcut şifre yanlış!', false);
    return;
  }
  
  if (newPw !== confirm) {
    showToast('Yeni şifreler eşleşmiyor!', false);
    return;
  }
  
  if (newPw.length < 6) {
    showToast('Şifre en az 6 karakter olmalı!', false);
    return;
  }
  
  showToast('Şifre değiştirildi! (Demo)', true);
}

// Diğer sayfalar
async function loadChannels() {
  const content = document.getElementById('mainContent');
  try {
    const res = await fetch(API + '/admin/channels', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    const channels = await res.json();
    
    let html = `<div class="section-header"><h2>Kanallar</h2></div><div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Kanal Adı</th><th>Sahibi</th><th>Oluşturma</th><th>İşlemler</th></tr></thead><tbody>`;
    
    channels.forEach(ch => {
      html += `<tr><td>${ch.id}</td><td>${ch.channel_name}</td><td>${ch.owner_id}</td><td>${new Date(ch.created_at).toLocaleDateString('tr-TR')}</td><td><button class="a-btn a-btn-sm a-btn-gray">Detay</button></td></tr>`;
    });
    
    html += `</tbody></table></div>`;
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466">Kanallar yüklenemedi: ${e.message}</p>`;
  }
}

async function loadPersonal() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>Kişisel Hesaplar</h2></div>
    <p>Kişisel hesaplar yönetim sayfası</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Kullanıcı</th><th>Durum</th></tr></thead><tbody><tr><td colspan="3" style="text-align:center;padding:20px">Veri yükleniyor...</td></tr></tbody></table></div>
  `;
}

async function loadIPBans() {
  const content = document.getElementById('mainContent');
  try {
    const res = await fetch(API + '/admin/ip-bans', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    const bans = await res.json();
    
    let html = `<div class="section-header"><h2>IP Banları</h2></div><div class="table-wrap"><table class="a-table"><thead><tr><th>IP Adresi</th><th>Sebep</th><th>Tarih</th><th>İşlemler</th></tr></thead><tbody>`;
    
    if (bans.length === 0) {
      html += `<tr><td colspan="4" style="text-align:center;padding:20px">Aktif IP banı yok</td></tr>`;
    } else {
      bans.forEach(ban => {
        html += `<tr><td>${ban.ip_address}</td><td>${ban.reason}</td><td>${new Date(ban.blocked_until).toLocaleDateString('tr-TR')}</td><td><button class="a-btn a-btn-sm a-btn-orange" onclick="alert('Kaldır: ${ban.ip_address}')">Kaldır</button></td></tr>`;
      });
    }
    
    html += `</tbody></table></div>`;
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466">IP banları yüklenemedi: ${e.message}</p>`;
  }
}

async function loadGroups() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>Gruplar</h2></div>
    <p>Gruplar yönetim sayfası</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Grup Adı</th><th>Üye Sayısı</th></tr></thead><tbody><tr><td colspan="3" style="text-align:center;padding:20px">Veri yükleniyor...</td></tr></tbody></table></div>
  `;
}

async function loadMessages() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>Mesajlaşmalar</h2></div>
    <p>Mesajlaşmalar yönetim sayfası</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Gönderen</th><th>Alıcı</th><th>Tarih</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:20px">Veri yükleniyor...</td></tr></tbody></table></div>
  `;
}

async function loadMusicApplications() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>TS Music Başvuruları</h2></div>
    <p>Sanatçı başvuruları yönetim sayfası</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Başvuran</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:20px">Başvuru yok</td></tr></tbody></table></div>
  `;
}

async function loadMusicArtists() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>TS Music Sanatçıları</h2></div>
    <p>Sanatçılar yönetim sayfası</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Sanatçı Adı</th><th>Şarkı Sayısı</th></tr></thead><tbody><tr><td colspan="3" style="text-align:center;padding:20px">Veri yükleniyor...</td></tr></tbody></table></div>
  `;
}

async function loadMusicSongs() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>TS Music Şarkıları</h2></div>
    <p>Şarkılar yönetim sayfası</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Şarkı Adı</th><th>Sanatçı</th><th>Tarih</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:20px">Veri yükleniyor...</td></tr></tbody></table></div>
  `;
}

async function loadAnnouncements() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>Duyurular</h2></div>
    <button class="a-btn" onclick="alert('Yeni duyuru oluştur')">+ Yeni Duyuru</button>
    <div class="table-wrap" style="margin-top:16px"><table class="a-table"><thead><tr><th>ID</th><th>Başlık</th><th>Tarih</th><th>İşlemler</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:20px">Duyuru yok</td></tr></tbody></table></div>
  `;
}

async function loadBadges() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>Rozetler</h2></div>
    <button class="a-btn" onclick="alert('Yeni rozet oluştur')">+ Yeni Rozet</button>
    <div class="table-wrap" style="margin-top:16px"><table class="a-table"><thead><tr><th>ID</th><th>Rozet Adı</th><th>Sahip Sayısı</th><th>İşlemler</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:20px">Rozet yok</td></tr></tbody></table></div>
  `;
}

function showToast(msg, success = true) {
  const toast = document.getElementById('adminToast');
  toast.textContent = msg;
  toast.style.background = success ? '#1a4d1a' : '#4d1a1a';
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Sayfa yüklendiğinde
window.addEventListener('load', () => {
  const saved = localStorage.getItem('adminData');
  if (saved) {
    adminData = JSON.parse(saved);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'block';
    showSection('dashboard');
  }
});