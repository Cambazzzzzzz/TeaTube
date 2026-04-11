const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3456/api' : window.location.origin + '/api';
let adminData = null;
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('tea_admin');
  if (saved) {
    adminData = JSON.parse(saved);
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('adminApp').style.display='block';
    const nameEl = document.getElementById('sidebarAdminName');
    if (nameEl) nameEl.textContent = adminData.username || 'Admin';
    showSection('dashboard');
  }
});

async function adminLogin() {
  const u = document.getElementById('adminUsername').value.trim();
  const p = document.getElementById('adminPassword').value;
  const err = document.getElementById('loginError');
  err.style.display = 'none';
  try {
    const r = await fetch(API+'/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    const d = await r.json();
    if (!r.ok) { err.textContent=d.error; err.style.display='block'; return; }
    adminData = d.admin;
    localStorage.setItem('tea_admin', JSON.stringify(adminData));
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('adminApp').style.display='block';
    const nameEl = document.getElementById('sidebarAdminName');
    if (nameEl) nameEl.textContent = adminData.username || 'Admin';
    showSection('dashboard');
  } catch(e) { err.textContent='Baglanti hatasi'; err.style.display='block'; }
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
  const titles = {dashboard:'Dashboard',users:'Kullanicilar',channels:'Kanallar',personal:'Kisisel Hesaplar','ip-bans':'IP Banlari',videos:'Videolar','music-applications':'TS Music - Basvurular','music-artists':'TS Music - Artistler','music-songs':'TS Music - Sarkilar','admin-settings':'Admin Ayarlari'};
  const tb = document.getElementById('topbarTitle');
  if (tb) tb.textContent = titles[sec] || sec;
  switch(sec) {
    case 'dashboard': loadDashboard(); break;
    case 'users': loadUsers(); break;
    case 'channels': loadChannels('channel'); break;
    case 'personal': loadChannels('personal'); break;
    case 'ip-bans': loadIPBans(); break;
    case 'videos': loadVideos(); break;
    case 'music-applications': loadMusicApplications(); break;
    case 'music-artists': loadMusicArtists(); break;
    case 'music-songs': loadMusicSongs(); break;
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
    const url = API+'/admin/users'+(search?'?search='+encodeURIComponent(search):'');
    const r = await fetch(url, {headers:{'x-admin-token': adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { document.getElementById('userTableWrap').innerHTML='<p>Hata: '+d.error+'</p>'; return; }
    const users = d.users || d;
    if (!users.length) { document.getElementById('userTableWrap').innerHTML='<p>Kullanici bulunamadi.</p>'; return; }
    let rows = users.map(u=>`
      <tr>
        <td>${u.id}</td>
        <td>${esc(u.username)}</td>
        <td>${esc(u.email||'-')}</td>
        <td>${u.is_suspended?'<span style="color:#ff0033">Askida</span>':'Aktif'}</td>
        <td>${u.created_at?u.created_at.slice(0,10):'-'}</td>
        <td>
          <button class="a-btn a-btn-sm" onclick="showUserDetail(${u.id})">Detay</button>
          <button class="a-btn a-btn-sm" style="background:${u.is_suspended?'#1db954':'#e67e22'}" onclick="toggleSuspend(${u.id},${u.is_suspended?0:1})">${u.is_suspended?'Aktif Et':'Askiya Al'}</button>
          <button class="a-btn a-btn-sm" style="background:#ff0033" onclick="deleteUser(${u.id},'${esc(u.username)}')">Sil</button>
        </td>
      </tr>`).join('');
    document.getElementById('userTableWrap').innerHTML = `
      <table class="a-table">
        <thead><tr><th>ID</th><th>Kullanici</th><th>Email</th><th>Durum</th><th>Kayit</th><th>Islemler</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch(e) { document.getElementById('userTableWrap').innerHTML='<p>Baglanti hatasi</p>'; }
}

async function showUserDetail(userId) {
  try {
    const r = await fetch(API+'/admin/users/'+userId, {headers:{'x-admin-token': adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    const u = d.user || d;
    const attempts = d.loginAttempts || [];
    const bans = d.bans || [];
    const attRows = attempts.map(a=>`<tr><td>${a.ip||'-'}</td><td>${a.created_at?a.created_at.slice(0,19):'-'}</td><td>${a.success?'Basarili':'Basarisiz'}</td></tr>`).join('') || '<tr><td colspan="3">Kayit yok</td></tr>';
    const banRows = bans.map(b=>`<tr><td>${esc(b.reason||'-')}</td><td>${b.created_at?b.created_at.slice(0,10):'-'}</td><td>${b.expires_at?b.expires_at.slice(0,10):'Kalici'}</td><td><button class="a-btn a-btn-sm" style="background:#ff0033" onclick="removeBan(${b.id},${userId})">Kaldir</button></td></tr>`).join('') || '<tr><td colspan="4">Ban yok</td></tr>';
    showModal(`
      <h3>${esc(u.username)} - Detay</h3>
      <p><b>Email:</b> ${esc(u.email||'-')}</p>
      <p><b>Durum:</b> ${u.is_suspended?'Askida':'Aktif'}</p>
      <p><b>Kayit:</b> ${u.created_at?u.created_at.slice(0,10):'-'}</p>
      <hr>
      <h4>Sifre Degistir</h4>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input id="newPwInput" class="a-input" type="password" placeholder="Yeni sifre" style="flex:1">
        <button class="a-btn" onclick="changeUserPassword(${u.id})">Degistir</button>
      </div>
      <h4>Ban Ekle</h4>
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
    const r = await fetch(API+'/admin/users/'+userId+'/suspend', {method:'POST', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({suspend:!!suspend})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast(suspend?'Kullanici askiya alindi':'Kullanici aktif edildi');
    loadUsers(document.getElementById('userSearch')?.value||'');
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function deleteUser(userId, username) {
  if (!confirm(username+' kullanicisini silmek istediginize emin misiniz?')) return;
  try {
    const r = await fetch(API+'/admin/users/'+userId, {method:'DELETE', headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Kullanici silindi');
    loadUsers(document.getElementById('userSearch')?.value||'');
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function changeUserPassword(userId) {
  const pw = document.getElementById('newPwInput')?.value;
  if (!pw || pw.length < 4) { showToast('Sifre en az 4 karakter olmali', false); return; }
  try {
    const r = await fetch(API+'/admin/users/'+userId+'/password', {method:'POST', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({password:pw})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Sifre degistirildi');
    closeModal();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function addBan(userId) {
  const reason = document.getElementById('banReason')?.value.trim();
  const expires = document.getElementById('banExpires')?.value;
  try {
    const r = await fetch(API+'/admin/users/'+userId+'/bans', {method:'POST', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({reason, expires_at: expires||null})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Ban eklendi');
    showUserDetail(userId);
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function removeBan(banId, userId) {
  try {
    const r = await fetch(API+'/admin/bans/'+banId, {method:'DELETE', headers:{'x-admin-token':adminData?.token||''}});
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
    const r = await fetch(API+'/admin/videos/'+videoId+'/suspend', {method:'POST', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({suspend:!!suspend})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast(suspend?'Video askiya alindi':'Video aktif edildi');
    loadVideos();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

function editVideoTitle(videoId, currentTitle) {
  showModal(`
    <h3>Video Basligini Duzenle</h3>
    <input id="editVideoTitleInput" class="a-input" value="${esc(currentTitle)}" style="width:100%;margin-bottom:12px">
    <button class="a-btn" style="width:100%" onclick="saveVideoTitle(${videoId})">Kaydet</button>
  `);
}

async function saveVideoTitle(videoId) {
  const title = document.getElementById('editVideoTitleInput')?.value.trim();
  if (!title) { showToast('Baslik bos olamaz', false); return; }
  try {
    const r = await fetch(API+'/admin/videos/'+videoId, {method:'PATCH', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({title})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Baslik guncellendi');
    closeModal();
    loadVideos();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function deleteVideo(videoId, title) {
  if (!confirm('"'+title+'" videosunu silmek istediginize emin misiniz?')) return;
  try {
    const r = await fetch(API+'/admin/videos/'+videoId, {method:'DELETE', headers:{'x-admin-token':adminData?.token||''}});
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
        <td>${esc(a.genre||'-')}</td>
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
        <thead><tr><th>ID</th><th>Sanatci</th><th>Email</th><th>Tur</th><th>Tarih</th><th>Islem</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch(e) { c.innerHTML='<h2>Muzik Basvurulari</h2><p>Baglanti hatasi</p>'; }
}

async function reviewMusicApp(appId, action) {
  const note = prompt(action==='accept'?'Kabul notu (opsiyonel):':'Red sebebi:') ?? '';
  try {
    const r = await fetch(API+'/admin/music/application/'+appId, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action, note})});
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
    const r = await fetch(API+'/admin/music/artists/'+artistId+'/suspend', {method:'POST', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({suspend:!!suspend})});
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
    const r = await fetch(API+'/admin/music/artists/'+artistId, {method:'PATCH', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({name})});
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
    const r = await fetch(API+'/admin/music/artists/'+artistId, {method:'DELETE', headers:{'x-admin-token':adminData?.token||''}});
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
    const r = await fetch(API+'/admin/music/songs/'+songId+'/suspend', {method:'POST', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({suspend:!!suspend})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast(suspend?'Sarki askiya alindi':'Sarki aktif edildi');
    loadMusicSongs();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

function editSongTitle(songId, currentTitle) {
  showModal(`
    <h3>Sarki Basligini Duzenle</h3>
    <input id="editSongTitleInput" class="a-input" value="${esc(currentTitle)}" style="width:100%;margin-bottom:12px">
    <button class="a-btn" style="width:100%" onclick="saveSongTitle(${songId})">Kaydet</button>
  `);
}

async function saveSongTitle(songId) {
  const title = document.getElementById('editSongTitleInput')?.value.trim();
  if (!title) { showToast('Baslik bos olamaz', false); return; }
  try {
    const r = await fetch(API+'/admin/music/songs/'+songId, {method:'PATCH', headers:{'Content-Type':'application/json','x-admin-token':adminData?.token||''}, body:JSON.stringify({title})});
    const d = await r.json();
    if (!r.ok) { showToast(d.error||'Hata', false); return; }
    showToast('Sarki basligi guncellendi');
    closeModal();
    loadMusicSongs();
  } catch(e) { showToast('Baglanti hatasi', false); }
}

async function deleteSong(songId, title) {
  if (!confirm('"'+title+'" sarkisini silmek istediginize emin misiniz?')) return;
  try {
    const r = await fetch(API+'/admin/music/songs/'+songId, {method:'DELETE', headers:{'x-admin-token':adminData?.token||''}});
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
  try {
    const r = await fetch(API+'/admin/settings', {headers:{'x-admin-token':adminData?.token||''}});
    const d = await r.json();
    const settings = d.settings || d;
    const hashDisplay = settings?.password_hash ? settings.password_hash.slice(0,20)+'...' : '(gizli)';
    c.innerHTML = `
      <h2>Admin Ayarlari</h2>
      <div style="background:#1a1a1a;border-radius:8px;padding:20px;max-width:480px">
        <p style="margin:0 0 8px;color:#aaa;font-size:13px">Mevcut Sifre Hash:</p>
        <code style="display:block;background:#111;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:20px;word-break:break-all">${hashDisplay}</code>
        <h4 style="margin:0 0 12px">Admin Sifresi Degistir</h4>
        <input id="adminCurrentPw" class="a-input" type="password" placeholder="Mevcut sifre" style="width:100%;margin-bottom:8px">
        <input id="adminNewPw" class="a-input" type="password" placeholder="Yeni sifre" style="width:100%;margin-bottom:8px">
        <input id="adminNewPwConfirm" class="a-input" type="password" placeholder="Yeni sifre (tekrar)" style="width:100%;margin-bottom:12px">
        <button class="a-btn" style="width:100%" onclick="saveAdminPassword()">Sifreyi Degistir</button>
      </div>`;
  } catch(e) {
    c.innerHTML = `
      <h2>Admin Ayarlari</h2>
      <div style="background:#1a1a1a;border-radius:8px;padding:20px;max-width:480px">
        <h4 style="margin:0 0 12px">Admin Sifresi Degistir</h4>
        <input id="adminCurrentPw" class="a-input" type="password" placeholder="Mevcut sifre" style="width:100%;margin-bottom:8px">
        <input id="adminNewPw" class="a-input" type="password" placeholder="Yeni sifre" style="width:100%;margin-bottom:8px">
        <input id="adminNewPwConfirm" class="a-input" type="password" placeholder="Yeni sifre (tekrar)" style="width:100%;margin-bottom:12px">
        <button class="a-btn" style="width:100%" onclick="saveAdminPassword()">Sifreyi Degistir</button>
      </div>`;
  }
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
