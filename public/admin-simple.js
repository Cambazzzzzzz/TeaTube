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
    'music-applications': 'TeaSocial Music Başvuruları',
    'music-artists': 'TeaSocial Music Sanatçıları',
    'music-songs': 'TeaSocial Music Şarkıları',
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
              <th>Kayıt Tarihi</th>
              <th>Son Giriş</th>
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
            <td style="font-size:12px;color:#888">${user.last_login_at ? user.last_login_at.slice(0,16).replace('T',' ') : '-'}</td>
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
        <h2>TeaSocial Music Başvuruları (${apps.length})</h2>
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
        <h2>TeaSocial Music Sanatçıları (${artists.length})</h2>
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
        <h2>TeaSocial Music Şarkıları (${songs.length})</h2>
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


// ==================== KULLANIM KOŞULLARI YÖNETİMİ ====================

async function loadTermsManagement() {
  const content = document.getElementById('mainContent');
  content.innerHTML = '<div class="loading">Yükleniyor...</div>';
  
  try {
    const res = await fetch(`${API}/admin/terms`);
    const terms = await res.json();
    
    content.innerHTML = `
      <div class="section-header">
        <h2>Kullanım Koşulları Yönetimi</h2>
        <button class="btn-primary" onclick="saveTerms()">
          <i class="fas fa-save"></i> Kaydet
        </button>
      </div>
      
      <div class="card">
        <div class="form-group">
          <label>Kullanım Koşulları İçeriği</label>
          <textarea id="termsContent" rows="20" style="width:100%;padding:12px;border:1px solid #333;background:#1a1a1a;color:#fff;border-radius:8px;font-family:monospace;font-size:14px;line-height:1.6;">${terms.content || ''}</textarea>
        </div>
        
        ${terms.version ? `
          <div style="margin-top:16px;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;">
            <p style="margin:0;font-size:13px;color:#888;">
              <strong>Mevcut Versiyon:</strong> ${terms.version} | 
              <strong>Son Güncelleme:</strong> ${new Date(terms.updated_at).toLocaleString('tr-TR')}
            </p>
          </div>
        ` : ''}
      </div>
      
      <div class="card" style="margin-top:20px;">
        <h3 style="margin-bottom:16px;">Geçmiş Versiyonlar</h3>
        <div id="termsHistory"></div>
      </div>
    `;
    
    loadTermsHistory();
  } catch(err) {
    content.innerHTML = `<div class="error">Hata: ${err.message}</div>`;
  }
}

async function loadTermsHistory() {
  try {
    const res = await fetch(`${API}/admin/terms/history`);
    const history = await res.json();
    
    const historyDiv = document.getElementById('termsHistory');
    if (history.length === 0) {
      historyDiv.innerHTML = '<p style="color:#888;">Henüz geçmiş versiyon yok.</p>';
      return;
    }
    
    historyDiv.innerHTML = history.map(h => `
      <div style="padding:12px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>Versiyon ${h.version}</strong>
          <span style="color:#888;margin-left:12px;">${new Date(h.updated_at).toLocaleString('tr-TR')}</span>
        </div>
        <button class="btn-secondary" onclick="viewTermsVersion(${h.id})">Görüntüle</button>
      </div>
    `).join('');
  } catch(err) {
    console.error('Geçmiş yüklenemedi:', err);
  }
}

