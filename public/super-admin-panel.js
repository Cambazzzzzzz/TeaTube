// API URL
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3456/api'
  : window.location.origin + '/api';

let currentUser = null;
let currentPage = 'dashboard';

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
  // Kullanıcı kontrolü (basit)
  const adminToken = localStorage.getItem('admin_token');
  if (!adminToken) {
    window.location.href = '/admin';
    return;
  }
  
  // Dashboard'u yükle
  showPage('dashboard');
});

// Sayfa gösterme
function showPage(page) {
  currentPage = page;
  
  // Sidebar aktif durumu
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[onclick="showPage('${page}')"]`)?.classList.add('active');
  
  // Sayfa içeriğini yükle
  switch(page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'videos':
      loadVideosPage();
      break;
    case 'users':
      loadUsersPage();
      break;
    case 'music':
      loadMusicPage();
      break;
    case 'groups':
      loadGroupsPage();
      break;
    case 'reports':
      loadReportsPage();
      break;
    case 'messages':
      loadMessagesPage();
      break;
    case 'comments':
      loadCommentsPage();
      break;
    case 'roles':
      loadRolesPage();
      break;
    case 'ts-music-apps':
      loadTSMusicAppsPage();
      break;
    case 'logs':
      loadLogsPage();
      break;
    case 'settings':
      loadSettingsPage();
      break;
    default:
      loadDashboard();
  }
}

// Dashboard
async function loadDashboard() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" id="totalUsers">-</div>
        <div class="stat-label">Toplam Kullanıcı</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="totalVideos">-</div>
        <div class="stat-label">Toplam Video</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="totalSongs">-</div>
        <div class="stat-label">Toplam Şarkı</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="totalGroups">-</div>
        <div class="stat-label">Toplam Grup</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="pendingReports">-</div>
        <div class="stat-label">Bekleyen Bildiri</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="onlineUsers">-</div>
        <div class="stat-label">Çevrimiçi Kullanıcı</div>
      </div>
    </div>
    
    <div class="card">
      <h3>Son Aktiviteler</h3>
      <div id="recentActivities">Yükleniyor...</div>
    </div>
  `;
  
  // İstatistikleri yükle
  try {
    const stats = await apiCall('/super-admin/stats');
    document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
    document.getElementById('totalVideos').textContent = stats.totalVideos || 0;
    document.getElementById('totalSongs').textContent = stats.totalSongs || 0;
    document.getElementById('totalGroups').textContent = stats.totalGroups || 0;
    document.getElementById('pendingReports').textContent = stats.pendingReports || 0;
    document.getElementById('onlineUsers').textContent = stats.onlineUsers || 0;
  } catch(e) {
    console.error('İstatistik yükleme hatası:', e);
  }
}

// Videolar sayfası
async function loadVideosPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Video Yönetimi</h1>
      <button class="btn btn-primary" onclick="refreshVideos()">
        <i class="fas fa-sync"></i>
        Yenile
      </button>
    </div>
    
    <div class="search-bar">
      <input type="text" class="search-input" id="videoSearch" placeholder="Video ara..." onkeyup="searchVideos()">
      <select class="filter-select" id="videoStatusFilter" onchange="filterVideos()">
        <option value="all">Tüm Durumlar</option>
        <option value="active">Aktif</option>
        <option value="suspended">Askıya Alınmış</option>
      </select>
    </div>
    
    <div class="card">
      <div id="videosTable">Yükleniyor...</div>
    </div>
    
    <div class="pagination" id="videosPagination"></div>
  `;
  
  loadVideos();
}

// Kullanıcılar sayfası
async function loadUsersPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Kullanıcı Yönetimi</h1>
      <button class="btn btn-primary" onclick="refreshUsers()">
        <i class="fas fa-sync"></i>
        Yenile
      </button>
    </div>
    
    <div class="search-bar">
      <input type="text" class="search-input" id="userSearch" placeholder="Kullanıcı ara..." onkeyup="searchUsers()">
      <select class="filter-select" id="userRoleFilter" onchange="filterUsers()">
        <option value="all">Tüm Roller</option>
        <option value="user">Kullanıcı</option>
        <option value="yetkili">Yetkili</option>
        <option value="moderator">Moderatör</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    
    <div class="card">
      <div id="usersTable">Yükleniyor...</div>
    </div>
    
    <div class="pagination" id="usersPagination"></div>
  `;
  
  loadUsers();
}

