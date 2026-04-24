// API URL
const API_URL = window.location.origin + '/api';

// Auth check
const adminToken = localStorage.getItem('teatube_admin_token');
const adminUserId = localStorage.getItem('teatube_admin_user_id');
if (!adminToken || !adminUserId) {
  window.location.href = '/admin';
}

// ==================== UTILITY FUNCTIONS ====================

async function api(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      'X-User-Id': adminUserId // Dynamic admin user ID
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API_URL + url, opts);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Hata oluştu');
  return d;
}

function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-xmark'}"></i> ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function openModal(title, html) {
  document.getElementById('modal-title').innerHTML = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function adminCikis() {
  localStorage.removeItem('teatube_admin_token');
  localStorage.removeItem('teatube_admin_user_id');
  window.location.href = '/admin';
}

// ==================== PAGE NAVIGATION ====================

function showAdminPage(page) {
  document.querySelectorAll('.sidebar-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  document.getElementById('main-content').innerHTML = '';
  
  // Sistem
  if (page === 'dashboard') renderDashboard();
  else if (page === 'reports') renderReports();
  
  // İçerik Yönetimi
  else if (page === 'videos') renderVideos();
  else if (page === 'photos') renderPhotos();
  else if (page === 'music') renderMusic();
  else if (page === 'comments') renderComments();
  else if (page === 'ts-music-apps') renderTSMusicApps();
  
  // Kullanıcı Yönetimi
  else if (page === 'users') renderUsers();
  else if (page === 'roles') renderRoles();
  else if (page === 'messages') renderMessages();
  
  // Sosyal
  else if (page === 'groups') renderGroups();
  
  // Ayarlar
  else if (page === 'sifreler') renderSifreler();
  else if (page === 'sistem-loglari') renderSistemLoglari();
  else if (page === 'yedek') renderYedekYonetimi();
}

// ==================== DASHBOARD ====================

async function renderDashboard() {
  // Kullanıcı rolünü güncelle
  updateUserRoleDisplay();
  
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-gauge"></i> Dashboard</div>
      <div class="page-subtitle">Sistem genel bakış ve istatistikler</div>
    </div>
    
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value" id="stat-users">-</div>
        <div class="stat-label">Toplam Kullanıcı</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-videos">-</div>
        <div class="stat-label">Toplam Video</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-songs">-</div>
        <div class="stat-label">Toplam Müzik</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-groups">-</div>
        <div class="stat-label">Toplam Grup</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-reports">-</div>
        <div class="stat-label">Bekleyen Bildiri</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-online">-</div>
        <div class="stat-label">Çevrimiçi Kullanıcı</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-chart-line"></i> Hızlı İşlemler</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="showAdminPage('users')">
          <i class="fa-solid fa-users"></i> Kullanıcı Yönetimi
        </button>
        <button class="btn btn-primary" onclick="showAdminPage('videos')">
          <i class="fa-solid fa-play"></i> Video Yönetimi
        </button>
        <button class="btn btn-primary" onclick="showAdminPage('reports')">
          <i class="fa-solid fa-flag"></i> Bildiriler
        </button>
        <button class="btn btn-primary" onclick="showAdminPage('roles')">
          <i class="fa-solid fa-user-shield"></i> Yetki Yönetimi
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-info-circle"></i> Sistem Bilgisi</div>
      <p style="color:var(--text2);font-size:14px;line-height:1.6">
        TeaTube Süper Admin Paneli - Tüm sistem verilerini, kullanıcıları, içerikleri ve yetkileri buradan yönetebilirsiniz.
        <br><br>
        <strong>Yetki Seviyeleri:</strong><br>
        • <span style="color:#ef4444"><i class="fas fa-shield-alt"></i> Admin</span> - Tam yetki (yedekleme hariç tüm işlemler)<br>
        • <span style="color:#8b5cf6"><i class="fas fa-shield-alt"></i> Moderatör</span> - İçerik yönetimi, yasaklama, yetkili rolü verme<br>
        • <span style="color:#6b7280"><i class="fas fa-shield-alt"></i> Yetkili</span> - Sadece mute işlemleri ve yorum askıya alma
      </p>
    </div>
  `;
  
  try {
    const stats = await api('GET', '/super-admin/stats');
    document.getElementById('stat-users').textContent = stats.totalUsers || 0;
    document.getElementById('stat-videos').textContent = stats.totalVideos || 0;
    document.getElementById('stat-songs').textContent = stats.totalSongs || 0;
    document.getElementById('stat-groups').textContent = stats.totalGroups || 0;
    document.getElementById('stat-reports').textContent = stats.pendingReports || 0;
    document.getElementById('stat-online').textContent = stats.onlineUsers || 0;
  } catch (e) {
    toast('İstatistikler yüklenemedi: ' + e.message, 'error');
  }
}

function updateUserRoleDisplay() {
  // Şimdilik admin olarak ayarla, gerçek uygulamada API'den gelecek
  const userRole = 'admin'; // Bu değer API'den gelecek
  const roleElement = document.getElementById('userRole');
  
  if (roleElement) {
    const roleColor = getRoleColor(userRole);
    const roleText = getRoleText(userRole);
    
    roleElement.innerHTML = `
      <i class="fas fa-shield-alt" style="margin-right:5px;color:${roleColor}"></i>
      <span style="color:${roleColor};font-weight:600">${roleText}</span>
    `;
  }
}

// ==================== ŞİFRE YÖNETİMİ ====================

function renderSifreler() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-key"></i> Admin Şifresi</div>
      <div class="page-subtitle">Admin şifresini değiştir</div>
    </div>
    
    <div class="card">
      <div class="card-title">Şifre Değiştir</div>
      <div class="form-group">
        <label>Yeni Şifre</label>
        <input type="password" id="new-password" placeholder="Yeni şifre girin" />
      </div>
      <div class="form-group">
        <label>Yeni Şifre (Tekrar)</label>
        <input type="password" id="new-password-confirm" placeholder="Yeni şifreyi tekrar girin" />
      </div>
      <button class="btn btn-primary" onclick="sifreDegistir()">
        <i class="fa-solid fa-save"></i> Şifreyi Kaydet
      </button>
    </div>
  `;
}

async function sifreDegistir() {
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('new-password-confirm').value;
  
  if (!newPassword || !confirmPassword) {
    return toast('Lütfen tüm alanları doldurun', 'error');
  }
  
  if (newPassword !== confirmPassword) {
    return toast('Şifreler eşleşmiyor', 'error');
  }
  
  if (newPassword.length < 6) {
    return toast('Şifre en az 6 karakter olmalı', 'error');
  }
  
  try {
    await api('POST', '/teatube-admin/change-password', { newPassword });
    toast('Şifre başarıyla değiştirildi');
    document.getElementById('new-password').value = '';
    document.getElementById('new-password-confirm').value = '';
  } catch (e) {
    toast('Şifre değiştirilemedi: ' + e.message, 'error');
  }
}

// ==================== SİSTEM LOGLARI ====================

async function renderSistemLoglari() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-list"></i> Sistem Logları</div>
      <div class="page-subtitle">Tüm kullanıcı aktiviteleri</div>
    </div>
    
    <div class="card">
      <div class="card-title">Son Aktiviteler</div>
      <div id="logs-container">Yükleniyor...</div>
    </div>
  `;
  
  try {
    const logs = await api('GET', '/teatube-admin/logs');
    const container = document.getElementById('logs-container');
    
    if (!logs || logs.length === 0) {
      container.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px">Henüz log kaydı yok</p>';
      return;
    }
    
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Kullanıcı</th>
            <th>IP Adresi</th>
            <th>İşlem</th>
            <th>Detay</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr>
              <td>${new Date(log.created_at).toLocaleString('tr-TR')}</td>
              <td>${log.username || 'Bilinmiyor'}</td>
              <td><code>${log.ip_address}</code></td>
              <td><span class="badge badge-${getActionBadge(log.action)}">${log.action}</span></td>
              <td>${log.details || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    document.getElementById('logs-container').innerHTML = 
      `<p style="color:#dc2626;text-align:center;padding:20px">Loglar yüklenemedi: ${e.message}</p>`;
  }
}

function getActionBadge(action) {
  if (action.includes('login') || action.includes('register')) return 'green';
  if (action.includes('delete') || action.includes('ban')) return 'red';
  return 'yellow';
}

// ==================== YEDEK YÖNETİMİ ====================

function renderYedekYonetimi() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-database"></i> Yedek Yönetimi</div>
      <div class="page-subtitle">Veritabanı yedekleme ve geri yükleme</div>
    </div>
    
    <div class="card">
      <div class="card-title">Yedek İndir</div>
      <p style="color:var(--text2);font-size:14px;margin-bottom:16px">
        Tüm paylaşımları, mesajları ve arkadaşlıkları içeren yedek dosyasını indir
      </p>
      <button class="btn btn-primary" onclick="yedekIndir()">
        <i class="fa-solid fa-download"></i> Yedek İndir (teatube-yedek.json)
      </button>
    </div>
    
    <div class="card">
      <div class="card-title">Yedek Geri Yükle</div>
      <p style="color:var(--text2);font-size:14px;margin-bottom:16px">
        Daha önce indirdiğiniz yedek dosyasını geri yükleyin
      </p>
      <div class="form-group">
        <label>Yedek Dosyası Seç</label>
        <input type="file" id="backup-file" accept=".json" />
      </div>
      <button class="btn btn-danger" onclick="yedekGeriYukle()">
        <i class="fa-solid fa-upload"></i> Geri Yükle (Dikkat: Mevcut veriler silinecek!)
      </button>
    </div>
  `;
}

