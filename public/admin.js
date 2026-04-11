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
              <div style="font-weight:500">${esc(u.nickname||u.username)}</div>
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
    const r = await fetch(API+'/admin/video/'+videoId+'/suspend', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({suspend:!!suspend})});
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
    const r = await fetch(API+'/admin/video/'+videoId, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title})});
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
    <h3>Sarki Basligini Duzenle</h3>
    <input id="editSongTitleInput" class="a-input" value="${esc(currentTitle)}" style="width:100%;margin-bottom:12px">
    <button class="a-btn" style="width:100%" onclick="saveSongTitle(${songId})">Kaydet</button>
  `);
}

async function saveSongTitle(songId) {
  const title = document.getElementById('editSongTitleInput')?.value.trim();
  if (!title) { showToast('Baslik bos olamaz', false); return; }
  try {
    const r = await fetch(API+'/admin/music/song/'+songId, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title})});
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
    const r = await fetch(API+'/admin/badges');
    const badges = await r.json();
    c.innerHTML = `
      <div class="section-header">
        <h2>Rozetler</h2>
        <button class="a-btn" onclick="showCreateBadgeModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Yeni Rozet</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${badges.map(b => `
          <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center">
                <i class="fas ${b.icon}" style="color:${b.color};font-size:18px"></i>
              </div>
              <div>
                <p style="font-size:14px;font-weight:600;color:${b.name_color}">${esc(b.name)}</p>
                <p style="font-size:11px;color:#666">${b.is_system ? 'Sistem Rozeti' : 'Özel Rozet'}</p>
              </div>
            </div>
            ${b.description ? `<p style="font-size:12px;color:#888">${esc(b.description)}</p>` : ''}
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="a-btn a-btn-sm a-btn-gray" onclick="showAssignBadgeModal(${b.id},'${esc(b.name)}')">Kullaniciya Ver</button>
              ${!b.is_system ? `<button class="a-btn a-btn-sm a-btn-gray" onclick="showEditBadgeModal(${b.id},'${esc(b.name)}','${b.icon}','${b.color}','${b.name_color}','${esc(b.description||'')}')">Duzenle</button>
              <button class="a-btn a-btn-sm" style="background:#c00" onclick="deleteBadge(${b.id})">Sil</button>` : ''}
            </div>
          </div>`).join('')}
      </div>`;
  } catch(e) { c.innerHTML = '<p style="color:#666">Hata</p>'; }
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