// API çağrısı helper
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('admin_token');
  const response = await fetch(API_URL + endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '1', // Admin user ID
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

// Videoları yükle
async function loadVideos(page = 1, search = '', status = 'all') {
  try {
    const params = new URLSearchParams({ page, limit: 20, search, status });
    const data = await apiCall(`/super-admin/videos?${params}`);
    
    const tableHtml = `
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Başlık</th>
            <th>Kanal</th>
            <th>Görüntülenme</th>
            <th>Beğeni</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.videos.map(video => `
            <tr>
              <td>${video.id}</td>
              <td>${video.title}</td>
              <td>${video.channel_name}</td>
              <td>${video.views}</td>
              <td>${video.likes}</td>
              <td>
                <span class="badge ${video.is_suspended ? 'badge-danger' : 'badge-success'}">
                  ${video.is_suspended ? 'Askıda' : 'Aktif'}
                </span>
              </td>
              <td>${new Date(video.created_at).toLocaleDateString('tr-TR')}</td>
              <td>
                <button class="btn btn-secondary" onclick="editVideo(${video.id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn ${video.is_suspended ? 'btn-success' : 'btn-warning'}" onclick="toggleVideoSuspension(${video.id}, ${!video.is_suspended})">
                  <i class="fas ${video.is_suspended ? 'fa-play' : 'fa-pause'}"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteVideo(${video.id})">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    document.getElementById('videosTable').innerHTML = tableHtml;
    
    // Pagination
    generatePagination('videosPagination', data.page, Math.ceil(data.total / data.limit), (p) => loadVideos(p, search, status));
    
  } catch(e) {
    document.getElementById('videosTable').innerHTML = '<div class="empty-state">Videolar yüklenemedi</div>';
  }
}

// Kullanıcıları yükle
async function loadUsers(page = 1, search = '', role = 'all') {
  try {
    const params = new URLSearchParams({ page, limit: 20, search, role });
    const data = await apiCall(`/super-admin/users?${params}`);
    
    const tableHtml = `
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Kullanıcı Adı</th>
            <th>Takma Ad</th>
            <th>Rol</th>
            <th>Video Sayısı</th>
            <th>Kayıt Tarihi</th>
            <th>Son Giriş</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map(user => `
            <tr>
              <td>${user.id}</td>
              <td>${user.username}</td>
              <td>${user.nickname}</td>
              <td>
                <span class="badge ${getRoleBadgeClass(user.role || 'user')}">
                  ${getRoleDisplayName(user.role || 'user')}
                </span>
              </td>
              <td>${user.video_count}</td>
              <td>${new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
              <td>${user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('tr-TR') : 'Hiç'}</td>
              <td>
                <button class="btn btn-secondary" onclick="editUser(${user.id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-warning" onclick="muteUser(${user.id})">
                  <i class="fas fa-volume-mute"></i>
                </button>
                <button class="btn btn-danger" onclick="banUser(${user.id})">
                  <i class="fas fa-ban"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    document.getElementById('usersTable').innerHTML = tableHtml;
    
    // Pagination
    generatePagination('usersPagination', data.page, Math.ceil(data.total / data.limit), (p) => loadUsers(p, search, role));
    
  } catch(e) {
    document.getElementById('usersTable').innerHTML = '<div class="empty-state">Kullanıcılar yüklenemedi</div>';
  }
}

// Helper functions
function getRoleBadgeClass(role) {
  switch(role) {
    case 'admin': return 'badge-danger';
    case 'moderator': return 'badge-warning';
    case 'yetkili': return 'badge-success';
    default: return 'badge-secondary';
  }
}

function getRoleDisplayName(role) {
  switch(role) {
    case 'admin': return 'Admin';
    case 'moderator': return 'Moderatör';
    case 'yetkili': return 'Yetkili';
    default: return 'Kullanıcı';
  }
}

function generatePagination(containerId, currentPage, totalPages, onPageClick) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let html = '';
  
  // Önceki sayfa
  if (currentPage > 1) {
    html += `<button class="page-btn" onclick="${onPageClick.name}(${currentPage - 1})">‹</button>`;
  }
  
  // Sayfa numaraları
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${onPageClick.name}(${i})">${i}</button>`;
  }
  
  // Sonraki sayfa
  if (currentPage < totalPages) {
    html += `<button class="page-btn" onclick="${onPageClick.name}(${currentPage + 1})">›</button>`;
  }
  
  container.innerHTML = html;
}