async function yedekIndir() {
  try {
    toast('Yedek hazırlanıyor...', 'success');
    const backup = await api('GET', '/teatube-admin/backup');
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teatube-yedek.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast('Yedek başarıyla indirildi');
  } catch (e) {
    toast('Yedek indirilemedi: ' + e.message, 'error');
  }
}

async function yedekGeriYukle() {
  const fileInput = document.getElementById('backup-file');
  const file = fileInput.files[0];
  
  if (!file) {
    return toast('Lütfen bir yedek dosyası seçin', 'error');
  }
  
  if (!confirm('DİKKAT! Bu işlem mevcut tüm verileri silecek ve yedek dosyasındaki verilerle değiştirecektir. Devam etmek istediğinizden emin misiniz?')) {
    return;
  }
  
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    
    toast('Yedek geri yükleniyor...', 'success');
    await api('POST', '/teatube-admin/restore', backup);
    
    toast('Yedek başarıyla geri yüklendi! Sayfa yenileniyor...');
    setTimeout(() => location.reload(), 2000);
  } catch (e) {
    toast('Yedek geri yüklenemedi: ' + e.message, 'error');
  }
}

// ==================== INIT ====================

// Sayfa yüklenince dashboard'u göster
showAdminPage('dashboard');

// ==================== VİDEO YÖNETİMİ ====================

async function renderVideos() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-play"></i> Video Yönetimi</div>
      <div class="page-subtitle">Tüm videoları görüntüle, düzenle ve yönet</div>
    </div>
    
    <div class="card">
      <div class="card-title">Filtreler ve Arama</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="video-search" placeholder="Video ara..." style="flex:1;min-width:200px" class="form-input">
        <select id="video-status-filter" class="form-input" style="width:150px">
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="suspended">Askıya Alınmış</option>
        </select>
        <button class="btn btn-primary" onclick="loadVideos()">
          <i class="fa-solid fa-search"></i> Ara
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Videolar</div>
      <div id="videos-container">Yükleniyor...</div>
      <div id="videos-pagination"></div>
    </div>
  `;
  
  loadVideos();
}

let currentVideoPage = 1;

async function loadVideos(page = 1) {
  try {
    const search = document.getElementById('video-search').value;
    const status = document.getElementById('video-status-filter').value;
    
    const params = new URLSearchParams({
      page,
      limit: 20,
      search,
      status
    });
    
    const data = await api('GET', `/super-admin/videos?${params}`);
    const container = document.getElementById('videos-container');
    
    if (!data.videos || data.videos.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Video bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Video</th>
            <th>Kanal</th>
            <th>İstatistikler</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.videos.map(video => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <img src="${video.banner_url}" style="width:60px;height:40px;object-fit:cover;border-radius:4px" onerror="this.src='/default-video.png'">
                  <div>
                    <div style="font-weight:600;color:var(--text1)">${video.title}</div>
                    <div style="font-size:12px;color:var(--text3)">${video.description?.substring(0, 50) || ''}...</div>
                  </div>
                </div>
              </td>
              <td>
                <div style="font-weight:500">${video.channel_name}</div>
                <div style="font-size:12px;color:var(--text3)">@${video.username}</div>
              </td>
              <td>
                <div style="font-size:12px">
                  <div><i class="fa-solid fa-eye"></i> ${video.views || 0} görüntülenme</div>
                  <div><i class="fa-solid fa-thumbs-up"></i> ${video.likes || 0} beğeni</div>
                  <div><i class="fa-solid fa-comments"></i> ${video.comment_count || 0} yorum</div>
                </div>
              </td>
              <td>
                <span class="badge badge-${video.is_suspended ? 'danger' : 'success'}">
                  ${video.is_suspended ? 'Askıya Alınmış' : 'Aktif'}
                </span>
              </td>
              <td style="font-size:12px;color:var(--text3)">
                ${new Date(video.created_at).toLocaleDateString('tr-TR')}
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-secondary btn-sm" onclick="editVideo(${video.id})" title="Düzenle">
                    <i class="fa-solid fa-edit"></i>
                  </button>
                  <button class="btn btn-${video.is_suspended ? 'success' : 'warning'} btn-sm" 
                          onclick="toggleVideoSuspension(${video.id}, ${video.is_suspended ? 0 : 1})" 
                          title="${video.is_suspended ? 'Askıyı Kaldır' : 'Askıya Al'}">
                    <i class="fa-solid fa-${video.is_suspended ? 'play' : 'pause'}"></i>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="deleteVideo(${video.id})" title="Sil">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    // Pagination
    renderPagination('videos-pagination', data.page, Math.ceil(data.total / data.limit), (p) => loadVideos(p));
    currentVideoPage = page;
    
  } catch (e) {
    document.getElementById('videos-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Videolar yüklenemedi: ${e.message}</p>`;
  }
}

async function editVideo(videoId) {
  try {
    const video = await api('GET', `/super-admin/videos/${videoId}`);
    
    openModal('Video Düzenle', `
      <div class="form-group">
        <label>Başlık</label>
        <input type="text" id="edit-video-title" value="${video.title}" class="form-input">
      </div>
      <div class="form-group">
        <label>Paylaşım ID (URL için)</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" id="edit-video-share-id" value="${video.share_id || ''}" class="form-input" placeholder="Otomatik oluşturulacak" style="flex:1">
          <button class="btn btn-secondary" onclick="document.getElementById('edit-video-share-id').value = generateRandomId()" type="button">
            <i class="fa-solid fa-refresh"></i> Yeni ID
          </button>
        </div>
        <small style="color:var(--text3);font-size:12px">URL: teatube.com/video/${video.share_id || 'RANDOM_ID'}</small>
      </div>
      <div class="form-group">
        <label>Açıklama</label>
        <textarea id="edit-video-description" class="form-input" rows="3">${video.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Algoritma Etiketleri (virgülle ayırın)</label>
        <input type="text" id="edit-video-tags" value="${video.tags || ''}" class="form-input" placeholder="komedi, eğlence, viral, trend">
        <small style="color:var(--text3);font-size:12px">Örnek: komedi, eğlence, viral, trend, müzik</small>
      </div>
      <div class="form-group">
        <label>Video Türü</label>
        <select id="edit-video-type" class="form-input">
          <option value="Vlog" ${video.video_type === 'Vlog' ? 'selected' : ''}>Vlog</option>
          <option value="Günlük hayat" ${video.video_type === 'Günlük hayat' ? 'selected' : ''}>Günlük hayat</option>
          <option value="Challenge" ${video.video_type === 'Challenge' ? 'selected' : ''}>Challenge</option>
          <option value="Şaka" ${video.video_type === 'Şaka' ? 'selected' : ''}>Şaka</option>
          <option value="Komedi" ${video.video_type === 'Komedi' ? 'selected' : ''}>Komedi</option>
          <option value="Eğlence" ${video.video_type === 'Eğlence' ? 'selected' : ''}>Eğlence</option>
          <option value="Müzik" ${video.video_type === 'Müzik' ? 'selected' : ''}>Müzik</option>
          <option value="Gaming" ${video.video_type === 'Gaming' ? 'selected' : ''}>Gaming</option>
          <option value="Eğitim" ${video.video_type === 'Eğitim' ? 'selected' : ''}>Eğitim</option>
          <option value="Teknoloji" ${video.video_type === 'Teknoloji' ? 'selected' : ''}>Teknoloji</option>
          <option value="Spor" ${video.video_type === 'Spor' ? 'selected' : ''}>Spor</option>
          <option value="Seyahat" ${video.video_type === 'Seyahat' ? 'selected' : ''}>Seyahat</option>
          <option value="Yemek" ${video.video_type === 'Yemek' ? 'selected' : ''}>Yemek</option>
          <option value="Diğer" ${video.video_type === 'Diğer' ? 'selected' : ''}>Diğer</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Görüntülenme</label>
          <input type="number" id="edit-video-views" value="${video.views || 0}" class="form-input">
        </div>
        <div class="form-group">
          <label>Beğeni</label>
          <input type="number" id="edit-video-likes" value="${video.likes || 0}" class="form-input">
        </div>
      </div>
      <div class="form-group">
        <label>Admin Notları</label>
        <textarea id="edit-video-notes" class="form-input" rows="2">${video.admin_notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="saveVideoEdit(${videoId})">Kaydet</button>
      </div>
    `);
  } catch (e) {
    toast('Video bilgileri yüklenemedi: ' + e.message, 'error');
  }
}

// Random ID oluştur
function generateRandomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function saveVideoEdit(videoId) {
  try {
    const data = {
      title: document.getElementById('edit-video-title').value,
      share_id: document.getElementById('edit-video-share-id').value || generateRandomId(),
      description: document.getElementById('edit-video-description').value,
      tags: document.getElementById('edit-video-tags').value,
      video_type: document.getElementById('edit-video-type').value,
      views: parseInt(document.getElementById('edit-video-views').value) || 0,
      likes: parseInt(document.getElementById('edit-video-likes').value) || 0,
      admin_notes: document.getElementById('edit-video-notes').value
    };
    
    await api('PUT', `/super-admin/videos/${videoId}`, data);
    toast('Video başarıyla güncellendi');
    closeModal();
    loadVideos(currentVideoPage);
  } catch (e) {
    toast('Video güncellenemedi: ' + e.message, 'error');
  }
}