async function saveTerms() {
  const content = document.getElementById('termsContent').value;
  if (!content.trim()) {
    alert('İçerik boş olamaz!');
    return;
  }
  
  try {
    const res = await fetch(`${API}/admin/terms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, adminId: 1 })
    });
    
    const data = await res.json();
    if (data.success) {
      alert('Kullanım koşulları güncellendi! Yeni versiyon: ' + data.version);
      loadTermsManagement();
    } else {
      alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
    }
  } catch(err) {
    alert('Kaydetme hatası: ' + err.message);
  }
}

// ==================== VİDEO DETAYLI DÜZENLEME ====================

async function editVideoDetails(videoId) {
  try {
    const res = await fetch(`${API}/admin/video/${videoId}/details`);
    const video = await res.json();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:600px;">
        <div class="modal-header">
          <h3>Video Düzenle</h3>
          <button onclick="this.closest('.modal').remove()" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Başlık</label>
            <input type="text" id="editVideoTitle" value="${video.title}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
          </div>
          
          <div class="form-group">
            <label>Açıklama</label>
            <textarea id="editVideoDesc" rows="4" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">${video.description || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label>Etiketler (virgülle ayırın)</label>
            <input type="text" id="editVideoTags" value="${video.tags || ''}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Görüntüleme</label>
              <input type="number" id="editVideoViews" value="${video.views}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
            </div>
            
            <div class="form-group">
              <label>Beğeni</label>
              <input type="number" id="editVideoLikes" value="${video.likes}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
            </div>
          </div>
          
          <button class="btn-primary" onclick="saveVideoDetails(${videoId})" style="width:100%;margin-top:16px;">
            <i class="fas fa-save"></i> Kaydet
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch(err) {
    alert('Video yüklenemedi: ' + err.message);
  }
}

async function saveVideoDetails(videoId) {
  const title = document.getElementById('editVideoTitle').value;
  const description = document.getElementById('editVideoDesc').value;
  const tags = document.getElementById('editVideoTags').value;
  const views = document.getElementById('editVideoViews').value;
  const likes = document.getElementById('editVideoLikes').value;
  
  try {
    const res = await fetch(`${API}/admin/video/${videoId}/details`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, tags, views, likes })
    });
    
    const data = await res.json();
    if (data.success) {
      alert('Video güncellendi!');
      document.querySelector('.modal').remove();
      loadVideos();
    } else {
      alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
    }
  } catch(err) {
    alert('Kaydetme hatası: ' + err.message);
  }
}

// ==================== ŞARKI DETAYLI DÜZENLEME ====================

async function editSongDetails(songId) {
  try {
    const res = await fetch(`${API}/admin/music/song/${songId}/details`);
    const song = await res.json();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:600px;">
        <div class="modal-header">
          <h3>Şarkı Düzenle</h3>
          <button onclick="this.closest('.modal').remove()" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Şarkı Adı</label>
            <input type="text" id="editSongTitle" value="${song.title}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
          </div>
          
          <div class="form-group">
            <label>Sanatçı</label>
            <input type="text" value="${song.artist_name}" disabled style="width:100%;padding:10px;background:#0a0a0a;border:1px solid #333;color:#888;border-radius:6px;">
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Tür</label>
              <input type="text" id="editSongGenre" value="${song.genre || ''}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
            </div>
            
            <div class="form-group">
              <label>Dinlenme Sayısı</label>
              <input type="number" id="editSongPlays" value="${song.play_count}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
            </div>
          </div>
          
          <div class="form-group">
            <label>Şirket (opsiyonel)</label>
            <input type="text" id="editSongCompany" value="${song.company_name || ''}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
          </div>
          
          <button class="btn-primary" onclick="saveSongDetails(${songId})" style="width:100%;margin-top:16px;">
            <i class="fas fa-save"></i> Kaydet
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch(err) {
    alert('Şarkı yüklenemedi: ' + err.message);
  }
}

async function saveSongDetails(songId) {
  const title = document.getElementById('editSongTitle').value;
  const genre = document.getElementById('editSongGenre').value;
  const play_count = document.getElementById('editSongPlays').value;
  const company_name = document.getElementById('editSongCompany').value;
  
  try {
    const res = await fetch(`${API}/admin/music/song/${songId}/full`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, genre, play_count, company_name })
    });
    
    const data = await res.json();
    if (data.success) {
      alert('Şarkı güncellendi!');
      document.querySelector('.modal').remove();
      loadMusicSongs();
    } else {
      alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
    }
  } catch(err) {
    alert('Kaydetme hatası: ' + err.message);
  }
}

// ==================== REALS ETİKET YÖNETİMİ ====================

async function loadRealsTagManagement() {
  const content = document.getElementById('mainContent');
  content.innerHTML = '<div class="loading">Yükleniyor...</div>';
  
  try {
    const res = await fetch(`${API}/admin/reals/tags`);
    const tags = await res.json();
    
    content.innerHTML = `
      <div class="section-header">
        <h2>Reals Etiket Yönetimi</h2>
      </div>
      
      <div class="card">
        <h3 style="margin-bottom:16px;">Tüm Etiketler (${tags.length})</h3>
        
        ${tags.length === 0 ? '<p style="color:#888;">Henüz etiket yok.</p>' : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Etiket</th>
                  <th>Kullanım Sayısı</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                ${tags.map(t => `
                  <tr>
                    <td><span style="background:#1db954;color:#000;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">#${t.tag}</span></td>
                    <td>${t.count} video</td>
                    <td>
                      <button class="btn-secondary" onclick="replaceRealsTag('${t.tag}')">
                        <i class="fas fa-edit"></i> Değiştir
                      </button>
                      <button class="btn-danger" onclick="deleteRealsTag('${t.tag}')">
                        <i class="fas fa-trash"></i> Sil
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } catch(err) {
    content.innerHTML = `<div class="error">Hata: ${err.message}</div>`;
  }
}

async function replaceRealsTag(oldTag) {
  const newTag = prompt(`"${oldTag}" etiketini ne ile değiştirmek istiyorsunuz?`);
  if (!newTag || newTag === oldTag) return;
  
  try {
    const res = await fetch(`${API}/admin/reals/tags/replace`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldTag, newTag })
    });
    
    const data = await res.json();
    if (data.success) {
      alert(`${data.updated} video güncellendi!`);
      loadRealsTagManagement();
    } else {
      alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
    }
  } catch(err) {
    alert('Hata: ' + err.message);
  }
}

async function deleteRealsTag(tag) {
  if (!confirm(`"${tag}" etiketini tüm videolardan silmek istediğinize emin misiniz?`)) return;
  
  try {
    const res = await fetch(`${API}/admin/reals/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE'
    });
    
    const data = await res.json();
    if (data.success) {
      alert(`${data.updated} videodan etiket silindi!`);
      loadRealsTagManagement();
    } else {
      alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
    }
  } catch(err) {
    alert('Hata: ' + err.message);
  }
}

// ==================== KULLANICI PROFİL DÜZENLEME ====================

async function editUserProfile(userId) {
  try {
    const res = await fetch(`${API}/admin/user/${userId}`);
    const user = await res.json();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:600px;">
        <div class="modal-header">
          <h3>Kullanıcı Düzenle</h3>
          <button onclick="this.closest('.modal').remove()" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <div style="text-align:center;margin-bottom:20px;">
            <img src="${user.profile_photo}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;" onerror="this.src='?'">
            <p style="margin-top:8px;color:#888;">@${user.username}</p>
          </div>
          
          <div class="form-group">
            <label>Nickname</label>
            <input type="text" id="editUserNickname" value="${user.nickname}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
          </div>
          
          <div class="form-group">
            <label>Kullanıcı Adı</label>
            <input type="text" id="editUsername" value="${user.username}" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
          </div>
          
          <div class="form-group">
            <label>Yeni Şifre (boş bırakılırsa değişmez)</label>
            <input type="password" id="editUserPassword" placeholder="Yeni şifre" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;">
          </div>
          
          <button class="btn-primary" onclick="saveUserProfile(${userId})" style="width:100%;margin-top:16px;">
            <i class="fas fa-save"></i> Kaydet
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch(err) {
    alert('Kullanıcı yüklenemedi: ' + err.message);
  }
}

async function saveUserProfile(userId) {
  const nickname = document.getElementById('editUserNickname').value;
  const username = document.getElementById('editUsername').value;
  const password = document.getElementById('editUserPassword').value;
  
  try {
    // Nickname güncelle
    await fetch(`${API}/admin/user/${userId}/nickname`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname })
    });
    
    // Username güncelle
    await fetch(`${API}/admin/user/${userId}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    // Şifre varsa güncelle
    if (password) {
      await fetch(`${API}/admin/user/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password })
      });
    }
    
    alert('Kullanıcı güncellendi!');
    document.querySelector('.modal').remove();
    loadUsers();
  } catch(err) {
    alert('Kaydetme hatası: ' + err.message);
  }
}