// Arama ve filtreleme
function searchVideos() {
  const search = document.getElementById('videoSearch').value;
  const status = document.getElementById('videoStatusFilter').value;
  loadVideos(1, search, status);
}

function filterVideos() {
  searchVideos();
}

function searchUsers() {
  const search = document.getElementById('userSearch').value;
  const role = document.getElementById('userRoleFilter').value;
  loadUsers(1, search, role);
}

function filterUsers() {
  searchUsers();
}

// Video işlemleri
async function editVideo(videoId) {
  try {
    const video = await apiCall(`/super-admin/videos/${videoId}`);
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      <form onsubmit="saveVideo(event, ${videoId})">
        <div class="form-group">
          <label class="form-label">Başlık</label>
          <input type="text" class="form-input" name="title" value="${video.title}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Açıklama</label>
          <textarea class="form-input" name="description" rows="3">${video.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Görüntülenme Sayısı</label>
          <input type="number" class="form-input" name="views" value="${video.views}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Beğeni Sayısı</label>
          <input type="number" class="form-input" name="likes" value="${video.likes}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Beğenmeme Sayısı</label>
          <input type="number" class="form-input" name="dislikes" value="${video.dislikes}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Admin Notları</label>
          <textarea class="form-input" name="admin_notes" rows="2">${video.admin_notes || ''}</textarea>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">İptal</button>
          <button type="submit" class="btn btn-primary">Kaydet</button>
        </div>
      </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Video Düzenle';
    document.getElementById('editModal').style.display = 'flex';
    
  } catch(e) {
    alert('Video bilgileri yüklenemedi');
  }
}

async function saveVideo(event, videoId) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);
  
  try {
    await apiCall(`/super-admin/videos/${videoId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    closeModal();
    loadVideos();
    alert('Video güncellendi');
  } catch(e) {
    alert('Video güncellenemedi');
  }
}

async function toggleVideoSuspension(videoId, suspend) {
  const reason = suspend ? prompt('Askıya alma sebebi:') : null;
  if (suspend && !reason) return;
  
  try {
    await apiCall(`/super-admin/videos/${videoId}/suspend`, {
      method: 'PUT',
      body: JSON.stringify({ suspended: suspend, reason })
    });
    
    loadVideos();
    alert(suspend ? 'Video askıya alındı' : 'Video askıdan kaldırıldı');
  } catch(e) {
    alert('İşlem başarısız');
  }
}

async function deleteVideo(videoId) {
  if (!confirm('Bu videoyu silmek istediğinizden emin misiniz?')) return;
  
  const reason = prompt('Silme sebebi:');
  if (!reason) return;
  
  try {
    await apiCall(`/super-admin/videos/${videoId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
    
    loadVideos();
    alert('Video silindi');
  } catch(e) {
    alert('Video silinemedi');
  }
}

// Kullanıcı işlemleri
async function editUser(userId) {
  try {
    const user = await apiCall(`/super-admin/users/${userId}`);
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      <form onsubmit="saveUser(event, ${userId})">
        <div class="form-group">
          <label class="form-label">Kullanıcı Adı</label>
          <input type="text" class="form-input" name="username" value="${user.username}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Takma Ad</label>
          <input type="text" class="form-input" name="nickname" value="${user.nickname}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Doğum Tarihi</label>
          <input type="date" class="form-input" name="birth_date" value="${user.birth_date || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Yeni Şifre (Boş bırakılırsa değişmez)</label>
          <input type="password" class="form-input" name="password" placeholder="Yeni şifre">
        </div>
        <div class="form-group">
          <label class="form-label">Rol</label>
          <select class="form-input" name="role">
            <option value="user" ${(user.role || 'user') === 'user' ? 'selected' : ''}>Kullanıcı</option>
            <option value="yetkili" ${user.role === 'yetkili' ? 'selected' : ''}>Yetkili</option>
            <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Moderatör</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">İptal</button>
          <button type="submit" class="btn btn-primary">Kaydet</button>
        </div>
      </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Kullanıcı Düzenle';
    document.getElementById('editModal').style.display = 'flex';
    
  } catch(e) {
    alert('Kullanıcı bilgileri yüklenemedi');
  }
}

async function saveUser(event, userId) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);
  
  try {
    // Kullanıcı bilgilerini güncelle
    await apiCall(`/super-admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    // Rol değişikliği
    await apiCall(`/super-admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: data.role })
    });
    
    closeModal();
    loadUsers();
    alert('Kullanıcı güncellendi');
  } catch(e) {
    alert('Kullanıcı güncellenemedi');
  }
}