async function toggleVideoSuspension(videoId, suspended) {
  const reason = suspended ? prompt('Askıya alma sebebi:') : null;
  if (suspended && !reason) return;
  
  try {
    await api('PUT', `/super-admin/videos/${videoId}/suspend`, { suspended, reason });
    toast(suspended ? 'Video askıya alındı' : 'Video askısı kaldırıldı');
    loadVideos(currentVideoPage);
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}

async function deleteVideo(videoId) {
  if (!confirm('Bu videoyu kalıcı olarak silmek istediğinizden emin misiniz?')) return;
  
  const reason = prompt('Silme sebebi:');
  if (!reason) return;
  
  try {
    await api('DELETE', `/super-admin/videos/${videoId}`, { reason });
    toast('Video başarıyla silindi');
    loadVideos(currentVideoPage);
  } catch (e) {
    toast('Video silinemedi: ' + e.message, 'error');
  }
}

// ==================== KULLANICI YÖNETİMİ ====================

async function renderUsers() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-users"></i> Kullanıcı Yönetimi</div>
      <div class="page-subtitle">Tüm kullanıcıları görüntüle, düzenle ve yönet</div>
    </div>
    
    <div class="card">
      <div class="card-title">Filtreler ve Arama</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="user-search" placeholder="Kullanıcı ara..." style="flex:1;min-width:200px" class="form-input">
        <select id="user-role-filter" class="form-input" style="width:150px">
          <option value="all">Tüm Roller</option>
          <option value="user">Kullanıcı</option>
          <option value="yetkili">Yetkili</option>
          <option value="moderator">Moderatör</option>
          <option value="admin">Admin</option>
        </select>
        <button class="btn btn-primary" onclick="loadUsers()">
          <i class="fa-solid fa-search"></i> Ara
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Kullanıcılar</div>
      <div id="users-container">Yükleniyor...</div>
      <div id="users-pagination"></div>
    </div>
  `;
  
  loadUsers();
}

let currentUserPage = 1;

async function loadUsers(page = 1) {
  try {
    const search = document.getElementById('user-search').value;
    const role = document.getElementById('user-role-filter').value;
    
    const params = new URLSearchParams({
      page,
      limit: 20,
      search,
      role
    });
    
    const data = await api('GET', `/super-admin/users?${params}`);
    const container = document.getElementById('users-container');
    
    if (!data.users || data.users.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Kullanıcı bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>İletişim</th>
            <th>Rol</th>
            <th>İstatistikler</th>
            <th>Durum</th>
            <th>Son Giriş</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map(user => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <img src="${user.profile_photo || '/default-avatar.png'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">
                  <div>
                    <div style="font-weight:600;color:var(--text1);display:flex;align-items:center;gap:4px">
                      ${user.nickname}
                      ${getRoleIcon(user.role || 'user')}
                      <span style="color:${getRoleColor(user.role || 'user')};font-size:12px;font-weight:500">
                        ${getRoleText(user.role || 'user')}
                      </span>
                    </div>
                    <div style="font-size:12px;color:var(--text3)">@${user.username}</div>
                  </div>
                </div>
              </td>
              <td>
                <div style="font-size:12px">
                  <div>Doğum: ${user.birth_date || 'Belirtilmemiş'}</div>
                  <div>IP: <code>${user.last_ip || 'Bilinmiyor'}</code></div>
                </div>
              </td>
              <td>
                <span class="badge badge-${getRoleBadge(user.role || 'user')}">
                  ${getRoleText(user.role || 'user')}
                </span>
              </td>
              <td>
                <div style="font-size:12px">
                  <div><i class="fa-solid fa-video"></i> ${user.video_count || 0} video</div>
                  <div><i class="fa-solid fa-users"></i> ${user.friend_count || 0} arkadaş</div>
                </div>
              </td>
              <td>
                <div style="font-size:12px">
                  ${user.is_banned ? '<span class="badge badge-danger">Yasaklı</span>' : ''}
                  ${user.is_muted ? '<span class="badge badge-warning">Susturulmuş</span>' : ''}
                  ${!user.is_banned && !user.is_muted ? '<span class="badge badge-success">Aktif</span>' : ''}
                </div>
              </td>
              <td style="font-size:12px;color:var(--text3)">
                ${user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('tr-TR') : 'Hiç'}
              </td>
              <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  <button class="btn btn-secondary btn-sm" onclick="editUser(${user.id})" title="Düzenle">
                    <i class="fa-solid fa-edit"></i>
                  </button>
                  <button class="btn btn-primary btn-sm" onclick="changeUserRole(${user.id})" title="Rol Değiştir">
                    <i class="fa-solid fa-user-shield"></i>
                  </button>
                  ${!user.is_muted ? `
                    <button class="btn btn-warning btn-sm" onclick="muteUser(${user.id})" title="Sustur">
                      <i class="fa-solid fa-volume-mute"></i>
                    </button>
                  ` : `
                    <button class="btn btn-success btn-sm" onclick="unmuteUser(${user.id})" title="Susturmayı Kaldır">
                      <i class="fa-solid fa-volume-up"></i>
                    </button>
                  `}
                  ${!user.is_banned ? `
                    <button class="btn btn-danger btn-sm" onclick="banUser(${user.id})" title="Yasakla">
                      <i class="fa-solid fa-ban"></i>
                    </button>
                  ` : `
                    <button class="btn btn-success btn-sm" onclick="unbanUser(${user.id})" title="Yasağı Kaldır">
                      <i class="fa-solid fa-check"></i>
                    </button>
                  `}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    // Pagination
    renderPagination('users-pagination', data.page, Math.ceil(data.total / data.limit), (p) => loadUsers(p));
    currentUserPage = page;
    
  } catch (e) {
    document.getElementById('users-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Kullanıcılar yüklenemedi: ${e.message}</p>`;
  }
}

function getRoleBadge(role) {
  const badges = {
    'admin': 'danger',
    'moderator': 'warning', 
    'yetkili': 'secondary',
    'user': 'secondary'
  };
  return badges[role] || 'secondary';
}

function getRoleText(role) {
  const texts = {
    'admin': 'Admin',
    'moderator': 'Moderatör',
    'yetkili': 'Yetkili', 
    'user': 'Kullanıcı'
  };
  return texts[role] || 'Kullanıcı';
}

function getRoleColor(role) {
  const colors = {
    'admin': '#ef4444',      // Kırmızı
    'moderator': '#8b5cf6',  // Mor
    'yetkili': '#6b7280',    // Grimsi
    'user': '#9ca3af'        // Açık gri
  };
  return colors[role] || '#9ca3af';
}

function getRoleIcon(role) {
  // Tüm yetkili roller için shield ikonu
  if (role === 'admin' || role === 'moderator' || role === 'yetkili') {
    return '<i class="fas fa-shield-alt" style="margin-right:4px"></i>';
  }
  return '';
}

async function editUser(userId) {
  try {
    const user = await api('GET', `/super-admin/users/${userId}`);
    
    openModal('Kullanıcı Düzenle', `
      <div class="form-group">
        <label>Kullanıcı Adı</label>
        <input type="text" id="edit-user-username" value="${user.username}" class="form-input">
      </div>
      <div class="form-group">
        <label>Görünen Ad</label>
        <input type="text" id="edit-user-nickname" value="${user.nickname}" class="form-input">
      </div>
      <div class="form-group">
        <label>Doğum Tarihi</label>
        <input type="date" id="edit-user-birth" value="${user.birth_date || ''}" class="form-input">
      </div>
      <div class="form-group">
        <label>Yeni Şifre (Boş bırakılırsa değişmez)</label>
        <input type="password" id="edit-user-password" placeholder="Yeni şifre" class="form-input">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="saveUserEdit(${userId})">Kaydet</button>
      </div>
    `);
  } catch (e) {
    toast('Kullanıcı bilgileri yüklenemedi: ' + e.message, 'error');
  }
}

async function saveUserEdit(userId) {
  try {
    const data = {
      username: document.getElementById('edit-user-username').value,
      nickname: document.getElementById('edit-user-nickname').value,
      birth_date: document.getElementById('edit-user-birth').value,
      password: document.getElementById('edit-user-password').value
    };
    
    await api('PUT', `/super-admin/users/${userId}`, data);
    toast('Kullanıcı başarıyla güncellendi');
    closeModal();
    loadUsers(currentUserPage);
  } catch (e) {
    toast('Kullanıcı güncellenemedi: ' + e.message, 'error');
  }
}

async function changeUserRole(userId) {
  openModal('Rol Değiştir', `
    <div class="form-group">
      <label>Yeni Rol</label>
      <select id="new-user-role" class="form-input">
        <option value="user">Kullanıcı</option>
        <option value="yetkili">Yetkili</option>
        <option value="moderator">Moderatör</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveUserRole(${userId})">Kaydet</button>
    </div>
  `);
}

async function saveUserRole(userId) {
  try {
    const role = document.getElementById('new-user-role').value;
    await api('PUT', `/super-admin/users/${userId}/role`, { role });
    toast('Kullanıcı rolü başarıyla değiştirildi');
    closeModal();
    loadUsers(currentUserPage);
  } catch (e) {
    toast('Rol değiştirilemedi: ' + e.message, 'error');
  }
}

async function muteUser(userId) {
  const reason = prompt('Susturma sebebi:');
  if (!reason) return;
  
  const duration = prompt('Süre (saat, boş bırakılırsa kalıcı):');
  const durationHours = duration ? parseInt(duration) : null;
  
  try {
    await api('POST', `/super-admin/users/${userId}/mute`, {
      reason,
      duration_hours: durationHours,
      is_permanent: !durationHours
    });
    toast('Kullanıcı susturuldu');
    loadUsers(currentUserPage);
  } catch (e) {
    toast('Susturma işlemi başarısız: ' + e.message, 'error');
  }
}