// Video listesine düzenle butonu ekle
const originalLoadVideos = loadVideos;
loadVideos = async function() {
  await originalLoadVideos();
  // Düzenle butonlarını ekle
  document.querySelectorAll('.video-row').forEach(row => {
    const videoId = row.dataset.videoId;
    if (videoId) {
      const actionsCell = row.querySelector('.actions-cell');
      if (actionsCell && !actionsCell.querySelector('.edit-btn')) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-secondary edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Düzenle';
        editBtn.onclick = () => editVideoDetails(videoId);
        actionsCell.insertBefore(editBtn, actionsCell.firstChild);
      }
    }
  });
};

// Şarkı listesine düzenle butonu ekle
const originalLoadMusicSongs = loadMusicSongs;
loadMusicSongs = async function() {
  await originalLoadMusicSongs();
  // Düzenle butonlarını ekle
  document.querySelectorAll('.song-row').forEach(row => {
    const songId = row.dataset.songId;
    if (songId) {
      const actionsCell = row.querySelector('.actions-cell');
      if (actionsCell && !actionsCell.querySelector('.edit-btn')) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-secondary edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Düzenle';
        editBtn.onclick = () => editSongDetails(songId);
        actionsCell.insertBefore(editBtn, actionsCell.firstChild);
      }
    }
  });
};

// Kullanıcı listesine düzenle butonu ekle
const originalLoadUsers = loadUsers;
loadUsers = async function() {
  await originalLoadUsers();
  // Düzenle butonlarını ekle
  document.querySelectorAll('.user-row').forEach(row => {
    const userId = row.dataset.userId;
    if (userId) {
      const actionsCell = row.querySelector('.actions-cell');
      if (actionsCell && !actionsCell.querySelector('.edit-btn')) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-secondary edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Düzenle';
        editBtn.onclick = () => editUserProfile(userId);
        actionsCell.insertBefore(editBtn, actionsCell.firstChild);
      }
    }
  });
};
