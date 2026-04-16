const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3456/api' : (window.location.protocol + '//' + window.location.host + '/api');
let adminData = null;

// Admin panel giriş sistemi - basit versiyon
window.addEventListener('DOMContentLoaded', () => {
  console.log('Admin panel yükleniyor...');
  
  // Eğer localStorage'da admin bilgisi varsa otomatik giriş yap
  const savedAdmin = localStorage.getItem('tea_admin');
  if (savedAdmin) {
    try {
      adminData = JSON.parse(savedAdmin);
      console.log('Otomatik giriş yapılıyor:', adminData.username);
      showAdminPanel();
      return;
    } catch(e) {
      console.error('Otomatik giriş hatası:', e);
      localStorage.removeItem('tea_admin');
    }
  }
  
  console.log('Şifre girişi bekleniyor...');
});

function showAdminPanel() {
  const loginScreen = document.getElementById('loginScreen');
  const adminApp = document.getElementById('adminApp');
  
  if (loginScreen) loginScreen.style.display = 'none';
  if (adminApp) adminApp.style.display = 'block';
  
  const nameEl = document.getElementById('sidebarAdminName');
  if (nameEl) nameEl.textContent = adminData?.username || 'Admin';
  
  console.log('Admin paneli açılıyor...');
  setTimeout(() => {
    console.log('Dashboard yükleniyor...');
    showSection('dashboard');
  }, 100);
}

async function adminLogin() {
  const password = document.getElementById('adminPassword')?.value;
  const errorEl = document.getElementById('loginError');
  
  console.log('Giriş denemesi başlatılıyor...');
  
  if (!password) {
    console.error('Şifre boş');
    if (errorEl) {
      errorEl.textContent = 'Şifre gerekli';
      errorEl.style.display = 'block';
    }
    return;
  }

  try {
    console.log('API isteği gönderiliyor...');
    const response = await fetch(API + '/admin/login-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    console.log('API yanıtı alındı:', response.status);
    const data = await response.json();
    console.log('API verisi:', data);

    if (response.ok && data.success) {
      console.log('Giriş başarılı!');
      adminData = data.admin;
      localStorage.setItem('tea_admin', JSON.stringify(adminData));
      
      showAdminPanel();
    } else {
      console.error('Giriş başarısız:', data.error);
      if (errorEl) {
        errorEl.textContent = data.error || 'Giriş başarısız';
        errorEl.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Giriş hatası:', error);
    if (errorEl) {
      errorEl.textContent = 'Bağlantı hatası: ' + error.message;
      errorEl.style.display = 'block';
    }
  }
}

function adminLogout() { localStorage.removeItem('tea_admin'); location.reload(); }

function showToast(msg, ok=true) {
  const t = document.getElementById('adminToast');
  t.textContent=msg; t.style.background=ok?'#1db954':'#ff0033'; t.style.display='block';
  setTimeout(()=>t.style.display='none',3000);
}

function showModal(html) {
  document.querySelector('.a-modal-bg')?.remove();
  const bg = document.createElement('div');
  bg.className='a-modal-bg';
  bg.innerHTML='<div class="a-modal">'+html+'<button class="a-btn" style="margin-top:16px;width:100%" onclick="this.closest(\'.a-modal-bg\').remove()">Kapat</button></div>';
  bg.addEventListener('click', e => { if(e.target===bg) bg.remove(); });
  document.body.appendChild(bg);
}
function closeModal() { document.querySelector('.a-modal-bg')?.remove(); }

function showSection(sec) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>{ if(n.getAttribute('onclick')&&n.getAttribute('onclick').includes(sec)) n.classList.add('active'); });
  const titles = {dashboard:'Dashboard',users:'Kullanicilar',channels:'Kanallar',personal:'Kisisel Hesaplar','ip-bans':'IP Banlari',videos:'Videolar',groups:'Gruplar',messages:'Mesajlasmalar','music-applications':'TS Music - Basvurular','music-artists':'TS Music - Artistler','music-songs':'TS Music - Sarkilar','admin-settings':'Admin Ayarlari'};
  const tb = document.getElementById('topbarTitle');
  if (tb) tb.textContent = titles[sec] || sec;
  switch(sec) {
    case 'dashboard': loadDashboard(); break;
    case 'users': loadUsers(); break;
    case 'channels': loadChannels('channel'); break;
    case 'personal': loadChannels('personal'); break;
    case 'ip-bans': loadIPBans(); break;
    case 'videos': loadVideos(); break;
    case 'groups': loadGroups(); break;
    case 'messages': loadMessages(); break;
    case 'music-applications': loadMusicApplications(); break;
    case 'music-artists': loadMusicArtists(); break;
    case 'music-songs': loadMusicSongs(); break;
    case 'announcements': loadAnnouncements(); break;
    case 'badges': loadBadges(); break;
    case 'admin-settings': loadAdminSettings(); break;
  }
}


// ─── DASHBOARD ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  const c = document.getElementById('mainContent');
  document.getElementById('topbarTitle').textContent = 'Dashboard';
  c.innerHTML = '<p style="color:#666">Yukleniyor...</p>';
  try {
    const r = await fetch(API+'/admin/stats');
    const s = await r.json();
    
    // Pending badge guncelle
    const pb = document.getElementById('pendingBadge');
    if (pb && s.pendingApplications > 0) { pb.textContent = s.pendingApplications; pb.style.display = 'inline'; }

    const cards = [
      { icon:'fa-users', color:'#3b82f6', bg:'rgba(59,130,246,0.12)', val: s.totalUsers??0, lbl:'Toplam Kullanici' },
      { icon:'fa-user-slash', color:'#ef4444', bg:'rgba(239,68,68,0.12)', val: s.suspendedUsers??0, lbl:'Askiya Alinan' },
      { icon:'fa-video', color:'#8b5cf6', bg:'rgba(139,92,246,0.12)', val: s.totalVideos??0, lbl:'Toplam Video' },
      { icon:'fa-tv', color:'#06b6d4', bg:'rgba(6,182,212,0.12)', val: s.totalChannels??0, lbl:'Kanal' },
      { icon:'fa-user', color:'#f59e0b', bg:'rgba(245,158,11,0.12)', val: s.totalPersonal??0, lbl:'Kisisel Hesap' },
      { icon:'fa-music', color:'#1db954', bg:'rgba(29,185,84,0.12)', val: s.totalSongs??0, lbl:'Sarki' },
      { icon:'fa-microphone', color:'#ec4899', bg:'rgba(236,72,153,0.12)', val: s.totalArtists??0, lbl:'Artist' },
      { icon:'fa-file-alt', color:'#ff0033', bg:'rgba(255,0,51,0.12)', val: s.pendingApplications??0, lbl:'Bekleyen Basvuru' },
      { icon:'fa-ban', color:'#6b7280', bg:'rgba(107,114,128,0.12)', val: s.bannedIPs??0, lbl:'Banli IP' },
    ];

    c.innerHTML = `
      <div class="section-header"><h2>Dashboard</h2></div>
      <div class="stat-grid">
        ${cards.map(card => `
          <div class="stat-card">
            <div class="s-icon" style="background:${card.bg};color:${card.color}"><i class="fas ${card.icon}"></i></div>
            <div class="val" style="color:${card.color}">${card.val}</div>
            <div class="lbl">${card.lbl}</div>
          </div>`).join('')}
      </div>`;
  } catch(e) { c.innerHTML='<p style="color:#666">Baglanti hatasi</p>'; }
}

