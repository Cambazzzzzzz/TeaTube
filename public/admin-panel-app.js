// API URL
const API_URL = window.location.origin + '/api';

// Auth check
const adminToken = localStorage.getItem('teatube_admin_token');
if (!adminToken) {
  window.location.href = '/admin';
}

// ==================== UTILITY FUNCTIONS ====================

async function api(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
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
  window.location.href = '/admin';
}

// ==================== PAGE NAVIGATION ====================

function showAdminPage(page) {
  document.querySelectorAll('.sidebar-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  document.getElementById('main-content').innerHTML = '';
  
  if (page === 'dashboard') renderDashboard();
  else if (page === 'sifreler') renderSifreler();
  else if (page === 'sistem-loglari') renderSistemLoglari();
  else if (page === 'yedek') renderYedekYonetimi();
}

// ==================== DASHBOARD ====================

async function renderDashboard() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-gauge"></i> Dashboard</div>
      <div class="page-subtitle">Sistem genel bakış</div>
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
        <div class="stat-value" id="stat-messages">-</div>
        <div class="stat-label">Toplam Mesaj</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-friendships">-</div>
        <div class="stat-label">Toplam Arkadaşlık</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-info-circle"></i> Sistem Bilgisi</div>
      <p style="color:var(--text2);font-size:14px;line-height:1.6">
        TeaTube Admin Paneli - Tüm sistem verilerini buradan yönetebilirsiniz.
      </p>
    </div>
  `;
  
  try {
    const stats = await api('GET', '/teatube-admin/stats');
    document.getElementById('stat-users').textContent = stats.totalUsers || 0;
    document.getElementById('stat-videos').textContent = stats.totalVideos || 0;
    document.getElementById('stat-messages').textContent = stats.totalMessages || 0;
    document.getElementById('stat-friendships').textContent = stats.totalFriendships || 0;
  } catch (e) {
    toast('İstatistikler yüklenemedi: ' + e.message, 'error');
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