async function unmuteUser(userId) {
  try {
    await api('DELETE', `/super-admin/users/${userId}/mute`);
    toast('Susturma kaldırıldı');
    loadUsers(currentUserPage);
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}

async function banUser(userId) {
  const reason = prompt('Yasaklama sebebi:');
  if (!reason) return;
  
  const duration = prompt('Süre (saat, boş bırakılırsa kalıcı):');
  const durationHours = duration ? parseInt(duration) : null;
  
  try {
    await api('POST', `/super-admin/users/${userId}/ban`, {
      reason,
      duration_hours: durationHours,
      is_permanent: !durationHours
    });
    toast('Kullanıcı yasaklandı');
    loadUsers(currentUserPage);
  } catch (e) {
    toast('Yasaklama işlemi başarısız: ' + e.message, 'error');
  }
}

async function unbanUser(userId) {
  try {
    await api('DELETE', `/super-admin/users/${userId}/ban`);
    toast('Yasak kaldırıldı');
    loadUsers(currentUserPage);
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}
// ==================== BİLDİRİ YÖNETİMİ ====================

async function renderReports() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-flag"></i> Bildiri Yönetimi</div>
      <div class="page-subtitle">Kullanıcı bildirilerini incele ve işlem yap</div>
    </div>
    
    <div class="card">
      <div class="card-title">Filtreler</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <select id="report-status-filter" class="form-input" style="width:150px">
          <option value="all">Tüm Durumlar</option>
          <option value="pending">Bekleyen</option>
          <option value="reviewed">İncelenen</option>
          <option value="resolved">Çözülen</option>
          <option value="dismissed">Reddedilen</option>
        </select>
        <select id="report-type-filter" class="form-input" style="width:150px">
          <option value="all">Tüm Türler</option>
          <option value="video">Video</option>
          <option value="comment">Yorum</option>
          <option value="message">Mesaj</option>
          <option value="user">Kullanıcı</option>
          <option value="group">Grup</option>
        </select>
        <button class="btn btn-primary" onclick="loadReports()">
          <i class="fa-solid fa-filter"></i> Filtrele
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Bildiriler</div>
      <div id="reports-container">Yükleniyor...</div>
      <div id="reports-pagination"></div>
    </div>
  `;
  
  loadReports();
}

let currentReportPage = 1;

async function loadReports(page = 1) {
  try {
    const status = document.getElementById('report-status-filter').value;
    const type = document.getElementById('report-type-filter').value;
    
    const params = new URLSearchParams({
      page,
      limit: 20,
      status,
      type
    });
    
    const data = await api('GET', `/super-admin/reports?${params}`);
    const container = document.getElementById('reports-container');
    
    if (!data.reports || data.reports.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Bildiri bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Bildiren</th>
            <th>Tür</th>
            <th>Sebep</th>
            <th>Hedef</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.reports.map(report => `
            <tr>
              <td>
                <div style="font-weight:500">${report.reporter_username}</div>
                <div style="font-size:12px;color:var(--text3)">ID: ${report.reporter_id}</div>
              </td>
              <td>
                <span class="badge badge-${getReportTypeBadge(report.reported_content_type)}">
                  ${getReportTypeText(report.reported_content_type)}
                </span>
              </td>
              <td>
                <div style="font-weight:500">${report.reason}</div>
                ${report.description ? `<div style="font-size:12px;color:var(--text3)">${report.description.substring(0, 50)}...</div>` : ''}
              </td>
              <td>
                <div style="font-size:12px">
                  <div>ID: ${report.reported_content_id}</div>
                  ${report.reported_user_id ? `<div>Kullanıcı: ${report.reported_user_id}</div>` : ''}
                </div>
              </td>
              <td>
                <span class="badge badge-${getReportStatusBadge(report.status)}">
                  ${getReportStatusText(report.status)}
                </span>
              </td>
              <td style="font-size:12px;color:var(--text3)">
                ${new Date(report.created_at).toLocaleDateString('tr-TR')}
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-primary btn-sm" onclick="reviewReport(${report.id})" title="İncele">
                    <i class="fa-solid fa-eye"></i>
                  </button>
                  ${report.status === 'pending' ? `
                    <button class="btn btn-success btn-sm" onclick="resolveReport(${report.id})" title="Çöz">
                      <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="dismissReport(${report.id})" title="Reddet">
                      <i class="fa-solid fa-times"></i>
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    // Pagination
    renderPagination('reports-pagination', data.page, Math.ceil(data.total / data.limit), (p) => loadReports(p));
    currentReportPage = page;
    
  } catch (e) {
    document.getElementById('reports-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Bildiriler yüklenemedi: ${e.message}</p>`;
  }
}

function getReportTypeBadge(type) {
  const badges = {
    'video': 'primary',
    'comment': 'warning',
    'message': 'secondary',
    'user': 'danger',
    'group': 'success'
  };
  return badges[type] || 'secondary';
}

function getReportTypeText(type) {
  const texts = {
    'video': 'Video',
    'comment': 'Yorum',
    'message': 'Mesaj',
    'user': 'Kullanıcı',
    'group': 'Grup'
  };
  return texts[type] || type;
}

function getReportStatusBadge(status) {
  const badges = {
    'pending': 'warning',
    'reviewed': 'primary',
    'resolved': 'success',
    'dismissed': 'danger'
  };
  return badges[status] || 'secondary';
}

function getReportStatusText(status) {
  const texts = {
    'pending': 'Bekleyen',
    'reviewed': 'İncelenen',
    'resolved': 'Çözülen',
    'dismissed': 'Reddedilen'
  };
  return texts[status] || status;
}

async function reviewReport(reportId) {
  try {
    const report = await api('GET', `/super-admin/reports/${reportId}`);
    
    openModal('Bildiri Detayları', `
      <div style="margin-bottom:16px">
        <strong>Bildiren:</strong> ${report.reporter_username} (ID: ${report.reporter_id})<br>
        <strong>Tür:</strong> ${getReportTypeText(report.reported_content_type)}<br>
        <strong>Hedef ID:</strong> ${report.reported_content_id}<br>
        <strong>Sebep:</strong> ${report.reason}<br>
        <strong>Açıklama:</strong> ${report.description || 'Yok'}<br>
        <strong>Tarih:</strong> ${new Date(report.created_at).toLocaleString('tr-TR')}
      </div>
      
      ${report.status === 'pending' ? `
        <div class="form-group">
          <label>Admin Notları</label>
          <textarea id="report-admin-notes" class="form-input" rows="3" placeholder="İnceleme notlarınızı yazın..."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Kapat</button>
          <button class="btn btn-success" onclick="resolveReportWithNotes(${reportId})">Çöz</button>
          <button class="btn btn-danger" onclick="dismissReportWithNotes(${reportId})">Reddet</button>
        </div>
      ` : `
        <div style="margin-top:16px">
          <strong>Durum:</strong> ${getReportStatusText(report.status)}<br>
          ${report.admin_notes ? `<strong>Admin Notları:</strong> ${report.admin_notes}<br>` : ''}
          ${report.reviewed_by ? `<strong>İnceleyen:</strong> ${report.reviewed_by_username}<br>` : ''}
          ${report.reviewed_at ? `<strong>İnceleme Tarihi:</strong> ${new Date(report.reviewed_at).toLocaleString('tr-TR')}` : ''}
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Kapat</button>
        </div>
      `}
    `);
  } catch (e) {
    toast('Bildiri detayları yüklenemedi: ' + e.message, 'error');
  }
}

async function resolveReportWithNotes(reportId) {
  const notes = document.getElementById('report-admin-notes').value;
  try {
    await api('PUT', `/super-admin/reports/${reportId}`, {
      status: 'resolved',
      admin_notes: notes
    });
    toast('Bildiri çözüldü olarak işaretlendi');
    closeModal();
    loadReports(currentReportPage);
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}

async function dismissReportWithNotes(reportId) {
  const notes = document.getElementById('report-admin-notes').value;
  try {
    await api('PUT', `/super-admin/reports/${reportId}`, {
      status: 'dismissed',
      admin_notes: notes
    });
    toast('Bildiri reddedildi');
    closeModal();
    loadReports(currentReportPage);
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}

async function resolveReport(reportId) {
  try {
    await api('PUT', `/super-admin/reports/${reportId}`, { status: 'resolved' });
    toast('Bildiri çözüldü');
    loadReports(currentReportPage);
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}

async function dismissReport(reportId) {
  try {
    await api('PUT', `/super-admin/reports/${reportId}`, { status: 'dismissed' });
    toast('Bildiri reddedildi');
    loadReports(currentReportPage);
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}
// ==================== MÜZİK YÖNETİMİ ====================

async function renderMusic() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-music"></i> Müzik Yönetimi</div>
      <div class="page-subtitle">Tüm şarkıları görüntüle, düzenle ve yönet</div>
    </div>
    
    <div class="card">
      <div class="card-title">Filtreler ve Arama</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="music-search" placeholder="Şarkı ara..." style="flex:1;min-width:200px" class="form-input">
        <select id="music-status-filter" class="form-input" style="width:150px">
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="suspended">Askıya Alınmış</option>
        </select>
        <button class="btn btn-primary" onclick="loadMusic()">
          <i class="fa-solid fa-search"></i> Ara
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Şarkılar</div>
      <div id="music-container">Yükleniyor...</div>
      <div id="music-pagination"></div>
    </div>
  `;
  
  loadMusic();
}

async function loadMusic(page = 1) {
  try {
    const search = document.getElementById('music-search').value;
    const status = document.getElementById('music-status-filter').value;
    
    const params = new URLSearchParams({
      page,
      limit: 20,
      search,
      status
    });
    
    const data = await api('GET', `/super-admin/music?${params}`);
    const container = document.getElementById('music-container');
    
    if (!data.songs || data.songs.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Şarkı bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Şarkı</th>
            <th>Artist</th>
            <th>İstatistikler</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.songs.map(song => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <img src="${song.cover_url}" style="width:50px;height:50px;object-fit:cover;border-radius:4px" onerror="this.src='/default-music.png'">
                  <div>
                    <div style="font-weight:600;color:var(--text1)">${song.title}</div>
                    <div style="font-size:12px;color:var(--text3)">${song.genre || 'Tür belirtilmemiş'}</div>
                    ${song.audio_url ? `<audio controls style="width:200px;height:30px;margin-top:4px"><source src="${song.audio_url}" type="audio/mpeg"></audio>` : ''}
                  </div>
                </div>
              </td>
              <td>
                <div style="font-weight:500">${song.artist_name}</div>
                <div style="font-size:12px;color:var(--text3)">${song.company_name || 'Şirket belirtilmemiş'}</div>
              </td>
              <td>
                <div style="font-size:12px">
                  <div><i class="fa-solid fa-play"></i> ${song.play_count || 0} dinlenme</div>
                </div>
              </td>
              <td>
                <span class="badge badge-${song.is_suspended ? 'danger' : 'success'}">
                  ${song.is_suspended ? 'Askıya Alınmış' : 'Aktif'}
                </span>
              </td>
              <td style="font-size:12px;color:var(--text3)">
                ${new Date(song.created_at).toLocaleDateString('tr-TR')}
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-secondary btn-sm" onclick="editMusic(${song.id})" title="Düzenle">
                    <i class="fa-solid fa-edit"></i>
                  </button>
                  <button class="btn btn-${song.is_suspended ? 'success' : 'warning'} btn-sm" 
                          onclick="toggleMusicSuspension(${song.id}, ${song.is_suspended ? 0 : 1})" 
                          title="${song.is_suspended ? 'Askıyı Kaldır' : 'Askıya Al'}">
                    <i class="fa-solid fa-${song.is_suspended ? 'play' : 'pause'}"></i>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="deleteMusic(${song.id})" title="Sil">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    renderPagination('music-pagination', data.page, Math.ceil(data.total / data.limit), (p) => loadMusic(p));
    
  } catch (e) {
    document.getElementById('music-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Şarkılar yüklenemedi: ${e.message}</p>`;
  }
}

async function editMusic(songId) {
  try {
    const song = await api('GET', `/super-admin/music/${songId}`);
    
    openModal('Şarkı Düzenle', `
      <div class="form-group">
        <label>Başlık</label>
        <input type="text" id="edit-music-title" value="${song.title}" class="form-input">
      </div>
      <div class="form-group">
        <label>Tür</label>
        <input type="text" id="edit-music-genre" value="${song.genre || ''}" class="form-input">
      </div>
      <div class="form-group">
        <label>Dinlenme Sayısı</label>
        <input type="number" id="edit-music-plays" value="${song.play_count || 0}" class="form-input">
      </div>
      <div class="form-group">
        <label>Şirket Adı</label>
        <input type="text" id="edit-music-company" value="${song.company_name || ''}" class="form-input">
      </div>
      <div class="form-group">
        <label>Admin Notları</label>
        <textarea id="edit-music-notes" class="form-input" rows="2">${song.admin_notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="saveMusicEdit(${songId})">Kaydet</button>
      </div>
    `);
  } catch (e) {
    toast('Şarkı bilgileri yüklenemedi: ' + e.message, 'error');
  }
}

async function saveMusicEdit(songId) {
  try {
    const data = {
      title: document.getElementById('edit-music-title').value,
      genre: document.getElementById('edit-music-genre').value,
      play_count: parseInt(document.getElementById('edit-music-plays').value) || 0,
      company_name: document.getElementById('edit-music-company').value,
      admin_notes: document.getElementById('edit-music-notes').value
    };
    
    await api('PUT', `/super-admin/music/${songId}`, data);
    toast('Şarkı başarıyla güncellendi');
    closeModal();
    loadMusic();
  } catch (e) {
    toast('Şarkı güncellenemedi: ' + e.message, 'error');
  }
}

async function toggleMusicSuspension(songId, suspended) {
  const reason = suspended ? prompt('Askıya alma sebebi:') : null;
  if (suspended && !reason) return;
  
  try {
    await api('PUT', `/super-admin/music/${songId}/suspend`, { suspended, reason });
    toast(suspended ? 'Şarkı askıya alındı' : 'Şarkı askısı kaldırıldı');
    loadMusic();
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}

async function deleteMusic(songId) {
  if (!confirm('Bu şarkıyı kalıcı olarak silmek istediğinizden emin misiniz?')) return;
  
  const reason = prompt('Silme sebebi:');
  if (!reason) return;
  
  try {
    await api('DELETE', `/super-admin/music/${songId}`, { reason });
    toast('Şarkı başarıyla silindi');
    loadMusic();
  } catch (e) {
    toast('Şarkı silinemedi: ' + e.message, 'error');
  }
}

// ==================== YORUM YÖNETİMİ ====================

async function renderComments() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-comments"></i> Yorum Yönetimi</div>
      <div class="page-subtitle">Tüm yorumları görüntüle ve yönet</div>
    </div>
    
    <div class="card">
      <div class="card-title">Filtreler ve Arama</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="comment-search" placeholder="Yorum ara..." style="flex:1;min-width:200px" class="form-input">
        <select id="comment-status-filter" class="form-input" style="width:150px">
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="suspended">Askıya Alınmış</option>
        </select>
        <button class="btn btn-primary" onclick="loadComments()">
          <i class="fa-solid fa-search"></i> Ara
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Yorumlar</div>
      <div id="comments-container">Yükleniyor...</div>
      <div id="comments-pagination"></div>
    </div>
  `;
  
  loadComments();
}

async function loadComments(page = 1) {
  try {
    const search = document.getElementById('comment-search').value;
    const status = document.getElementById('comment-status-filter').value;
    
    const params = new URLSearchParams({
      page,
      limit: 20,
      search,
      status
    });
    
    const data = await api('GET', `/super-admin/comments?${params}`);
    const container = document.getElementById('comments-container');
    
    if (!data.comments || data.comments.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Yorum bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>Yorum</th>
            <th>Video</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.comments.map(comment => `
            <tr>
              <td>
                <div style="font-weight:500">${comment.nickname}</div>
                <div style="font-size:12px;color:var(--text3)">@${comment.username}</div>
              </td>
              <td>
                <div style="max-width:300px;word-break:break-word">${comment.comment_text}</div>
              </td>
              <td>
                <div style="font-size:12px;max-width:200px">
                  <div style="font-weight:500">${comment.video_title}</div>
                  <div style="color:var(--text3)">ID: ${comment.video_id}</div>
                </div>
              </td>
              <td>
                <span class="badge badge-${comment.is_suspended ? 'danger' : 'success'}">
                  ${comment.is_suspended ? 'Askıya Alınmış' : 'Aktif'}
                </span>
              </td>
              <td style="font-size:12px;color:var(--text3)">
                ${new Date(comment.created_at).toLocaleDateString('tr-TR')}
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-${comment.is_suspended ? 'success' : 'warning'} btn-sm" 
                          onclick="toggleCommentSuspension(${comment.id}, ${comment.is_suspended ? 0 : 1})" 
                          title="${comment.is_suspended ? 'Askıyı Kaldır' : 'Askıya Al'}">
                    <i class="fa-solid fa-${comment.is_suspended ? 'play' : 'pause'}"></i>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="deleteComment(${comment.id})" title="Sil">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    renderPagination('comments-pagination', data.page, Math.ceil(data.total / data.limit), (p) => loadComments(p));
    
  } catch (e) {
    document.getElementById('comments-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Yorumlar yüklenemedi: ${e.message}</p>`;
  }
}

async function toggleCommentSuspension(commentId, suspended) {
  const reason = suspended ? prompt('Askıya alma sebebi:') : null;
  if (suspended && !reason) return;
  
  try {
    await api('PUT', `/super-admin/comments/${commentId}/suspend`, { suspended, reason });
    toast(suspended ? 'Yorum askıya alındı' : 'Yorum askısı kaldırıldı');
    loadComments();
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}

async function deleteComment(commentId) {
  if (!confirm('Bu yorumu kalıcı olarak silmek istediğinizden emin misiniz?')) return;
  
  const reason = prompt('Silme sebebi:');
  if (!reason) return;
  
  try {
    await api('DELETE', `/super-admin/comments/${commentId}`, { reason });
    toast('Yorum başarıyla silindi');
    loadComments();
  } catch (e) {
    toast('Yorum silinemedi: ' + e.message, 'error');
  }
}

// ==================== GRUP YÖNETİMİ ====================

async function renderGroups() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-layer-group"></i> Grup Yönetimi</div>
      <div class="page-subtitle">Tüm grupları görüntüle ve yönet</div>
    </div>
    
    <div class="card">
      <div class="card-title">Filtreler ve Arama</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="group-search" placeholder="Grup ara..." style="flex:1;min-width:200px" class="form-input">
        <select id="group-privacy-filter" class="form-input" style="width:150px">
          <option value="all">Tüm Türler</option>
          <option value="public">Herkese Açık</option>
          <option value="private">Gizli</option>
        </select>
        <button class="btn btn-primary" onclick="loadGroups()">
          <i class="fa-solid fa-search"></i> Ara
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Gruplar</div>
      <div id="groups-container">Yükleniyor...</div>
      <div id="groups-pagination"></div>
    </div>
  `;
  
  loadGroups();
}

async function loadGroups(page = 1) {
  try {
    const search = document.getElementById('group-search').value;
    const privacy = document.getElementById('group-privacy-filter').value;
    
    const params = new URLSearchParams({
      page,
      limit: 20,
      search,
      privacy
    });
    
    const data = await api('GET', `/super-admin/groups?${params}`);
    const container = document.getElementById('groups-container');
    
    if (!data.groups || data.groups.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Grup bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Grup</th>
            <th>Kurucu</th>
            <th>Üye Sayısı</th>
            <th>Gizlilik</th>
            <th>Kuruluş Tarihi</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.groups.map(group => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <img src="${group.photo_url || '/default-group.png'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">
                  <div>
                    <div style="font-weight:600;color:var(--text1)">${group.name}</div>
                    <div style="font-size:12px;color:var(--text3)">${group.description?.substring(0, 50) || ''}...</div>
                  </div>
                </div>
              </td>
              <td>
                <div style="font-weight:500">${group.owner_nickname}</div>
                <div style="font-size:12px;color:var(--text3)">@${group.owner_username}</div>
              </td>
              <td>
                <span style="font-weight:600">${group.member_count || 0}</span> üye
              </td>
              <td>
                <span class="badge badge-${group.is_private ? 'warning' : 'success'}">
                  ${group.is_private ? 'Gizli' : 'Herkese Açık'}
                </span>
              </td>
              <td style="font-size:12px;color:var(--text3)">
                ${new Date(group.created_at).toLocaleDateString('tr-TR')}
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-secondary btn-sm" onclick="editGroup(${group.id})" title="Düzenle">
                    <i class="fa-solid fa-edit"></i>
                  </button>
                  <button class="btn btn-primary btn-sm" onclick="viewGroupMembers(${group.id})" title="Üyeleri Görüntüle">
                    <i class="fa-solid fa-users"></i>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="deleteGroup(${group.id})" title="Sil">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    renderPagination('groups-pagination', data.page, Math.ceil(data.total / data.limit), (p) => loadGroups(p));
    
  } catch (e) {
    document.getElementById('groups-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Gruplar yüklenemedi: ${e.message}</p>`;
  }
}

async function editGroup(groupId) {
  try {
    const group = await api('GET', `/super-admin/groups/${groupId}`);
    
    openModal('Grup Düzenle', `
      <div class="form-group">
        <label>Grup Adı</label>
        <input type="text" id="edit-group-name" value="${group.name}" class="form-input">
      </div>
      <div class="form-group">
        <label>Açıklama</label>
        <textarea id="edit-group-description" class="form-input" rows="3">${group.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Gizlilik</label>
        <select id="edit-group-privacy" class="form-input">
          <option value="0" ${!group.is_private ? 'selected' : ''}>Herkese Açık</option>
          <option value="1" ${group.is_private ? 'selected' : ''}>Gizli</option>
        </select>
      </div>
      <div class="form-group">
        <label>Admin Notları</label>
        <textarea id="edit-group-notes" class="form-input" rows="2">${group.admin_notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="saveGroupEdit(${groupId})">Kaydet</button>
      </div>
    `);
  } catch (e) {
    toast('Grup bilgileri yüklenemedi: ' + e.message, 'error');
  }
}

async function saveGroupEdit(groupId) {
  try {
    const data = {
      name: document.getElementById('edit-group-name').value,
      description: document.getElementById('edit-group-description').value,
      is_private: parseInt(document.getElementById('edit-group-privacy').value),
      admin_notes: document.getElementById('edit-group-notes').value
    };
    
    await api('PUT', `/super-admin/groups/${groupId}`, data);
    toast('Grup başarıyla güncellendi');
    closeModal();
    loadGroups();
  } catch (e) {
    toast('Grup güncellenemedi: ' + e.message, 'error');
  }
}

async function viewGroupMembers(groupId) {
  try {
    const members = await api('GET', `/super-admin/groups/${groupId}/members`);
    
    openModal('Grup Üyeleri', `
      <div style="max-height:400px;overflow-y:auto">
        ${members.length === 0 ? '<p style="text-align:center;color:var(--text3)">Üye bulunamadı</p>' : `
          <table class="table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Rol</th>
                <th>Katılma Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              ${members.map(member => `
                <tr>
                  <td>
                    <div style="font-weight:500">${member.nickname}</div>
                    <div style="font-size:12px;color:var(--text3)">@${member.username}</div>
                  </td>
                  <td>
                    <span class="badge badge-${member.role === 'owner' ? 'danger' : member.role === 'admin' ? 'warning' : 'secondary'}">
                      ${member.role === 'owner' ? 'Kurucu' : member.role === 'admin' ? 'Admin' : 'Üye'}
                    </span>
                  </td>
                  <td style="font-size:12px">
                    ${new Date(member.joined_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td>
                    ${member.role !== 'owner' ? `
                      <button class="btn btn-danger btn-sm" onclick="removeGroupMember(${groupId}, ${member.user_id})" title="Çıkar">
                        <i class="fa-solid fa-user-minus"></i>
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Kapat</button>
      </div>
    `);
  } catch (e) {
    toast('Grup üyeleri yüklenemedi: ' + e.message, 'error');
  }
}

async function removeGroupMember(groupId, userId) {
  if (!confirm('Bu üyeyi gruptan çıkarmak istediğinizden emin misiniz?')) return;
  
  try {
    await api('DELETE', `/super-admin/groups/${groupId}/members/${userId}`);
    toast('Üye gruptan çıkarıldı');
    viewGroupMembers(groupId); // Refresh member list
  } catch (e) {
    toast('Üye çıkarılamadı: ' + e.message, 'error');
  }
}

async function deleteGroup(groupId) {
  if (!confirm('Bu grubu kalıcı olarak silmek istediğinizden emin misiniz?')) return;
  
  const reason = prompt('Silme sebebi:');
  if (!reason) return;
  
  try {
    await api('DELETE', `/super-admin/groups/${groupId}`, { reason });
    toast('Grup başarıyla silindi');
    loadGroups();
  } catch (e) {
    toast('Grup silinemedi: ' + e.message, 'error');
  }
}

// ==================== MESAJ YÖNETİMİ ====================

async function renderMessages() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-envelope"></i> Mesaj Yönetimi</div>
      <div class="page-subtitle">Kullanıcı mesajlarını görüntüle ve yönet</div>
    </div>
    
    <div class="card">
      <div class="card-title">Filtreler ve Arama</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="message-search" placeholder="Kullanıcı ara..." style="flex:1;min-width:200px" class="form-input">
        <button class="btn btn-primary" onclick="loadMessages()">
          <i class="fa-solid fa-search"></i> Ara
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Son Mesajlar</div>
      <div id="messages-container">Yükleniyor...</div>
      <div id="messages-pagination"></div>
    </div>
  `;
  
  loadMessages();
}

async function loadMessages(page = 1) {
  try {
    const search = document.getElementById('message-search').value;
    
    const params = new URLSearchParams({
      page,
      limit: 20,
      search
    });
    
    const data = await api('GET', `/super-admin/messages?${params}`);
    const container = document.getElementById('messages-container');
    
    if (!data.messages || data.messages.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Mesaj bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Gönderen</th>
            <th>Alıcı</th>
            <th>Mesaj</th>
            <th>Tarih</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.messages.map(message => `
            <tr>
              <td>
                <div style="font-weight:500">${message.sender_nickname}</div>
                <div style="font-size:12px;color:var(--text3)">@${message.sender_username}</div>
              </td>
              <td>
                <div style="font-weight:500">${message.receiver_nickname}</div>
                <div style="font-size:12px;color:var(--text3)">@${message.receiver_username}</div>
              </td>
              <td>
                <div style="max-width:300px;word-break:break-word">${message.message_text}</div>
              </td>
              <td style="font-size:12px;color:var(--text3)">
                ${new Date(message.created_at).toLocaleDateString('tr-TR')}
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-primary btn-sm" onclick="viewUserMessages(${message.sender_id}, ${message.receiver_id})" title="Konuşmayı Görüntüle">
                    <i class="fa-solid fa-comments"></i>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="deleteMessage(${message.id})" title="Sil">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    renderPagination('messages-pagination', data.page, Math.ceil(data.total / data.limit), (p) => loadMessages(p));
    
  } catch (e) {
    document.getElementById('messages-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Mesajlar yüklenemedi: ${e.message}</p>`;
  }
}

async function viewUserMessages(userId1, userId2) {
  try {
    const conversation = await api('GET', `/super-admin/messages/${userId1}/${userId2}`);
    
    openModal('Konuşma Detayları', `
      <div style="max-height:400px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:12px">
        ${conversation.messages.map(msg => `
          <div style="margin-bottom:12px;padding:8px;background:${msg.sender_id == userId1 ? 'var(--bg3)' : 'var(--bg4)'};border-radius:8px">
            <div style="font-size:12px;color:var(--text3);margin-bottom:4px">
              <strong>${msg.sender_nickname}</strong> - ${new Date(msg.created_at).toLocaleString('tr-TR')}
            </div>
            <div>${msg.message_text}</div>
          </div>
        `).join('')}
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Kapat</button>
      </div>
    `);
  } catch (e) {
    toast('Konuşma yüklenemedi: ' + e.message, 'error');
  }
}

async function deleteMessage(messageId) {
  if (!confirm('Bu mesajı kalıcı olarak silmek istediğinizden emin misiniz?')) return;
  
  try {
    await api('DELETE', `/super-admin/messages/${messageId}`);
    toast('Mesaj başarıyla silindi');
    loadMessages();
  } catch (e) {
    toast('Mesaj silinemedi: ' + e.message, 'error');
  }
}

// ==================== ROL YÖNETİMİ ====================

async function renderRoles() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-user-shield"></i> Rol ve Yetki Yönetimi</div>
      <div class="page-subtitle">Kullanıcı rollerini ve yetkilerini yönet</div>
    </div>
    
    <div class="card">
      <div class="card-title">Yetki Seviyeleri</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:20px">
        <div style="padding:16px;background:var(--bg3);border-radius:8px;border-left:4px solid #ef4444">
          <h4 style="color:#ef4444;margin:0 0 8px 0">Admin</h4>
          <ul style="margin:0;padding-left:20px;font-size:14px;color:var(--text2)">
            <li>Tüm yönetim özellikleri</li>
            <li>Kullanıcı düzenleme/silme</li>
            <li>Rol verme (admin hariç)</li>
            <li>Yasaklama/susturma</li>
            <li>İçerik yönetimi</li>
          </ul>
        </div>
        <div style="padding:16px;background:var(--bg3);border-radius:8px;border-left:4px solid #f59e0b">
          <h4 style="color:#f59e0b;margin:0 0 8px 0">Moderatör</h4>
          <ul style="margin:0;padding-left:20px;font-size:14px;color:var(--text2)">
            <li>İçerik yönetimi</li>
            <li>Yasaklama işlemleri</li>
            <li>Yetkili rolü verme</li>
            <li>Bildiri yönetimi</li>
            <li>Grup/mesaj önizleme</li>
          </ul>
        </div>
        <div style="padding:16px;background:var(--bg3);border-radius:8px;border-left:4px solid #3b82f6">
          <h4 style="color:#3b82f6;margin:0 0 8px 0">Yetkili</h4>
          <ul style="margin:0;padding-left:20px;font-size:14px;color:var(--text2)">
            <li>Kullanıcı susturma</li>
            <li>Yorum askıya alma</li>
            <li>Bildiri kontrolü</li>
          </ul>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Yetkili Kullanıcılar</div>
      <div id="roles-container">Yükleniyor...</div>
    </div>
  `;
  
  loadRoles();
}

async function loadRoles() {
  try {
    const data = await api('GET', '/super-admin/roles');
    const container = document.getElementById('roles-container');
    
    if (!data.users || data.users.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Yetkili kullanıcı bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>Rol</th>
            <th>Yetki Veren</th>
            <th>Verilme Tarihi</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map(user => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <img src="${user.profile_photo || '/default-avatar.png'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">
                  <div>
                    <div style="font-weight:500;display:flex;align-items:center;gap:4px">
                      ${user.nickname}
                      ${getRoleIcon(user.role)}
                      <span style="color:${getRoleColor(user.role)};font-size:12px;font-weight:500">
                        ${getRoleText(user.role)}
                      </span>
                    </div>
                    <div style="font-size:12px;color:var(--text3)">@${user.username}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge badge-${getRoleBadge(user.role)}">
                  ${getRoleText(user.role)}
                </span>
              </td>
              <td>
                <div style="font-size:12px">
                  ${user.granted_by_username || 'Sistem'}
                </div>
              </td>
              <td style="font-size:12px;color:var(--text3)">
                ${new Date(user.granted_at).toLocaleDateString('tr-TR')}
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-primary btn-sm" onclick="changeUserRole(${user.id})" title="Rol Değiştir">
                    <i class="fa-solid fa-edit"></i>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="removeUserRole(${user.id})" title="Yetkiyi Kaldır">
                    <i class="fa-solid fa-user-minus"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
  } catch (e) {
    document.getElementById('roles-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Roller yüklenemedi: ${e.message}</p>`;
  }
}

async function removeUserRole(userId) {
  if (!confirm('Bu kullanıcının yetkisini kaldırmak istediğinizden emin misiniz?')) return;
  
  try {
    await api('PUT', `/super-admin/users/${userId}/role`, { role: 'user' });
    toast('Kullanıcı yetkisi kaldırıldı');
    loadRoles();
  } catch (e) {
    toast('Yetki kaldırılamadı: ' + e.message, 'error');
  }
}

// ==================== TS MUSIC BAŞVURULARI ====================

async function renderTSMusicApps() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-microphone"></i> TS Music Başvuruları</div>
      <div class="page-subtitle">Artist başvurularını incele ve onayla</div>
    </div>
    
    <div class="card">
      <div class="card-title">Filtreler</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <select id="app-status-filter" class="form-input" style="width:150px">
          <option value="all">Tüm Durumlar</option>
          <option value="pending">Bekleyen</option>
          <option value="approved">Onaylanan</option>
          <option value="rejected">Reddedilen</option>
        </select>
        <button class="btn btn-primary" onclick="loadTSMusicApps()">
          <i class="fa-solid fa-filter"></i> Filtrele
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Başvurular</div>
      <div id="ts-apps-container">Yükleniyor...</div>
      <div id="ts-apps-pagination"></div>
    </div>
  `;
  
  loadTSMusicApps();
}

async function loadTSMusicApps(page = 1) {
  try {
    const status = document.getElementById('app-status-filter').value;
    
    const params = new URLSearchParams({
      page,
      limit: 20,
      status
    });
    
    const data = await api('GET', `/super-admin/ts-music-apps?${params}`);
    const container = document.getElementById('ts-apps-container');
    
    if (!data.applications || data.applications.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Başvuru bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Başvuran</th>
            <th>Artist Bilgileri</th>
            <th>İletişim</th>
            <th>Örnek Şarkı</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.applications.map(app => `
            <tr>
              <td>
                <div style="font-weight:500">${app.user_nickname}</div>
                <div style="font-size:12px;color:var(--text3)">@${app.user_username}</div>
              </td>
              <td>
                <div style="font-weight:500">${app.artist_name}</div>
                ${app.artist_alias ? `<div style="font-size:12px;color:var(--text3)">Takma ad: ${app.artist_alias}</div>` : ''}
                ${app.real_name ? `<div style="font-size:12px;color:var(--text3)">Gerçek ad: ${app.real_name}</div>` : ''}
              </td>
              <td style="font-size:12px">
                ${app.phone ? `<div>Tel: ${app.phone}</div>` : ''}
                ${app.email ? `<div>Email: ${app.email}</div>` : ''}
              </td>
              <td>
                ${app.sample_audio_url ? `
                  <audio controls style="width:150px;height:30px">
                    <source src="${app.sample_audio_url}" type="audio/mpeg">
                  </audio>
                ` : '<span style="color:var(--text3)">Yok</span>'}
              </td>
              <td>
                <span class="badge badge-${getAppStatusBadge(app.status)}">
                  ${getAppStatusText(app.status)}
                </span>
              </td>
              <td style="font-size:12px;color:var(--text3)">
                ${new Date(app.created_at).toLocaleDateString('tr-TR')}
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  ${app.status === 'pending' ? `
                    <button class="btn btn-success btn-sm" onclick="approveApplication(${app.id})" title="Onayla">
                      <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectApplication(${app.id})" title="Reddet">
                      <i class="fa-solid fa-times"></i>
                    </button>
                  ` : ''}
                  <button class="btn btn-primary btn-sm" onclick="viewApplication(${app.id})" title="Detayları Görüntüle">
                    <i class="fa-solid fa-eye"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    renderPagination('ts-apps-pagination', data.page, Math.ceil(data.total / data.limit), (p) => loadTSMusicApps(p));
    
  } catch (e) {
    document.getElementById('ts-apps-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Başvurular yüklenemedi: ${e.message}</p>`;
  }
}

function getAppStatusBadge(status) {
  const badges = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  };
  return badges[status] || 'secondary';
}

function getAppStatusText(status) {
  const texts = {
    'pending': 'Bekleyen',
    'approved': 'Onaylanan',
    'rejected': 'Reddedilen'
  };
  return texts[status] || status;
}

async function approveApplication(appId) {
  const note = prompt('Onay notu (isteğe bağlı):');
  
  try {
    await api('PUT', `/super-admin/ts-music-apps/${appId}`, {
      status: 'approved',
      admin_note: note
    });
    toast('Başvuru onaylandı');
    loadTSMusicApps();
  } catch (e) {
    toast('Onaylama işlemi başarısız: ' + e.message, 'error');
  }
}

async function rejectApplication(appId) {
  const note = prompt('Red sebebi:');
  if (!note) return;
  
  try {
    await api('PUT', `/super-admin/ts-music-apps/${appId}`, {
      status: 'rejected',
      admin_note: note
    });
    toast('Başvuru reddedildi');
    loadTSMusicApps();
  } catch (e) {
    toast('Red işlemi başarısız: ' + e.message, 'error');
  }
}

async function viewApplication(appId) {
  try {
    const app = await api('GET', `/super-admin/ts-music-apps/${appId}`);
    
    openModal('Başvuru Detayları', `
      <div style="margin-bottom:16px">
        <strong>Başvuran:</strong> ${app.user_nickname} (@${app.user_username})<br>
        <strong>Artist Adı:</strong> ${app.artist_name}<br>
        ${app.artist_alias ? `<strong>Takma Ad:</strong> ${app.artist_alias}<br>` : ''}
        ${app.real_name ? `<strong>Gerçek Ad:</strong> ${app.real_name}<br>` : ''}
        ${app.phone ? `<strong>Telefon:</strong> ${app.phone}<br>` : ''}
        ${app.email ? `<strong>Email:</strong> ${app.email}<br>` : ''}
        <strong>Durum:</strong> ${getAppStatusText(app.status)}<br>
        <strong>Başvuru Tarihi:</strong> ${new Date(app.created_at).toLocaleString('tr-TR')}<br>
        ${app.admin_note ? `<strong>Admin Notu:</strong> ${app.admin_note}<br>` : ''}
        ${app.reviewed_by ? `<strong>İnceleyen:</strong> ${app.reviewed_by_username}<br>` : ''}
        ${app.reviewed_at ? `<strong>İnceleme Tarihi:</strong> ${new Date(app.reviewed_at).toLocaleString('tr-TR')}` : ''}
      </div>
      
      ${app.sample_audio_url ? `
        <div style="margin-bottom:16px">
          <strong>Örnek Şarkı:</strong><br>
          <audio controls style="width:100%;margin-top:8px">
            <source src="${app.sample_audio_url}" type="audio/mpeg">
          </audio>
        </div>
      ` : ''}
      
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Kapat</button>
      </div>
    `);
  } catch (e) {
    toast('Başvuru detayları yüklenemedi: ' + e.message, 'error');
  }
}

// ==================== UTILITY FUNCTIONS ====================

function renderPagination(containerId, currentPage, totalPages, onPageClick) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  
  // Fonksiyon adını çıkar - arrow function desteği ile
  let funcName = 'loadPage';
  if (typeof onPageClick === 'function') {
    const funcStr = onPageClick.toString();
    // Normal function
    const normalMatch = funcStr.match(/function\s+(\w+)/);
    if (normalMatch) {
      funcName = normalMatch[1];
    } else {
      // Arrow function - context'ten çıkar
      if (funcStr.includes('loadVideos')) funcName = 'loadVideos';
      else if (funcStr.includes('loadUsers')) funcName = 'loadUsers';
      else if (funcStr.includes('loadReports')) funcName = 'loadReports';
      else if (funcStr.includes('loadMusic')) funcName = 'loadMusic';
      else if (funcStr.includes('loadComments')) funcName = 'loadComments';
      else if (funcStr.includes('loadGroups')) funcName = 'loadGroups';
      else if (funcStr.includes('loadMessages')) funcName = 'loadMessages';
      else if (funcStr.includes('loadTSMusicApps')) funcName = 'loadTSMusicApps';
      else if (funcStr.includes('loadPhotos')) funcName = 'loadPhotos';
    }
  }
  
  let html = '<div class="pagination">';
  
  // Previous button
  if (currentPage > 1) {
    html += `<button class="page-btn" onclick="${funcName}(${currentPage - 1})">‹ Önceki</button>`;
  }
  
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  if (startPage > 1) {
    html += `<button class="page-btn" onclick="${funcName}(1)">1</button>`;
    if (startPage > 2) html += '<span style="padding:8px">...</span>';
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${funcName}(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += '<span style="padding:8px">...</span>';
    html += `<button class="page-btn" onclick="${funcName}(${totalPages})">${totalPages}</button>`;
  }
  
  // Next button
  if (currentPage < totalPages) {
    html += `<button class="page-btn" onclick="${funcName}(${currentPage + 1})">Sonraki ›</button>`;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

// ==================== FOTOĞRAF YÖNETİMİ ====================

async function renderPhotos() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-image"></i> Fotoğraf Yönetimi</div>
      <div class="page-subtitle">Tüm fotoğrafları görüntüle, düzenle ve yönet</div>
    </div>
    
    <div class="card">
      <div class="card-title">Filtreler ve Arama</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="photo-search" placeholder="Fotoğraf ara..." style="flex:1;min-width:200px" class="form-input">
        <select id="photo-status-filter" class="form-input" style="width:150px">
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="suspended">Askıya Alınmış</option>
        </select>
        <button class="btn btn-primary" onclick="loadPhotos()">
          <i class="fa-solid fa-search"></i> Ara
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Fotoğraflar</div>
      <div id="photos-container">Yükleniyor...</div>
      <div id="photos-pagination"></div>
    </div>
  `;
  
  loadPhotos();
}

let currentPhotoPage = 1;

async function loadPhotos(page = 1) {
  try {
    const search = document.getElementById('photo-search').value;
    const status = document.getElementById('photo-status-filter').value;
    
    const params = new URLSearchParams({
      page,
      limit: 20,
      search,
      status
    });
    
    const data = await api('GET', `/super-admin/photos?${params}`);
    const container = document.getElementById('photos-container');
    
    if (!data.photos || data.photos.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px">Fotoğraf bulunamadı</p>';
      return;
    }
    
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px">
        ${data.photos.map(photo => `
          <div class="photo-card" style="background:var(--bg3);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)">
            <div style="position:relative;aspect-ratio:1;overflow:hidden">
              <img src="${photo.banner_url}" style="width:100%;height:100%;object-fit:cover" onerror="this.src='/default-photo.png'">
              ${photo.is_suspended ? '<div style="position:absolute;top:8px;right:8px;background:rgba(239,68,68,0.9);color:white;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600">ASKIDA</div>' : ''}
            </div>
            <div style="padding:16px">
              <div style="font-weight:600;color:var(--text1);margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${photo.title}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <img src="${photo.profile_photo || '/default-avatar.png'}" style="width:24px;height:24px;border-radius:50%;object-fit:cover">
                <div>
                  <div style="font-weight:500;font-size:13px">${photo.channel_name}</div>
                  <div style="font-size:11px;color:var(--text3)">@${photo.username}</div>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text3);margin-bottom:12px">
                <div><i class="fa-solid fa-eye"></i> ${photo.views || 0}</div>
                <div><i class="fa-solid fa-thumbs-up"></i> ${photo.likes || 0}</div>
                <div>${new Date(photo.created_at).toLocaleDateString('tr-TR')}</div>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-secondary btn-sm" onclick="editPhoto(${photo.id})" title="Düzenle" style="flex:1">
                  <i class="fa-solid fa-edit"></i>
                </button>
                <button class="btn btn-${photo.is_suspended ? 'success' : 'warning'} btn-sm" 
                        onclick="togglePhotoSuspension(${photo.id}, ${photo.is_suspended ? 0 : 1})" 
                        title="${photo.is_suspended ? 'Askıyı Kaldır' : 'Askıya Al'}" style="flex:1">
                  <i class="fa-solid fa-${photo.is_suspended ? 'play' : 'pause'}"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deletePhoto(${photo.id})" title="Sil" style="flex:1">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    // Pagination
    if (data.total > data.limit) {
      document.getElementById('photos-pagination').innerHTML = `
        <div style="margin-top:20px;text-align:center">
          <div class="pagination">
            ${data.page > 1 ? `<button class="page-btn" onclick="loadPhotos(${data.page - 1})">‹ Önceki</button>` : ''}
            <span style="padding:8px 16px;color:var(--text2)">Sayfa ${data.page} / ${Math.ceil(data.total / data.limit)}</span>
            ${data.page < Math.ceil(data.total / data.limit) ? `<button class="page-btn" onclick="loadPhotos(${data.page + 1})">Sonraki ›</button>` : ''}
          </div>
        </div>
      `;
    }
    
    currentPhotoPage = page;
    
  } catch (e) {
    document.getElementById('photos-container').innerHTML = 
      `<p style="color:var(--danger);text-align:center;padding:40px">Fotoğraflar yüklenemedi: ${e.message}</p>`;
  }
}

async function editPhoto(photoId) {
  try {
    const photo = await api('GET', `/super-admin/photos/${photoId}`);
    
    openModal('Fotoğraf Düzenle', `
      <div class="form-group">
        <label>Başlık</label>
        <input type="text" id="edit-photo-title" value="${photo.title}" class="form-input">
      </div>
      <div class="form-group">
        <label>Açıklama</label>
        <textarea id="edit-photo-description" class="form-input" rows="3">${photo.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Algoritma Etiketleri (virgülle ayırın)</label>
        <input type="text" id="edit-photo-tags" value="${photo.tags || ''}" class="form-input" placeholder="fotoğraf, sanat, doğa, portre">
        <small style="color:var(--text3);font-size:12px">Örnek: fotoğraf, sanat, doğa, portre, manzara</small>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Görüntülenme</label>
          <input type="number" id="edit-photo-views" value="${photo.views || 0}" class="form-input">
        </div>
        <div class="form-group">
          <label>Beğeni</label>
          <input type="number" id="edit-photo-likes" value="${photo.likes || 0}" class="form-input">
        </div>
      </div>
      <div class="form-group">
        <label>Admin Notları</label>
        <textarea id="edit-photo-notes" class="form-input" rows="2">${photo.admin_notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="savePhotoEdit(${photoId})">Kaydet</button>
      </div>
    `);
  } catch (e) {
    toast('Fotoğraf bilgileri yüklenemedi: ' + e.message, 'error');
  }
}

async function savePhotoEdit(photoId) {
  try {
    const data = {
      title: document.getElementById('edit-photo-title').value,
      description: document.getElementById('edit-photo-description').value,
      tags: document.getElementById('edit-photo-tags').value,
      views: parseInt(document.getElementById('edit-photo-views').value) || 0,
      likes: parseInt(document.getElementById('edit-photo-likes').value) || 0,
      admin_notes: document.getElementById('edit-photo-notes').value
    };
    
    await api('PUT', `/super-admin/photos/${photoId}`, data);
    toast('Fotoğraf başarıyla güncellendi');
    closeModal();
    loadPhotos(currentPhotoPage);
  } catch (e) {
    toast('Fotoğraf güncellenemedi: ' + e.message, 'error');
  }
}

async function togglePhotoSuspension(photoId, suspended) {
  const reason = suspended ? prompt('Askıya alma sebebi:') : null;
  if (suspended && !reason) return;
  
  try {
    await api('PUT', `/super-admin/photos/${photoId}/suspend`, { suspended, reason });
    toast(suspended ? 'Fotoğraf askıya alındı' : 'Fotoğraf askısı kaldırıldı');
    loadPhotos(currentPhotoPage);
  } catch (e) {
    toast('İşlem başarısız: ' + e.message, 'error');
  }
}

async function deletePhoto(photoId) {
  if (!confirm('Bu fotoğrafı kalıcı olarak silmek istediğinizden emin misiniz?')) return;
  
  const reason = prompt('Silme sebebi:');
  if (!reason) return;
  
  try {
    await api('DELETE', `/super-admin/photos/${photoId}`, { reason });
    toast('Fotoğraf başarıyla silindi');
    loadPhotos(currentPhotoPage);
  } catch (e) {
    toast('Fotoğraf silinemedi: ' + e.message, 'error');
  }
}