// ─── USERS ────────────────────────────────────────────────────────────────────
let userSearchTimeout = null;
async function loadUsers(search='') {
  const c = document.getElementById('mainContent');
  c.innerHTML = `
    <h2>Kullanicilar</h2>
    <div style="margin-bottom:12px;display:flex;gap:8px">
      <input id="userSearch" class="a-input" placeholder="Kullanici ara..." value="${search}" style="flex:1" oninput="clearTimeout(userSearchTimeout);userSearchTimeout=setTimeout(()=>loadUsers(this.value),400)">
    </div>
    <div id="userTableWrap"><p>Yukleniyor...</p></div>`;
  try {
    const url = API+'/admin/users'+(search?'?q='+encodeURIComponent(search):'');
    const r = await fetch(url, {headers:{'x-admin-token': adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { document.getElementById('userTableWrap').innerHTML='<p>Hata: '+d.error+'</p>'; return; }
    const users = d.users || d;
    if (!users.length) { document.getElementById('userTableWrap').innerHTML='<p>Kullanici bulunamadi.</p>'; return; }
    let rows = users.map(u=>`
      <tr>
        <td>${u.id}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <img src="${u.profile_photo && u.profile_photo!=='?' ? u.profile_photo : ''}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;background:#333;flex-shrink:0" onerror="this.style.display='none'" />
            <div>
              <div style="font-weight:500">${esc(u.nickname||u.username)}${u.is_red_verified ? ' <i class="fas fa-certificate" style="color:#ff0033;font-size:12px"></i>' : ''}</div>
              <div style="font-size:11px;color:#666">@${esc(u.username)}</div>
            </div>
          </div>
        </td>
        <td style="font-size:12px;color:#888;font-family:monospace">${esc(u.last_ip||'-')}</td>
        <td>${u.is_suspended?'<span class="badge badge-red">Askida</span>':'<span class="badge badge-green">Aktif</span>'}</td>
        <td style="font-size:12px;color:#888">${u.created_at?u.created_at.slice(0,10):'-'}</td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="a-btn a-btn-sm a-btn-gray" onclick="showUserDetail(${u.id})">Detay</button>
            <button class="a-btn a-btn-sm" style="background:${u.is_suspended?'#1db954':'#e67e22'}" onclick="toggleSuspend(${u.id},${u.is_suspended?0:1})">${u.is_suspended?'Aktif Et':'Askiya Al'}</button>
            <button class="a-btn a-btn-sm" style="background:#c00" onclick="deleteUser(${u.id},'${esc(u.username)}')">Sil</button>
          </div>
        </td>
      </tr>`).join('');
    document.getElementById('userTableWrap').innerHTML = `
      <div class="table-wrap">
        <table class="a-table">
          <thead><tr><th>ID</th><th>Kullanici</th><th>Son IP</th><th>Durum</th><th>Kayit</th><th>Islemler</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch(e) { document.getElementById('userTableWrap').innerHTML='<p>Baglanti hatasi</p>'; }
}

async function showUserDetail(userId) {
  try {
    const [userR, attR, bansR] = await Promise.all([
      fetch(API+'/admin/user/'+userId),
      fetch(API+'/admin/user/'+userId+'/login-attempts'),
      fetch(API+'/admin/user/'+userId+'/bans')
    ]);
    const u = await userR.json();
    const attempts = await attR.json().catch(() => []);
    const bans = await bansR.json().catch(() => []);
    const attRows = attempts.map(a=>`<tr><td>${a.ip||'-'}</td><td>${a.created_at?a.created_at.slice(0,19):'-'}</td><td>${a.success?'Basarili':'Basarisiz'}</td></tr>`).join('') || '<tr><td colspan="3">Kayit yok</td></tr>';
    const banRows = bans.map(b=>`<tr><td>${esc(b.reason||'-')}</td><td>${b.created_at?b.created_at.slice(0,10):'-'}</td><td>${b.expires_at?b.expires_at.slice(0,10):'Kalici'}</td><td><button class="a-btn a-btn-sm" style="background:#ff0033" onclick="removeBan(${b.id},${userId})">Kaldir</button></td></tr>`).join('') || '<tr><td colspan="4">Ban yok</td></tr>';
    showModal(`
      <h3>${esc(u.username)} - Detay</h3>
      <p><b>Email:</b> ${esc(u.email||'-')}</p>
      <p><b>Durum:</b> ${u.is_suspended?'Askida':'Aktif'}</p>
      <p><b>Kayit:</b> ${u.created_at?u.created_at.slice(0,10):'-'}</p>
      <div style="margin:12px 0;padding:10px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:14px;display:flex;align-items:center;gap:8px;">
          <i class="fas fa-certificate" style="color:#ff0033;font-size:18px;"></i>
          Kirmizi Tik: <b>${u.is_red_verified?'<span style="color:#ff0033">Aktif</span>':'Yok'}</b>
        </span>
        ${u.is_red_verified
          ? `<button class="a-btn a-btn-sm" style="background:#ff0033" onclick="removeRedVerify(${u.id})">Tiki Al</button>`
          : `<button class="a-btn a-btn-sm" style="background:#ff0033" onclick="giveRedVerify(${u.id})">Tik Ver</button>`
        }
      </div>
      <hr>
      <h4>Isim Degistir</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <input id="renameUsername" class="a-input" placeholder="Yeni kullanici adi" value="${esc(u.username||'')}" style="flex:1;min-width:120px">
        <input id="renameNickname" class="a-input" placeholder="Yeni takma ad" value="${esc(u.nickname||'')}" style="flex:1;min-width:120px">
        <button class="a-btn" onclick="renameUser(${u.id})">Degistir</button>
      </div>
      <h4>Sifre Degistir</h4>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input id="newPwInput" class="a-input" type="password" placeholder="Yeni sifre" style="flex:1">
        <button class="a-btn" onclick="changeUserPassword(${u.id})">Degistir</button>
      </div>
      <h4>Dogum Tarihi</h4>
      <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
        <span style="font-size:13px;color:#888;flex:1">${u.birth_date ? new Date(u.birth_date).toLocaleDateString('tr-TR') : 'Belirtilmemis'}</span>
        <input id="birthDateInput" class="a-input" type="date" value="${u.birth_date||''}" style="flex:1">
        <button class="a-btn" onclick="changeUserBirthDate(${u.id})">Degistir</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <input id="banReason" class="a-input" placeholder="Sebep" style="flex:1;min-width:120px">
        <input id="banExpires" class="a-input" type="date" style="width:140px">
        <button class="a-btn" onclick="addBan(${u.id})">Ban Ekle</button>
      </div>
      <h4>Giris Denemeleri</h4>
      <table class="a-table"><thead><tr><th>IP</th><th>Tarih</th><th>Sonuc</th></tr></thead><tbody>${attRows}</tbody></table>
      <h4 style="margin-top:12px">Banlar</h4>
      <table class="a-table"><thead><tr><th>Sebep</th><th>Tarih</th><th>Bitis</th><th></th></tr></thead><tbody>${banRows}</tbody></table>
    `);
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function toggleSuspend(userId, suspend) {
  try {
    const r = await fetch(API+'/admin/user/'+userId+'/suspend', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suspend:!!suspend})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast(suspend?'Kullanici askiya alindi':'Kullanici aktif edildi');
    loadUsers(document.getElementById('userSearch')?.value||'');
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function deleteUser(userId, username) {
  if (!confirm(username+' kullanicisini silmek istediginize emin misiniz?')) return;
  try {
    const r = await fetch(API+'/admin/user/'+userId, {method:'DELETE'});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Kullanici silindi');
    loadUsers(document.getElementById('userSearch')?.value||'');
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function giveRedVerify(userId) {
  try {
    const r = await fetch(API+'/admin/user/'+userId+'/red-verify', {method:'POST', headers:{'Content-Type':'application/json'}});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Kirmizi tik verildi');
    closeModal();
    showUserDetail(userId);
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function removeRedVerify(userId) {
  try {
    const r = await fetch(API+'/admin/user/'+userId+'/red-verify', {method:'DELETE', headers:{'Content-Type':'application/json'}});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Kirmizi tik alindi');
    closeModal();
    showUserDetail(userId);
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function renameUser(userId) {
  const username = document.getElementById('renameUsername')?.value.trim();
  const nickname = document.getElementById('renameNickname')?.value.trim();
  if (!username && !nickname) { showToast('En az bir alan doldurulmali', false); return; }
  try {
    const r = await fetch(API+'/admin/user/'+userId+'/rename', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username, nickname})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Isim guncellendi');
    closeModal();
    loadUsers(document.getElementById('userSearch')?.value||'');
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function changeUserPassword(userId) {
  const pw = document.getElementById('newPwInput')?.value;
  if (!pw || pw.length < 4) { showToast('Sifre en az 4 karakter olmali', false); return; }
  try {
    const r = await fetch(API+'/admin/user/'+userId+'/password', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({newPassword:pw})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Sifre degistirildi');
    closeModal();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function changeUserBirthDate(userId) {
  const birth_date = document.getElementById('birthDateInput')?.value;
  if (!birth_date) { showToast('Tarih secin', false); return; }
  try {
    const r = await fetch(API+'/admin/user/'+userId+'/birth-date', {method:'PUT', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({birth_date})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Dogum tarihi guncellendi');
    showUserDetail(userId);
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function addBan(userId) {
  const reason = document.getElementById('banReason')?.value.trim();
  const expires = document.getElementById('banExpires')?.value;
  try {
    const r = await fetch(API+'/admin/user/'+userId+'/ban', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({banType:'all', reason, isPermanent:!expires, bannedUntil:expires||null})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Ban eklendi');
    showUserDetail(userId);
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function removeBan(banId, userId) {
  try {
    const r = await fetch(API+'/admin/ban/'+banId, {method:'DELETE', headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Ban kaldirildi');
    showUserDetail(userId);
  } catch(e) { showToast('Baglanti hatasi', false); }
}

// ─── CHANNELS ─────────────────────────────────────────────────────────────────
async function loadChannels(type='channel') {
  const c = document.getElementById('mainContent');
  const label = type==='channel' ? 'Kanallar' : 'Kisisel Kanallar';
  c.innerHTML = `<h2>${label}</h2><p>Yukleniyor...</p>`;
  try {
    const r = await fetch(API+'/admin/channels?type='+type, {headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { c.innerHTML='<h2>'+label+'</h2><p>Hata: '+d.error+'</p>'; return; }
    const channels = d.channels || d;
    if (!channels.length) { c.innerHTML='<h2>'+label+'</h2><p>Kayit yok.</p>'; return; }
    const rows = channels.map(ch=>`
      <tr>
        <td>${ch.id}</td>
        <td>${esc(ch.name||'-')}</td>
        <td>${esc(ch.owner_username||ch.username||'-')}</td>
        <td>${ch.subscriber_count??0}</td>
        <td>${ch.video_count??0}</td>
        <td>${ch.created_at?ch.created_at.slice(0,10):'-'}</td>
        <td>${ch.is_suspended?'<span style="color:#ff0033">Askida</span>':'Aktif'}</td>
      </tr>`).join('');
    c.innerHTML = `
      <h2>${label}</h2>
      <table class="a-table">
        <thead><tr><th>ID</th><th>Ad</th><th>Sahip</th><th>Abone</th><th>Video</th><th>Tarih</th><th>Durum</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch(e) { c.innerHTML='<h2>'+label+'</h2><p>Baglanti hatasi</p>'; }
}

// ─── VIDEOS ───────────────────────────────────────────────────────────────────
async function loadVideos() {
  const c = document.getElementById('mainContent');
  c.innerHTML = '<h2>Videolar</h2><p>Yukleniyor...</p>';
  try {
    const r = await fetch(API+'/admin/videos', {headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { c.innerHTML='<h2>Videolar</h2><p>Hata: '+d.error+'</p>'; return; }
    const videos = d.videos || d;
    if (!videos.length) { c.innerHTML='<h2>Videolar</h2><p>Video yok.</p>'; return; }
    const rows = videos.map(v=>`
      <tr>
        <td>${v.id}</td>
        <td>${esc(v.title||'-')}</td>
        <td>${esc(v.channel_name||v.uploader||'-')}</td>
        <td>${v.view_count??0}</td>
        <td>${v.is_suspended?'<span style="color:#ff0033">Askida</span>':'Aktif'}</td>
        <td>${v.created_at?v.created_at.slice(0,10):'-'}</td>
        <td>
          <button class="a-btn a-btn-sm" style="background:${v.is_suspended?'#1db954':'#e67e22'}" onclick="toggleVideoSuspend(${v.id},${v.is_suspended?0:1})">${v.is_suspended?'Aktif Et':'Askiya Al'}</button>
          <button class="a-btn a-btn-sm" onclick="editVideoTitle(${v.id},'${esc(v.title||'')}')">Duzenle</button>
          <button class="a-btn a-btn-sm" style="background:#ff0033" onclick="deleteVideo(${v.id},'${esc(v.title||'')}')">Sil</button>
        </td>
      </tr>`).join('');
    c.innerHTML = `
      <h2>Videolar</h2>
      <table class="a-table">
        <thead><tr><th>ID</th><th>Baslik</th><th>Kanal</th><th>Izlenme</th><th>Durum</th><th>Tarih</th><th>Islemler</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch(e) { c.innerHTML='<h2>Videolar</h2><p>Baglanti hatasi</p>'; }
}

async function toggleVideoSuspend(videoId, suspend) {
  try {
    const r = await fetch(API+'/admin/video/'+videoId+'/suspend', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suspend:!!suspend})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast(suspend?'Video askiya alindi':'Video aktif edildi');
    loadVideos();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

function editVideoTitle(videoId, currentTitle) {
  showModal(`
    <h3>Video Duzenle</h3>
    <div class="a-form-group">
      <label>Baslik</label>
      <input id="editVideoTitleInput" class="a-input" value="${esc(currentTitle)}" style="width:100%;margin-bottom:12px">
    </div>
    <div class="a-form-group">
      <label>Etiketler (virgülle ayirin)</label>
      <input id="editVideoTagsInput" class="a-input" placeholder="oyun, muzik, spor..." style="width:100%;margin-bottom:12px">
    </div>
    <div class="a-form-group">
      <label>Goruntulenme Sayisi</label>
      <input id="editVideoViewsInput" class="a-input" type="number" min="0" placeholder="Goruntulenme sayisi" style="width:100%;margin-bottom:12px">
    </div>
    <button class="a-btn" style="width:100%" onclick="saveVideoEdit(${videoId})">Kaydet</button>
  `);
  // Mevcut verileri yükle
  fetch(API+'/admin/video/'+videoId+'/tags').then(r=>r.json()).then(d=>{
    const inp = document.getElementById('editVideoTagsInput');
    if (inp && d.tags) inp.value = d.tags;
  }).catch(()=>{});
  // Mevcut görüntülenme sayısını yükle
  fetch(API+'/admin/videos').then(r=>r.json()).then(d=>{
    const videos = d.videos || d;
    const v = videos.find(v => v.id === videoId);
    const inp = document.getElementById('editVideoViewsInput');
    if (inp && v) inp.value = v.view_count ?? v.views ?? 0;
  }).catch(()=>{});
}

async function saveVideoEdit(videoId) {
  const title = document.getElementById('editVideoTitleInput')?.value.trim();
  const tags = document.getElementById('editVideoTagsInput')?.value.trim();
  const views = document.getElementById('editVideoViewsInput')?.value;
  if (!title) { showToast('Baslik bos olamaz', false); return; }
  try {
    const r = await fetch(API+'/admin/video/'+videoId, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title, tags, views: views !== '' ? views : undefined})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Video guncellendi');
    closeModal();
    loadVideos();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function deleteVideo(videoId, title) {
  if (!confirm('"'+title+'" videosunu silmek istediginize emin misiniz?')) return;
  try {
    const r = await fetch(API+'/admin/video/'+videoId, {method:'DELETE'});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Video silindi');
    loadVideos();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

// ─── IP BANS ──────────────────────────────────────────────────────────────────
async function loadIPBans() {
  const c = document.getElementById('mainContent');
  c.innerHTML = '<h2>IP Banlari</h2><p>Yukleniyor...</p>';
  try {
    const r = await fetch(API+'/admin/ip-bans', {headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { c.innerHTML='<h2>IP Banlari</h2><p>Hata: '+d.error+'</p>'; return; }
    const bans = d.bans || d;
    const rows = bans.length ? bans.map(b=>`
      <div class="ip-ban-row" style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid #333">
        <span style="flex:1;font-family:monospace">${esc(b.ip)}</span>
        <span style="color:#aaa;font-size:13px">${esc(b.reason||'-')}</span>
        <span style="color:#aaa;font-size:13px">${b.created_at?b.created_at.slice(0,10):'-'}</span>
        <button class="a-btn a-btn-sm" style="background:#ff0033" onclick="removeIPBan(${b.id})">Kaldir</button>
      </div>`).join('') : '<p>IP ban yok.</p>';
    c.innerHTML = `
      <h2>IP Banlari</h2>
      <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin-bottom:20px">
        <h4 style="margin:0 0 12px">Yeni IP Ban</h4>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input id="newBanIP" class="a-input" placeholder="IP adresi" style="flex:1;min-width:150px">
          <input id="newBanReason" class="a-input" placeholder="Sebep (opsiyonel)" style="flex:2;min-width:150px">
          <button class="a-btn" onclick="addIPBan()">Ban Ekle</button>
        </div>
      </div>
      <div id="ipBanList">${rows}</div>`;
  } catch(e) { c.innerHTML='<h2>IP Banlari</h2><p>Baglanti hatasi</p>'; }
}

async function addIPBan() {
  const ip = document.getElementById('newBanIP')?.value.trim();
  const reason = document.getElementById('newBanReason')?.value.trim();
  if (!ip) { showToast('IP adresi gerekli', false); return; }
  try {
    const r = await fetch(API+'/admin/ip-bans', {method:'POST', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({ip, reason})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('IP banlandi');
    loadIPBans();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function removeIPBan(banId) {
  try {
    const r = await fetch(API+'/admin/ip-bans/'+banId, {method:'DELETE', headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('IP bani kaldirildi');
    loadIPBans();
  } catch(e) { showToast('Baglanti hatasi', false); }
}
// ─── MUSIC APPLICATIONS ───────────────────────────────────────────────────────
let musicAppTab = 'pending';
async function loadMusicApplications(tab) {
  if (tab) musicAppTab = tab;
  const c = document.getElementById('mainContent');
  c.innerHTML = '<h2>Muzik Basvurulari</h2><p>Yukleniyor...</p>';
  try {
    const r = await fetch(API+'/admin/music/applications', {headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { c.innerHTML='<h2>Muzik Basvurulari</h2><p>Hata: '+d.error+'</p>'; return; }
    const all = d.applications || d;
    const tabs = ['pending','accepted','rejected'];
    const tabBtns = tabs.map(t=>`<button class="a-btn${musicAppTab===t?' a-btn-active':''}" style="margin-right:6px${musicAppTab===t?';background:#1db954':''}" onclick="loadMusicApplications('${t}')">${t==='pending'?'Bekleyen':t==='accepted'?'Kabul Edilen':'Reddedilen'}</button>`).join('');
    const filtered = all.filter(a=>a.status===musicAppTab);
    const rows = filtered.length ? filtered.map(a=>`
      <tr>
        <td>${a.id}</td>
        <td>${esc(a.artist_name||a.username||'-')}</td>
        <td>${esc(a.email||'-')}</td>
        <td>${a.sample_audio_url ? `<audio controls src="${a.sample_audio_url}" style="height:32px;max-width:180px;"></audio>` : '<span style="color:#888">Yok</span>'}</td>
        <td>${a.created_at?a.created_at.slice(0,10):'-'}</td>
        <td>${musicAppTab==='pending'?`
          <button class="a-btn a-btn-sm" style="background:#1db954" onclick="reviewMusicApp(${a.id},'accept')">Kabul Et</button>
          <button class="a-btn a-btn-sm" style="background:#ff0033" onclick="reviewMusicApp(${a.id},'reject')">Reddet</button>
        `:esc(a.review_note||'-')}</td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center">Kayit yok</td></tr>';
    c.innerHTML = `
      <h2>Muzik Basvurulari</h2>
      <div style="margin-bottom:16px">${tabBtns}</div>
      <table class="a-table">
        <thead><tr><th>ID</th><th>Sanatci</th><th>Email</th><th>Ornek Sarki</th><th>Tarih</th><th>Islem</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch(e) { c.innerHTML='<h2>Muzik Basvurulari</h2><p>Baglanti hatasi</p>'; }
}

async function reviewMusicApp(appId, action) {
  const note = prompt(action==='accept'?'Kabul notu (opsiyonel):':'Red sebebi:') ?? '';
  // Backend 'accepted'/'rejected' bekliyor
  const backendAction = action === 'accept' ? 'accepted' : 'rejected';
  try {
    const r = await fetch(API+'/admin/music/application/'+appId, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action: backendAction, note})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast(action==='accept'?'Basvuru kabul edildi':'Basvuru reddedildi');
    loadMusicApplications();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

// ─── MUSIC ARTISTS ────────────────────────────────────────────────────────────
async function loadMusicArtists() {
  const c = document.getElementById('mainContent');
  c.innerHTML = '<h2>Muzik Sanatcilari</h2><p>Yukleniyor...</p>';
  try {
    const r = await fetch(API+'/admin/music/artists', {headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { c.innerHTML='<h2>Muzik Sanatcilari</h2><p>Hata: '+d.error+'</p>'; return; }
    const artists = d.artists || d;
    if (!artists.length) { c.innerHTML='<h2>Muzik Sanatcilari</h2><p>Sanatci yok.</p>'; return; }
    const rows = artists.map(a=>`
      <tr>
        <td>${a.id}</td>
        <td>${esc(a.name||'-')}</td>
        <td>${esc(a.username||'-')}</td>
        <td>${a.song_count??0}</td>
        <td>${a.is_suspended?'<span style="color:#ff0033">Askida</span>':'Aktif'}</td>
        <td>
          <button class="a-btn a-btn-sm" style="background:${a.is_suspended?'#1db954':'#e67e22'}" onclick="toggleArtistSuspend(${a.id},${a.is_suspended?0:1})">${a.is_suspended?'Aktif Et':'Askiya Al'}</button>
          <button class="a-btn a-btn-sm" onclick="editArtistName(${a.id},'${esc(a.name||'')}')">Duzenle</button>
          <button class="a-btn a-btn-sm" style="background:#ff0033" onclick="deleteArtist(${a.id},'${esc(a.name||'')}')">Sil</button>
        </td>
      </tr>`).join('');
    c.innerHTML = `
      <h2>Muzik Sanatcilari</h2>
      <table class="a-table">
        <thead><tr><th>ID</th><th>Ad</th><th>Kullanici</th><th>Sarki</th><th>Durum</th><th>Islemler</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch(e) { c.innerHTML='<h2>Muzik Sanatcilari</h2><p>Baglanti hatasi</p>'; }
}

async function toggleArtistSuspend(artistId, suspend) {
  try {
    const r = await fetch(API+'/admin/music/artist/'+artistId+'/suspend', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suspend:!!suspend})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast(suspend?'Sanatci askiya alindi':'Sanatci aktif edildi');
    loadMusicArtists();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

function editArtistName(artistId, currentName) {
  showModal(`
    <h3>Sanatci Adini Duzenle</h3>
    <input id="editArtistNameInput" class="a-input" value="${esc(currentName)}" style="width:100%;margin-bottom:12px">
    <button class="a-btn" style="width:100%" onclick="saveArtistName(${artistId})">Kaydet</button>
  `);
}

async function saveArtistName(artistId) {
  const name = document.getElementById('editArtistNameInput')?.value.trim();
  if (!name) { showToast('Ad bos olamaz', false); return; }
  try {
    const r = await fetch(API+'/admin/music/artist/'+artistId, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({artist_name:name})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Sanatci adi guncellendi');
    closeModal();
    loadMusicArtists();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function deleteArtist(artistId, name) {
  if (!confirm('"'+name+'" sanatcisini silmek istediginize emin misiniz?')) return;
  try {
    const r = await fetch(API+'/admin/music/artist/'+artistId, {method:'DELETE'});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Sanatci silindi');
    loadMusicArtists();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

// ─── MUSIC SONGS ──────────────────────────────────────────────────────────────
async function loadMusicSongs() {
  const c = document.getElementById('mainContent');
  c.innerHTML = '<h2>Muzik Sarkilari</h2><p>Yukleniyor...</p>';
  try {
    const r = await fetch(API+'/admin/music/songs', {headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { c.innerHTML='<h2>Muzik Sarkilari</h2><p>Hata: '+d.error+'</p>'; return; }
    const songs = d.songs || d;
    if (!songs.length) { c.innerHTML='<h2>Muzik Sarkilari</h2><p>Sarki yok.</p>'; return; }
    const rows = songs.map(s=>`
      <tr>
        <td>${s.id}</td>
        <td>${esc(s.title||'-')}</td>
        <td>${esc(s.artist_name||'-')}</td>
        <td>${esc(s.genre||'-')}</td>
        <td>${s.play_count??0}</td>
        <td>${s.is_suspended?'<span style="color:#ff0033">Askida</span>':'Aktif'}</td>
        <td>
          <button class="a-btn a-btn-sm" style="background:${s.is_suspended?'#1db954':'#e67e22'}" onclick="toggleSongSuspend(${s.id},${s.is_suspended?0:1})">${s.is_suspended?'Aktif Et':'Askiya Al'}</button>
          <button class="a-btn a-btn-sm" onclick="editSongTitle(${s.id},'${esc(s.title||'')}')">Duzenle</button>
          <button class="a-btn a-btn-sm" style="background:#ff0033" onclick="deleteSong(${s.id},'${esc(s.title||'')}')">Sil</button>
        </td>
      </tr>`).join('');
    c.innerHTML = `
      <h2>Muzik Sarkilari</h2>
      <table class="a-table">
        <thead><tr><th>ID</th><th>Baslik</th><th>Sanatci</th><th>Tur</th><th>Oynatma</th><th>Durum</th><th>Islemler</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch(e) { c.innerHTML='<h2>Muzik Sarkilari</h2><p>Baglanti hatasi</p>'; }
}

async function toggleSongSuspend(songId, suspend) {
  try {
    const r = await fetch(API+'/admin/music/song/'+songId+'/suspend', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suspend:!!suspend})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast(suspend?'Sarki askiya alindi':'Sarki aktif edildi');
    loadMusicSongs();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

function editSongTitle(songId, currentTitle) {
  showModal(`
    <h3>Sarki Duzenle</h3>
    <div class="a-form-group">
      <label>Baslik</label>
      <input id="editSongTitleInput" class="a-input" value="${esc(currentTitle)}" style="width:100%;margin-bottom:12px">
    </div>
    <div class="a-form-group">
      <label>Sanatci Adi</label>
      <input id="editSongArtistInput" class="a-input" placeholder="Sanatci adi" style="width:100%;margin-bottom:12px">
    </div>
    <div class="a-form-group">
      <label>Tur / Genre</label>
      <input id="editSongGenreInput" class="a-input" placeholder="Pop, Rock, Hip-Hop..." style="width:100%;margin-bottom:12px">
    </div>
    <div class="a-form-group">
      <label>Dinlenme Sayisi</label>
      <input id="editSongPlaysInput" class="a-input" type="number" min="0" placeholder="Dinlenme sayisi" style="width:100%;margin-bottom:12px">
    </div>
    <div class="a-form-group">
      <label>Kapak Gorseli URL</label>
      <input id="editSongCoverInput" class="a-input" placeholder="https://..." style="width:100%;margin-bottom:12px">
    </div>
    <div class="a-form-group">
      <label>Sarkiyi Goster (Dinlenme Sayisi)</label>
      <select id="editSongShowPlays" class="a-input" style="width:100%;margin-bottom:12px">
        <option value="1">Goster</option>
        <option value="0">Gizle</option>
      </select>
    </div>
    <button class="a-btn" style="width:100%" onclick="saveSongTitle(${songId})">Kaydet</button>
  `);
  // Mevcut verileri yükle
  fetch(API+'/admin/music/songs').then(r=>r.json()).then(d=>{
    const songs = d.songs || d;
    const s = songs.find(s => s.id === songId);
    if (!s) return;
    const inp = document.getElementById('editSongPlaysInput');
    const artist = document.getElementById('editSongArtistInput');
    const genre = document.getElementById('editSongGenreInput');
    const cover = document.getElementById('editSongCoverInput');
    const showPlays = document.getElementById('editSongShowPlays');
    if (inp) inp.value = s.play_count ?? 0;
    if (artist) artist.value = s.artist_name || '';
    if (genre) genre.value = s.genre || '';
    if (cover) cover.value = s.cover_url || '';
    if (showPlays) showPlays.value = s.show_play_count ? '1' : '0';
  }).catch(()=>{});
}

async function saveSongTitle(songId) {
  const title = document.getElementById('editSongTitleInput')?.value.trim();
  const plays = document.getElementById('editSongPlaysInput')?.value;
  const artist_name = document.getElementById('editSongArtistInput')?.value.trim();
  const genre = document.getElementById('editSongGenreInput')?.value.trim();
  const cover_url = document.getElementById('editSongCoverInput')?.value.trim();
  const show_play_count = document.getElementById('editSongShowPlays')?.value;
  if (!title) { showToast('Baslik bos olamaz', false); return; }
  try {
    const body = { title };
    if (plays !== undefined && plays !== '') body.play_count = parseInt(plays) || 0;
    if (artist_name) body.artist_name = artist_name;
    if (genre) body.genre = genre;
    if (cover_url) body.cover_url = cover_url;
    if (show_play_count !== undefined) body.show_play_count = parseInt(show_play_count);
    const r = await fetch(API+'/admin/music/song/'+songId+'/detail', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Sarki guncellendi');
    closeModal();
    loadMusicSongs();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function deleteSong(songId, title) {
  if (!confirm('"'+title+'" sarkisini silmek istediginize emin misiniz?')) return;
  try {
    const r = await fetch(API+'/admin/music/song/'+songId, {method:'DELETE'});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Sarki silindi');
    loadMusicSongs();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

// ─── ADMIN SETTINGS ───────────────────────────────────────────────────────────
async function loadAdminSettings() {
  const c = document.getElementById('mainContent');
  c.innerHTML = '<h2>Admin Ayarlari</h2><p>Yukleniyor...</p>';

  // Bypass şifresini de yükle
  let bypassPw = '';
  try {
    const br = await fetch(API+'/admin/bypass-password', {headers:{'x-admin-token':adminData?.token||''}});
    const bd = await br.json();
    bypassPw = bd.password || '';
  } catch(e) {}

  // Yaş sınırı ayarlarını yükle
  let ageSettings = { min_age: 15, warning: '' };
  try {
    const ar = await fetch(API+'/admin/age-settings', {headers:{'x-admin-token':adminData?.token||''}});
    ageSettings = await ar.json();
  } catch(e) {}

  try {
    const r = await fetch(API+'/admin/settings', {headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    const settings = d.settings || d;
    c.innerHTML = `
      <h2>Admin Ayarlari</h2>
      <div style="background:#1a1a1a;border-radius:8px;padding:20px;max-width:480px;margin-bottom:20px">
        <h4 style="margin:0 0 12px">Admin Sifresi Degistir</h4>
        <input id="adminCurrentPw" class="a-input" type="password" placeholder="Mevcut sifre" style="width:100%;margin-bottom:8px">
        <input id="adminNewPw" class="a-input" type="password" placeholder="Yeni sifre" style="width:100%;margin-bottom:8px">
        <input id="adminNewPwConfirm" class="a-input" type="password" placeholder="Yeni sifre (tekrar)" style="width:100%;margin-bottom:12px">
        <button class="a-btn" style="width:100%" onclick="saveAdminPassword()">Sifreyi Degistir</button>
      </div>
      <div style="background:#1a1a1a;border-radius:8px;padding:20px;max-width:480px;margin-bottom:20px">
        <h4 style="margin:0 0 6px">Kullanici Hesabi Bypass Sifresi</h4>
        <p style="font-size:12px;color:#888;margin:0 0 12px">Bu sifre ile herhangi bir kullanicinin hesabina girebilirsiniz.</p>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input id="bypassPwInput" class="a-input" type="text" value="${esc(bypassPw)}" placeholder="Bypass sifresi" style="flex:1">
          <button class="a-btn" onclick="saveBypassPassword()">Kaydet</button>
        </div>
        <p style="font-size:11px;color:#666">Mevcut: <code style="background:#111;padding:2px 6px;border-radius:4px">${bypassPw ? bypassPw.slice(0,6)+'...' : '(yok)'}</code></p>
      </div>
      <div style="background:#1a1a1a;border-radius:8px;padding:20px;max-width:480px">
        <h4 style="margin:0 0 6px;display:flex;align-items:center;gap:8px;"><i class="fas fa-birthday-cake" style="color:#ff0033"></i> Yas Siniri Ayarlari</h4>
        <p style="font-size:12px;color:#888;margin:0 0 12px">Kayit icin minimum yas siniri ve uyari mesajini ayarla.</p>
        <div style="margin-bottom:10px">
          <label style="font-size:12px;color:#888;display:block;margin-bottom:4px">Minimum Yas</label>
          <input id="minAgeInput" class="a-input" type="number" min="1" max="99" value="${ageSettings.min_age}" style="width:100px">
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;color:#888;display:block;margin-bottom:4px">Yas Siniri Uyari Mesaji</label>
          <input id="ageWarningInput" class="a-input" type="text" value="${esc(ageSettings.warning)}" placeholder="Uyari mesaji..." style="width:100%">
        </div>
        <button class="a-btn" onclick="saveAgeSettings()">Kaydet</button>
      </div>`;
  } catch(e) {
    c.innerHTML = `<h2>Admin Ayarlari</h2><p style="color:#ff4466">Hata: ${e.message}</p>`;
  }
}

async function saveAgeSettings() {
  const min_age = parseInt(document.getElementById('minAgeInput')?.value);
  const warning = document.getElementById('ageWarningInput')?.value?.trim();
  if (!min_age || min_age < 1) { showToast('Gecersiz yas', false); return; }
  try {
    const r = await fetch(API+'/admin/age-settings', {method:'PUT', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({min_age, warning})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Yas siniri guncellendi');
  } catch(e) { showToast('Baglanti hatasi', false); }
}
  } catch(e) {
    c.innerHTML = `
      <h2>Admin Ayarlari</h2>
      <div style="background:#1a1a1a;border-radius:8px;padding:20px;max-width:480px;margin-bottom:20px">
        <h4 style="margin:0 0 12px">Admin Sifresi Degistir</h4>
        <input id="adminCurrentPw" class="a-input" type="password" placeholder="Mevcut sifre" style="width:100%;margin-bottom:8px">
        <input id="adminNewPw" class="a-input" type="password" placeholder="Yeni sifre" style="width:100%;margin-bottom:8px">
        <input id="adminNewPwConfirm" class="a-input" type="password" placeholder="Yeni sifre (tekrar)" style="width:100%;margin-bottom:12px">
        <button class="a-btn" style="width:100%" onclick="saveAdminPassword()">Sifreyi Degistir</button>
      </div>
      <div style="background:#1a1a1a;border-radius:8px;padding:20px;max-width:480px">
        <h4 style="margin:0 0 6px">Kullanici Hesabi Bypass Sifresi</h4>
        <div style="display:flex;gap:8px">
          <input id="bypassPwInput" class="a-input" type="text" value="${esc(bypassPw)}" placeholder="Bypass sifresi" style="flex:1">
          <button class="a-btn" onclick="saveBypassPassword()">Kaydet</button>
        </div>
      </div>`;
  }
}

async function saveBypassPassword() {
  const pw = document.getElementById('bypassPwInput')?.value.trim();
  if (!pw || pw.length < 8) { showToast('Sifre en az 8 karakter olmali', false); return; }
  try {
    const r = await fetch(API+'/admin/bypass-password', {method:'PUT', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({password:pw})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Bypass sifresi guncellendi');
    loadAdminSettings();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function saveAdminPassword() {
  const current = document.getElementById('adminCurrentPw')?.value;
  const newPw = document.getElementById('adminNewPw')?.value;
  const confirm2 = document.getElementById('adminNewPwConfirm')?.value;
  if (!current || !newPw) { showToast('Tum alanlar gerekli', false); return; }
  if (newPw !== confirm2) { showToast('Yeni sifreler eslesmedi', false); return; }
  if (newPw.length < 6) { showToast('Sifre en az 6 karakter olmali', false); return; }
  try {
    const r = await fetch(API+'/admin/settings/password', {method:'POST', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({current_password:current, new_password:newPw})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Admin sifresi guncellendi');
    document.getElementById('adminCurrentPw').value='';
    document.getElementById('adminNewPw').value='';
    document.getElementById('adminNewPwConfirm').value='';
  } catch(e) { showToast('Baglanti hatasi', false); }
}

// ─── UTILITY ──────────────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── ROZETLER ─────────────────────────────────────────────────────────────────

const BADGE_ICONS = [
  'fa-mug-hot','fa-star','fa-crown','fa-fire','fa-bolt','fa-gem','fa-heart','fa-shield-alt',
  'fa-music','fa-microphone','fa-headphones','fa-guitar','fa-drum','fa-record-vinyl',
  'fa-gamepad','fa-chess','fa-dice','fa-trophy','fa-medal','fa-award',
  'fa-code','fa-laptop-code','fa-terminal','fa-robot','fa-brain','fa-atom',
  'fa-camera','fa-film','fa-video','fa-photo-video','fa-palette','fa-paint-brush',
  'fa-pen-nib','fa-feather-alt','fa-book','fa-graduation-cap','fa-university',
  'fa-rocket','fa-satellite','fa-globe','fa-map-marker-alt','fa-compass',
  'fa-leaf','fa-tree','fa-sun','fa-moon','fa-snowflake','fa-cloud-sun',
  'fa-cat','fa-dog','fa-dragon','fa-dove','fa-fish','fa-spider',
  'fa-pizza-slice','fa-hamburger','fa-ice-cream','fa-coffee','fa-wine-glass',
  'fa-dumbbell','fa-running','fa-bicycle','fa-football-ball','fa-basketball-ball',
  'fa-magic','fa-hat-wizard','fa-ghost','fa-skull','fa-alien','fa-user-astronaut',
  'fa-infinity','fa-yin-yang','fa-peace','fa-rainbow','fa-meteor','fa-comet'
];

async function loadBadges() {
  const c = document.getElementById('mainContent');
  document.getElementById('topbarTitle').textContent = 'Rozetler';
  c.innerHTML = '<p style="color:#666">Yukleniyor...</p>';
  try {
    const [badgesR, usersR] = await Promise.all([
      fetch(API+'/admin/badges'),
      fetch(API+'/admin/users?limit=100')
    ]);
    const badges = await badgesR.json();
    const usersData = await usersR.json();
    const users = Array.isArray(usersData) ? usersData : (usersData.users || []);

    c.innerHTML = `
      <div class="section-header">
        <h2>Rozetler</h2>
        <button class="a-btn" onclick="showCreateBadgeModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Yeni Rozet</button>
      </div>
      
      <!-- Rozetler -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:32px">
        ${badges.map(b => `
          <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center">
                <i class="fas ${b.icon}" style="color:${b.color};font-size:18px"></i>
              </div>
              <div>
                <p style="font-size:14px;font-weight:600;color:${b.name_color}">${esc(b.name)}</p>
                <p style="font-size:11px;color:#666">${b.is_system ? 'Sistem Rozeti' : 'Ozel Rozet'}</p>
              </div>
            </div>
            ${b.description ? `<p style="font-size:12px;color:#888">${esc(b.description)}</p>` : ''}
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="a-btn a-btn-sm a-btn-gray" onclick="showAssignBadgeModal(${b.id},'${esc(b.name)}')">Kullaniciya Ver</button>
              ${!b.is_system ? `<button class="a-btn a-btn-sm a-btn-gray" onclick="showEditBadgeModal(${b.id},'${esc(b.name)}','${b.icon}','${b.color}','${b.name_color}','${esc(b.description||'')}')">Duzenle</button>
              <button class="a-btn a-btn-sm" style="background:#c00" onclick="deleteBadge(${b.id})">Sil</button>` : ''}
            </div>
          </div>`).join('')}
      </div>

      <!-- Tüm Kullanıcılar - Rozet Atama -->
      <h3 style="font-size:16px;font-weight:700;margin-bottom:14px">Tum Kullanicilar</h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${users.map(u => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#1a1a1a;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
            <img src="${u.profile_photo && u.profile_photo!=='?' ? u.profile_photo : 'logoteatube.png'}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='logoteatube.png'" />
            <div style="flex:1;min-width:0">
              <p style="font-size:13px;font-weight:500">${esc(u.nickname||u.username)}</p>
              <p style="font-size:11px;color:#666">@${esc(u.username)} · ${u.created_at?u.created_at.slice(0,10):''}</p>
            </div>
            <select onchange="quickAssignBadge(this.value,${u.id},'${esc(u.nickname||u.username)}')" style="background:#111;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:5px 10px;border-radius:8px;font-size:12px;cursor:pointer">
              <option value="">Rozet Ver...</option>
              ${badges.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
          </div>`).join('')}
      </div>`;
  } catch(e) { c.innerHTML = '<p style="color:#666">Hata: '+e.message+'</p>'; }
}

async function quickAssignBadge(badgeId, userId, userName) {
  if (!badgeId) return;
  const r = await fetch(API+'/admin/badges/'+badgeId+'/assign/'+userId, { method:'POST' });
  const d = await r.json();
  showToast(r.ok ? userName+' kullanicisina rozet verildi' : (d.error||'Hata'), r.ok);
}

function showCreateBadgeModal() {
  showModal(`
    <h3 style="margin-bottom:16px">Yeni Rozet Olustur</h3>
    <div class="a-form-group"><label>Rozet Adi</label><input id="bName" class="a-input" placeholder="Rozet adi" /></div>
    <div class="a-form-group"><label>Aciklama</label><input id="bDesc" class="a-input" placeholder="Aciklama (opsiyonel)" /></div>
    <div class="a-form-group"><label>Ikon Rengi</label><input id="bColor" type="color" value="#ff0033" style="width:100%;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#1a1a1a;cursor:pointer" /></div>
    <div class="a-form-group"><label>Isim Rengi</label><input id="bNameColor" type="color" value="#ffffff" style="width:100%;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#1a1a1a;cursor:pointer" /></div>
    <div class="a-form-group">
      <label>Ikon Sec</label>
      <input id="bIconSearch" class="a-input" placeholder="Ikon ara..." oninput="filterBadgeIcons(this.value)" style="margin-bottom:8px" />
      <div id="bIconPreview" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:10px;background:#1a1a1a;border-radius:8px">
        <i id="bIconPreviewEl" class="fas fa-star" style="font-size:24px;color:#ff0033"></i>
        <span id="bIconName" style="font-size:13px;color:#888">fa-star</span>
      </div>
      <div id="bIconGrid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;max-height:200px;overflow-y:auto;padding:4px">
        ${BADGE_ICONS.map(ic => `<button onclick="selectBadgeIcon('${ic}')" title="${ic}" style="background:rgba(255,255,255,0.06);border:1px solid transparent;border-radius:8px;padding:8px;cursor:pointer;transition:all 0.15s" onmouseover="this.style.borderColor='#ff0033'" onmouseout="this.style.borderColor='transparent'"><i class="fas ${ic}" style="font-size:16px;color:#aaa"></i></button>`).join('')}
      </div>
    </div>
    <input type="hidden" id="bIcon" value="fa-star" />
    <button class="a-btn" style="width:100%;margin-top:8px" onclick="createBadge()">Olustur</button>`);
}

function filterBadgeIcons(q) {
  const grid = document.getElementById('bIconGrid');
  if (!grid) return;
  const filtered = q ? BADGE_ICONS.filter(ic => ic.includes(q.toLowerCase())) : BADGE_ICONS;
  grid.innerHTML = filtered.map(ic => `<button onclick="selectBadgeIcon('${ic}')" title="${ic}" style="background:rgba(255,255,255,0.06);border:1px solid transparent;border-radius:8px;padding:8px;cursor:pointer;transition:all 0.15s" onmouseover="this.style.borderColor='#ff0033'" onmouseout="this.style.borderColor='transparent'"><i class="fas ${ic}" style="font-size:16px;color:#aaa"></i></button>`).join('');
}

function selectBadgeIcon(icon) {
  document.getElementById('bIcon').value = icon;
  const prev = document.getElementById('bIconPreviewEl');
  const name = document.getElementById('bIconName');
  const color = document.getElementById('bColor')?.value || '#ff0033';
  if (prev) { prev.className = 'fas ' + icon; prev.style.color = color; }
  if (name) name.textContent = icon;
}

async function createBadge() {
  const name = document.getElementById('bName')?.value.trim();
  const icon = document.getElementById('bIcon')?.value;
  const color = document.getElementById('bColor')?.value;
  const nameColor = document.getElementById('bNameColor')?.value;
  const description = document.getElementById('bDesc')?.value.trim();
  if (!name) { showToast('Rozet adi gerekli', false); return; }
  const r = await fetch(API+'/admin/badges', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, icon, color, nameColor, description}) });
  const d = await r.json();
  if (!r.ok) { showToast(d.error||'Hata', false); return; }
  showToast('Rozet olusturuldu');
  closeModal();
  loadBadges();
}

function showEditBadgeModal(id, name, icon, color, nameColor, desc) {
  showModal(`
    <h3 style="margin-bottom:16px">Rozet Duzenle</h3>
    <div class="a-form-group"><label>Rozet Adi</label><input id="ebName" class="a-input" value="${esc(name)}" /></div>
    <div class="a-form-group"><label>Aciklama</label><input id="ebDesc" class="a-input" value="${esc(desc)}" /></div>
    <div class="a-form-group"><label>Ikon Rengi</label><input id="ebColor" type="color" value="${color}" style="width:100%;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#1a1a1a;cursor:pointer" /></div>
    <div class="a-form-group"><label>Isim Rengi</label><input id="ebNameColor" type="color" value="${nameColor}" style="width:100%;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#1a1a1a;cursor:pointer" /></div>
    <div class="a-form-group">
      <label>Ikon (mevcut: ${icon})</label>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:10px;background:#1a1a1a;border-radius:8px">
        <i id="ebIconPreviewEl" class="fas ${icon}" style="font-size:24px;color:${color}"></i>
        <span id="ebIconName" style="font-size:13px;color:#888">${icon}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;max-height:160px;overflow-y:auto">
        ${BADGE_ICONS.map(ic => `<button onclick="selectEditBadgeIcon('${ic}')" title="${ic}" style="background:rgba(255,255,255,0.06);border:1px solid transparent;border-radius:8px;padding:8px;cursor:pointer" onmouseover="this.style.borderColor='#ff0033'" onmouseout="this.style.borderColor='transparent'"><i class="fas ${ic}" style="font-size:16px;color:#aaa"></i></button>`).join('')}
      </div>
    </div>
    <input type="hidden" id="ebIcon" value="${icon}" />
    <button class="a-btn" style="width:100%;margin-top:8px" onclick="updateBadge(${id})">Kaydet</button>`);
}

function selectEditBadgeIcon(icon) {
  document.getElementById('ebIcon').value = icon;
  const prev = document.getElementById('ebIconPreviewEl');
  const name = document.getElementById('ebIconName');
  const color = document.getElementById('ebColor')?.value || '#ff0033';
  if (prev) { prev.className = 'fas ' + icon; prev.style.color = color; }
  if (name) name.textContent = icon;
}

async function updateBadge(id) {
  const name = document.getElementById('ebName')?.value.trim();
  const icon = document.getElementById('ebIcon')?.value;
  const color = document.getElementById('ebColor')?.value;
  const nameColor = document.getElementById('ebNameColor')?.value;
  const description = document.getElementById('ebDesc')?.value.trim();
  const r = await fetch(API+'/admin/badges/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, icon, color, nameColor, description}) });
  const d = await r.json();
  if (!r.ok) { showToast(d.error||'Hata', false); return; }
  showToast('Rozet guncellendi');
  closeModal();
  loadBadges();
}

async function deleteBadge(id) {
  if (!confirm('Rozeti silmek istediginize emin misiniz?')) return;
  await fetch(API+'/admin/badges/'+id, { method:'DELETE' });
  showToast('Rozet silindi');
  loadBadges();
}

async function showAssignBadgeModal(badgeId, badgeName) {
  showModal(`
    <h3 style="margin-bottom:16px">"${esc(badgeName)}" Rozetini Ver</h3>
    <div class="a-form-group"><label>Kullanici Ara</label><input id="assignUserSearch" class="a-input" placeholder="Kullanici adi..." oninput="searchUsersForBadge(this.value,${badgeId})" /></div>
    <div id="assignUserResults"></div>`);
}

async function searchUsersForBadge(q, badgeId) {
  const results = document.getElementById('assignUserResults');
  if (!results || !q || q.length < 2) { if(results) results.innerHTML=''; return; }
  const r = await fetch(API+'/admin/users?q='+encodeURIComponent(q)+'&limit=10');
  const users = await r.json();
  const list = Array.isArray(users) ? users : (users.users || []);
  results.innerHTML = list.map(u => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px;background:#1a1a1a;border-radius:8px;margin-bottom:6px">
      <img src="${u.profile_photo && u.profile_photo!=='?' ? u.profile_photo : ''}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;background:#333" onerror="this.style.display='none'" />
      <div style="flex:1"><p style="font-size:13px;font-weight:500">${esc(u.nickname)}</p><p style="font-size:11px;color:#666">@${esc(u.username)}</p></div>
      <button class="a-btn a-btn-sm a-btn-green" onclick="assignBadge(${badgeId},${u.id},'${esc(u.nickname)}')">Ver</button>
      <button class="a-btn a-btn-sm" style="background:#c00" onclick="revokeBadge(${badgeId},${u.id},'${esc(u.nickname)}')">Al</button>
    </div>`).join('') || '<p style="color:#666;font-size:13px">Kullanici bulunamadi</p>';
}

async function assignBadge(badgeId, userId, name) {
  const r = await fetch(API+'/admin/badges/'+badgeId+'/assign/'+userId, { method:'POST' });
  const d = await r.json();
  showToast(r.ok ? name+' kullanicisina rozet verildi' : (d.error||'Hata'), r.ok);
}

async function revokeBadge(badgeId, userId, name) {
  const r = await fetch(API+'/admin/badges/'+badgeId+'/revoke/'+userId, { method:'DELETE' });
  const d = await r.json();
  showToast(r.ok ? name+' kullanicisinin rozeti alindi' : (d.error||'Hata'), r.ok);
}

// ─── DUYURULAR ────────────────────────────────────────────────────────────────
async function loadAnnouncements() {
  const c = document.getElementById('mainContent');
  document.getElementById('topbarTitle').textContent = 'Duyurular';
  c.innerHTML = '<p style="color:#666">Yukleniyor...</p>';
  try {
    const r = await fetch(API+'/admin/announcements');
    const list = await r.json();
    c.innerHTML = `
      <div class="section-header">
        <h2>Duyurular</h2>
        <button class="a-btn" onclick="showCreateAnnouncementModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Yeni Duyuru</button>
      </div>
      ${list.length === 0 ? '<p style="color:#666">Henuz duyuru yok</p>' : `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${list.map(a => {
            const typeLabel = a.type==='permanent' ? '<span class="badge badge-green">Kalici</span>' : a.type==='timed' ? '<span class="badge badge-yellow">Sureli</span>' : '<span class="badge badge-blue">Anlik</span>';
            const expired = a.expires_at && new Date(a.expires_at) < new Date();
            return `
              <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;${expired?'opacity:0.5':''}">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">
                  <div style="flex:1">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                      <span style="font-size:15px;font-weight:600">${esc(a.title)}</span>
                      ${typeLabel}
                      ${expired ? '<span class="badge badge-red">Suresi Doldu</span>' : ''}
                    </div>
                    <p style="font-size:13px;color:#aaa;line-height:1.5">${esc(a.content)}</p>
                    <p style="font-size:11px;color:#555;margin-top:6px">
                      ${a.created_at ? new Date(a.created_at).toLocaleString('tr-TR') : ''}
                      ${a.expires_at ? ' · Bitis: '+new Date(a.expires_at).toLocaleString('tr-TR') : ''}
                    </p>
                  </div>
                  <div style="display:flex;gap:6px;flex-shrink:0">
                    <button class="a-btn a-btn-sm a-btn-gray" onclick="showEditAnnouncementModal(${a.id},'${esc(a.title)}','${esc(a.content)}')">Duzenle</button>
                    <button class="a-btn a-btn-sm" style="background:#c00" onclick="deleteAnnouncement(${a.id})">Sil</button>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>`}`;
  } catch(e) { c.innerHTML = '<p style="color:#666">Hata</p>'; }
}

function showCreateAnnouncementModal() {
  showModal(`
    <h3 style="margin-bottom:16px">Yeni Duyuru</h3>
    <div class="a-form-group"><label>Baslik</label><input id="anTitle" class="a-input" placeholder="Duyuru basligi" /></div>
    <div class="a-form-group"><label>Icerik</label><textarea id="anContent" class="a-input" style="height:80px;resize:vertical" placeholder="Duyuru icerigi..."></textarea></div>
    <div class="a-form-group">
      <label>Tur</label>
      <select id="anType" class="a-input" onchange="toggleAnDuration(this.value)">
        <option value="permanent">Kalici (biz silene kadar)</option>
        <option value="timed">Sureli</option>
        <option value="instant">Anlik (10 saniye)</option>
      </select>
    </div>
    <div id="anDurationWrap" style="display:none" class="a-form-group">
      <label>Sure (saniye)</label>
      <input id="anDuration" class="a-input" type="number" placeholder="ornek: 3600 = 1 saat" />
    </div>
    <button class="a-btn" style="width:100%;margin-top:8px" onclick="createAnnouncement()">Yayinla</button>`);
}

function toggleAnDuration(val) {
  document.getElementById('anDurationWrap').style.display = val === 'timed' ? 'block' : 'none';
}

async function createAnnouncement() {
  const title = document.getElementById('anTitle')?.value.trim();
  const content = document.getElementById('anContent')?.value.trim();
  const type = document.getElementById('anType')?.value;
  const dur = document.getElementById('anDuration')?.value;
  if (!title || !content) { showToast('Baslik ve icerik gerekli', false); return; }
  const r = await fetch(API+'/admin/announcements', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title, content, type, durationSeconds: dur ? parseInt(dur) : null}) });
  const d = await r.json();
  if (!r.ok) { showToast(d.error||'Hata', false); return; }
  showToast('Duyuru yayinlandi');
  closeModal();
  loadAnnouncements();
}

function showEditAnnouncementModal(id, title, content) {
  showModal(`
    <h3 style="margin-bottom:16px">Duyuru Duzenle</h3>
    <div class="a-form-group"><label>Baslik</label><input id="eanTitle" class="a-input" value="${esc(title)}" /></div>
    <div class="a-form-group"><label>Icerik</label><textarea id="eanContent" class="a-input" style="height:80px;resize:vertical">${esc(content)}</textarea></div>
    <button class="a-btn" style="width:100%;margin-top:8px" onclick="updateAnnouncement(${id})">Kaydet</button>`);
}

async function updateAnnouncement(id) {
  const title = document.getElementById('eanTitle')?.value.trim();
  const content = document.getElementById('eanContent')?.value.trim();
  const r = await fetch(API+'/admin/announcements/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title, content}) });
  const d = await r.json();
  if (!r.ok) { showToast(d.error||'Hata', false); return; }
  showToast('Duyuru guncellendi');
  closeModal();
  loadAnnouncements();
}

async function deleteAnnouncement(id) {
  if (!confirm('Duyuruyu silmek istediginize emin misiniz?')) return;
  await fetch(API+'/admin/announcements/'+id, { method:'DELETE' });
  showToast('Duyuru silindi');
  loadAnnouncements();
}

// ─── GRUPLAR YÖNETİMİ ───────────────────────────────────────────────────────────
async function loadGroups() {
  const c = document.getElementById('mainContent');
  c.innerHTML = '<h2>Gruplar</h2><p style="color:#666">Yükleniyor...</p>';
  
  try {
    const r = await fetch(API + '/admin/groups');
    const groups = await r.json();
    
    c.innerHTML = `
      <div class="section-header">
        <h2>Gruplar (${groups.length})</h2>
        <button class="a-btn a-btn-sm" onclick="showCreateGroupModal()">
          <i class="fas fa-plus"></i> Grup Oluştur
        </button>
      </div>
      
      <div class="table-wrap">
        <table class="a-table">
          <thead>
            <tr>
              <th>Grup</th>
              <th>Sahip</th>
              <th>Üye Sayısı</th>
              <th>Gizlilik</th>
              <th>Oluşturulma</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(g => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <img src="${g.photo_url || 'logoteatube.png'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />
                    <div>
                      <div style="font-weight:500;">${g.name}</div>
                      <div style="font-size:11px;color:#666;">${g.description || 'Açıklama yok'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <img src="${g.owner_profile_photo || 'logoteatube.png'}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;" />
                    ${g.owner_nickname}
                  </div>
                </td>
                <td>${g.member_count || 0}</td>
                <td>
                  <span class="badge ${g.is_private ? 'badge-yellow' : 'badge-green'}">
                    <i class="fas fa-${g.is_private ? 'lock' : 'globe'}"></i>
                    ${g.is_private ? 'Gizli' : 'Açık'}
                  </span>
                </td>
                <td>${new Date(g.created_at).toLocaleDateString('tr-TR')}</td>
                <td>
                  <button class="a-btn a-btn-sm" onclick="viewGroupMessages(${g.id}, '${g.name}')">
                    <i class="fas fa-comment-dots"></i> Mesajlar
                  </button>
                  <button class="a-btn a-btn-sm a-btn-orange" onclick="sendGroupMessage(${g.id}, '${g.name}')">
                    <i class="fas fa-paper-plane"></i> Mesaj Gönder
                  </button>
                  <button class="a-btn a-btn-sm a-btn-blue" onclick="editGroupName(${g.id}, '${g.name}')">
                    <i class="fas fa-edit"></i> Düzenle
                  </button>
                  <button class="a-btn a-btn-sm a-btn-gray" onclick="deleteGroup(${g.id})">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(e) {
    c.innerHTML = '<h2>Gruplar</h2><p style="color:#ff4466">Yükleme hatası: ' + e.message + '</p>';
  }
}

async function viewGroupMessages(groupId, groupName) {
  try {
    const r = await fetch(API + `/admin/group-messages/${groupId}`);
    const messages = await r.json();
    
    const html = `
      <h3><i class="fas fa-layer-group"></i> ${groupName} - Mesajlar</h3>
      <div style="max-height:400px;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;background:#0a0a0a;">
        ${messages.length === 0 ? '<p style="color:#666;text-align:center;">Henüz mesaj yok</p>' : messages.map(m => `
          <div style="display:flex;gap:8px;margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.02);border-radius:6px;">
            <img src="${m.profile_photo || 'logoteatube.png'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-weight:500;font-size:13px;">${m.nickname}</span>
                <span style="font-size:11px;color:#666;">${new Date(m.created_at).toLocaleString('tr-TR')}</span>
              </div>
              <div style="font-size:13px;line-height:1.4;">${m.message}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    showModal(html);
  } catch(e) {
    showToast('Mesajlar yüklenemedi: ' + e.message, false);
  }
}

async function sendGroupMessage(groupId, groupName) {
  const html = `
    <h3><i class="fas fa-paper-plane"></i> ${groupName} - Admin Mesajı</h3>
    <div class="a-form-group">
      <label>Mesaj</label>
      <textarea id="adminGroupMessage" class="a-input" placeholder="Admin mesajınızı yazın..." style="min-height:100px;resize:vertical;"></textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="a-btn" onclick="submitGroupMessage(${groupId})">
        <i class="fas fa-paper-plane"></i> Gönder
      </button>
      <button class="a-btn a-btn-gray" onclick="closeModal()">İptal</button>
    </div>
  `;
  showModal(html);
}

async function submitGroupMessage(groupId) {
  const message = document.getElementById('adminGroupMessage')?.value?.trim();
  if (!message) {
    showToast('Mesaj boş olamaz', false);
    return;
  }
  
  try {
    const r = await fetch(API + '/admin/send-group-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, message })
    });
    
    if (r.ok) {
      showToast('Mesaj gönderildi');
      closeModal();
    } else {
      const err = await r.json();
      showToast('Hata: ' + err.error, false);
    }
  } catch(e) {
    showToast('Gönderme hatası: ' + e.message, false);
  }
}

async function deleteGroup(groupId) {
  if (!confirm('Bu grubu silmek istediğinizden emin misiniz?')) return;
  
  try {
    const r = await fetch(API + `/admin/group/${groupId}`, { method: 'DELETE' });
    if (r.ok) {
      showToast('Grup silindi');
      loadGroups();
    } else {
      const err = await r.json();
      showToast('Silme hatası: ' + err.error, false);
    }
  } catch(e) {
    showToast('Silme hatası: ' + e.message, false);
  }
}

// ─── MESAJLAŞMA GÖZETİMİ ───────────────────────────────────────────────────────
async function loadMessages() {
  const c = document.getElementById('mainContent');
  c.innerHTML = '<h2>Mesajlaşmalar</h2><p style="color:#666">Yükleniyor...</p>';
  
  try {
    const r = await fetch(API + '/admin/all-messages');
    const conversations = await r.json();
    
    c.innerHTML = `
      <div class="section-header">
        <h2>Tüm Mesajlaşmalar (${conversations.length})</h2>
        <div style="display:flex;gap:8px;">
          <button class="a-btn a-btn-sm a-btn-blue" onclick="viewFirebaseConversations()">
            <i class="fas fa-fire"></i> Firebase Konuşmaları
          </button>
          <div class="search-row">
            <input type="text" class="a-input" placeholder="Kullanıcı ara..." onkeyup="filterConversations(this.value)" />
          </div>
        </div>
      </div>
      
      <div class="table-wrap" id="conversationsTable">
        <table class="a-table">
          <thead>
            <tr>
              <th>Konuşma</th>
              <th>Son Mesaj</th>
              <th>Mesaj Sayısı</th>
              <th>Son Aktivite</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            ${conversations.map(c => `
              <tr class="conversation-row" data-users="${c.user1_nickname.toLowerCase()} ${c.user2_nickname.toLowerCase()}">
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <img src="${c.user1_profile_photo || 'logoteatube.png'}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />
                    <span style="font-size:13px;">${c.user1_nickname}</span>
                    <i class="fas fa-arrow-right" style="color:#666;font-size:10px;"></i>
                    <img src="${c.user2_profile_photo || 'logoteatube.png'}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />
                    <span style="font-size:13px;">${c.user2_nickname}</span>
                  </div>
                </td>
                <td>
                  <div style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#999;">
                    ${c.last_message || 'Mesaj yok'}
                  </div>
                </td>
                <td>${c.message_count}</td>
                <td style="font-size:12px;color:#666;">
                  ${c.last_activity ? new Date(c.last_activity).toLocaleString('tr-TR') : 'Hiç'}
                </td>
                <td>
                  <button class="a-btn a-btn-sm" onclick="viewConversation(${c.user1_id}, ${c.user2_id}, '${c.user1_nickname}', '${c.user2_nickname}')">
                    <i class="fas fa-eye"></i> Görüntüle
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(e) {
    c.innerHTML = '<h2>Mesajlaşmalar</h2><p style="color:#ff4466">Yükleme hatası: ' + e.message + '</p>';
  }
}

function filterConversations(query) {
  const rows = document.querySelectorAll('.conversation-row');
  const q = query.toLowerCase();
  
  rows.forEach(row => {
    const users = row.getAttribute('data-users');
    if (users.includes(q)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

async function viewConversation(user1Id, user2Id, user1Name, user2Name) {
  try {
    const r = await fetch(API + `/admin/conversation/${user1Id}/${user2Id}`);
    const messages = await r.json();
    
    const html = `
      <h3><i class="fas fa-comment-dots"></i> ${user1Name} ↔ ${user2Name}</h3>
      <div style="max-height:400px;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;background:#0a0a0a;">
        ${messages.length === 0 ? '<p style="color:#666;text-align:center;">Mesaj yok</p>' : messages.map(m => `
          <div style="display:flex;gap:8px;margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.02);border-radius:6px;">
            <img src="${m.profile_photo || 'logoteatube.png'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-weight:500;font-size:13px;">${m.nickname}</span>
                <span style="font-size:11px;color:#666;">${new Date(m.created_at).toLocaleString('tr-TR')}</span>
              </div>
              <div style="font-size:13px;line-height:1.4;">${m.message}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:#666;">
        Toplam ${messages.length} mesaj
      </div>
    `;
    showModal(html);
  } catch(e) {
    showToast('Konuşma yüklenemedi: ' + e.message, false);
  }
}
// Kullanıcıya rozet ver ve aktif yap
async function quickAssignBadge(badgeId, userId, userName) {
  if (!badgeId) return;
  
  try {
    // Rozeti ver
    const assignR = await fetch(API + '/admin/badges/' + badgeId + '/assign/' + userId, { method: 'POST' });
    
    if (assignR.ok) {
      // Aktif rozet olarak ayarla
      const activeR = await fetch(API + '/admin/users/' + userId + '/active-badge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId })
      });
      
      if (activeR.ok) {
        showToast(userName + ' kullanıcısına rozet verildi ve aktif yapıldı');
      } else {
        showToast(userName + ' kullanıcısına rozet verildi ama aktif yapılamadı', false);
      }
    } else {
      const err = await assignR.json();
      showToast('Hata: ' + err.error, false);
    }
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

// Rozet oluşturma modalı
function showCreateBadgeModal() {
  const html = `
    <h3><i class="fas fa-certificate"></i> Yeni Rozet Oluştur</h3>
    <div class="a-form-group">
      <label>Rozet Adı</label>
      <input type="text" id="badgeName" class="a-input" placeholder="Örn: VIP Üye" />
    </div>
    <div class="a-form-group">
      <label>İkon (FontAwesome)</label>
      <input type="text" id="badgeIcon" class="a-input" placeholder="Örn: fa-crown" value="fa-star" />
    </div>
    <div class="a-form-group">
      <label>İkon Rengi</label>
      <input type="color" id="badgeColor" class="a-input" value="#ffd700" />
    </div>
    <div class="a-form-group">
      <label>İsim Rengi</label>
      <input type="color" id="badgeNameColor" class="a-input" value="#ffd700" />
    </div>
    <div class="a-form-group">
      <label>Açıklama</label>
      <textarea id="badgeDescription" class="a-input" placeholder="Rozet açıklaması..." style="min-height:60px;"></textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="a-btn" onclick="createBadge()">
        <i class="fas fa-plus"></i> Oluştur
      </button>
      <button class="a-btn a-btn-gray" onclick="closeModal()">İptal</button>
    </div>
  `;
  showModal(html);
}

// Rozet oluştur
async function createBadge() {
  const name = document.getElementById('badgeName')?.value?.trim();
  const icon = document.getElementById('badgeIcon')?.value?.trim();
  const color = document.getElementById('badgeColor')?.value;
  const nameColor = document.getElementById('badgeNameColor')?.value;
  const description = document.getElementById('badgeDescription')?.value?.trim();
  
  if (!name || !icon) {
    showToast('Rozet adı ve ikon gerekli', false);
    return;
  }
  
  try {
    const r = await fetch(API + '/admin/badges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon, color, nameColor, description })
    });
    
    if (r.ok) {
      showToast('Rozet oluşturuldu');
      closeModal();
      loadBadges();
    } else {
      const err = await r.json();
      showToast('Hata: ' + err.error, false);
    }
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

// Rozet düzenleme modalı
function showEditBadgeModal(id, name, icon, color, nameColor, description) {
  const html = `
    <h3><i class="fas fa-edit"></i> Rozet Düzenle</h3>
    <div class="a-form-group">
      <label>Rozet Adı</label>
      <input type="text" id="editBadgeName" class="a-input" value="${name}" />
    </div>
    <div class="a-form-group">
      <label>İkon (FontAwesome)</label>
      <input type="text" id="editBadgeIcon" class="a-input" value="${icon}" />
    </div>
    <div class="a-form-group">
      <label>İkon Rengi</label>
      <input type="color" id="editBadgeColor" class="a-input" value="${color}" />
    </div>
    <div class="a-form-group">
      <label>İsim Rengi</label>
      <input type="color" id="editBadgeNameColor" class="a-input" value="${nameColor}" />
    </div>
    <div class="a-form-group">
      <label>Açıklama</label>
      <textarea id="editBadgeDescription" class="a-input" style="min-height:60px;">${description}</textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="a-btn" onclick="updateBadge(${id})">
        <i class="fas fa-save"></i> Kaydet
      </button>
      <button class="a-btn a-btn-gray" onclick="closeModal()">İptal</button>
    </div>
  `;
  showModal(html);
}

// Rozet güncelle
async function updateBadge(badgeId) {
  const name = document.getElementById('editBadgeName')?.value?.trim();
  const icon = document.getElementById('editBadgeIcon')?.value?.trim();
  const color = document.getElementById('editBadgeColor')?.value;
  const nameColor = document.getElementById('editBadgeNameColor')?.value;
  const description = document.getElementById('editBadgeDescription')?.value?.trim();
  
  if (!name || !icon) {
    showToast('Rozet adı ve ikon gerekli', false);
    return;
  }
  
  try {
    const r = await fetch(API + '/admin/badges/' + badgeId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon, color, nameColor, description })
    });
    
    if (r.ok) {
      showToast('Rozet güncellendi');
      closeModal();
      loadBadges();
    } else {
      const err = await r.json();
      showToast('Hata: ' + err.error, false);
    }
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

// Rozet sil
async function deleteBadge(badgeId) {
  if (!confirm('Bu rozeti silmek istediğinizden emin misiniz?')) return;
  
  try {
    const r = await fetch(API + '/admin/badges/' + badgeId, { method: 'DELETE' });
    if (r.ok) {
      showToast('Rozet silindi');
      loadBadges();
    } else {
      const err = await r.json();
      showToast('Hata: ' + err.error, false);
    }
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

// Kullanıcıya rozet atama modalı
function showAssignBadgeModal(badgeId, badgeName) {
  const html = `
    <h3><i class="fas fa-user-plus"></i> ${badgeName} Rozeti Ver</h3>
    <div class="a-form-group">
      <label>Kullanıcı Ara</label>
      <input type="text" id="userSearchInput" class="a-input" placeholder="Kullanıcı adı veya takma ad..." onkeyup="searchUsersForBadge(this.value)" />
    </div>
    <div id="userSearchResults" style="max-height:200px;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px;margin-top:8px;">
      <p style="color:#666;text-align:center;">Kullanıcı aramaya başlayın...</p>
    </div>
    <div style="margin-top:16px;">
      <button class="a-btn a-btn-gray" onclick="closeModal()">İptal</button>
    </div>
  `;
  showModal(html);
  window.currentBadgeId = badgeId;
}

// Kullanıcı arama (rozet için)
async function searchUsersForBadge(query) {
  const results = document.getElementById('userSearchResults');
  if (!query.trim()) {
    results.innerHTML = '<p style="color:#666;text-align:center;">Kullanıcı aramaya başlayın...</p>';
    return;
  }
  
  try {
    const r = await fetch(API + '/admin/users?q=' + encodeURIComponent(query) + '&limit=10');
    const data = await r.json();
    const users = Array.isArray(data) ? data : (data.users || []);
    
    if (users.length === 0) {
      results.innerHTML = '<p style="color:#666;text-align:center;">Kullanıcı bulunamadı</p>';
      return;
    }
    
    results.innerHTML = users.map(u => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px;background:rgba(255,255,255,0.02);border-radius:6px;margin-bottom:4px;cursor:pointer;" onclick="assignBadgeToUser(${window.currentBadgeId}, ${u.id}, '${u.nickname}')">
        <img src="${u.profile_photo && u.profile_photo !== '?' ? u.profile_photo : 'logoteatube.png'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />
        <div>
          <p style="font-size:13px;font-weight:500;">${u.nickname}</p>
          <p style="font-size:11px;color:#666;">@${u.username}</p>
        </div>
      </div>
    `).join('');
  } catch(e) {
    results.innerHTML = '<p style="color:#ff4466;text-align:center;">Arama hatası</p>';
  }
}

// Kullanıcıya rozet ata
async function assignBadgeToUser(badgeId, userId, userName) {
  try {
    // Rozeti ver
    const assignR = await fetch(API + '/admin/badges/' + badgeId + '/assign/' + userId, { method: 'POST' });
    
    if (assignR.ok) {
      // Aktif rozet olarak ayarla
      const activeR = await fetch(API + '/admin/users/' + userId + '/active-badge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId })
      });
      
      if (activeR.ok) {
        showToast(userName + ' kullanıcısına rozet verildi ve aktif yapıldı');
      } else {
        showToast(userName + ' kullanıcısına rozet verildi ama aktif yapılamadı', false);
      }
      closeModal();
    } else {
      const err = await assignR.json();
      showToast('Hata: ' + err.error, false);
    }
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}


// ─── FIREBASE ADMIN - GRUP YÖNETİMİ ──────────────────────────────────────────

async function sendGroupMessage(groupId, groupName) {
  const html = `
    <h3><i class="fas fa-paper-plane"></i> ${groupName} - Mesaj Gönder</h3>
    <div class="a-form-group">
      <label>Mesaj</label>
      <textarea id="groupMessageText" class="a-input" placeholder="Mesajınızı yazın..." style="min-height:100px;"></textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="a-btn" onclick="sendGroupMessageNow(${groupId})">
        <i class="fas fa-paper-plane"></i> Gönder
      </button>
      <button class="a-btn a-btn-gray" onclick="closeModal()">İptal</button>
    </div>
  `;
  showModal(html);
}

async function sendGroupMessageNow(groupId) {
  const text = document.getElementById('groupMessageText')?.value?.trim();
  if (!text) {
    showToast('Mesaj boş olamaz', false);
    return;
  }
  
  try {
    const r = await fetch(API + '/admin/firebase/send-group-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId,
        senderId: currentAdmin.id,
        text,
        type: 'text'
      })
    });
    
    if (!r.ok) throw new Error('Mesaj gönderilemedi');
    showToast('Mesaj gönderildi', true);
    closeModal();
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function viewGroupMessages(groupId, groupName) {
  try {
    const r = await fetch(API + `/admin/firebase/group-messages/${groupId}`);
    const messages = await r.json();
    
    const html = `
      <h3><i class="fas fa-layer-group"></i> ${groupName} - Mesajlar (${messages.length})</h3>
      <div style="max-height:500px;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;background:#0a0a0a;margin-bottom:16px;">
        ${messages.length === 0 ? '<p style="color:#666;text-align:center;">Henüz mesaj yok</p>' : messages.map(m => `
          <div style="display:flex;gap:8px;margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.02);border-radius:6px;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-weight:500;font-size:13px;">User ${m.senderId}</span>
                <span style="font-size:11px;color:#666;">${new Date(m.timestamp).toLocaleString('tr-TR')}</span>
              </div>
              <div style="font-size:13px;line-height:1.4;">${m.text || ''}</div>
            </div>
            <button class="a-btn a-btn-sm a-btn-gray" onclick="deleteGroupMessage(${groupId}, '${m.id}', '${groupName}')" style="flex-shrink:0;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `).join('')}
      </div>
      <button class="a-btn a-btn-gray" onclick="closeModal()">Kapat</button>
    `;
    showModal(html);
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function deleteGroupMessage(groupId, messageId, groupName) {
  if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
  
  try {
    const r = await fetch(API + `/admin/firebase/group-message/${groupId}/${messageId}`, {
      method: 'DELETE'
    });
    
    if (!r.ok) throw new Error('Mesaj silinemedi');
    showToast('Mesaj silindi', true);
    closeModal();
    setTimeout(() => viewGroupMessages(groupId, groupName), 300);
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function editGroupName(groupId, currentName) {
  const html = `
    <h3><i class="fas fa-edit"></i> Grup Adını Düzenle</h3>
    <div class="a-form-group">
      <label>Yeni Grup Adı</label>
      <input type="text" id="newGroupName" class="a-input" value="${currentName}" />
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="a-btn" onclick="saveGroupName(${groupId})">
        <i class="fas fa-save"></i> Kaydet
      </button>
      <button class="a-btn a-btn-gray" onclick="closeModal()">İptal</button>
    </div>
  `;
  showModal(html);
}

async function saveGroupName(groupId) {
  const name = document.getElementById('newGroupName')?.value?.trim();
  if (!name) {
    showToast('Grup adı boş olamaz', false);
    return;
  }
  
  try {
    const r = await fetch(API + `/admin/group/${groupId}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (!r.ok) throw new Error('Grup adı değiştirilemedi');
    showToast('Grup adı güncellendi', true);
    closeModal();
    loadGroups();
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function deleteGroup(groupId) {
  if (!confirm('Bu grubu silmek istediğinize emin misiniz? Tüm mesajlar ve üyeler silinecek!')) return;
  
  try {
    const r = await fetch(API + `/admin/group/${groupId}`, {
      method: 'DELETE'
    });
    
    if (!r.ok) throw new Error('Grup silinemedi');
    showToast('Grup silindi', true);
    loadGroups();
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

// ─── FIREBASE ADMIN - MESAJLAŞMA ─────────────────────────────────────────────

async function viewFirebaseConversations() {
  try {
    const r = await fetch(API + '/admin/firebase/conversations');
    const conversations = await r.json();
    
    const html = `
      <h3><i class="fas fa-comment-dots"></i> Firebase Konuşmaları (${conversations.length})</h3>
      <div style="max-height:500px;overflow-y:auto;">
        ${conversations.length === 0 ? '<p style="color:#666;text-align:center;">Henüz konuşma yok</p>' : conversations.map(c => `
          <div style="padding:12px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;margin-bottom:8px;cursor:pointer;" onclick="viewFirebaseMessages('${c.id}')">
            <div style="font-weight:500;margin-bottom:4px;">Konuşma ID: ${c.id}</div>
            <div style="font-size:12px;color:#666;">Katılımcılar: ${c.participants ? Object.keys(c.participants).join(', ') : 'Bilinmiyor'}</div>
          </div>
        `).join('')}
      </div>
      <button class="a-btn a-btn-gray" onclick="closeModal()" style="margin-top:16px;">Kapat</button>
    `;
    showModal(html);
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function viewFirebaseMessages(conversationId) {
  try {
    const r = await fetch(API + `/admin/firebase/messages/${conversationId}`);
    const messages = await r.json();
    
    const html = `
      <h3><i class="fas fa-comment-dots"></i> Konuşma: ${conversationId}</h3>
      <div style="max-height:500px;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;background:#0a0a0a;margin-bottom:16px;">
        ${messages.length === 0 ? '<p style="color:#666;text-align:center;">Henüz mesaj yok</p>' : messages.map(m => `
          <div style="display:flex;gap:8px;margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.02);border-radius:6px;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-weight:500;font-size:13px;">User ${m.senderId}</span>
                <span style="font-size:11px;color:#666;">${new Date(m.timestamp).toLocaleString('tr-TR')}</span>
              </div>
              <div style="font-size:13px;line-height:1.4;">${m.text || ''}</div>
            </div>
            <button class="a-btn a-btn-sm a-btn-gray" onclick="deleteFirebaseMessage('${conversationId}', '${m.id}')" style="flex-shrink:0;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `).join('')}
      </div>
      <button class="a-btn a-btn-gray" onclick="closeModal()">Kapat</button>
    `;
    showModal(html);
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}

async function deleteFirebaseMessage(conversationId, messageId) {
  if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
  
  try {
    const r = await fetch(API + `/admin/firebase/message/${conversationId}/${messageId}`, {
      method: 'DELETE'
    });
    
    if (!r.ok) throw new Error('Mesaj silinemedi');
    showToast('Mesaj silindi', true);
    closeModal();
    setTimeout(() => viewFirebaseMessages(conversationId), 300);
  } catch(e) {
    showToast('Hata: ' + e.message, false);
  }
}