async function muteUser(userId) {
  const reason = prompt('Mute sebebi:');
  if (!reason) return;
  
  const duration = prompt('Süre (saat, kalıcı için 0):');
  if (duration === null) return;
  
  try {
    await apiCall(`/super-admin/users/${userId}/mute`, {
      method: 'POST',
      body: JSON.stringify({
        reason,
        duration_hours: parseInt(duration) || 0,
        is_permanent: parseInt(duration) === 0
      })
    });
    
    loadUsers();
    alert('Kullanıcı mute edildi');
  } catch(e) {
    alert('Mute işlemi başarısız');
  }
}

async function banUser(userId) {
  const reason = prompt('Ban sebebi:');
  if (!reason) return;
  
  const duration = prompt('Süre (saat, kalıcı için 0):');
  if (duration === null) return;
  
  try {
    await apiCall(`/super-admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({
        reason,
        duration_hours: parseInt(duration) || 0,
        is_permanent: parseInt(duration) === 0
      })
    });
    
    loadUsers();
    alert('Kullanıcı banlandı');
  } catch(e) {
    alert('Ban işlemi başarısız');
  }
}

// Diğer sayfa yükleme fonksiyonları (placeholder)
function loadMusicPage() {
  document.getElementById('pageContent').innerHTML = '<div class="loading">Müzik yönetimi geliştiriliyor...</div>';
}

function loadGroupsPage() {
  document.getElementById('pageContent').innerHTML = '<div class="loading">Grup yönetimi geliştiriliyor...</div>';
}

function loadReportsPage() {
  document.getElementById('pageContent').innerHTML = '<div class="loading">Bildiri sistemi geliştiriliyor...</div>';
}

function loadMessagesPage() {
  document.getElementById('pageContent').innerHTML = '<div class="loading">Mesaj yönetimi geliştiriliyor...</div>';
}

function loadCommentsPage() {
  document.getElementById('pageContent').innerHTML = '<div class="loading">Yorum yönetimi geliştiriliyor...</div>';
}

function loadRolesPage() {
  document.getElementById('pageContent').innerHTML = '<div class="loading">Rol yönetimi geliştiriliyor...</div>';
}

function loadTSMusicAppsPage() {
  document.getElementById('pageContent').innerHTML = '<div class="loading">TS Music başvuruları geliştiriliyor...</div>';
}

function loadLogsPage() {
  document.getElementById('pageContent').innerHTML = '<div class="loading">Sistem logları geliştiriliyor...</div>';
}

function loadSettingsPage() {
  document.getElementById('pageContent').innerHTML = '<div class="loading">Ayarlar geliştiriliyor...</div>';
}

// Yenileme fonksiyonları
function refreshVideos() {
  loadVideos();
}

function refreshUsers() {
  loadUsers();
}

// Modal işlemleri
function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

// Çıkış
function logout() {
  localStorage.removeItem('admin_token');
  window.location.href = '/admin';
}