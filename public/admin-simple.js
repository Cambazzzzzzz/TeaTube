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
  content.innerHTML = `<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ff0033"></i><p style="margin-top:12px;color:#666">Yükleniyor...</p></div>`;
  
  try {
    const res = await fetch(API + '/admin/users', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const users = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>Kullanıcılar (${users.length})</h2>
      </div>
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Kullanıcı Adı</th>
              <th>Takma Ad</th>
              <th>Son IP</th>
              <th>Durum</th>
              <th>Oluşturma Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (users.length === 0) {
      html += `<tr><td colspan="8" style="text-align:center;padding:20px">Kullanıcı bulunamadı</td></tr>`;
    } else {
      users.forEach(user => {
        const status = user.is_suspended ? '<span class="badge badge-red"><i class="fas fa-ban"></i> Askıya Alındı</span>' : '<span class="badge badge-green"><i class="fas fa-check"></i> Aktif</span>';
        const lastIp = user.last_ip ? `<code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:11px">${user.last_ip}</code>` : '<span style="color:#666">-</span>';
        const regTime = new Date(user.created_at).toLocaleString('tr-TR');
        
        html += `
          <tr>
            <td><code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:11px">${user.id}</code></td>
            <td><strong>${user.username}</strong></td>
            <td>${user.nickname || '-'}</td>
            <td>${lastIp}</td>
            <td>${status}</td>
            <td title="${regTime}">${new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
            <td>
              <button class="a-btn a-btn-sm a-btn-gray" onclick="viewUserDetails('${user.id}')">Detay</button>
              ${user.last_ip ? `<button class="a-btn a-btn-sm a-btn-orange" onclick="banUserIP('${user.last_ip}', '${user.username}')"><i class="fas fa-ban"></i> IP Yasakla</button>` : ''}
            </td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466"><i class="fas fa-exclamation-circle"></i> Kullanıcılar yüklenemedi: ${e.message}</p>`;
  }
}

function viewUserDetails(userId) {
  alert('Kullanıcı detayları: ' + userId + ' (Yakında gelecek)');
}

async function banUserIP(ipAddress, username) {
  if (!confirm(`${username} kullanıcısının IP adresi (${ipAddress}) yasaklansın mı?`)) return;
  
  const reason = prompt('Ban sebebi:', `${username} kullanıcısı yasaklandı`);
  if (reason === null) return;
  
  const hours = prompt('Kaç saat süreyle? (varsayılan: 24)', '24');
  if (hours === null) return;
  
  try {
    const res = await fetch(API + '/admin/ip-bans', {
      method: 'POST',
      headers: { 
        'x-admin-token': adminData?.token || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        ip: ipAddress, 
        reason: reason || `${username} kullanıcısı yasaklandı`, 
        hours: parseInt(hours) || 24 
      })
    });
    
    if (res.ok) {
      showToast(`${ipAddress} adresi ${hours} saat süreyle banlandı`, true);
      loadUsers();
    } else {
      const error = await res.json();
      showToast('Hata: ' + (error.error || 'Bilinmeyen hata'), false);
    }
  } catch (e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function loadVideos() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ff0033"></i><p style="margin-top:12px;color:#666">Yükleniyor...</p></div>`;
  
  try {
    const res = await fetch(API + '/admin/videos', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const videos = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>Videolar (${videos.length})</h2>
      </div>
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Başlık</th>
              <th>Kanal</th>
              <th>Yükleyen</th>
              <th>Görüntüleme</th>
              <th>Yükleme Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (videos.length === 0) {
      html += `<tr><td colspan="7" style="text-align:center;padding:20px">Video bulunamadı</td></tr>`;
    } else {
      videos.forEach(video => {
        html += `
          <tr>
            <td><code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:11px">${video.id}</code></td>
            <td><strong>${video.title || 'Başlıksız'}</strong></td>
            <td>${video.channel_name || '-'}</td>
            <td>${video.username || '-'}</td>
            <td>${video.views || 0}</td>
            <td>${new Date(video.created_at).toLocaleDateString('tr-TR')}</td>
            <td>
              <button class="a-btn a-btn-sm a-btn-gray" onclick="alert('Video: ${video.title}')">Detay</button>
            </td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466"><i class="fas fa-exclamation-circle"></i> Videolar yüklenemedi: ${e.message}</p>`;
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
  content.innerHTML = `<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ff0033"></i><p style="margin-top:12px;color:#666">Yükleniyor...</p></div>`;
  
  try {
    const res = await fetch(API + '/admin/channels', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const channels = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>Kanallar (${channels.length})</h2>
      </div>
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Kanal Adı</th>
              <th>Sahibi</th>
              <th>Tip</th>
              <th>Video</th>
              <th>Abone</th>
              <th>Oluşturma</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (channels.length === 0) {
      html += `<tr><td colspan="8" style="text-align:center;padding:20px">Kanal bulunamadı</td></tr>`;
    } else {
      channels.forEach(ch => {
        const type = ch.account_type === 'channel' ? '<span class="badge badge-green">Kanal</span>' : '<span class="badge badge-gray">Kişisel</span>';
        
        html += `
          <tr>
            <td><code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:11px">${ch.id}</code></td>
            <td><strong>${ch.channel_name}</strong></td>
            <td>${ch.username}</td>
            <td>${type}</td>
            <td>${ch.video_count || 0}</td>
            <td>${ch.sub_count || 0}</td>
            <td>${new Date(ch.created_at).toLocaleDateString('tr-TR')}</td>
            <td>
              <button class="a-btn a-btn-sm a-btn-gray" onclick="alert('Kanal: ${ch.channel_name}')">Detay</button>
            </td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466"><i class="fas fa-exclamation-circle"></i> Kanallar yüklenemedi: ${e.message}</p>`;
  }
}

async function loadPersonal() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ff0033"></i><p style="margin-top:12px;color:#666">Yükleniyor...</p></div>`;
  
  try {
    const res = await fetch(API + '/admin/channels?type=personal', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const accounts = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>Kişisel Hesaplar (${accounts.length})</h2>
      </div>
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Hesap Adı</th>
              <th>Sahibi</th>
              <th>Video</th>
              <th>Abone</th>
              <th>Oluşturma</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (accounts.length === 0) {
      html += `<tr><td colspan="7" style="text-align:center;padding:20px">Kişisel hesap bulunamadı</td></tr>`;
    } else {
      accounts.forEach(acc => {
        html += `
          <tr>
            <td><code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:11px">${acc.id}</code></td>
            <td><strong>${acc.channel_name}</strong></td>
            <td>${acc.username}</td>
            <td>${acc.video_count || 0}</td>
            <td>${acc.sub_count || 0}</td>
            <td>${new Date(acc.created_at).toLocaleDateString('tr-TR')}</td>
            <td>
              <button class="a-btn a-btn-sm a-btn-gray" onclick="alert('Hesap: ${acc.channel_name}')">Detay</button>
            </td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466"><i class="fas fa-exclamation-circle"></i> Kişisel hesaplar yüklenemedi: ${e.message}</p>`;
  }
}

async function loadIPBans() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ff0033"></i><p style="margin-top:12px;color:#666">Yükleniyor...</p></div>`;
  
  try {
    const res = await fetch(API + '/admin/ip-bans', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const bans = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>IP Banları (${bans.length})</h2>
        <button class="a-btn a-btn-sm" onclick="showAddIPBanModal()"><i class="fas fa-plus"></i> Yeni IP Ban</button>
      </div>
      
      <!-- IP Ban Ekleme Formu -->
      <div id="addIPBanForm" style="display:none;background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:20px">
        <h3 style="margin:0 0 16px;font-size:16px">Yeni IP Ban Ekle</h3>
        <div style="display:grid;gap:12px">
          <div>
            <label style="display:block;font-size:12px;color:#666;margin-bottom:6px">IP Adresi</label>
            <input type="text" id="newBanIP" class="a-input" placeholder="örn: 192.168.1.1" style="width:100%">
          </div>
          <div>
            <label style="display:block;font-size:12px;color:#666;margin-bottom:6px">Sebep</label>
            <input type="text" id="newBanReason" class="a-input" placeholder="Ban sebebi" style="width:100%">
          </div>
          <div>
            <label style="display:block;font-size:12px;color:#666;margin-bottom:6px">Süre (saat)</label>
            <input type="number" id="newBanHours" class="a-input" value="24" min="1" style="width:100%">
          </div>
          <div style="display:flex;gap:8px">
            <button class="a-btn" onclick="addIPBan()"><i class="fas fa-ban"></i> Banla</button>
            <button class="a-btn a-btn-gray" onclick="document.getElementById('addIPBanForm').style.display='none'">İptal</button>
          </div>
        </div>
      </div>
      
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>IP Adresi</th>
              <th>Sebep</th>
              <th>Tarih</th>
              <th>Kaldırılacak</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (bans.length === 0) {
      html += `<tr><td colspan="5" style="text-align:center;padding:20px">Aktif IP banı yok</td></tr>`;
    } else {
      bans.forEach(ban => {
        const bannedUntil = new Date(ban.blocked_until);
        const now = new Date();
        const isActive = bannedUntil > now;
        
        html += `
          <tr>
            <td><code style="background:#1a1a1a;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600">${ban.ip_address}</code></td>
            <td>${ban.reason || 'Belirtilmemiş'}</td>
            <td>${new Date(ban.created_at).toLocaleDateString('tr-TR')}</td>
            <td>${isActive ? bannedUntil.toLocaleDateString('tr-TR') : '<span style="color:#666">Süresi Doldu</span>'}</td>
            <td>
              <button class="a-btn a-btn-sm a-btn-orange" onclick="removeIPBan('${ban.id}', '${ban.ip_address}')">Kaldır</button>
            </td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466"><i class="fas fa-exclamation-circle"></i> IP banları yüklenemedi: ${e.message}</p>`;
  }
}

function showAddIPBanModal() {
  const form = document.getElementById('addIPBanForm');
  if (form) form.style.display = 'block';
}

async function addIPBan() {
  const ip = document.getElementById('newBanIP').value.trim();
  const reason = document.getElementById('newBanReason').value.trim();
  const hours = parseInt(document.getElementById('newBanHours').value) || 24;
  
  if (!ip) {
    showToast('IP adresi gerekli!', false);
    return;
  }
  
  // IP format kontrolü
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    showToast('Geçersiz IP adresi formatı!', false);
    return;
  }
  
  try {
    const res = await fetch(API + '/admin/ip-bans', {
      method: 'POST',
      headers: { 
        'x-admin-token': adminData?.token || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ip, reason, hours })
    });
    
    if (res.ok) {
      showToast(`${ip} adresi ${hours} saat süreyle banlandı`, true);
      document.getElementById('addIPBanForm').style.display = 'none';
      document.getElementById('newBanIP').value = '';
      document.getElementById('newBanReason').value = '';
      document.getElementById('newBanHours').value = '24';
      loadIPBans();
    } else {
      const error = await res.json();
      showToast('Hata: ' + (error.error || 'Bilinmeyen hata'), false);
    }
  } catch (e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function removeIPBan(banId, ipAddress) {
  if (!confirm(`${ipAddress} adresinin banını kaldırmak istediğinize emin misiniz?`)) return;
  
  try {
    const res = await fetch(API + '/admin/ip-bans/' + banId, {
      method: 'DELETE',
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    if (res.ok) {
      showToast('IP banı kaldırıldı', true);
      loadIPBans();
    } else {
      showToast('Hata: ' + (await res.text()), false);
    }
  } catch (e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function loadGroups() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>Gruplar</h2></div>
    <p style="color:#666">Grup yönetimi yakında gelecek...</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Grup Adı</th><th>Üye Sayısı</th><th>Oluşturma</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:20px">Veri yükleniyor...</td></tr></tbody></table></div>
  `;
}

async function loadMessages() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header"><h2>Mesajlaşmalar</h2></div>
    <p style="color:#666">Mesaj yönetimi yakında gelecek...</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Gönderen</th><th>Alıcı</th><th>Tarih</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:20px">Veri yükleniyor...</td></tr></tbody></table></div>
  `;
}

async function loadMusicApplications() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ff0033"></i><p style="margin-top:12px;color:#666">Yükleniyor...</p></div>`;
  
  try {
    const res = await fetch(API + '/admin/music/applications', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const apps = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>TS Music Başvuruları (${apps.length})</h2>
      </div>
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Başvuran</th>
              <th>Sanatçı Adı</th>
              <th>Durum</th>
              <th>Tarih</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (apps.length === 0) {
      html += `<tr><td colspan="6" style="text-align:center;padding:20px">Başvuru bulunamadı</td></tr>`;
    } else {
      apps.forEach(app => {
        const statusBadge = app.status === 'pending' ? '<span class="badge badge-yellow">Beklemede</span>' : 
                           app.status === 'accepted' ? '<span class="badge badge-green">Kabul</span>' : 
                           '<span class="badge badge-red">Red</span>';
        
        html += `
          <tr>
            <td><code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:11px">${app.id}</code></td>
            <td>${app.username}</td>
            <td>${app.artist_name}</td>
            <td>${statusBadge}</td>
            <td>${new Date(app.created_at).toLocaleDateString('tr-TR')}</td>
            <td>
              <button class="a-btn a-btn-sm a-btn-green" onclick="approveMusicApp('${app.id}')">Kabul</button>
              <button class="a-btn a-btn-sm a-btn-orange" onclick="rejectMusicApp('${app.id}')">Red</button>
            </td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466"><i class="fas fa-exclamation-circle"></i> Başvurular yüklenemedi: ${e.message}</p>`;
  }
}

async function approveMusicApp(appId) {
  try {
    const res = await fetch(API + '/admin/music/application/' + appId, {
      method: 'PUT',
      headers: { 
        'x-admin-token': adminData?.token || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'accepted' })
    });
    
    if (res.ok) {
      showToast('Başvuru kabul edildi', true);
      loadMusicApplications();
    } else {
      showToast('Hata: ' + (await res.text()), false);
    }
  } catch (e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function rejectMusicApp(appId) {
  const reason = prompt('Red sebebi (opsiyonel):');
  if (reason === null) return;
  
  try {
    const res = await fetch(API + '/admin/music/application/' + appId, {
      method: 'PUT',
      headers: { 
        'x-admin-token': adminData?.token || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'rejected', note: reason })
    });
    
    if (res.ok) {
      showToast('Başvuru reddedildi', true);
      loadMusicApplications();
    } else {
      showToast('Hata: ' + (await res.text()), false);
    }
  } catch (e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function loadMusicArtists() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ff0033"></i><p style="margin-top:12px;color:#666">Yükleniyor...</p></div>`;
  
  try {
    const res = await fetch(API + '/admin/music/artists', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const artists = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>TS Music Sanatçıları (${artists.length})</h2>
      </div>
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Sanatçı Adı</th>
              <th>Kullanıcı</th>
              <th>Şarkı Sayısı</th>
              <th>Durum</th>
              <th>Oluşturma</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (artists.length === 0) {
      html += `<tr><td colspan="7" style="text-align:center;padding:20px">Sanatçı bulunamadı</td></tr>`;
    } else {
      artists.forEach(artist => {
        const status = artist.is_suspended ? '<span class="badge badge-red">Askıya Alındı</span>' : '<span class="badge badge-green">Aktif</span>';
        
        html += `
          <tr>
            <td><code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:11px">${artist.id}</code></td>
            <td><strong>${artist.artist_name}</strong></td>
            <td>${artist.username}</td>
            <td>${artist.song_count || 0}</td>
            <td>${status}</td>
            <td>${new Date(artist.created_at).toLocaleDateString('tr-TR')}</td>
            <td>
              <button class="a-btn a-btn-sm a-btn-gray" onclick="alert('Sanatçı: ${artist.artist_name}')">Detay</button>
            </td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466"><i class="fas fa-exclamation-circle"></i> Sanatçılar yüklenemedi: ${e.message}</p>`;
  }
}

async function loadMusicSongs() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ff0033"></i><p style="margin-top:12px;color:#666">Yükleniyor...</p></div>`;
  
  try {
    const res = await fetch(API + '/admin/music/songs', {
      headers: { 'x-admin-token': adminData?.token || '' }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const songs = await res.json();
    
    let html = `
      <div class="section-header">
        <h2>TS Music Şarkıları (${songs.length})</h2>
      </div>
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Şarkı Adı</th>
              <th>Sanatçı</th>
              <th>Tür</th>
              <th>Çalınma</th>
              <th>Yükleme</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (songs.length === 0) {
      html += `<tr><td colspan="7" style="text-align:center;padding:20px">Şarkı bulunamadı</td></tr>`;
    } else {
      songs.forEach(song => {
        html += `
          <tr>
            <td><code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:11px">${song.id}</code></td>
            <td><strong>${song.title}</strong></td>
            <td>${song.artist_name}</td>
            <td>${song.genre || '-'}</td>
            <td>${song.play_count || 0}</td>
            <td>${new Date(song.created_at).toLocaleDateString('tr-TR')}</td>
            <td>
              <button class="a-btn a-btn-sm a-btn-gray" onclick="alert('Şarkı: ${song.title}')">Detay</button>
            </td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<p style="color:#ff4466"><i class="fas fa-exclamation-circle"></i> Şarkılar yüklenemedi: ${e.message}</p>`;
  }
}

async function loadAnnouncements() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header">
      <h2>Duyurular</h2>
      <button class="a-btn a-btn-sm" onclick="alert('Yeni duyuru oluştur (Yakında gelecek)')">+ Yeni Duyuru</button>
    </div>
    <p style="color:#666;margin-bottom:16px">Duyuru yönetimi yakında gelecek...</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Başlık</th><th>Tarih</th><th>İşlemler</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:20px">Duyuru yok</td></tr></tbody></table></div>
  `;
}

async function loadBadges() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="section-header">
      <h2>Rozetler</h2>
      <button class="a-btn a-btn-sm" onclick="alert('Yeni rozet oluştur (Yakında gelecek)')">+ Yeni Rozet</button>
    </div>
    <p style="color:#666;margin-bottom:16px">Rozet yönetimi yakında gelecek...</p>
    <div class="table-wrap"><table class="a-table"><thead><tr><th>ID</th><th>Rozet Adı</th><th>Sahip Sayısı</th><th>İşlemler</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:20px">Rozet yok</td></tr></tbody></table></div>
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