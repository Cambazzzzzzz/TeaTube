// API URL - localhost'ta 3456, production'da aynı origin
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3456/api'
  : window.location.origin + '/api';
let currentUser = null;
let currentChannel = null;
let currentPage = 'home';
let sidebarOpen = true;

// Mobil alt navigasyon
function mobileNavTo(page) {
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.mobile-nav-btn[data-page="${page}"]`);
  if (btn) btn.classList.add('active');

  if (page === 'search-mobile') {
    // Arama sayfası — anasayfaya git ve arama kutusunu aç
    showPage('home');
    setTimeout(() => {
      const input = document.getElementById('searchInput');
      if (input) {
        // Mobilde arama kutusunu göster
        const center = document.getElementById('center');
        if (center && window.innerWidth <= 480) {
          center.style.display = 'flex';
          center.style.position = 'fixed';
          center.style.top = 'var(--ytd-masthead-height)';
          center.style.left = '0';
          center.style.right = '0';
          center.style.transform = 'none';
          center.style.background = 'var(--yt-spec-base-background)';
          center.style.padding = '8px 12px';
          center.style.zIndex = '2021';
          center.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        }
        input.focus();
      }
    }, 100);
    return;
  }
  showPage(page);
}

// Mobil nav badge güncelle
function updateMobileNavBadge() {
  const badge = document.getElementById('notifBadge');
  const mobileBadge = document.getElementById('mobileNavMsgBadge');
  if (badge && mobileBadge) {
    mobileBadge.textContent = badge.textContent;
    mobileBadge.style.display = badge.style.display;
  }
}

function updateMobileBottomBar(page) {
  // Aktif sayfa takibi için kullanılabilir
}

// Mobil yükleme menüsü (+ butonu)
function showMobileUploadMenu() {
  const sheet = document.createElement('div');
  sheet.id = 'mobileUploadSheet';
  sheet.style.cssText = `
    position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.6);
    display:flex; align-items:flex-end;
  `;
  sheet.innerHTML = `
    <div style="width:100%; background:var(--yt-spec-raised-background); border-radius:20px 20px 0 0; padding:20px 16px 32px;">
      <div style="width:40px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:0 auto 20px;"></div>
      <button id="mobileRealsBtn"
        style="width:100%; display:flex; align-items:center; gap:16px; background:none; border:none; color:var(--yt-spec-text-primary); padding:14px 8px; font-size:16px; cursor:pointer; border-radius:10px;">
        <div style="width:44px; height:44px; background:rgba(255,0,51,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-film" style="color:#ff0033; font-size:18px;"></i>
        </div>
        <div style="text-align:left;">
          <p style="font-weight:600; margin-bottom:2px;">Reals</p>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary);">Kısa video paylaş</p>
        </div>
      </button>
      <button id="mobilePhotoBtn"
        style="width:100%; display:flex; align-items:center; gap:16px; background:none; border:none; color:var(--yt-spec-text-primary); padding:14px 8px; font-size:16px; cursor:pointer; border-radius:10px;">
        <div style="width:44px; height:44px; background:rgba(255,165,0,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-image" style="color:orange; font-size:18px;"></i>
        </div>
        <div style="text-align:left;">
          <p style="font-weight:600; margin-bottom:2px;">Fotoğraf</p>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary);">Fotoğraf paylaş</p>
        </div>
      </button>
      <button id="mobileCancelBtn"
        style="width:100%; background:rgba(255,255,255,0.06); border:none; color:var(--yt-spec-text-secondary); padding:14px; border-radius:10px; font-size:14px; cursor:pointer; margin-top:8px;">
        İptal
      </button>
    </div>
  `;
  
  // Event listener'ları doğrudan ekle
  const realsBtn = sheet.querySelector('#mobileRealsBtn');
  const photoBtn = sheet.querySelector('#mobilePhotoBtn');
  const cancelBtn = sheet.querySelector('#mobileCancelBtn');
  
  realsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sheet.remove();
    setTimeout(() => {
      switchUploadType('reals');
      showUploadVideoModal();
    }, 100);
  });
  
  photoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sheet.remove();
    setTimeout(() => {
      switchUploadType('photo');
      showUploadVideoModal();
    }, 100);
  });
  
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sheet.remove();
  });
  
  sheet.addEventListener('click', e => { 
    if (e.target === sheet) sheet.remove(); 
  });
  
  document.body.appendChild(sheet);
}

// Profil tıklayınca ayarlar sheet
function showMobileProfileSheet() {
  const sheet = document.createElement('div');
  sheet.id = 'mobileProfileSheet';
  sheet.style.cssText = `
    position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.6);
    display:flex; align-items:flex-end;
  `;
  sheet.innerHTML = `
    <div style="width:100%; background:var(--yt-spec-raised-background); border-radius:20px 20px 0 0; padding:20px 16px 32px;">
      <div style="width:40px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:0 auto 16px;"></div>
      <div style="display:flex; align-items:center; gap:12px; padding:0 8px 16px; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:8px;">
        <img src="${getProfilePhotoUrl(currentUser?.profile_photo)}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
        <div>
          <p style="font-weight:600; font-size:16px;">${currentUser?.nickname || ''}</p>
          <p style="font-size:13px; color:var(--yt-spec-text-secondary);">@${currentUser?.username || ''}</p>
        </div>
      </div>
      ${[
        { icon:'fa-photo-video', label:'İçeriklerim', page:'my-videos' },
        { icon:'fa-star', label:'Favoriler', page:'favorites' },
        { icon:'fa-bookmark', label:'Kaydedilenler', page:'saved' },
        { icon:'fa-history', label:'Geçmiş', page:'history' },
        { icon:'fa-layer-group', label:'Gruplar', page:'groups' },
        { icon:'fa-music', label:'TS Music', page:'ts-music' },
        { icon:'fa-brain', label:'Algoritmam', page:'algorithm' },
        { icon:'fa-cog', label:'Ayarlar', page:'settings' },
      ].map(item => `
        <button onclick="document.getElementById('mobileProfileSheet').remove(); showPage('${item.page}');"
          style="width:100%; display:flex; align-items:center; gap:14px; background:none; border:none; color:var(--yt-spec-text-primary); padding:12px 8px; font-size:15px; cursor:pointer; border-radius:8px; text-align:left;">
          <i class="fas ${item.icon}" style="width:20px; color:var(--yt-spec-text-secondary);"></i>
          ${item.label}
        </button>
      `).join('')}
      <button onclick="document.getElementById('mobileProfileSheet').remove(); logout();"
        style="width:100%; display:flex; align-items:center; gap:14px; background:none; border:none; color:#ff4444; padding:12px 8px; font-size:15px; cursor:pointer; border-radius:8px; margin-top:4px;">
        <i class="fas fa-sign-out-alt" style="width:20px;"></i>
        Çıkış Yap
      </button>
    </div>
  `;
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
  document.body.appendChild(sheet);
}

// Mobil profil fotosu güncelle
function updateMobileProfilePhoto() {
  const mobilePhoto = document.getElementById('mobileProfilePhoto');
  if (mobilePhoto && currentUser?.profile_photo && currentUser.profile_photo !== '?') {
    mobilePhoto.src = currentUser.profile_photo;
  }
}

async function searchFriendsInMessages() {
  const q = document.getElementById('msgFriendSearch')?.value?.trim();
  const results = document.getElementById('msgFriendSearchResults');
  if (!results) return;
  if (!q) { results.innerHTML = ''; return; }

  try {
    const res = await fetch(`${API_URL}/search-users?q=${encodeURIComponent(q)}&userId=${currentUser.id}`);
    const users = await res.json();
    if (!users.length) { results.innerHTML = '<p style="font-size:13px;color:var(--yt-spec-text-secondary);padding:4px 0;">Kullanıcı bulunamadı</p>'; return; }

    const items = await Promise.all(users.map(async u => {
      const statusRes = await fetch(`${API_URL}/friendship-status/${currentUser.id}/${u.id}`);
      const status = await statusRes.json();
      let btn = `<button class="yt-btn" onclick="sendFriendRequest(${u.id})" style="height:30px;padding:0 12px;font-size:12px;">Arkadaş Ekle</button>`;
      if (status.status === 'accepted') btn = `<button class="yt-btn" onclick="openMobileChat(${u.id},'${u.nickname.replace(/'/g,"\\'")}','${getProfilePhotoUrl(u.profile_photo)}')" style="height:30px;padding:0 12px;font-size:12px;"><i class="fas fa-comment"></i> Mesaj</button>`;
      else if (status.status === 'pending' && status.isSender) btn = `<span style="font-size:12px;color:var(--yt-spec-text-secondary);">İstek Gönderildi</span>`;
      else if (status.status === 'pending') btn = `<div style="display:flex;gap:6px;"><button class="yt-btn" onclick="respondFriendRequest(${status.id},'accept')" style="height:30px;padding:0 10px;font-size:12px;">Kabul</button><button class="yt-btn yt-btn-secondary" onclick="respondFriendRequest(${status.id},'reject')" style="height:30px;padding:0 10px;font-size:12px;">Red</button></div>`;
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--yt-spec-raised-background);border-radius:10px;margin-bottom:6px;">
        <img src="${getProfilePhotoUrl(u.profile_photo)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;" />
        <div style="flex:1;min-width:0;"><p style="font-size:14px;font-weight:500;">${u.nickname}</p><p style="font-size:12px;color:var(--yt-spec-text-secondary);">@${u.username}</p></div>
        ${btn}
      </div>`;
    }));
    results.innerHTML = items.join('');
  } catch(e) {}
}

// Mobil arama toggle
function toggleMobileSearch() {
  const center = document.getElementById('center');
  if (!center) return;
  const isVisible = center.style.display === 'flex';
  if (isVisible) {
    center.style.cssText = '';
  } else {
    center.style.display = 'flex';
    center.style.position = 'fixed';
    center.style.top = 'var(--ytd-masthead-height)';
    center.style.left = '0';
    center.style.right = '0';
    center.style.transform = 'none';
    center.style.background = 'var(--yt-spec-base-background)';
    center.style.padding = '8px 12px';
    center.style.zIndex = '2021';
    center.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
  }
}

// Sidebar toggle
function toggleSidebar() {
  const guide = document.getElementById('guide');
  const overlay = document.getElementById('sidebarOverlay');
  const content = document.getElementById('content');
  
  if (!guide) return;
  
  sidebarOpen = !sidebarOpen;
  
  if (window.innerWidth > 1312) {
    // Desktop: mini mod toggle
    if (sidebarOpen) {
      guide.classList.remove('collapsed');
      if (content) content.classList.remove('sidebar-collapsed');
    } else {
      guide.classList.add('collapsed');
      if (content) content.classList.add('sidebar-collapsed');
    }
  } else {
    // Mobil: overlay toggle
    if (sidebarOpen) {
      guide.classList.remove('collapsed');
      guide.classList.add('show');
      if (overlay) overlay.classList.add('show');
    } else {
      guide.classList.add('collapsed');
      guide.classList.remove('show');
      if (overlay) overlay.classList.remove('show');
    }
  }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('Tea_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    loadUserData();
  }
  
  // Başlangıçta sidebar durumunu ayarla
  if (window.innerWidth <= 1312) {
    const guide = document.getElementById('guide');
    if (guide) guide.classList.add('collapsed');
    sidebarOpen = false;
  } else {
    sidebarOpen = true; // desktop'ta açık, mini mod yok
  }
  
  // Pencere boyutu değişince sidebar'ı ayarla
  window.addEventListener('resize', () => {
    const guide = document.getElementById('guide');
    const overlay = document.getElementById('sidebarOverlay');
    const content = document.getElementById('content');
    
    if (window.innerWidth > 1312) {
      // Desktop'a geçince overlay kaldır
      if (guide) guide.classList.remove('show');
      if (overlay) overlay.classList.remove('show');
      // Mevcut sidebarOpen durumunu koru
      if (sidebarOpen) {
        if (guide) guide.classList.remove('collapsed');
        if (content) content.classList.remove('sidebar-collapsed');
      } else {
        if (guide) guide.classList.add('collapsed');
        if (content) content.classList.add('sidebar-collapsed');
      }
    } else {
      // Mobil: overlay moda geç
      if (guide) { guide.classList.add('collapsed'); guide.classList.remove('show'); }
      if (overlay) overlay.classList.remove('show');
      if (content) content.classList.remove('sidebar-collapsed');
      sidebarOpen = false;
    }
  });
});

// Giriş/Kayıt fonksiyonları
function showLogin() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

function showAgreement() {
  const agreementText = `
    <h2>Tea KVKK Açıklama Metni</h2>
    <h3>Kişisel Verilerin Korunması ve İşlenmesine İlişkin Açıklama</h3>
    <p>Tea uygulamasına üye olarak veya giriş yaparak, aşağıdaki kişisel veri işleme yöntemlerini ve haklarınızı kabul etmiş olursunuz.</p>
    
    <h4>Toplanan Kişisel Veriler</h4>
    <ul>
      <li>Kullanıcı adı, şifre (hashlenmiş), IP adresi</li>
      <li>Video yükleme sırasında gönderilen banner ve video URL bilgileri</li>
      <li>Abonelik, favori ve kaydedilen videolarla ilgili bilgiler</li>
      <li>Uygulama içi kullanım istatistikleri (izlenen videolar, etkileşimler)</li>
    </ul>
    
    <h4>Veri İşleme Amaçları</h4>
    <ul>
      <li>Kullanıcı kimliğini doğrulamak ve hesap güvenliğini sağlamak</li>
      <li>Kullanıcı deneyimini iyileştirmek ve öneri algoritmasını çalıştırmak</li>
      <li>Uygulama içi hataları ve güvenlik tehditlerini tespit etmek</li>
      <li>Beta sürecinde sistem testleri ve performans ölçümleri yapmak</li>
    </ul>
    
    <h4>Veri Saklama Süresi</h4>
    <p>Kullanıcı verileri, hesabınız aktif olduğu sürece ve uygulama faaliyetleri boyunca saklanır. Kullanıcı hesabı silinirse, kişisel veriler makul bir süre içerisinde sistemden kalıcı olarak silinir.</p>
    
    <h4>Veri Paylaşımı</h4>
    <p>Kullanıcı verileri üçüncü taraflarla paylaşılmaz. Sadece yasal zorunluluk hâlinde veya sistem güvenliği için yetkili kişilerle paylaşılır.</p>
    
    <h4>Veri Güvenliği Önlemleri</h4>
    <ul>
      <li>Şifreler bcrypt ile hashlenir, düz metin olarak saklanmaz</li>
      <li>IP adresleri yalnızca güvenlik ve erişim logları için kaydedilir</li>
      <li>Veritabanı ve depolama servisleri SSL/TLS ile korunur</li>
      <li>Depolama servisleri (Cloudinary, Supabase) veri güvenliği standartlarına uygundur</li>
    </ul>
    
    <h4>Kullanıcı Hakları</h4>
    <ul>
      <li>Kendi kişisel verilerinize erişme ve doğrulama</li>
      <li>Yanlış veya eksik verilerin düzeltilmesini talep etme</li>
      <li>Verilerinizin silinmesini talep etme</li>
      <li>Veri işleme ve paylaşımı ile ilgili itirazda bulunma</li>
    </ul>
    
    <h4>Onay ve Kabul</h4>
    <p>Tea'a giriş yaparak veya üye olarak, yukarıda belirtilen kişisel veri işleme kurallarını ve güvenlik önlemlerini kabul etmiş olursunuz.</p>
  `;
  
  showModal(agreementText);
}

async function register() {
  const username = document.getElementById('regUsername').value.trim();
  const nickname = document.getElementById('regNickname').value.trim();
  const password = document.getElementById('regPassword').value;
  const photoFile = document.getElementById('regPhoto').files[0];
  const agreed = document.getElementById('regAgreed').checked;

  if (!username || !nickname || !password) {
    alert('Lütfen tüm alanları doldurun');
    return;
  }

  const formData = new FormData();
  formData.append('username', username);
  formData.append('nickname', nickname);
  formData.append('password', password);
  formData.append('agreed', 'true');
  if (photoFile) {
    formData.append('profile_photo', photoFile);
  }

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      showToast('Kayıt başarılı!', 'success');
      showLogin();
      // Kayıt sonrası giriş yap ve kanal oluşturma ekranını göster
      setTimeout(() => {
        document.getElementById('loginUsername').value = username;
        document.getElementById('loginPassword').value = password;
        login().then(() => {
          // login içinde loadUserData çağrılıyor, kanal yoksa showCreateChannelAfterRegister çağrılacak
        });
      }, 500);
    } else {
      alert(data.error || 'Kayıt başarısız');
    }
  } catch (error) {
    console.error('Kayıt hatası:', error);
    alert('Kayıt sırasında bir hata oluştu');
  }
}

async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    alert('Kullanıcı adı ve şifre gerekli');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data.user;
      localStorage.setItem('Tea_user', JSON.stringify(currentUser));
      loadUserData();
    } else {
      alert(data.error || 'Giriş başarısız');
    }
  } catch (error) {
    console.error('Giriş hatası:', error);
    alert('Giriş sırasında bir hata oluştu');
  }
}

async function loadUserData() {
  try {
    // Kullanıcı bilgilerini güncelle
    const userResponse = await fetch(`${API_URL}/user/${currentUser.id}`);
    const userData = await userResponse.json();
    currentUser = { ...currentUser, ...userData };
    localStorage.setItem('Tea_user', JSON.stringify(currentUser));

    // Temayı uygula
    document.body.setAttribute('data-theme', currentUser.theme || 'dark');
    applyTheme(currentUser.theme || 'dark');
    // Kullanıcı bilgilerini göster
    const userPhoto = document.getElementById('userPhoto');
    if (userPhoto) {
      userPhoto.src = getProfilePhotoUrl(currentUser.profile_photo);
      userPhoto.style.display = 'block';
    }

    // Kanalı kontrol et - yoksa otomatik oluştur
    const channelResponse = await fetch(`${API_URL}/channel/user/${currentUser.id}`);
    currentChannel = await channelResponse.json();

    // Kanal yoksa otomatik oluştur (kullanıcı adıyla)
    if (!currentChannel) {
      const formData = new FormData();
      formData.append('userId', currentUser.id);
      formData.append('channelName', currentUser.nickname || currentUser.username);
      formData.append('about', '');
      formData.append('agreed', 'true');
      const createRes = await fetch(`${API_URL}/channel`, { method: 'POST', body: formData });
      if (createRes.ok) {
        const chRes = await fetch(`${API_URL}/channel/user/${currentUser.id}`);
        currentChannel = await chRes.json();
      }
    }

    // Bildirimleri yükle
    loadNotifications();

    // Online durumunu ayarla
    initOnlinePresence();

    // Ana ekranı göster
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    showPage('home');
    updateMobileProfilePhoto();
  } catch (error) {
    console.error('Kullanıcı verisi yükleme hatası:', error);
  }
}

function logout() {
  localStorage.removeItem('Tea_user');
  currentUser = null;
  currentChannel = null;
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
  showLogin();
}

// Sayfa gösterme
function showPage(page) {
  currentPage = page;
  
  // Sidebar aktif durumunu güncelle
  document.querySelectorAll('.guide-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === page) {
      item.classList.add('active');
    }
  });
  
  // Mobilde sayfa değişince sidebar'ı kapat
  if (window.innerWidth <= 1312) {
    const guide = document.getElementById('guide');
    const overlay = document.getElementById('sidebarOverlay');
    if (guide) {
      guide.classList.add('collapsed');
      guide.classList.remove('show');
    }
    if (overlay) overlay.classList.remove('show');
    sidebarOpen = false;
  }
  
  const pageContent = document.getElementById('pageContent');
  
  switch(page) {
    case 'friends':
      loadFriendsPage();
      break;
    case 'messages':
      loadMessagesPage();
      break;
    case 'groups':
      loadGroupsPage();
      break;
    case 'shorts':
      loadShortsPage();
      break;
    case 'reals':
      loadShortsPage();
      break;
    case 'home':
      loadHomePage();
      break;
    case 'profile':
      loadProfilePage();
      break;
    case 'my-channel':
      loadMyChannelPage();
      break;
    case 'my-videos':
      loadMyVideosPage();
      break;
    case 'watched':
      loadWatchedPage();
      break;
    case 'history':
      loadHistoryPage();
      break;
    case 'algorithm':
      loadAlgorithmPage();
      break;
    case 'ts-music':
      loadTSMusicPage();
      break;
    case 'groups':
      loadGroupsPage();
      break;
    case 'settings':
      loadSettingsPage();
      break;
    case 'terms':
      loadTermsPage();
      break;
    case 'subscriptions':
      loadSubscriptionsPage();
      break;
    case 'favorites':
      loadFavoritesPage();
      break;
    case 'saved':
      loadSavedPage();
      break;
    case 'notifications':
      loadNotificationsPage();
      break;
    default:
      pageContent.innerHTML = '<h2>Sayfa bulunamadı</h2>';
  }
}

// ==================== ARKADAŞLAR ====================

async function loadFriendsPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `<div class="yt-loading"><div class="yt-spinner"></div></div>`;

  try {
    const [friends, incoming, sent] = await Promise.all([
      fetch(`${API_URL}/friends/${currentUser.id}`).then(r => r.json()),
      fetch(`${API_URL}/friend-requests/incoming/${currentUser.id}`).then(r => r.json()),
      fetch(`${API_URL}/friend-requests/sent/${currentUser.id}`).then(r => r.json())
    ]);

    pageContent.innerHTML = `
      <h2 class="section-header">Arkadaşlar</h2>
      <div class="settings-card" style="margin-bottom:16px;">
        <h3 class="settings-card-title"><i class="fas fa-user-plus" style="margin-right:8px; color:var(--yt-spec-brand-background-solid);"></i>Arkadaş Ekle</h3>
        <input type="text" id="friendSearchInput" class="yt-input" placeholder="Kullanıcı adı veya takma ad..." style="margin-bottom:0;" oninput="searchFriends()" />
        <div id="friendSearchResults" style="margin-top:8px;"></div>
      </div>
      ${incoming.length > 0 ? `
        <div class="settings-card" style="margin-bottom:16px; border:1px solid var(--yt-spec-brand-background-solid);">
          <h3 class="settings-card-title">
            <i class="fas fa-user-clock" style="margin-right:8px; color:var(--yt-spec-brand-background-solid);"></i>Gelen İstekler
            <span style="background:var(--yt-spec-brand-background-solid); color:white; font-size:11px; padding:2px 7px; border-radius:10px; margin-left:8px;">${incoming.length}</span>
          </h3>
          ${incoming.map(r => `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
              <img src="${getProfilePhotoUrl(r.profile_photo)}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />
              <div style="flex:1;"><p style="font-size:14px; font-weight:500;">${r.nickname}</p><p style="font-size:12px; color:var(--yt-spec-text-secondary);">@${r.username}</p></div>
              <div style="display:flex; gap:8px;">
                <button class="yt-btn" onclick="respondFriendRequest(${r.id},'accept')" style="height:32px; padding:0 14px; font-size:12px;">Kabul</button>
                <button class="yt-btn yt-btn-secondary" onclick="respondFriendRequest(${r.id},'reject')" style="height:32px; padding:0 14px; font-size:12px;">Red</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${sent.length > 0 ? `
        <div class="settings-card" style="margin-bottom:16px;">
          <h3 class="settings-card-title"><i class="fas fa-paper-plane" style="margin-right:8px;"></i>Gönderilen İstekler</h3>
          ${sent.map(r => `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
              <img src="${getProfilePhotoUrl(r.profile_photo)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" />
              <div style="flex:1;"><p style="font-size:14px; font-weight:500;">${r.nickname}</p><p style="font-size:12px; color:var(--yt-spec-text-secondary);">@${r.username}</p></div>
              <span style="font-size:12px; color:var(--yt-spec-text-secondary); background:rgba(255,255,255,0.08); padding:4px 10px; border-radius:10px;">Bekliyor</span>
              <button class="yt-btn yt-btn-secondary" onclick="cancelFriendRequest(${r.id})" style="height:32px; padding:0 12px; font-size:12px;">İptal</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="settings-card">
        <h3 class="settings-card-title"><i class="fas fa-users" style="margin-right:8px;"></i>Arkadaşlarım (${friends.length})</h3>
        ${friends.length === 0 ? '<p style="color:var(--yt-spec-text-secondary); font-size:14px;">Henüz arkadaşın yok</p>' : friends.map(f => `
          <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
            <img src="${getProfilePhotoUrl(f.profile_photo)}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />
            <div style="flex:1;"><p style="font-size:14px; font-weight:500;">${f.nickname}</p><p style="font-size:12px; color:var(--yt-spec-text-secondary);">@${f.username}</p></div>
            <div style="display:flex; gap:8px;">
              <button class="yt-btn" onclick="openChat(${f.friend_id},'${f.nickname}','${getProfilePhotoUrl(f.profile_photo)}')" style="height:32px; padding:0 14px; font-size:12px;"><i class="fas fa-comment"></i> Mesaj</button>
              <button class="yt-btn yt-btn-secondary" onclick="removeFriend(${f.id})" style="height:32px; padding:0 12px; font-size:12px;"><i class="fas fa-user-minus"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch(e) { console.error(e); }
}

async function searchFriends() {
  const q = document.getElementById('friendSearchInput')?.value.trim();
  const results = document.getElementById('friendSearchResults');
  if (!results) return;
  if (!q) { results.innerHTML = ''; return; }
  try {
    const res = await fetch(`${API_URL}/search-users?q=${encodeURIComponent(q)}&userId=${currentUser.id}`);
    const users = await res.json();
    if (!users.length) { results.innerHTML = '<p style="font-size:13px; color:var(--yt-spec-text-secondary);">Kullanıcı bulunamadı</p>'; return; }
    const items = await Promise.all(users.map(async u => {
      const statusRes = await fetch(`${API_URL}/friendship-status/${currentUser.id}/${u.id}`);
      const status = await statusRes.json();
      let btn = `<button class="yt-btn" onclick="sendFriendRequest(${u.id})" style="height:30px;padding:0 12px;font-size:12px;">İstek Gönder</button>`;
      if (status.status === 'accepted') btn = `<span style="color:#4caf50;font-size:12px;"><i class="fas fa-check"></i> Arkadaş</span>`;
      else if (status.status === 'pending' && status.isSender) btn = `<span style="font-size:12px;color:var(--yt-spec-text-secondary);">İstek Gönderildi</span>`;
      else if (status.status === 'pending') btn = `<div style="display:flex;gap:6px;"><button class="yt-btn" onclick="respondFriendRequest(${status.id},'accept')" style="height:30px;padding:0 10px;font-size:12px;">Kabul</button><button class="yt-btn yt-btn-secondary" onclick="respondFriendRequest(${status.id},'reject')" style="height:30px;padding:0 10px;font-size:12px;">Red</button></div>`;
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--yt-spec-raised-background);border-radius:8px;margin-bottom:6px;">
        <img src="${getProfilePhotoUrl(u.profile_photo)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" />
        <div style="flex:1;"><p style="font-size:13px;font-weight:500;">${u.nickname}</p><p style="font-size:11px;color:var(--yt-spec-text-secondary);">@${u.username}</p></div>
        ${btn}
      </div>`;
    }));
    results.innerHTML = items.join('');
  } catch(e) {}
}

async function sendFriendRequest(receiverId) {
  try {
    const res = await fetch(`${API_URL}/friend-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderId: currentUser.id, receiverId }) });
    const data = await res.json();
    if (res.ok) { showToast('Arkadaşlık isteği gönderildi!', 'success'); searchFriends(); }
    else showToast(data.error || 'Hata', 'error');
  } catch(e) { showToast('Hata', 'error'); }
}

async function respondFriendRequest(id, action) {
  try {
    if (action === 'accept') await fetch(`${API_URL}/friend-request/${id}/accept`, { method: 'PUT' });
    else await fetch(`${API_URL}/friendship/${id}`, { method: 'DELETE' });
    showToast(action === 'accept' ? 'Kabul edildi!' : 'Reddedildi', action === 'accept' ? 'success' : 'info');
    loadFriendsPage();
  } catch(e) { showToast('Hata', 'error'); }
}

async function cancelFriendRequest(id) {
  await fetch(`${API_URL}/friendship/${id}`, { method: 'DELETE' });
  loadFriendsPage();
}

async function removeFriend(id) {
  if (!confirm('Arkadaşlıktan çıkarmak istediğine emin misin?')) return;
  await fetch(`${API_URL}/friendship/${id}`, { method: 'DELETE' });
  showToast('Arkadaşlıktan çıkarıldı', 'info');
  loadFriendsPage();
}

function loadMessagesPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `<div class="yt-loading"><div class="yt-spinner"></div></div>`;

  // Firebase hazır değilse bekle
  if (!window.firebaseDB) {
    document.addEventListener('firebaseReady', () => loadMessagesPage(), { once: true });
    return;
  }

  fetch(`${API_URL}/friends/${currentUser.id}`)
    .then(r => r.json())
    .then(friends => {
      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        pageContent.innerHTML = `
          <div class="mobile-messages-page">
            <h2 style="font-size:18px;font-weight:700;padding:12px 16px 8px;margin:0;">Mesajlar</h2>

            <!-- Arkadaş Arama -->
            <div style="padding:0 16px 12px;">
              <div style="display:flex; gap:8px; background:rgba(255,255,255,0.06); border-radius:12px; padding:10px 14px; align-items:center;">
                <i class="fas fa-search" style="color:var(--yt-spec-text-secondary); font-size:14px;"></i>
                <input type="text" id="msgFriendSearch" placeholder="Kullanıcı ara..." 
                  style="background:none; border:none; outline:none; color:var(--yt-spec-text-primary); font-size:14px; flex:1;"
                  oninput="searchFriendsInMessages()" />
              </div>
              <div id="msgFriendSearchResults" style="margin-top:8px;"></div>
            </div>
            <div class="mobile-friends-row">
              ${friends.map(f => `
                <div class="mobile-friend-avatar" onclick="openMobileChat(${f.friend_id},'${f.nickname.replace(/'/g,"\\'")}','${getProfilePhotoUrl(f.profile_photo)}')">
                  <div style="position:relative;">
                    <img src="${getProfilePhotoUrl(f.profile_photo)}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.1);" />
                    <div class="online-dot" id="online_${f.friend_id}" style="display:none;"></div>
                    <div id="unread_${f.friend_id}" class="unread-badge" style="display:none;position:absolute;top:-2px;right:-2px;"></div>
                  </div>
                  <p style="font-size:11px;text-align:center;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60px;">${f.nickname}</p>
                </div>
              `).join('')}
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:8px;">
              ${friends.length === 0
                ? '<p style="padding:24px 16px;color:var(--yt-spec-text-secondary);text-align:center;">Arkadaş ekleyerek mesajlaşmaya başla</p>'
                : friends.map(f => `
                  <div class="mobile-chat-row" onclick="openMobileChat(${f.friend_id},'${f.nickname.replace(/'/g,"\\'")}','${getProfilePhotoUrl(f.profile_photo)}')">
                    <div style="position:relative;flex-shrink:0;">
                      <img src="${getProfilePhotoUrl(f.profile_photo)}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
                      <div class="online-dot" id="online2_${f.friend_id}" style="display:none;"></div>
                    </div>
                    <div style="flex:1;min-width:0;">
                      <p style="font-size:14px;font-weight:600;margin-bottom:2px;">${f.nickname}</p>
                      <p class="last-msg" id="lastmsg_${f.friend_id}" style="font-size:12px;color:var(--yt-spec-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></p>
                    </div>
                    <div id="unread2_${f.friend_id}" class="unread-badge" style="display:none;"></div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        `;
      } else {
        pageContent.innerHTML = `
          <div class="messages-layout">
            <div class="messages-sidebar">
              <div style="padding:16px;border-bottom:1px solid rgba(255,255,255,0.1);">
                <h3 style="font-size:16px;font-weight:600;">Mesajlar</h3>
              </div>
              <div id="friendsList" class="friends-list">
                ${friends.length === 0 ? '<p style="padding:16px;color:var(--yt-spec-text-secondary);font-size:13px;">Henüz arkadaşın yok</p>' :
                  friends.map(f => `
                    <div class="friend-item" id="friend_${f.friend_id}" onclick="openChat(${f.friend_id},'${f.nickname.replace(/'/g,"\\'")}','${getProfilePhotoUrl(f.profile_photo)}')">
                      <div style="position:relative;">
                        <img src="${getProfilePhotoUrl(f.profile_photo)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" />
                        <div class="online-dot" id="online_${f.friend_id}"></div>
                      </div>
                      <div style="flex:1;min-width:0;">
                        <p style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.nickname}</p>
                        <p class="last-msg" id="lastmsg_${f.friend_id}" style="font-size:12px;color:var(--yt-spec-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></p>
                      </div>
                      <div id="unread_${f.friend_id}" class="unread-badge" style="display:none;"></div>
                    </div>
                  `).join('')
                }
              </div>
            </div>
            <div class="messages-chat" id="chatArea">
              <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--yt-spec-text-secondary);">
                <div style="text-align:center;">
                  <i class="fas fa-comment-dots" style="font-size:48px;margin-bottom:12px;opacity:0.4;"></i>
                  <p>Bir arkadaş seç ve mesajlaşmaya başla</p>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      friends.forEach(f => {
        listenLastMessage(f.friend_id, f.nickname);
        listenFriendPresence(f.friend_id);
      });
    });
}

// Mobil tam ekran chat
function openMobileChat(friendId, friendName, friendPhoto) {
  if (!window.firebaseDB) {
    showToast('Bağlantı kuruluyor...', 'info');
    document.addEventListener('firebaseReady', () => openMobileChat(friendId, friendName, friendPhoto), { once: true });
    return;
  }
  const chatId = getChatId(currentUser.id, friendId);
  const pageContent = document.getElementById('pageContent');
  currentChatFriendId = friendId;

  pageContent.innerHTML = `
    <div class="mobile-chat-fullscreen">
      <div class="mobile-chat-header">
        <button onclick="loadMessagesPage()" style="background:none;border:none;color:var(--yt-spec-text-primary);cursor:pointer;padding:8px 12px 8px 4px;font-size:20px;flex-shrink:0;">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div style="position:relative;flex-shrink:0;">
          <img src="${friendPhoto}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" />
          <div id="headerOnlineDot" style="display:none;position:absolute;bottom:1px;right:1px;width:10px;height:10px;background:#4caf50;border-radius:50%;border:2px solid var(--yt-spec-base-background);"></div>
        </div>
        <div style="flex:1;min-width:0;margin-left:10px;">
          <p style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${friendName}</p>
          <p id="chatStatus" style="font-size:12px;color:var(--yt-spec-text-secondary);"></p>
        </div>
      </div>
      <div id="selectToolbar" class="select-toolbar" style="display:none;">
        <button onclick="exitSelectMode()" style="background:none;border:none;color:inherit;cursor:pointer;padding:4px 8px;font-size:18px;"><i class="fas fa-times"></i></button>
        <span id="selectCount" style="font-size:14px;font-weight:600;flex:1;">0 seçildi</span>
        <button onclick="deleteSelectedMessages('${chatId}')" style="background:none;border:none;color:#f44336;cursor:pointer;padding:4px 12px;font-size:14px;"><i class="fas fa-trash"></i> Sil</button>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-input-wrapper">
        <div id="photoPreviewArea" style="display:none;padding:8px 12px 0;border-top:1px solid rgba(255,255,255,0.08);">
          <div style="position:relative;display:inline-block;">
            <img id="photoPreviewImg" style="max-height:100px;max-width:160px;border-radius:8px;display:block;object-fit:cover;" />
            <button onclick="cancelPhotoPreview()" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#333;border:none;color:#fff;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">×</button>
          </div>
        </div>
        <div class="chat-input-area">
          <label class="chat-photo-btn">
            <i class="fas fa-image"></i>
            <input type="file" id="chatPhotoInput" accept="image/*" style="display:none;" onchange="previewChatPhoto(this,${friendId})" />
          </label>
          <textarea id="chatInput" class="chat-input chat-textarea" placeholder="Mesaj yaz..." onkeydown="handleChatKey(event,${friendId})"></textarea>
          <button class="chat-send-btn" onclick="sendMessage(${friendId})"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    </div>
  `;

  const msgsRef = window.firebaseQuery(
    window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`),
    window.firebaseOrderByChild('timestamp')
  );
  window.firebaseOnValue(msgsRef, snap => {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    container.innerHTML = '';
    snap.forEach(child => {
      const msg = child.val();
      const msgId = child.key;
      const isMe = msg.senderId == currentUser.id;
      const deleted = isMe ? msg.deletedForSender : msg.deletedForReceiver;
      if (deleted) return;
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
      const readIcon = isMe ? (msg.read ? '<i class="fas fa-check-double" style="color:#4caf50;"></i>' : '<i class="fas fa-check"></i>') : '';
      const div = document.createElement('div');
      div.className = `chat-msg ${isMe ? 'chat-msg-me' : 'chat-msg-them'}`;
      div.dataset.msgId = msgId; div.dataset.isMe = isMe ? '1' : '0';
      div.innerHTML = `
        <div class="msg-select-check" onclick="toggleMsgSelect(event,'${msgId}',${isMe})"><div class="msg-checkbox" id="chk_${msgId}"></div></div>
        ${!isMe ? `<img src="${friendPhoto}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;align-self:flex-end;margin-right:6px;" />` : ''}
        <div class="chat-bubble" oncontextmenu="showMsgMenu(event,'${msgId}',${isMe},'${chatId}')" onclick="handleBubbleClick(event,'${msgId}',${isMe})">
          ${msg.imageUrl ? `<img src="${msg.imageUrl}" style="max-width:200px;max-height:200px;border-radius:10px;display:block;" />` : `<p style="white-space:pre-wrap;">${msg.text}</p>`}
          <div class="chat-meta">${time} ${readIcon}</div>
        </div>
        ${isMe ? `<img src="${getProfilePhotoUrl(currentUser.profile_photo)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;align-self:flex-end;margin-left:6px;" />` : ''}
      `;
      let pressTimer;
      div.addEventListener('pointerdown', () => { pressTimer = setTimeout(() => enterSelectMode(msgId, isMe, chatId), 500); });
      div.addEventListener('pointerup', () => clearTimeout(pressTimer));
      div.addEventListener('pointermove', () => clearTimeout(pressTimer));
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
    markMessagesRead(chatId, friendId);
  });

  const presRef = window.firebaseRef(window.firebaseDB, `presence/${friendId}`);
  window.firebaseOnValue(presRef, snap => {
    const isOnline = snap.val()?.online === true;
    const statusEl = document.getElementById('chatStatus');
    const dot = document.getElementById('headerOnlineDot');
    if (statusEl) { statusEl.textContent = isOnline ? 'Çevrimiçi' : 'Çevrimdışı'; statusEl.style.color = isOnline ? '#4caf50' : 'var(--yt-spec-text-secondary)'; }
    if (dot) dot.style.display = isOnline ? 'block' : 'none';
  });
  setOnlineStatus(true);
}

let currentChatListener = null;
let currentChatFriendId = null;

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

function listenLastMessage(friendId, friendName) {
  if (!window.firebaseDB) return;
  const chatId = getChatId(currentUser.id, friendId);
  const msgsRef = window.firebaseQuery(
    window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`),
    window.firebaseOrderByChild('timestamp'),
    window.firebaseLimitToLast(1)
  );
  window.firebaseOnValue(msgsRef, snap => {
    const el = document.getElementById(`lastmsg_${friendId}`);
    if (!el) return;
    snap.forEach(child => {
      const msg = child.val();
      const isMe = msg.senderId == currentUser.id;
      const deleted = isMe ? msg.deletedForSender : msg.deletedForReceiver;
      el.textContent = deleted ? '' : (isMe ? 'Sen: ' : '') + (msg.text || (msg.imageUrl ? '📷 Fotoğraf' : ''));
    });
  });

  // Okunmamış mesaj sayısını dinle
  const allMsgsRef = window.firebaseQuery(
    window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`),
    window.firebaseOrderByChild('timestamp')
  );
  window.firebaseOnValue(allMsgsRef, snap => {
    let unread = 0;
    snap.forEach(child => {
      const msg = child.val();
      if (msg.senderId != currentUser.id && !msg.read && !msg.deletedForReceiver) unread++;
    });
    const badge = document.getElementById(`unread_${friendId}`);
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
    updateTotalMsgBadge();
  });
}

function updateTotalMsgBadge() {
  if (!window.firebaseDB || !currentUser) return;
  // Tüm unread badge'leri topla
  let total = 0;
  document.querySelectorAll('[id^="unread_"]').forEach(el => {
    if (el.style.display !== 'none') total += parseInt(el.textContent) || 0;
  });
  const badge = document.getElementById('msgBadge');
  if (badge) {
    if (total > 0) {
      badge.textContent = total > 9 ? '9+' : total;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function listenFriendPresence(friendId) {
  if (!window.firebaseDB) return;
  const presRef = window.firebaseRef(window.firebaseDB, `presence/${friendId}`);
  window.firebaseOnValue(presRef, snap => {
    const isOnline = snap.val()?.online === true;
    const dot = document.getElementById(`online_${friendId}`);
    const item = document.getElementById(`friend_${friendId}`);
    if (dot) dot.style.display = isOnline ? 'block' : 'none';
    if (item) item.style.opacity = isOnline ? '1' : '0.5';
  });
}

function openChat(friendId, friendName, friendPhoto) {
  currentChatFriendId = friendId;

  // Firebase hazır değilse bekle
  if (!window.firebaseDB) {
    showToast('Bağlantı kuruluyor, lütfen bekle...', 'info');
    document.addEventListener('firebaseReady', () => openChat(friendId, friendName, friendPhoto), { once: true });
    return;
  }

  // chatId'yi burada hesapla - HTML'de kullanılacak
  const chatId = getChatId(currentUser.id, friendId);

  // Aktif arkadaşı işaretle
  document.querySelectorAll('.friend-item').forEach(el => el.classList.remove('active'));
  const friendEl = document.getElementById(`friend_${friendId}`);
  if (friendEl) friendEl.classList.add('active');

  const chatArea = document.getElementById('chatArea');
  if (!chatArea) {
    // Mesajlar sayfasına geç, sonra chat'i aç
    showPage('messages');
    setTimeout(() => openChat(friendId, friendName, friendPhoto), 400);
    return;
  }

  chatArea.innerHTML = `
    <!-- Chat Header -->
    <div class="chat-header">
      <div style="position:relative; flex-shrink:0;">
        <img src="${friendPhoto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" />
        <div id="headerOnlineDot" style="display:none; position:absolute; bottom:1px; right:1px; width:10px; height:10px; background:#4caf50; border-radius:50%; border:2px solid var(--yt-spec-base-background);"></div>
      </div>
      <div style="flex:1;">
        <p style="font-size:15px; font-weight:600;">${friendName}</p>
        <p id="chatStatus" style="font-size:12px; color:var(--yt-spec-text-secondary);"></p>
      </div>
      <button class="yt-icon-button" onclick="openFloatingChat(${friendId},'${friendName}','${friendPhoto}')" title="Mini pencere">
        <i class="fas fa-external-link-alt" style="font-size:14px;"></i>
      </button>
    </div>

    <!-- Seçim Toolbar (gizli) -->
    <div id="selectToolbar" class="select-toolbar" style="display:none;">
      <button onclick="exitSelectMode()" style="background:none;border:none;color:inherit;cursor:pointer;padding:4px 8px;font-size:18px;"><i class="fas fa-times"></i></button>
      <span id="selectCount" style="font-size:14px; font-weight:600; flex:1;">0 seçildi</span>
      <button id="selectDeleteBtn" onclick="deleteSelectedMessages('${chatId}')" style="background:none;border:none;color:#f44336;cursor:pointer;padding:4px 12px;font-size:14px; display:flex; align-items:center; gap:6px;">
        <i class="fas fa-trash"></i> Sil
      </button>
    </div>

    <!-- Mesajlar -->
    <div class="chat-messages" id="chatMessages"></div>

    <!-- Input -->
    <div class="chat-input-wrapper">
      <!-- Fotoğraf önizleme alanı (gizli) -->
      <div id="photoPreviewArea" style="display:none; padding:8px 12px 0; border-top:1px solid rgba(255,255,255,0.08);">
        <div style="position:relative; display:inline-block;">
          <img id="photoPreviewImg" style="max-height:120px; max-width:200px; border-radius:8px; display:block; object-fit:cover;" />
          <button onclick="cancelPhotoPreview()" style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:#333; border:none; color:#fff; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; line-height:1;">×</button>
        </div>
        <p id="photoPreviewName" style="font-size:11px; color:var(--yt-spec-text-secondary); margin-top:4px;"></p>
      </div>
      <div class="chat-input-area">
        <label class="chat-photo-btn" title="Fotoğraf gönder">
          <i class="fas fa-image"></i>
          <input type="file" id="chatPhotoInput" accept="image/*" style="display:none;" onchange="previewChatPhoto(this, ${friendId})" />
        </label>
        <textarea id="chatInput" class="chat-input chat-textarea" placeholder="Mesaj yaz..."
                  onkeydown="handleChatKey(event,${friendId})"></textarea>
        <button class="chat-send-btn" onclick="sendMessage(${friendId})">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

  // Mesajları dinle
  const msgsRef = window.firebaseQuery(
    window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`),
    window.firebaseOrderByChild('timestamp')
  );

  window.firebaseOnValue(msgsRef, snap => {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    container.innerHTML = '';

    snap.forEach(child => {
      const msg = child.val();
      const msgId = child.key;
      const isMe = msg.senderId == currentUser.id;
      const deleted = isMe ? msg.deletedForSender : msg.deletedForReceiver;

      if (deleted) return;

      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
      const readIcon = isMe ? (msg.read ? '<i class="fas fa-check-double" style="color:#4caf50;"></i>' : '<i class="fas fa-check"></i>') : '';

      const div = document.createElement('div');
      div.className = `chat-msg ${isMe ? 'chat-msg-me' : 'chat-msg-them'}`;
      div.dataset.msgId = msgId;
      div.dataset.isMe = isMe ? '1' : '0';

      const avatarSrc = isMe ? getProfilePhotoUrl(currentUser.profile_photo) : friendPhoto;
      div.innerHTML = `
        <div class="msg-select-check" onclick="toggleMsgSelect(event, '${msgId}', ${isMe})">
          <div class="msg-checkbox" id="chk_${msgId}"></div>
        </div>
        ${!isMe ? `<img src="${avatarSrc}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; flex-shrink:0; align-self:flex-end; margin-right:6px;" />` : ''}
        <div class="chat-bubble" oncontextmenu="showMsgMenu(event,'${msgId}',${isMe},'${chatId}')" onclick="handleBubbleClick(event,'${msgId}',${isMe})">
          ${msg.imageUrl ? `<img src="${msg.imageUrl}" style="max-width:220px; max-height:220px; border-radius:10px; display:block; cursor:pointer;" onclick="event.stopPropagation(); window.open('${msg.imageUrl}','_blank')" />` : `<p style="white-space:pre-wrap;">${msg.text}</p>`}
          <div class="chat-meta">${time} ${readIcon}</div>
        </div>
        ${isMe ? `<img src="${avatarSrc}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; flex-shrink:0; align-self:flex-end; margin-left:6px;" />` : ''}
      `;

      // Long press ile seçim modu
      let pressTimer;
      div.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => enterSelectMode(msgId, isMe, chatId), 500);
      });
      div.addEventListener('pointerup', () => clearTimeout(pressTimer));
      div.addEventListener('pointermove', () => clearTimeout(pressTimer));

      container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
    markMessagesRead(chatId, friendId);
  });

  // Online durumu
  const presenceRef = window.firebaseRef(window.firebaseDB, `presence/${friendId}`);
  window.firebaseOnValue(presenceRef, snap => {
    const data = snap.val();
    const isOnline = data?.online === true;

    // Header status
    const statusEl = document.getElementById('chatStatus');
    const dot = document.getElementById('headerOnlineDot');
    if (statusEl) {
      statusEl.textContent = isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
      statusEl.style.color = isOnline ? '#4caf50' : 'var(--yt-spec-text-secondary)';
    }
    if (dot) dot.style.display = isOnline ? 'block' : 'none';

    // Arkadaş listesindeki yeşil nokta
    const onlineDot = document.getElementById(`online_${friendId}`);
    const friendItem = document.getElementById(`friend_${friendId}`);
    if (onlineDot) {
      onlineDot.style.display = isOnline ? 'block' : 'none';
    }
    if (friendItem) {
      friendItem.style.opacity = isOnline ? '1' : '0.5';
    }
  });

  // Yazıyor durumunu dinle
  const typingRef = window.firebaseRef(window.firebaseDB, `typing/${getChatId(currentUser.id, friendId)}/${friendId}`);
  window.firebaseOnValue(typingRef, snap => {
    const statusEl = document.getElementById('chatStatus');
    if (!statusEl) return;
    if (snap.val()?.typing) {
      statusEl.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span> yazıyor...';
      statusEl.style.color = 'var(--yt-spec-brand-background-solid)';
    } else {
      // Tekrar online/offline durumunu göster
      const presSnap = window.firebaseRef(window.firebaseDB, `presence/${friendId}`);
      window.firebaseOnValue(presSnap, s => {
        if (!statusEl) return;
        const online = s.val()?.online;
        statusEl.textContent = online ? 'Çevrimiçi' : 'Çevrimdışı';
        statusEl.style.color = online ? '#4caf50' : 'var(--yt-spec-text-secondary)';
      }, { onlyOnce: true });
    }
  });

  // Kendi online durumunu güncelle
  setOnlineStatus(true);
}

function handleChatKey(event, friendId) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage(friendId);
  } else {
    // Yazıyor durumunu güncelle
    sendTypingStatus(friendId, true);
  }
}

let typingTimeout = null;
function sendTypingStatus(friendId, isTyping) {
  if (!window.firebaseDB || !currentUser) return;
  const chatId = getChatId(currentUser.id, friendId);
  const typingRef = window.firebaseRef(window.firebaseDB, `typing/${chatId}/${currentUser.id}`);
  try {
    window.firebaseSet(typingRef, { typing: isTyping });
  } catch(e) {}
  clearTimeout(typingTimeout);
  if (isTyping) {
    typingTimeout = setTimeout(() => {
      if (window.firebaseDB) window.firebaseSet(typingRef, { typing: false });
    }, 2000);
  }
}

async function sendMessage(friendId) {
  // Bekleyen fotoğraf varsa önce onu gönder
  if (pendingChatPhoto) {
    const file = pendingChatPhoto;
    cancelPhotoPreview();
    showToast('Fotoğraf yükleniyor...', 'info');
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${API_URL}/upload-chat-photo`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.url) throw new Error('Yükleme başarısız');
      const chatId = getChatId(currentUser.id, friendId);
      await window.firebasePush(window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`), {
        senderId: currentUser.id,
        receiverId: friendId,
        text: '',
        imageUrl: data.url,
        timestamp: Date.now(),
        read: false,
        deletedForSender: false,
        deletedForReceiver: false
      });
      showToast('Fotoğraf gönderildi!', 'success');
    } catch(e) {
      showToast('Fotoğraf gönderilemedi: ' + e.message, 'error');
    }
  }

  const input = document.getElementById('chatInput');
  const text = input?.value.trim();
  if (!text) return;

  if (!window.firebaseDB) {
    showToast('Bağlantı kurulamadı, sayfayı yenile', 'error');
    return;
  }

  const chatId = getChatId(currentUser.id, friendId);
  const msgsRef = window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`);

  try {
    await window.firebasePush(msgsRef, {
      senderId: currentUser.id,
      receiverId: friendId,
      text,
      timestamp: Date.now(),
      read: false,
      deletedForSender: false,
      deletedForReceiver: false
    });
    input.value = '';
    input.style.height = 'auto';
    sendTypingStatus(friendId, false);
  } catch(e) {
    console.error('Mesaj gönderme hatası:', e);
    showToast('Mesaj gönderilemedi: ' + e.message, 'error');
  }
}

// Fotoğraf önizleme
let pendingChatPhoto = null;
let pendingChatFriendId = null;

function previewChatPhoto(input, friendId) {
  const file = input.files[0];
  if (!file) return;

  pendingChatPhoto = file;
  pendingChatFriendId = friendId;

  const reader = new FileReader();
  reader.onload = (e) => {
    const previewArea = document.getElementById('photoPreviewArea');
    const previewImg = document.getElementById('photoPreviewImg');
    const previewName = document.getElementById('photoPreviewName');
    if (previewArea) previewArea.style.display = 'block';
    if (previewImg) previewImg.src = e.target.result;
    if (previewName) previewName.textContent = file.name + ' · ' + (file.size / 1024).toFixed(0) + ' KB';
  };
  reader.readAsDataURL(file);
}

function cancelPhotoPreview() {
  pendingChatPhoto = null;
  pendingChatFriendId = null;
  const previewArea = document.getElementById('photoPreviewArea');
  const previewImg = document.getElementById('photoPreviewImg');
  const photoInput = document.getElementById('chatPhotoInput');
  if (previewArea) previewArea.style.display = 'none';
  if (previewImg) previewImg.src = '';
  if (photoInput) photoInput.value = '';
}

async function sendPhotoMessage(input, friendId) {
  const file = input.files[0];
  if (!file || !window.firebaseDB) return;

  showToast('Fotoğraf yükleniyor...', 'info');

  try {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`${API_URL}/upload-chat-photo`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.url) throw new Error('Yükleme başarısız');

    const chatId = getChatId(currentUser.id, friendId);
    await window.firebasePush(window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`), {
      senderId: currentUser.id,
      receiverId: friendId,
      text: '',
      imageUrl: data.url,
      timestamp: Date.now(),
      read: false,
      deletedForSender: false,
      deletedForReceiver: false
    });
    showToast('Fotoğraf gönderildi!', 'success');
  } catch(e) {
    showToast('Fotoğraf gönderilemedi: ' + e.message, 'error');
  }
  input.value = '';
}

function markMessagesRead(chatId, senderId) {
  if (!window.firebaseDB) return;
  const msgsRef = window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`);
  window.firebaseOnValue(msgsRef, snap => {
    snap.forEach(child => {
      const msg = child.val();
      if (msg.senderId == senderId && !msg.read) {
        window.firebaseUpdate(window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages/${child.key}`), { read: true });
      }
    });
  }, { onlyOnce: true });
}

// ── Toplu Mesaj Seçim Sistemi ─────────────────────────────────────────────
let selectedMessages = new Map(); // msgId -> { isMe, chatId }
let selectModeActive = false;

function enterSelectMode(firstMsgId, isMe, chatId) {
  selectModeActive = true;
  const container = document.getElementById('chatMessages');
  if (container) container.classList.add('select-mode');
  const toolbar = document.getElementById('selectToolbar');
  const header = document.querySelector('.chat-header');
  if (toolbar) toolbar.style.display = 'flex';
  if (header) header.style.display = 'none';
  selectedMessages.clear();
  toggleMsgSelect(null, firstMsgId, isMe, chatId);
}

function exitSelectMode() {
  selectModeActive = false;
  selectedMessages.clear();
  const container = document.getElementById('chatMessages');
  if (container) container.classList.remove('select-mode');
  const toolbar = document.getElementById('selectToolbar');
  const header = document.querySelector('.chat-header');
  if (toolbar) toolbar.style.display = 'none';
  if (header) header.style.display = 'flex';
  document.querySelectorAll('.chat-msg.selected').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.msg-checkbox.checked').forEach(el => el.classList.remove('checked'));
}

function toggleMsgSelect(event, msgId, isMe, chatId) {
  if (event) event.stopPropagation();
  if (!selectModeActive) return;

  const div = document.querySelector(`[data-msg-id="${msgId}"]`);
  const chk = document.getElementById(`chk_${msgId}`);

  if (selectedMessages.has(msgId)) {
    selectedMessages.delete(msgId);
    div?.classList.remove('selected');
    chk?.classList.remove('checked');
  } else {
    selectedMessages.set(msgId, { isMe: isMe === true || isMe === 1 || isMe === '1', chatId });
    div?.classList.add('selected');
    chk?.classList.add('checked');
  }

  const count = selectedMessages.size;
  const countEl = document.getElementById('selectCount');
  if (countEl) countEl.textContent = `${count} mesaj seçildi`;
}

function handleBubbleClick(event, msgId, isMe) {
  if (selectModeActive) {
    event.stopPropagation();
    toggleMsgSelect(event, msgId, isMe);
  }
}

async function deleteSelectedMessages(chatId) {
  if (selectedMessages.size === 0) return;

  // Seçilenler arasında karşının mesajı var mı?
  const hasOthers = [...selectedMessages.values()].some(m => !m.isMe);
  const allMine = !hasOthers;

  if (allMine) {
    // Hepsi benim → seçenek sun
    const menu = document.createElement('div');
    menu.style.cssText = `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--yt-spec-raised-background); border-radius:12px; padding:20px; box-shadow:0 8px 32px rgba(0,0,0,0.5); z-index:9999; min-width:240px;`;
    menu.innerHTML = `
      <p style="font-size:14px; font-weight:600; margin-bottom:16px;">${selectedMessages.size} mesajı sil</p>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button onclick="confirmBulkDelete('${chatId}','sender'); this.closest('div[style]').remove();"
          style="padding:10px 16px; background:rgba(244,67,54,0.15); border:1px solid #f44336; border-radius:8px; color:#f44336; cursor:pointer; font-size:14px; text-align:left;">
          <i class="fas fa-trash" style="margin-right:8px;"></i>Benden Sil
        </button>
        <button onclick="confirmBulkDelete('${chatId}','all'); this.closest('div[style]').remove();"
          style="padding:10px 16px; background:rgba(244,67,54,0.25); border:1px solid #f44336; border-radius:8px; color:#f44336; cursor:pointer; font-size:14px; text-align:left; font-weight:600;">
          <i class="fas fa-trash-alt" style="margin-right:8px;"></i>Herkesten Sil
        </button>
        <button onclick="this.closest('div[style]').remove();"
          style="padding:10px 16px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:var(--yt-spec-text-secondary); cursor:pointer; font-size:14px; text-align:left;">
          İptal
        </button>
      </div>
    `;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.remove(); }, { once: true }), 100);
  } else {
    // Karşının mesajı var → sadece benden sil
    await confirmBulkDelete(chatId, 'sender');
  }
}

async function confirmBulkDelete(chatId, type) {
  if (!window.firebaseDB) return;
  const promises = [];
  for (const [msgId, info] of selectedMessages) {
    const msgRef = window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages/${msgId}`);
    if (type === 'all' && info.isMe) {
      promises.push(window.firebaseUpdate(msgRef, { deletedForSender: true, deletedForReceiver: true }));
    } else {
      // Benden sil: kendi mesajım → deletedForSender, karşınınki → deletedForReceiver
      if (info.isMe) {
        promises.push(window.firebaseUpdate(msgRef, { deletedForSender: true }));
      } else {
        promises.push(window.firebaseUpdate(msgRef, { deletedForReceiver: true }));
      }
    }
  }
  await Promise.all(promises);
  exitSelectMode();
  showToast(`${promises.length} mesaj silindi`, 'success');
}
// ─────────────────────────────────────────────────────────────────────────

function showMsgMenu(event, msgId, isMe, chatId) {
  event.preventDefault();
  
  // Eski menüyü kaldır
  document.getElementById('msgContextMenu')?.remove();

  const menu = document.createElement('div');
  menu.id = 'msgContextMenu';
  menu.style.cssText = `position:fixed; top:${event.clientY}px; left:${event.clientX}px; background:var(--yt-spec-raised-background); border-radius:8px; padding:8px 0; box-shadow:0 4px 16px rgba(0,0,0,0.4); z-index:9999; min-width:160px;`;
  
  const items = isMe ? [
    { icon: 'fa-edit', text: 'Düzenle', action: () => editChatMessage(chatId, msgId) },
    { icon: 'fa-trash', text: 'Benden Sil', action: () => deleteMessage(chatId, msgId, 'sender') },
    { icon: 'fa-trash-alt', text: 'Herkesten Sil', action: () => deleteMessage(chatId, msgId, 'all') }
  ] : [
    { icon: 'fa-trash', text: 'Benden Sil', action: () => deleteMessage(chatId, msgId, 'receiver') }
  ];

  items.forEach(item => {
    const el = document.createElement('div');
    el.style.cssText = 'padding:10px 16px; cursor:pointer; font-size:14px; display:flex; align-items:center; gap:10px;';
    el.innerHTML = `<i class="fas ${item.icon}" style="width:16px;"></i> ${item.text}`;
    el.onmouseover = () => el.style.background = 'rgba(255,255,255,0.1)';
    el.onmouseout = () => el.style.background = '';
    el.onclick = () => { item.action(); menu.remove(); };
    menu.appendChild(el);
  });

  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 100);
}

async function deleteMessage(chatId, msgId, type) {
  if (!window.firebaseDB) return;
  const msgRef = window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages/${msgId}`);
  if (type === 'all') {
    await window.firebaseUpdate(msgRef, { deletedForSender: true, deletedForReceiver: true });
  } else if (type === 'sender') {
    await window.firebaseUpdate(msgRef, { deletedForSender: true });
  } else {
    await window.firebaseUpdate(msgRef, { deletedForReceiver: true });
  }
}

function editChatMessage(chatId, msgId) {
  const bubble = document.querySelector(`[data-msg-id="${msgId}"] .msg-text`);
  if (!bubble) return;
  const current = bubble.textContent;
  bubble.innerHTML = `<div style="display:flex;gap:6px;align-items:center"><input id="editMsgInput_${msgId}" class="yt-input" value="${current.replace(/"/g,'&quot;')}" style="flex:1;height:30px;padding:0 8px;font-size:13px;min-width:120px" /><button onclick="saveMsgEdit('${chatId}','${msgId}')" style="background:none;border:none;color:var(--yt-spec-brand-background-solid);cursor:pointer"><i class="fas fa-check"></i></button><button onclick="cancelMsgEdit('${msgId}','${current.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer"><i class="fas fa-times"></i></button></div>`;
  document.getElementById(`editMsgInput_${msgId}`)?.focus();
}

async function saveMsgEdit(chatId, msgId) {
  const input = document.getElementById(`editMsgInput_${msgId}`);
  const newText = input?.value.trim();
  if (!newText || !window.firebaseDB) return;
  const msgRef = window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages/${msgId}`);
  await window.firebaseUpdate(msgRef, { text: newText, edited: true });
}

function cancelMsgEdit(msgId, original) {
  const bubble = document.querySelector(`[data-msg-id="${msgId}"] .msg-text`);
  if (bubble) bubble.textContent = original;
}

function setOnlineStatus(online) {
  if (!window.firebaseDB || !currentUser) return;
  const presenceRef = window.firebaseRef(window.firebaseDB, `presence/${currentUser.id}`);
  window.firebaseSet(presenceRef, { online, lastSeen: Date.now() });
  if (online) {
    // Sayfa kapanınca offline yap
    window.removeEventListener('beforeunload', window._offlineHandler);
    window._offlineHandler = () => {
      window.firebaseSet(presenceRef, { online: false, lastSeen: Date.now() });
    };
    window.addEventListener('beforeunload', window._offlineHandler);
  }
}

// Firebase hazır olduğunda online durumunu ayarla
function initOnlinePresence() {
  if (window.firebaseDB && currentUser) {
    setOnlineStatus(true);
  } else {
    document.addEventListener('firebaseReady', () => {
      if (currentUser) setOnlineStatus(true);
    }, { once: true });
  }
}

// ── Floating Mini Chat Widget ──────────────────────────────────────────────
let floatingChatListeners = {};

function openFloatingChat(friendId, friendName, friendPhoto) {
  // Zaten açıksa öne getir
  const existing = document.getElementById(`floatChat_${friendId}`);
  if (existing) {
    existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
    return;
  }

  const widget = document.createElement('div');
  widget.id = `floatChat_${friendId}`;
  widget.className = 'float-chat-widget';
  widget.innerHTML = `
    <div class="float-chat-header" onmousedown="startDragFloatChat(event, '${friendId}')">
      <img src="${friendPhoto}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
      <span style="flex:1;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${friendName}</span>
      <button onclick="document.getElementById('floatChat_${friendId}').style.display='none'" style="background:none;border:none;color:inherit;cursor:pointer;padding:2px 6px;font-size:14px;"><i class="fas fa-minus"></i></button>
      <button onclick="document.getElementById('floatChat_${friendId}').remove(); delete floatingChatListeners['${friendId}']" style="background:none;border:none;color:inherit;cursor:pointer;padding:2px 6px;font-size:14px;"><i class="fas fa-times"></i></button>
    </div>
    <div class="float-chat-messages" id="floatMsgs_${friendId}"></div>
    <div class="float-chat-input-area">
      <textarea id="floatInput_${friendId}" class="float-chat-input" placeholder="Mesaj..." rows="1"
        onkeydown="handleFloatChatKey(event,${friendId})"
        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,80)+'px'"></textarea>
      <button class="float-chat-send" onclick="sendFloatMessage(${friendId})"><i class="fas fa-paper-plane"></i></button>
    </div>
  `;

  document.body.appendChild(widget);

  // Mesajları dinle
  const chatId = getChatId(currentUser.id, friendId);
  const msgsRef = window.firebaseQuery(
    window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`),
    window.firebaseOrderByChild('timestamp')
  );

  floatingChatListeners[friendId] = window.firebaseOnValue(msgsRef, snap => {
    const container = document.getElementById(`floatMsgs_${friendId}`);
    if (!container) return;
    container.innerHTML = '';
    snap.forEach(child => {
      const msg = child.val();
      const isMe = msg.senderId == currentUser.id;
      const deleted = isMe ? msg.deletedForSender : msg.deletedForReceiver;
      if (deleted) return;
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
      const avatarSrc = isMe ? getProfilePhotoUrl(currentUser.profile_photo) : friendPhoto;
      const div = document.createElement('div');
      div.className = `float-msg ${isMe ? 'float-msg-me' : 'float-msg-them'}`;
      div.innerHTML = `
        ${!isMe ? `<img src="${avatarSrc}" class="float-msg-avatar" />` : ''}
        <div class="float-bubble">
          <p style="white-space:pre-wrap;margin:0;">${msg.text}</p>
          <span class="float-meta">${time}</span>
        </div>
        ${isMe ? `<img src="${avatarSrc}" class="float-msg-avatar" />` : ''}
      `;
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  });
}

function handleFloatChatKey(event, friendId) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendFloatMessage(friendId);
  }
}

async function sendFloatMessage(friendId) {
  const input = document.getElementById(`floatInput_${friendId}`);
  const text = input?.value.trim();
  if (!text || !window.firebaseDB) return;
  const chatId = getChatId(currentUser.id, friendId);
  await window.firebasePush(window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`), {
    senderId: currentUser.id,
    receiverId: friendId,
    text,
    timestamp: Date.now(),
    read: false,
    deletedForSender: false,
    deletedForReceiver: false
  });
  input.value = '';
  input.style.height = 'auto';
}

function startDragFloatChat(e, friendId) {
  const widget = document.getElementById(`floatChat_${friendId}`);
  if (!widget) return;
  let startX = e.clientX - widget.offsetLeft;
  let startY = e.clientY - widget.offsetTop;
  function onMove(ev) {
    widget.style.left = (ev.clientX - startX) + 'px';
    widget.style.top = (ev.clientY - startY) + 'px';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
// ──────────────────────────────────────────────────────────────────────────

// Shorts sayfası
let shortsVideos = [];
let currentShortIndex = 0;

async function loadShortsPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `<div class="yt-loading"><div class="yt-spinner"></div></div>`;

  try {
    const res = await fetch(`${API_URL}/shorts`);
    shortsVideos = await res.json();

    if (shortsVideos.length === 0) {
      pageContent.innerHTML = `
        <div style="text-align:center; padding:80px 20px;">
          <i class="fas fa-film" style="font-size:64px; color:var(--yt-spec-text-secondary); margin-bottom:16px;"></i>
          <p style="font-size:18px; color:var(--yt-spec-text-secondary);">Henüz Reals yok</p>
        </div>`;
      return;
    }

    currentShortIndex = 0;
    renderShortsPlayer();
  } catch(e) { console.error(e); }
}

function renderShortsPlayer() {
  const pageContent = document.getElementById('pageContent');
  const v = shortsVideos[currentShortIndex];
  if (!v) return;

  // Her 3 shortta bir reklam göster
  if (currentShortIndex > 0 && currentShortIndex % 3 === 0) {
    showShortsAd(v.channel_id);
  }

  pageContent.innerHTML = `
    <div class="shorts-container" id="shortsContainer">
      <div class="shorts-player-wrap">

        <!-- Ses Kontrolü (sağ alt) -->
        <!-- Video Kutusu -->
        <div class="shorts-video-box" onclick="toggleShortPlay()">
          <video id="shortsVideo" src="${v.video_url}" autoplay loop playsinline
                 style="width:100%; height:100%; object-fit:cover; border-radius:12px;"></video>

          <!-- Play/Pause overlay -->
          <div id="shortPlayOverlay" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity:0; transition:opacity 0.3s;">
            <div style="background:rgba(0,0,0,0.6); border-radius:50%; width:72px; height:72px; display:flex; align-items:center; justify-content:center;">
              <i id="shortPlayIcon" class="fas fa-pause" style="font-size:32px; color:white;"></i>
            </div>
          </div>

          <!-- Kanal + Başlık -->
          <div class="shorts-info">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer;" onclick="event.stopPropagation(); viewChannel(${v.channel_id})">
              <img src="${getProfilePhotoUrl(v.profile_photo)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid white;" />
              <div>
                <p style="font-size:14px; font-weight:600;">${v.channel_name}</p>
                <p style="font-size:12px; color:rgba(255,255,255,0.7);">${v.subscriber_count} abone</p>
              </div>
            </div>
            <p style="font-size:14px; line-height:1.4; cursor:pointer; user-select:none;" onclick="toggleShortDesc()" id="shortTitleEl">
              ${v.title}
              ${v.description ? `<i class="fas fa-chevron-down" id="shortDescChevron" style="font-size:11px; margin-left:6px; opacity:0.7; transition:transform 0.2s;"></i>` : ''}
            </p>
            ${v.description ? `
              <div id="shortDescEl" style="display:none; margin-top:8px; font-size:13px; color:rgba(255,255,255,0.8); line-height:1.5; max-height:120px; overflow-y:auto;">
                ${v.description}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Sağ: Aksiyonlar + Navigasyon -->
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
          <button class="shorts-action-btn" id="shortPlayPauseBtn" onclick="toggleShortPlay()">
            <i class="fas fa-pause" id="shortPlayPauseIcon"></i>
            <span id="shortPlayPauseLabel">Durdur</span>
          </button>
          <button class="shorts-action-btn" id="shortLikeBtn" onclick="likeShort(${v.id}, 1)">
            <i class="fas fa-thumbs-up"></i>
            <span id="shortLikeCount">${v.likes || 0}</span>
          </button>
          <button class="shorts-action-btn" id="shortDislikeBtn" onclick="likeShort(${v.id}, -1)">
            <i class="fas fa-thumbs-down"></i>
            <span id="shortDislikeCount">${v.dislikes || 0}</span>
          </button>
          <button class="shorts-action-btn" onclick="toggleSaved(${v.id})">
            <i class="fas fa-bookmark"></i>
            <span>Kaydet</span>
          </button>
          <button class="shorts-action-btn" onclick="toggleShortsComments(${v.id}, ${v.channel_id})">
            <i class="fas fa-comment"></i>
            <span>Yorum</span>
          </button>

          <div style="height:16px;"></div>

          <!-- Navigasyon -->
          <button class="shorts-nav-btn" onclick="prevShort()" ${currentShortIndex === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-up"></i>
          </button>
          <button class="shorts-nav-btn" onclick="nextShort()" ${currentShortIndex >= shortsVideos.length - 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-down"></i>
          </button>
        </div>

      </div>
    </div>
  `;

  // Klavye
  document.onkeydown = (e) => {
    if (currentPage !== 'shorts' && currentPage !== 'reals') return;
    if (e.key === 'ArrowDown') nextShort();
    if (e.key === 'ArrowUp') prevShort();
    if (e.key === ' ') { e.preventDefault(); toggleShortPlay(); }
    if (e.key === 'm' || e.key === 'M') toggleShortMute();
  };

  // Touch swipe
  let touchStartY = 0;
  const container = document.getElementById('shortsContainer');
  if (container) {
    container.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
    container.addEventListener('touchend', e => {
      const diff = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 60) { if (diff > 0) nextShort(); else prevShort(); }
    }, { passive: true });
  }

  checkShortLikeStatus(v.id);
  saveWatchProgress(v.id, 0, 0);

}

function toggleShortPlay() {
  const video = document.getElementById('shortsVideo');
  const icon = document.getElementById('shortPlayPauseIcon');
  const label = document.getElementById('shortPlayPauseLabel');
  const overlay = document.getElementById('shortPlayOverlay');
  const overlayIcon = document.getElementById('shortPlayIcon');

  if (!video) return;

  if (video.paused) {
    video.play();
    if (icon) icon.className = 'fas fa-pause';
    if (label) label.textContent = 'Durdur';
    if (overlayIcon) overlayIcon.className = 'fas fa-pause';
  } else {
    video.pause();
    if (icon) icon.className = 'fas fa-play';
    if (label) label.textContent = 'Oynat';
    if (overlayIcon) overlayIcon.className = 'fas fa-play';
  }

  // Overlay flash efekti
  if (overlay) {
    overlay.style.opacity = '1';
    setTimeout(() => { overlay.style.opacity = '0'; }, 600);
  }
}

function toggleShortDesc() {
  const desc = document.getElementById('shortDescEl');
  const chevron = document.getElementById('shortDescChevron');
  if (!desc) return;
  const isOpen = desc.style.display !== 'none';
  desc.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function nextShort() {
  if (currentShortIndex < shortsVideos.length - 1) { currentShortIndex++; renderShortsPlayer(); }
}
function prevShort() {
  if (currentShortIndex > 0) { currentShortIndex--; renderShortsPlayer(); }
}

async function likeShort(videoId, likeType) {
  try {
    await fetch(`${API_URL}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, userId: currentUser.id, likeType }) });
    const res = await fetch(`${API_URL}/video/${videoId}`);
    const v = await res.json();
    document.getElementById('shortLikeCount').textContent = v.likes;
    document.getElementById('shortDislikeCount').textContent = v.dislikes;
    checkShortLikeStatus(videoId);
  } catch(e) {}
}

async function checkShortLikeStatus(videoId) {
  try {
    const res = await fetch(`${API_URL}/like-status/${videoId}/${currentUser.id}`);
    const data = await res.json();
    const lb = document.getElementById('shortLikeBtn');
    const db2 = document.getElementById('shortDislikeBtn');
    if (lb) lb.style.color = data.likeType === 1 ? 'var(--yt-spec-brand-background-solid)' : '';
    if (db2) db2.style.color = data.likeType === -1 ? '#3ea6ff' : '';
  } catch(e) {}
}

// Reals yorum paneli (Instagram stili)
function toggleShortsComments(videoId, channelId) {
  const existing = document.getElementById('shortsCommentPanel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'shortsCommentPanel';
  panel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:65vh;background:var(--yt-spec-raised-background);border-radius:20px 20px 0 0;z-index:4000;display:flex;flex-direction:column;box-shadow:0 -8px 32px rgba(0,0,0,0.5)';
  panel.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:15px;font-weight:600">Yorumlar</span>
      <button onclick="document.getElementById('shortsCommentPanel').remove()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:18px"><i class="fas fa-times"></i></button>
    </div>
    <div id="shortsCommentList" style="flex:1;overflow-y:auto;padding:12px 16px">
      <div class="yt-loading"><div class="yt-spinner"></div></div>
    </div>
    <div style="padding:10px 16px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;align-items:center">
      <img src="${getProfilePhotoUrl(currentUser?.profile_photo)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0" />
      <input id="shortsCommentInput" class="yt-input" placeholder="Yorum ekle..." style="flex:1;height:36px;padding:0 12px" onkeydown="if(event.key==='Enter')addShortsComment(${videoId},${channelId})" />
      <button onclick="addShortsComment(${videoId},${channelId})" style="background:none;border:none;color:var(--yt-spec-brand-background-solid);cursor:pointer;font-size:18px"><i class="fas fa-paper-plane"></i></button>
    </div>
  `;
  panel.addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(panel);
  loadShortsComments(videoId, channelId);
}

async function loadShortsComments(videoId, channelId) {
  const list = document.getElementById('shortsCommentList');
  if (!list) return;
  try {
    const r = await fetch(`${API_URL}/comments/${videoId}?userId=${currentUser.id}`);
    const comments = await r.json();
    if (!comments.length) { list.innerHTML = '<p style="color:var(--yt-spec-text-secondary);text-align:center;padding:20px">Henüz yorum yok</p>'; return; }
    
    // Video sahibi mi?
    const channelRes = await fetch(`${API_URL}/channel/${channelId}`);
    const channel = await channelRes.json();
    const isOwner = channel.user_id === currentUser.id;

    list.innerHTML = comments.map(c => {
      const isMyComment = c.user_id === currentUser.id;
      const canDelete = isMyComment || isOwner;
      const canPin = isOwner;
      return `
        <div style="display:flex;gap:10px;margin-bottom:14px;${c.is_pinned ? 'background:rgba(255,255,255,0.04);border-radius:8px;padding:8px;' : ''}">
          <img src="${getProfilePhotoUrl(c.profile_photo)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0" />
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
              <span style="font-size:13px;font-weight:600">${c.nickname}</span>
              ${c.is_pinned ? '<span style="font-size:10px;color:var(--yt-spec-brand-background-solid)"><i class="fas fa-thumbtack"></i> Sabitlendi</span>' : ''}
              ${c.liked_by_owner ? '<span style="font-size:10px;color:#ff0033"><i class="fas fa-heart"></i></span>' : ''}
            </div>
            <p id="commentText_${c.id}" style="font-size:13px;line-height:1.4">${c.comment_text}</p>
            <div style="display:flex;gap:12px;margin-top:6px;align-items:center">
              <button onclick="likeComment(${c.id},1,${videoId},${channelId})" style="background:none;border:none;color:${c.user_like===1?'#ff0033':'var(--yt-spec-text-secondary)'};cursor:pointer;font-size:12px"><i class="fas fa-heart"></i> ${c.likes||0}</button>
              ${isMyComment ? `<button onclick="editShortsComment(${c.id})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:12px"><i class="fas fa-edit"></i></button>` : ''}
              ${canDelete ? `<button onclick="deleteShortsComment(${c.id},${videoId},${channelId})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:12px"><i class="fas fa-trash"></i></button>` : ''}
              ${canPin ? `<button onclick="pinShortsComment(${c.id},${videoId},${channelId},${c.is_pinned?0:1})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:12px"><i class="fas fa-thumbtack"></i></button>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  } catch(e) { list.innerHTML = '<p style="color:var(--yt-spec-text-secondary)">Yüklenemedi</p>'; }
}

async function addShortsComment(videoId, channelId) {
  const input = document.getElementById('shortsCommentInput');
  const text = input?.value.trim();
  if (!text) return;
  await fetch(`${API_URL}/comment`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId, userId: currentUser.id, commentText: text }) });
  input.value = '';
  loadShortsComments(videoId, channelId);
}

async function deleteShortsComment(commentId, videoId, channelId) {
  await fetch(`${API_URL}/comment/${commentId}`, { method:'DELETE' });
  loadShortsComments(videoId, channelId);
}

async function pinShortsComment(commentId, videoId, channelId, pin) {
  await fetch(`${API_URL}/comment/${commentId}/pin`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, videoId, pin }) });
  loadShortsComments(videoId, channelId);
}

function editShortsComment(commentId) {
  const el = document.getElementById(`commentText_${commentId}`);
  if (!el) return;
  const current = el.textContent;
  el.innerHTML = `<div style="display:flex;gap:6px"><input id="editCommentInput_${commentId}" class="yt-input" value="${current.replace(/"/g,'&quot;')}" style="flex:1;height:30px;padding:0 8px;font-size:13px" /><button onclick="saveCommentEdit(${commentId})" style="background:none;border:none;color:var(--yt-spec-brand-background-solid);cursor:pointer"><i class="fas fa-check"></i></button><button onclick="cancelCommentEdit(${commentId},'${current.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer"><i class="fas fa-times"></i></button></div>`;
}

async function saveCommentEdit(commentId) {
  const input = document.getElementById(`editCommentInput_${commentId}`);
  const newText = input?.value.trim();
  if (!newText) return;
  await fetch(`${API_URL}/comment/${commentId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ commentText: newText, userId: currentUser.id }) });
  const el = document.getElementById(`commentText_${commentId}`);
  if (el) el.textContent = newText;
}

function cancelCommentEdit(commentId, original) {
  const el = document.getElementById(`commentText_${commentId}`);
  if (el) el.textContent = original;
}

async function likeComment(commentId, likeType, videoId, channelId) {
  await fetch(`${API_URL}/comment-like`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ commentId, userId: currentUser.id, likeType }) });
  loadShortsComments(videoId, channelId);
}

// Anasayfa
async function loadHomePage() {
  if (window.innerWidth <= 768) {
    return loadMobileHomePage();
  }

  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `
    <!-- Kategori Filtreleri -->
    <div class="category-bar" id="categoryBar">
      <button class="category-chip active" onclick="filterCategory(this, '')">Tümü</button>
      <button class="category-chip" onclick="filterCategory(this, 'shorts')">
        <i class="fas fa-film" style="margin-right:4px; font-size:11px;"></i>Reals
      </button>
      <button class="category-chip" onclick="filterCategory(this, 'Yakın Zamanda')">Yakın Zamanda</button>
      <button class="category-chip" onclick="filterCategory(this, 'Popüler')">Popüler</button>
      <button class="category-chip" onclick="filterCategory(this, 'Abonelikler')">Abonelikler</button>
      <button class="category-chip" onclick="filterCategory(this, 'Önerilen')">Önerilen</button>
      <button class="category-chip" onclick="filterCategory(this, 'Vlog')">Vlog</button>
      <button class="category-chip" onclick="filterCategory(this, 'Gameplay')">Gameplay</button>
      <button class="category-chip" onclick="filterCategory(this, 'Müzik klibi')">Müzik</button>
      <button class="category-chip" onclick="filterCategory(this, 'Ders anlatımı')">Eğitim</button>
      <button class="category-chip" onclick="filterCategory(this, 'Komedi')">Komedi</button>
      <button class="category-chip" onclick="filterCategory(this, 'Spor highlights')">Spor</button>
      <button class="category-chip" onclick="filterCategory(this, 'Seyahat vlog')">Seyahat</button>
    </div>
    <div id="homeContent" style="margin-top: 24px;"></div>
    <div id="homeLoading" style="display:none; text-align:center; padding:40px;">
      <div class="yt-spinner" style="margin:auto;"></div>
    </div>
  `;
  loadHomeVideos('');
}

// ==================== MOBİL ANASAYFA (Instagram stili) ====================
async function loadMobileHomePage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `<div class="yt-loading"><div class="yt-spinner"></div></div>`;

  try {
    const [allVideos, reals] = await Promise.all([
      fetch(`${API_URL}/videos?limit=60`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/shorts`).then(r => r.json()).catch(() => [])
    ]);

    const photoItems = allVideos.filter(v => v.video_type === 'Fotoğraf');
    const normalVideos = allVideos.filter(v => v.video_type !== 'Fotoğraf' && !v.is_short);
    const realsItems = reals.slice(0, 20);

    pageContent.innerHTML = `
      <div class="mobile-feed">
        <!-- Reals Stories Bar -->
        ${realsItems.length > 0 ? `
          <div class="mobile-stories-bar">
            ${realsItems.map(v => `
              <div class="mobile-story" onclick="openShortFromHome(${v.id})">
                <div class="mobile-story-ring">
                  <img src="${getProfilePhotoUrl(v.profile_photo)}" />
                </div>
                <p>${v.channel_name?.split(' ')[0] || 'Tea'}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Normal Videolar -->
        ${normalVideos.length > 0 ? `
          <div style="padding:0 12px;margin-bottom:8px">
            <h3 style="font-size:14px;font-weight:600;color:var(--yt-spec-text-secondary);margin-bottom:8px">Videolar</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${normalVideos.slice(0,10).map(v => `
                <div onclick="playVideo(${v.id})" style="display:flex;gap:10px;cursor:pointer;padding:6px;border-radius:10px;background:var(--yt-spec-raised-background)">
                  <img src="${v.banner_url}" style="width:100px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0" />
                  <div style="flex:1;min-width:0">
                    <p style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.title}</p>
                    <p style="font-size:11px;color:var(--yt-spec-text-secondary);margin-top:2px">${v.channel_name}</p>
                    <p style="font-size:11px;color:var(--yt-spec-text-secondary)">${v.views} görüntülenme</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Fotoğraf Grid -->
        ${photoItems.length > 0 ? `
          <div style="padding:0 12px;margin-bottom:8px">
            <h3 style="font-size:14px;font-weight:600;color:var(--yt-spec-text-secondary);margin-bottom:8px">Fotoğraflar</h3>
          </div>
          <div class="mobile-photo-grid">
            ${photoItems.map(v => `
              <div class="mobile-photo-item" onclick="playVideo(${v.id})">
                <img src="${v.video_url}" alt="${v.title}" loading="lazy" />
                ${v.likes > 0 ? `<div class="mobile-photo-likes"><i class="fas fa-heart"></i> ${v.likes}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${photoItems.length === 0 && normalVideos.length === 0 && realsItems.length === 0 ? '<p style="text-align:center;color:var(--yt-spec-text-secondary);padding:40px 0">Henüz içerik yok</p>' : ''}
      </div>
    `;
  } catch(e) {
    pageContent.innerHTML = '<p style="text-align:center;padding:40px;color:var(--yt-spec-text-secondary);">Yüklenemedi</p>';
  }
}

async function filterCategory(btn, category) {
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  loadHomeVideos(category);
}

async function loadHomeVideos(category) {
  const container = document.getElementById('homeContent');
  const loading = document.getElementById('homeLoading');
  if (container) container.innerHTML = '';
  if (loading) loading.style.display = 'block';

  try {
    // Sadece Shorts kategorisi
    if (category === 'shorts') {
      const shorts = await fetch(`${API_URL}/shorts`).then(r => r.json()).catch(() => []);
      if (loading) loading.style.display = 'none';
      if (!shorts.length) {
        container.innerHTML = '<p style="color:var(--yt-spec-text-secondary);">Henüz shorts yok</p>';
        return;
      }
      container.innerHTML = `
        <h2 class="section-header" style="margin-bottom:16px;">
          <i class="fas fa-film" style="color:var(--yt-spec-brand-background-solid); margin-right:8px;"></i>Reals
        </h2>
        <div class="shorts-grid" id="shortsGrid"></div>
      `;
      renderShortsGrid(shorts, 'shortsGrid');
      return;
    }

    // Tümü: normal videolar üstte, shorts altta
    if (!category || category === '') {
      const [recent, popular, subs, rec, shorts] = await Promise.all([
        fetch(`${API_URL}/videos/recent?limit=8`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/videos/popular?limit=8`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/videos/subscriptions/${currentUser.id}?limit=8`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/videos/recommended/${currentUser.id}?limit=8`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/shorts`).then(r => r.json()).catch(() => [])
      ]);

      // Normal videolar (is_short = 0)
      const allNormal = [...subs, ...rec, ...recent, ...popular].filter(v => !v.is_short);
      const seen = new Set();
      const normalVideos = allNormal.filter(v => { if (seen.has(v.id)) return false; seen.add(v.id); return true; });

      if (loading) loading.style.display = 'none';

      container.innerHTML = `
        <div id="normalVideosGrid" class="video-grid"></div>
        ${shorts.length > 0 ? `
          <div style="margin-top:40px;">
            <h2 class="section-header" style="margin-bottom:16px;">
              <i class="fas fa-film" style="color:var(--yt-spec-brand-background-solid); margin-right:8px;"></i>Reals
            </h2>
            <div class="shorts-grid" id="shortsGrid"></div>
          </div>
        ` : ''}
      `;

      displayVideos(normalVideos, 'normalVideosGrid');
      if (shorts.length > 0) renderShortsGrid(shorts, 'shortsGrid');
      return;
    }

    // Diğer kategoriler - sadece normal videolar
    let videos = [];
    if (category === 'Yakın Zamanda') {
      videos = await fetch(`${API_URL}/videos/recent?limit=24`).then(r => r.json()).catch(() => []);
    } else if (category === 'Popüler') {
      videos = await fetch(`${API_URL}/videos/popular?limit=24`).then(r => r.json()).catch(() => []);
    } else if (category === 'Abonelikler') {
      videos = await fetch(`${API_URL}/videos/subscriptions/${currentUser.id}?limit=24`).then(r => r.json()).catch(() => []);
    } else if (category === 'Önerilen') {
      videos = await fetch(`${API_URL}/videos/recommended/${currentUser.id}?limit=24`).then(r => r.json()).catch(() => []);
    } else {
      videos = await fetch(`${API_URL}/search?q=${encodeURIComponent(category)}&userId=${currentUser.id}&limit=24`).then(r => r.json()).catch(() => []);
    }

    if (loading) loading.style.display = 'none';
    container.innerHTML = '<div id="homeVideos" class="video-grid"></div>';
    displayVideos(videos.filter(v => !v.is_short), 'homeVideos');

  } catch (e) {
    if (loading) loading.style.display = 'none';
    if (container) container.innerHTML = '<p style="color:var(--yt-spec-text-secondary);">Yüklenirken hata oluştu</p>';
  }
}

// Shorts grid - dikey kartlar
function renderShortsGrid(shorts, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = shorts.map(v => `
    <div class="short-card" onclick="openShortFromHome(${v.id})">
      <div class="short-card-thumb">
        <img src="${v.banner_url}" alt="${v.title}" />
        <div class="short-badge"><i class="fas fa-film"></i> Reals</div>
        <div class="short-duration-overlay">
          <i class="fas fa-play" style="font-size:24px; color:white; opacity:0.9;"></i>
        </div>
      </div>
      <div class="short-card-info">
        <p class="short-card-title">${v.title}</p>
        <p class="short-card-meta">${v.views} görüntülenme</p>
      </div>
    </div>
  `).join('');
}

function openShortFromHome(videoId) {
  // Shorts sayfasına geç ve o videoyu aç
  const idx = shortsVideos.findIndex(v => v.id === videoId);
  if (idx !== -1) {
    currentShortIndex = idx;
    showPage('shorts');
  } else {
    // Shorts listesini yükle ve o videoyu bul
    fetch(`${API_URL}/shorts`).then(r => r.json()).then(shorts => {
      shortsVideos = shorts;
      currentShortIndex = shorts.findIndex(v => v.id === videoId) || 0;
      showPage('shorts');
    });
  }
}

function displayVideos(videos, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!videos || videos.length === 0) {
    container.innerHTML = '<p style="color: var(--yt-spec-text-secondary);">Henüz içerik yok</p>';
    return;
  }

  // Fotoğraf, Shorts ve normal videoları ayır
  const photos = videos.filter(v => v.video_type === 'Fotoğraf');
  const normalVideos = videos.filter(v => !v.is_short && v.video_type !== 'Fotoğraf');
  const shortsVideos2 = videos.filter(v => v.is_short && v.video_type !== 'Fotoğraf');

  let html = '';

  // Fotoğraflar — kare grid (ayrı bölüm)
  if (photos.length > 0) {
    html += `<div style="grid-column:1/-1;">
      <h3 style="font-size:15px; font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <i class="fas fa-image" style="color:var(--yt-spec-brand-background-solid);"></i> Fotoğraflar
      </h3>
      <div class="photo-grid">
        ${photos.map(p => `
          <div class="photo-card" onclick="playVideo(${p.id})">
            <div class="photo-card-img">
              <img src="${p.video_url}" alt="${p.title}" />
              <div class="photo-card-overlay">
                <i class="fas fa-image"></i>
              </div>
            </div>
            <div class="photo-card-info">
              <img src="${getProfilePhotoUrl(p.profile_photo)}" class="channel-avatar" style="width:22px;height:22px;" />
              <span style="font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.channel_name}</span>
              <span style="font-size:11px; color:var(--yt-spec-text-secondary); margin-left:auto; flex-shrink:0;"><i class="fas fa-heart"></i> ${p.likes}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  // Normal videolar — 16:9 grid
  if (normalVideos.length > 0) {
    if (photos.length > 0) {
      html += `<div style="grid-column:1/-1; margin-top:8px;">
        <h3 style="font-size:15px; font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <i class="fas fa-video" style="color:var(--yt-spec-brand-background-solid);"></i> Videolar
        </h3>
      </div>`;
    }
    html += normalVideos.map(video => `
      <div class="video-card" onclick="playVideo(${video.id})">
        <div class="video-thumbnail-container">
          <img src="${video.banner_url}" alt="${video.title}" class="video-thumbnail" />
          <div class="video-type-badge"><i class="fas fa-video"></i></div>
        </div>
        <div class="video-info">
          <img src="${getProfilePhotoUrl(video.profile_photo)}" alt="${video.nickname}" class="channel-avatar" />
          <div class="video-details">
            <div class="video-title">${video.title}</div>
            <div class="video-channel">${video.channel_name}</div>
            <div class="video-metadata">
              <span>${video.views} görüntülenme</span>
              <span>•</span>
              <span>${video.likes} beğeni</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  container.innerHTML = html || '<p style="color: var(--yt-spec-text-secondary);">Henüz içerik yok</p>';

  // Shorts varsa ayrı bir satırda ekle
  if (shortsVideos2.length > 0) {
    const shortsSection = document.createElement('div');
    shortsSection.style.cssText = 'grid-column: 1 / -1; margin-top: 8px;';
    shortsSection.innerHTML = `<div class="shorts-grid" id="inlineShorts_${containerId}"></div>`;
    container.appendChild(shortsSection);
    renderShortsGrid(shortsVideos2, `inlineShorts_${containerId}`);
  }
}

// Profil fotoğrafı URL'sini düzelt
function getProfilePhotoUrl(photo) {
  if (!photo || photo === '?') {
    return 'logoteatube.png';
  }
  return photo;
}

// Rozet HTML'i oluştur
function renderBadge(badge, size = 14) {
  if (!badge) return '';
  return `<i class="fas ${badge.icon}" style="color:${badge.color};font-size:${size}px;margin-left:4px" title="${badge.name}"></i>`;
}

// Kullanıcı adını rozet rengiyle render et
function renderUsername(nickname, badge) {
  const color = badge?.name_color || '#ffffff';
  const badgeHtml = badge ? renderBadge(badge) : '';
  return `<span style="color:${color}">${nickname}</span>${badgeHtml}`;
}

// Video oynatma
async function showPhotoPage(video) {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `
    <div class="photo-page">
      <!-- Sol: Fotoğraf -->
      <div class="photo-page-left">
        <img src="${video.video_url}" alt="${video.title}" />
      </div>

      <!-- Sağ: Detaylar -->
      <div class="photo-page-right">
        <!-- Kanal -->
        <div style="display:flex; align-items:center; gap:12px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:16px;">
          <img src="${getProfilePhotoUrl(video.profile_photo)}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; cursor:pointer; flex-shrink:0;" onclick="viewChannel(${video.channel_id})" />
          <div style="flex:1; cursor:pointer;" onclick="viewChannel(${video.channel_id})">
            <p style="font-size:15px; font-weight:600;">${video.channel_name}</p>
            <p style="font-size:12px; color:var(--yt-spec-text-secondary);">${video.subscriber_count} abone</p>
          </div>
          <button class="yt-btn" id="subscribeBtn" onclick="toggleSubscribe(${video.channel_id})" style="height:34px; padding:0 16px; font-size:13px;">Takip Et</button>
        </div>

        <!-- Başlık + Tarih -->
        <p style="font-size:16px; font-weight:600; margin-bottom:4px;">${video.title}</p>
        <p style="font-size:12px; color:var(--yt-spec-text-secondary); margin-bottom:16px;">${video.created_at ? video.created_at.substring(0,10) : ''}</p>

        <!-- Aksiyonlar -->
        <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
          <button class="photo-action-btn" id="likeBtn" onclick="likeVideo(${video.id}, 1)">
            <i class="fas fa-heart"></i> <span id="likeCount">${video.likes}</span>
          </button>
          <button class="photo-action-btn" id="dislikeBtn" onclick="likeVideo(${video.id}, -1)">
            <i class="fas fa-thumbs-down"></i> <span id="dislikeCount">${video.dislikes}</span>
          </button>
          <button class="photo-action-btn" onclick="toggleFavorite(${video.id})">
            <i class="fas fa-star"></i>
          </button>
          <button class="photo-action-btn" onclick="toggleSaved(${video.id})">
            <i class="fas fa-bookmark"></i>
          </button>
          <span class="photo-action-btn" style="cursor:default;">
            <i class="fas fa-eye"></i> ${video.views}
          </span>
        </div>

        <!-- Açıklama -->
        ${video.description ? `
          <div style="background:var(--yt-spec-raised-background); border-radius:10px; padding:12px; margin-bottom:16px; font-size:13px; color:var(--yt-spec-text-secondary); line-height:1.6;">
            ${video.description}
          </div>
        ` : ''}

        <!-- Yorumlar -->
        ${video.comments_enabled ? `
          <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:16px;">
            <h3 style="font-size:15px; font-weight:600; margin-bottom:14px;">Yorumlar</h3>
            <div style="display:flex; gap:10px; margin-bottom:16px;">
              <img src="${getProfilePhotoUrl(currentUser.profile_photo)}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; flex-shrink:0;" />
              <div style="flex:1; display:flex; gap:8px;">
                <input type="text" id="commentInput" class="yt-input" placeholder="Yorum ekle..." style="margin-bottom:0; height:36px;" />
                <button class="yt-btn" onclick="addComment(${video.id})" style="height:36px; padding:0 14px; font-size:13px;">Gönder</button>
              </div>
            </div>
            <div id="commentsList"></div>
          </div>
        ` : '<p style="color:var(--yt-spec-text-secondary); font-size:13px;">Yorumlar kapalı</p>'}
      </div>
    </div>
  `;

  checkLikeStatus(video.id);
  checkSubscriptionStatus(video.channel_id);
  if (video.comments_enabled) loadComments(video.id, video.user_id);
  saveWatchProgress(video.id, 0, 0);
  document.querySelectorAll('.guide-item').forEach(i => i.classList.remove('active'));

  // Reklam göster (5 saniye sonra, kanalın kendi reklamı değilse)
  setTimeout(() => showVideoAd(video.channel_id), 5000);
}

async function playVideo(videoId) {
  try {
    const response = await fetch(`${API_URL}/video/${videoId}?userId=${currentUser.id}`);
    const video = await response.json();

    // Fotoğraf ise ayrı layout
    if (video.video_type === 'Fotoğraf') {
      showPhotoPage(video);
      return;
    }

    // Kaldığı yer hesapla
    const resumeAt = video.resume_at || 0;
    const totalSaved = video.total_duration_saved || 0;
    // Videonun %95'inden fazlası izlendiyse baştan başlat
    const shouldResume = resumeAt > 5 && totalSaved > 0 && (resumeAt / totalSaved) < 0.95;
    const resumePct = totalSaved > 0 ? Math.round((resumeAt / totalSaved) * 100) : 0;
    const resumeLabel = resumeAt > 0 ? `${Math.floor(resumeAt/60)}:${(resumeAt%60).toString().padStart(2,'0')}` : '';

    // Tam sayfa video player
    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <div class="watch-page">
        <div class="watch-primary">
          <!-- Video Player -->
          <div class="watch-player-container" style="position:relative;">
            <video id="mainVideoPlayer" controls style="width:100%; border-radius:12px; background:#000; display:block;">
              <source src="${video.video_url}" type="video/mp4">
            </video>
            <!-- Kaldığın yerden devam et banner -->
            ${shouldResume ? `
              <div id="resumeBanner" style="position:absolute; bottom:52px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); border-radius:10px; padding:10px 18px; display:flex; align-items:center; gap:12px; z-index:10; white-space:nowrap; backdrop-filter:blur(4px);">
                <div style="flex:1;">
                  <p style="font-size:13px; color:#fff; margin-bottom:4px;">Kaldığın yerden devam et</p>
                  <div style="height:3px; background:rgba(255,255,255,0.2); border-radius:2px; width:160px;">
                    <div style="height:100%; width:${resumePct}%; background:var(--yt-spec-brand-background-solid); border-radius:2px;"></div>
                  </div>
                </div>
                <button onclick="resumeVideo(${resumeAt})" style="background:var(--yt-spec-brand-background-solid); border:none; border-radius:6px; color:#fff; padding:6px 14px; cursor:pointer; font-size:13px; font-weight:600;">${resumeLabel}'dan devam</button>
                <button onclick="document.getElementById('resumeBanner').remove()" style="background:none; border:none; color:rgba(255,255,255,0.6); cursor:pointer; font-size:18px; padding:0 4px;">×</button>
              </div>
            ` : ''}
          </div>

          <!-- Başlık -->
          <h1 class="watch-title">${video.title}</h1>

          <!-- Meta + Aksiyonlar -->
          <div class="watch-meta-row">
            <div class="watch-meta-info">
              <span><i class="fas fa-eye"></i> ${video.views} görüntülenme</span>
              <span style="margin-left:16px; color: var(--yt-spec-text-secondary);">${video.created_at ? video.created_at.substring(0,10) : ''}</span>
            </div>
            <div class="watch-actions">
              <button class="watch-action-btn" id="likeBtn" onclick="likeVideo(${video.id}, 1)">
                <i class="fas fa-thumbs-up"></i>
                <span id="likeCount">${video.likes}</span>
              </button>
              <button class="watch-action-btn" id="dislikeBtn" onclick="likeVideo(${video.id}, -1)">
                <i class="fas fa-thumbs-down"></i>
                <span id="dislikeCount">${video.dislikes}</span>
              </button>
              <button class="watch-action-btn" onclick="toggleFavorite(${video.id})">
                <i class="fas fa-star"></i> Favori
              </button>
              <button class="watch-action-btn" onclick="toggleSaved(${video.id})">
                <i class="fas fa-bookmark"></i> Kaydet
              </button>
            </div>
          </div>

          <!-- Kanal Bilgisi -->
          <div class="watch-channel-row">
            <img src="${getProfilePhotoUrl(video.profile_photo)}" class="watch-channel-avatar" onclick="viewChannel(${video.channel_id})" />
            <div class="watch-channel-info" onclick="viewChannel(${video.channel_id})">
              <div class="watch-channel-name">${video.channel_name}</div>
              <div class="watch-channel-subs">${video.subscriber_count} abone</div>
            </div>
            <button class="yt-btn" id="subscribeBtn" onclick="toggleSubscribe(${video.channel_id})">Takip Et</button>
          </div>

          <!-- Açıklama -->
          ${video.description ? `
            <div class="watch-description">
              <p>${video.description}</p>
            </div>
          ` : ''}

          <!-- Yorumlar -->
          ${video.comments_enabled ? `
            <div class="watch-comments">
              <h3 style="font-size:18px; font-weight:500; margin-bottom:20px;">Yorumlar</h3>
              <div style="display:flex; gap:12px; margin-bottom:24px;">
                <img src="${getProfilePhotoUrl(currentUser.profile_photo)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; flex-shrink:0;" />
                <div style="flex:1; display:flex; gap:8px;">
                  <input type="text" id="commentInput" class="yt-input" placeholder="Yorum ekle..." style="margin-bottom:0;" />
                  <button class="yt-btn" onclick="addComment(${video.id})">Gönder</button>
                </div>
              </div>
              <div id="commentsList"></div>
            </div>
          ` : '<p style="color: var(--yt-spec-text-secondary); padding: 20px 0;">Yorumlar kapalı</p>'}
        </div>
      </div>
    `;

    // CSS ekle
    if (!document.getElementById('watchPageStyle')) {
      const style = document.createElement('style');
      style.id = 'watchPageStyle';
      style.textContent = `
        .watch-page { display: flex; gap: 24px; max-width: 1280px; }
        .watch-primary { flex: 1; min-width: 0; }
        .watch-player-container { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
        .watch-title { font-size: 20px; font-weight: 600; line-height: 1.4; margin-bottom: 12px; }
        .watch-meta-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .watch-meta-info { font-size: 14px; color: var(--yt-spec-text-secondary); }
        .watch-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .watch-action-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--yt-spec-raised-background); border: none; border-radius: 20px; color: var(--yt-spec-text-primary); cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.15s; }
        .watch-action-btn:hover { background: rgba(255,255,255,0.15); }
        .watch-action-btn.active { background: var(--yt-spec-text-primary); color: var(--yt-spec-base-background); }
        .watch-channel-row { display: flex; align-items: center; gap: 12px; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 16px; }
        .watch-channel-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; cursor: pointer; flex-shrink: 0; }
        .watch-channel-info { flex: 1; cursor: pointer; }
        .watch-channel-name { font-size: 16px; font-weight: 500; }
        .watch-channel-subs { font-size: 13px; color: var(--yt-spec-text-secondary); margin-top: 2px; }
        .watch-description { background: var(--yt-spec-raised-background); border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 14px; line-height: 1.6; color: var(--yt-spec-text-secondary); }
        .watch-comments { margin-top: 8px; }
      `;
      document.head.appendChild(style);
    }

    // Beğeni ve abonelik durumu
    checkLikeStatus(video.id);
    checkSubscriptionStatus(video.channel_id);
    if (video.comments_enabled) loadComments(video.id, video.user_id);
    saveWatchProgress(video.id, 0, 0);
    
    const videoEl = document.getElementById('mainVideoPlayer');
    if (videoEl) {
      // Kaydedilmiş ses seviyesini uygula
      const savedVolume = parseFloat(localStorage.getItem('tea_volume') ?? '1');
      const savedMuted = localStorage.getItem('tea_muted') === 'true';
      videoEl.volume = savedVolume;
      videoEl.muted = savedMuted;

      // Video metadata yüklenince kaldığı yerden başlat
      videoEl.addEventListener('loadedmetadata', () => {
        if (shouldResume && resumeAt > 0) {
          videoEl.currentTime = resumeAt;
        }
        videoEl.play().catch(() => {});
      }, { once: true });

      // Ses değişince kaydet
      videoEl.addEventListener('volumechange', () => {
        localStorage.setItem('tea_volume', videoEl.volume);
        localStorage.setItem('tea_muted', videoEl.muted);
      });

      // Progress kaydet (her 10 saniyede bir)
      let lastSaved = -1;
      videoEl.addEventListener('timeupdate', () => {
        const t = Math.floor(videoEl.currentTime);
        const dur = Math.floor(videoEl.duration || 0);
        if (t > 0 && t !== lastSaved && t % 10 === 0) {
          lastSaved = t;
          saveWatchProgress(video.id, t, dur);
        }
        // Banner'ı 5 saniye sonra otomatik gizle
        if (t > 5) document.getElementById('resumeBanner')?.remove();
      });

      videoEl.addEventListener('ended', () => {
        const dur = Math.floor(videoEl.duration || 0);
        saveWatchProgress(video.id, dur, dur);
      });

      // Sayfa kapatılırken kaydet
      window.addEventListener('beforeunload', () => {
        const t = Math.floor(videoEl.currentTime);
        const dur = Math.floor(videoEl.duration || 0);
        if (t > 0) saveWatchProgress(video.id, t, dur);
      }, { once: true });
    }

    document.querySelectorAll('.guide-item').forEach(i => i.classList.remove('active'));

  } catch (error) {
    console.error('Video oynatma hatası:', error);
    showToast('Video yüklenemedi', 'error');
  }
}

function resumeVideo(seconds) {
  const videoEl = document.getElementById('mainVideoPlayer');
  if (videoEl) {
    videoEl.currentTime = seconds;
    videoEl.play().catch(() => {});
  }
  document.getElementById('resumeBanner')?.remove();
}

async function checkLikeStatus(videoId) {
  try {
    const response = await fetch(`${API_URL}/like-status/${videoId}/${currentUser.id}`);
    const data = await response.json();
    
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    if (data.likeType === 1) {
      likeBtn.classList.add('active');
    } else if (data.likeType === -1) {
      dislikeBtn.classList.add('active');
    }
  } catch (error) {
    console.error('Beğeni durumu kontrol hatası:', error);
  }
}

async function checkSubscriptionStatus(channelId) {
  try {
    const [subRes, privRes] = await Promise.all([
      fetch(`${API_URL}/is-subscribed/${currentUser.id}/${channelId}`),
      fetch(`${API_URL}/channel-privacy/${channelId}`)
    ]);
    const subData = await subRes.json();
    const privData = await privRes.json().catch(() => ({ is_private: 0 }));
    const isPrivate = privData.is_private === 1;

    const subscribeBtn = document.getElementById('subscribeBtn');
    // Abone sayısı metinlerini güncelle
    document.querySelectorAll('.watch-channel-subs').forEach(el => {
      const text = el.textContent;
      if (isPrivate) {
        el.textContent = text.replace('abone', 'takipçi');
      }
    });

    if (!subscribeBtn) return;

    if (subData.subscribed) {
      subscribeBtn.textContent = isPrivate ? 'Takip Ediliyor' : 'Takipten Çık';
      subscribeBtn.classList.add('btn-secondary');
    } else if (isPrivate) {
      // Bekleyen istek var mı?
      const channel = await fetch(`${API_URL}/channel/${channelId}`).then(r => r.json()).catch(() => null);
      if (channel) {
        const reqs = await fetch(`${API_URL}/follow-requests/${channel.user_id}`).then(r => r.json()).catch(() => []);
        const pending = reqs.find(r => r.sender_id === currentUser.id);
        if (pending) {
          subscribeBtn.textContent = 'İstek Gönderildi';
          subscribeBtn.disabled = true;
        } else {
          subscribeBtn.textContent = 'Takip Et';
        }
      }
    }
  } catch (error) {
    console.error('Abonelik durumu kontrol hatası:', error);
  }
}

async function likeVideo(videoId, likeType) {
  try {
    await fetch(`${API_URL}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, userId: currentUser.id, likeType })
    });

    // Sayıları güncelle
    const videoResponse = await fetch(`${API_URL}/video/${videoId}`);
    const video = await videoResponse.json();
    
    document.getElementById('likeCount').textContent = video.likes;
    document.getElementById('dislikeCount').textContent = video.dislikes;

    // Buton durumlarını güncelle
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    likeBtn.classList.remove('active');
    dislikeBtn.classList.remove('active');
    
    checkLikeStatus(videoId);
  } catch (error) {
    console.error('Beğeni hatası:', error);
  }
}

async function toggleSubscribe(channelId) {
  try {
    const checkResponse = await fetch(`${API_URL}/is-subscribed/${currentUser.id}/${channelId}`);
    const checkData = await checkResponse.json();

    if (checkData.subscribed) {
      // Abonelikten çık
      await fetch(`${API_URL}/subscribe`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, channelId })
      });
      checkSubscriptionStatus(channelId);
    } else {
      // Gizli hesap kontrolü
      const privRes = await fetch(`${API_URL}/channel-privacy/${channelId}`);
      const privData = await privRes.json();

      if (privData.is_private) {
        // Takip isteği gönder
        const reqRes = await fetch(`${API_URL}/follow-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: currentUser.id, receiverId: await getChannelOwnerId(channelId) })
        });
        const reqData = await reqRes.json();
        if (reqRes.ok) {
          showToast('Takip isteği gönderildi', 'success');
          const btn = document.getElementById('subscribeBtn');
          if (btn) { btn.textContent = 'İstek Gönderildi'; btn.disabled = true; }
        } else {
          showToast(reqData.error || 'İstek gönderilemedi', 'error');
        }
      } else {
        await fetch(`${API_URL}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, channelId })
        });
        checkSubscriptionStatus(channelId);
      }
    }
  } catch (error) {
    console.error('Abonelik hatası:', error);
  }
}

async function getChannelOwnerId(channelId) {
  const res = await fetch(`${API_URL}/channel/${channelId}`);
  const data = await res.json();
  return data.user_id;
}

async function toggleFavorite(videoId) {
  try {
    await fetch(`${API_URL}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, videoId })
    });
    alert('Favorilere eklendi');
  } catch (error) {
    console.error('Favori ekleme hatası:', error);
  }
}

async function toggleSaved(videoId) {
  try {
    await fetch(`${API_URL}/saved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, videoId })
    });
    alert('Kaydedildi');
  } catch (error) {
    console.error('Kaydetme hatası:', error);
  }
}

async function loadComments(videoId, videoOwnerId = null) {
  try {
    const response = await fetch(`${API_URL}/comments/${videoId}?userId=${currentUser.id}`);
    const comments = await response.json();

    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;
    
    if (comments.length === 0) {
      commentsList.innerHTML = '<p style="color: var(--yt-spec-text-secondary); padding: 16px 0;">Henüz yorum yok. İlk yorumu sen yap!</p>';
      return;
    }

    // Sabitlenen yorumu en üste al
    const pinnedComments = comments.filter(c => c.is_pinned === 1);
    const regularComments = comments.filter(c => c.is_pinned !== 1);
    const sortedComments = [...pinnedComments, ...regularComments];

    commentsList.innerHTML = sortedComments.map(c => renderComment(c, videoId, false, videoOwnerId)).join('');
  } catch (error) {
    console.error('Yorumlar yükleme hatası:', error);
  }
}

function renderComment(c, videoId, isReply = false, videoOwnerId = null) {
  const likeActive = c.user_like === 1 ? 'color:#4caf50;' : '';
  const dislikeActive = c.user_like === -1 ? 'color:#f44336;' : '';
  const isOwner = videoOwnerId && currentUser && currentUser.id === videoOwnerId;
  const isPinned = c.is_pinned === 1;
  const isHidden = c.is_hidden === 1;
  const likedByOwner = c.liked_by_owner === 1;
  
  // Askıya alınmış yorumları sadece video sahibi görebilir
  if (isHidden && !isOwner) return '';
  
  return `
    <div style="display:flex; gap:12px; margin-bottom:${isReply ? '12px' : '20px'}; ${isReply ? 'margin-left:48px;' : ''} ${isPinned ? 'background:rgba(255,0,51,0.05); padding:12px; border-radius:8px; border-left:3px solid var(--yt-spec-brand-background-solid);' : ''} ${isHidden ? 'opacity:0.5;' : ''}">
      <img src="${getProfilePhotoUrl(c.profile_photo)}" style="width:${isReply ? '28px' : '36px'}; height:${isReply ? '28px' : '36px'}; border-radius:50%; object-fit:cover; flex-shrink:0;" />
      <div style="flex:1;">
        ${isPinned ? '<div style="font-size:11px; color:var(--yt-spec-brand-background-solid); margin-bottom:4px; font-weight:600;"><i class="fas fa-thumbtack"></i> SABİTLENDİ</div>' : ''}
        ${isHidden ? '<div style="font-size:11px; color:#ff9800; margin-bottom:4px; font-weight:600;"><i class="fas fa-eye-slash"></i> ASKIDA</div>' : ''}
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
          <span style="font-size:13px; font-weight:500;">${c.nickname}</span>
          ${likedByOwner ? '<span style="font-size:11px; background:rgba(255,0,51,0.15); color:var(--yt-spec-brand-background-solid); padding:2px 6px; border-radius:10px; font-weight:600;"><i class="fas fa-heart"></i> Beğenildi</span>' : ''}
          <span style="font-size:12px; color:var(--yt-spec-text-secondary);">${c.created_at || ''}</span>
        </div>
        <p style="font-size:14px; line-height:1.5; margin-bottom:8px;">${c.comment_text}</p>
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <button onclick="likeComment(${c.id}, 1, ${videoId})" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--yt-spec-text-secondary); display:flex; align-items:center; gap:4px; ${likeActive}">
            <i class="fas fa-thumbs-up"></i> ${c.likes || 0}
          </button>
          <button onclick="likeComment(${c.id}, -1, ${videoId})" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--yt-spec-text-secondary); display:flex; align-items:center; gap:4px; ${dislikeActive}">
            <i class="fas fa-thumbs-down"></i> ${c.dislikes || 0}
          </button>
          ${!isReply ? `<button onclick="toggleReplyBox(${c.id}, ${videoId})" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--yt-spec-text-secondary);">
            <i class="fas fa-reply"></i> Yanıtla
          </button>` : ''}
          ${!isReply && c.reply_count > 0 ? `<button onclick="loadReplies(${c.id}, ${videoId}, ${videoOwnerId})" id="repliesBtn_${c.id}" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--yt-spec-call-to-action);">
            <i class="fas fa-chevron-down"></i> ${c.reply_count} yanıt
          </button>` : ''}
          ${isOwner && !isReply ? `
            <button onclick="showCommentMenu(${c.id}, ${videoId}, ${isPinned}, ${isHidden}, ${likedByOwner})" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--yt-spec-text-secondary);">
              <i class="fas fa-ellipsis-v"></i>
            </button>
          ` : ''}
          ${currentUser && c.user_id !== currentUser.id ? `
            <button onclick="blockUserFromComment(${c.user_id}, '${c.nickname}')" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--yt-spec-text-secondary);">
              <i class="fas fa-ban"></i>
            </button>
          ` : ''}
        </div>
        <div id="replyBox_${c.id}" style="display:none; margin-top:8px;">
          <div style="display:flex; gap:8px;">
            <input type="text" id="replyInput_${c.id}" class="yt-input" placeholder="Yanıt yaz..." style="margin-bottom:0;" />
            <button class="yt-btn" onclick="addReply(${c.id}, ${videoId})">Gönder</button>
            <button class="yt-btn yt-btn-secondary" onclick="document.getElementById('replyBox_${c.id}').style.display='none'">İptal</button>
          </div>
        </div>
        <div id="replies_${c.id}"></div>
      </div>
    </div>
  `;
}

function toggleReplyBox(commentId, videoId) {
  const box = document.getElementById(`replyBox_${commentId}`);
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
  if (box.style.display === 'block') {
    document.getElementById(`replyInput_${commentId}`)?.focus();
  }
}

async function loadReplies(commentId, videoId, videoOwnerId = null) {
  const btn = document.getElementById(`repliesBtn_${commentId}`);
  const container = document.getElementById(`replies_${commentId}`);
  
  if (container.innerHTML) {
    container.innerHTML = '';
    if (btn) btn.innerHTML = `<i class="fas fa-chevron-down"></i> Yanıtları göster`;
    return;
  }

  try {
    const res = await fetch(`${API_URL}/comment-replies/${commentId}?userId=${currentUser.id}`);
    const replies = await res.json();
    container.innerHTML = replies.map(r => renderComment(r, videoId, true, videoOwnerId)).join('');
    if (btn) btn.innerHTML = `<i class="fas fa-chevron-up"></i> Yanıtları gizle`;
  } catch(e) {}
}

async function likeComment(commentId, likeType, videoId) {
  try {
    await fetch(`${API_URL}/comment-like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, userId: currentUser.id, likeType })
    });
    loadComments(videoId);
  } catch(e) {}
}

async function addReply(parentId, videoId) {
  const input = document.getElementById(`replyInput_${parentId}`);
  const text = input?.value.trim();
  if (!text) return;

  try {
    await fetch(`${API_URL}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, userId: currentUser.id, commentText: text, parentId })
    });
    input.value = '';
    document.getElementById(`replyBox_${parentId}`).style.display = 'none';
    loadComments(videoId);
  } catch(e) {}
}

async function addComment(videoId) {
  const commentInput = document.getElementById('commentInput');
  const commentText = commentInput?.value.trim();

  if (!commentText) return;

  try {
    await fetch(`${API_URL}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, userId: currentUser.id, commentText })
    });
    commentInput.value = '';
    loadComments(videoId);
  } catch (error) {
    console.error('Yorum ekleme hatası:', error);
  }
}

async function saveWatchProgress(videoId, watchDuration, totalDuration) {
  try {
    await fetch(`${API_URL}/watch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, videoId, watchDuration, totalDuration })
    });
  } catch (error) {
    console.error('İzleme geçmişi kaydetme hatası:', error);
  }
}

// Arama
async function search() {
  const query = document.getElementById('searchInput').value.trim();
  
  if (!query) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&userId=${currentUser.id}`);
    const videos = await response.json();

    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <h2 class="section-header">Arama Sonuçları: "${query}"</h2>
      <div id="searchResults" class="video-grid"></div>
    `;

    displayVideos(videos, 'searchResults');
  } catch (error) {
    console.error('Arama hatası:', error);
  }
}

// Enter tuşu ile arama
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        search();
      }
    });
  }
});

// Profil sayfası
async function loadProfilePage() {
  if (!currentChannel) {
    loadMyChannelPage();
    return;
  }

  const pageContent = document.getElementById('pageContent');
  const bannerStyle = currentChannel.channel_banner
    ? `background-image: url('${currentChannel.channel_banner}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);`;

  pageContent.innerHTML = `
    <div class="profile-page">
      <!-- Banner -->
      <div style="${bannerStyle} height: 200px; border-radius: 16px; margin-bottom: 0; position: relative; overflow: hidden;">
        <div style="position:absolute; inset:0; background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 100%);"></div>
      </div>
      
      <!-- Kanal Bilgileri -->
      <div style="display: flex; align-items: flex-end; gap: 20px; margin-top: -40px; margin-bottom: 24px; padding: 0 16px; position: relative; z-index: 1;">
        <img src="${getProfilePhotoUrl(currentUser.profile_photo)}" 
             style="width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 4px solid var(--yt-spec-base-background); flex-shrink: 0;" />
        <div style="flex: 1; padding-bottom: 8px;">
          <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 4px;">${currentChannel.channel_name}</h2>
          <p style="color: var(--yt-spec-text-secondary); font-size: 14px;">@${currentUser.username}</p>
        </div>
        <div style="display: flex; gap: 10px; padding-bottom: 8px; flex-wrap:wrap;">
          <button class="yt-btn yt-btn-secondary" onclick="showEditChannelModal()">
            <i class="fas fa-edit" style="margin-right: 8px;"></i>Kanalı Düzenle
          </button>
          <button class="yt-btn" onclick="showUploadVideoModal()">
            <i class="fas fa-upload" style="margin-right: 8px;"></i>Yükle
          </button>
          <button class="yt-btn yt-btn-secondary" onclick="showAddPartnerModal()">
            <i class="fas fa-handshake" style="margin-right: 8px;"></i>Partner Ekle
          </button>
        </div>
      </div>

      <!-- Tab Menüsü -->
      <div style="display:flex; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:24px;">
        <button class="profile-tab active" onclick="switchProfileTab(this,'videos')" data-tab="videos"
          style="padding:12px 20px; background:none; border:none; border-bottom:2px solid var(--yt-spec-brand-background-solid); color:var(--yt-spec-text-primary); font-size:14px; font-weight:500; cursor:pointer;">
          <i class="fas fa-video" style="margin-right:6px;"></i>Videolar
        </button>
        <button class="profile-tab" onclick="switchProfileTab(this,'about')" data-tab="about"
          style="padding:12px 20px; background:none; border:none; border-bottom:2px solid transparent; color:var(--yt-spec-text-secondary); font-size:14px; cursor:pointer;">
          <i class="fas fa-info-circle" style="margin-right:6px;"></i>Hakkında
        </button>
        <button class="profile-tab" onclick="switchProfileTab(this,'partners')" data-tab="partners"
          style="padding:12px 20px; background:none; border:none; border-bottom:2px solid transparent; color:var(--yt-spec-text-secondary); font-size:14px; cursor:pointer;">
          <i class="fas fa-handshake" style="margin-right:6px;"></i>Partnerler
          <span id="partnerBadge" style="display:none; background:var(--yt-spec-brand-background-solid); color:white; font-size:11px; padding:1px 6px; border-radius:10px; margin-left:4px;"></span>
        </button>
      </div>

      <!-- Tab: Videolar -->
      <div id="profileTabVideos">
        <div id="channelVideos" class="video-grid"></div>
      </div>

      <!-- Tab: Hakkında -->
      <div id="profileTabAbout" style="display:none;">
        <div class="settings-card">
          <h3 class="settings-card-title">Hakkında</h3>
          <p style="color: var(--yt-spec-text-secondary); line-height: 1.6;">${currentChannel.about || 'Henüz açıklama eklenmemiş.'}</p>
        </div>
      </div>

      <!-- Tab: Partnerler -->
      <div id="profileTabPartners" style="display:none;">
        <div id="partnerRequestsBox"></div>
        <div id="acceptedPartnersBox"></div>
      </div>
    </div>
  `;

  // Kanal videolarını yükle
  try {
    const res = await fetch(`${API_URL}/videos/channel/${currentChannel.id}`);
    const videos = await res.json();
    displayVideos(videos, 'channelVideos');
  } catch(e) {}

  // Partner verilerini yükle
  loadPartnerRequests();
  loadAcceptedPartners();
}

function switchProfileTab(btn, tab) {
  document.querySelectorAll('.profile-tab').forEach(b => {
    b.style.borderBottomColor = 'transparent';
    b.style.color = 'var(--yt-spec-text-secondary)';
    b.classList.remove('active');
  });
  btn.style.borderBottomColor = 'var(--yt-spec-brand-background-solid)';
  btn.style.color = 'var(--yt-spec-text-primary)';
  btn.classList.add('active');
  ['Videos', 'About', 'Partners'].forEach(t => {
    const el = document.getElementById(`profileTab${t}`);
    if (el) el.style.display = t.toLowerCase() === tab ? 'block' : 'none';
  });
}

async function loadAcceptedPartners() {
  const box = document.getElementById('acceptedPartnersBox');
  if (!box || !currentChannel) return;
  try {
    const res = await fetch(`${API_URL}/supporter-channels/${currentChannel.id}`);
    const partners = await res.json();
    if (!partners || partners.length === 0) {
      box.innerHTML = '<p style="color:var(--yt-spec-text-secondary); font-size:13px; padding:8px 0;">Henüz kabul edilmiş partner yok.</p>';
      return;
    }
    box.innerHTML = `
      <div class="settings-card" style="margin-top:16px;">
        <h3 class="settings-card-title"><i class="fas fa-check-circle" style="color:#4caf50; margin-right:8px;"></i>Mevcut Partnerler</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-top:12px;">
          ${partners.map(p => `
            <div style="background:var(--yt-spec-raised-background); border-radius:10px; padding:14px; text-align:center; cursor:pointer;" onclick="viewChannel(${p.supporter_channel_id})">
              <img src="${getProfilePhotoUrl(p.profile_photo)}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin-bottom:8px;" />
              <p style="font-size:13px;font-weight:600;">${p.channel_name}</p>
              <p style="font-size:11px;color:var(--yt-spec-text-secondary);">@${p.username}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch(e) {}
}

// Kanalım sayfası - kanal yoksa onboarding göster
async function loadMyChannelPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `<div class="yt-loading"><div class="yt-spinner"></div></div>`;

  // Kanal yoksa onboarding göster
  if (!currentChannel) {
    showCreateChannelOnboarding();
    showPage('home');
    return;
  }

  loadProfilePage();
}

function showCreateChannelModal() {
  const modalContent = `
    <div style="max-height: 300px; overflow-y: auto; background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: var(--yt-spec-text-secondary); line-height: 1.6;">
      <p style="font-weight:600; color: var(--yt-spec-text-primary); margin-bottom: 8px;">Tea Kanal Açma Sözleşmesi</p>
      <p>Kanal açarken verdiğiniz bilgiler KVKK kapsamında işlenir. Yüklediğiniz içeriklerden siz sorumlusunuz. Telif hakkı ihlali, müstehcen veya yasa dışı içerik yükleyemezsiniz.</p>
    </div>
    
    <div class="yt-form-group">
      <label class="yt-form-label">Kanal Adı</label>
      <input type="text" id="channelName" class="yt-input" placeholder="Kanal adınız" />
    </div>
    
    <div class="yt-form-group">
      <label class="yt-form-label">Hakkında</label>
      <textarea id="channelAbout" class="yt-textarea" placeholder="Kanalınız hakkında..."></textarea>
    </div>
    
    <label class="yt-checkbox-label" style="margin-bottom: 20px;">
      <input type="checkbox" id="channelAgreed" class="yt-checkbox" />
      <span>Sözleşmeyi okudum ve kabul ediyorum</span>
    </label>
    
    <div style="display: flex; gap: 12px;">
      <button class="yt-btn" id="createChannelBtn" onclick="createChannel()" disabled >Kanal Oluştur</button>
      <button class="yt-btn yt-btn-secondary" onclick="closeModal()" >İptal</button>
    </div>
  `;

  showModal(modalContent, 'Kanal Oluştur');

  document.getElementById('channelAgreed').addEventListener('change', (e) => {
    document.getElementById('createChannelBtn').disabled = !e.target.checked;
  });
}

async function createChannel() {
  const channelName = document.getElementById('channelName').value.trim();
  const about = document.getElementById('channelAbout').value.trim();
  const agreed = document.getElementById('channelAgreed').checked;

  if (!channelName) {
    alert('Kanal adı gerekli');
    return;
  }

  if (!agreed) {
    alert('Sözleşmeyi kabul etmelisiniz');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('userId', currentUser.id);
    formData.append('channelName', channelName);
    formData.append('about', about);
    formData.append('agreed', 'true');

    const response = await fetch(`${API_URL}/channel`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      alert('Kanal oluşturuldu!');
      closeModal();
      
      // Kanalı yeniden yükle
      const channelResponse = await fetch(`${API_URL}/channel/user/${currentUser.id}`);
      currentChannel = await channelResponse.json();
      
      loadProfilePage();
    } else {
      alert(data.error || 'Kanal oluşturulamadı');
    }
  } catch (error) {
    console.error('Kanal oluşturma hatası:', error);
    alert('Kanal oluşturma sırasında hata oluştu');
  }
}

// Video yükleme modal
function toggleShortsFields(isShorts) {
  const normalFields = document.getElementById('normalVideoFields');
  const normalOptions = document.getElementById('normalVideoOptions');
  const hint = document.getElementById('videoFileHint');
  if (normalFields) normalFields.style.display = isShorts ? 'none' : 'block';
  if (normalOptions) normalOptions.style.display = isShorts ? 'none' : 'block';
  if (hint) hint.textContent = isShorts ? 'Shorts max 3 dakika olmalıdır' : '';
}

function checkShortsDuration(input) {
  const isShorts = document.querySelector('input[name="videoFormat"]:checked')?.value === 'shorts';
  if (!isShorts || !input.files[0]) return;
  
  const file = input.files[0];
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.onloadedmetadata = () => {
    URL.revokeObjectURL(video.src);
    const hint = document.getElementById('videoFileHint');
    if (video.duration > 180) {
      if (hint) hint.textContent = `⚠️ Video ${Math.round(video.duration)}sn - Shorts max 3 dakika (180sn) olmalı!`;
      hint.style.color = '#f44336';
      input.value = '';
    } else {
      if (hint) { hint.textContent = `✓ ${Math.round(video.duration)}sn - Uygun`; hint.style.color = '#4caf50'; }
    }
  };
  video.src = URL.createObjectURL(file);
}

function showUploadVideoModal() {
  const isMobile = window.innerWidth <= 768;
  const VIDEO_TYPES = [
    'Vlog', 'Günlük hayat', 'Challenge', 'Şaka', 'Gameplay', "Let's Play",
    'Oyun inceleme', 'Oyun rehberi', 'Ders anlatımı', 'Belgesel', 'Bilim videosu',
    'Kodlama dersleri', 'Müzik klibi', 'Cover', 'Enstrüman performansı',
    'Çizim videosu', 'Yemek tarifi', 'Fitness', 'Ürün inceleme', 'Unboxing',
    'Telefon inceleme', 'Haber videoları', 'Spor highlights', 'Motivasyon videosu',
    'Seyahat vlog', 'Hayvan videoları', 'Film inceleme', 'Dizi inceleme',
    'Tepki videosu', 'Podcast videoları', 'Reals / kısa videolar'
  ];

  const modalContent = `
    <!-- Format Seçimi -->
    <div class="yt-form-group">
      <label class="yt-form-label">Ne yüklemek istiyorsun?</label>
      <div style="display:grid; grid-template-columns:${isMobile ? '1fr 1fr' : '1fr 1fr 1fr'}; gap:10px; margin-bottom:4px;">
        <label class="upload-type-btn active" id="typeBtn_reals" onclick="switchUploadType('reals')">
          <input type="radio" name="uploadType" value="reals" checked style="display:none;" />
          <i class="fas fa-film" style="font-size:20px; margin-bottom:6px;"></i>
          <span>Reals</span>
          <small>Kısa video (max 3dk)</small>
        </label>
        ${!isMobile ? `<label class="upload-type-btn" id="typeBtn_video" onclick="switchUploadType('video')">
          <input type="radio" name="uploadType" value="video" style="display:none;" />
          <i class="fas fa-video" style="font-size:20px; margin-bottom:6px;"></i>
          <span>Uzun Video</span>
          <small>Normal video</small>
        </label>` : ''}
        <label class="upload-type-btn" id="typeBtn_photo" onclick="switchUploadType('photo')">
          <input type="radio" name="uploadType" value="photo" style="display:none;" />
          <i class="fas fa-image" style="font-size:20px; margin-bottom:6px;"></i>
          <span>Foto</span>
          <small>Fotoğraf paylaş</small>
        </label>
      </div>
      ${isMobile ? '<p style="font-size:11px;color:var(--yt-spec-text-secondary);margin-top:4px"><i class="fas fa-info-circle"></i> Mobil cihazdan uzun video yüklenemez</p>' : ''}
    </div>

    <div class="yt-form-group">
      <label class="yt-form-label">Başlık</label>
      <input type="text" id="videoTitle" class="yt-input" placeholder="Başlık" />
    </div>
    <div class="yt-form-group">
      <label class="yt-form-label">Açıklama</label>
      <textarea id="videoDescription" class="yt-textarea" placeholder="Açıklama (opsiyonel)"></textarea>
    </div>

    <!-- Video alanları (Reals + Uzun Video) -->
    <div id="videoFields">
      <div class="yt-form-group">
        <label class="yt-form-label">Kategori</label>
        <select id="videoType" class="yt-select">
          ${VIDEO_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="yt-form-group">
        <label class="yt-form-label">Etiketler (virgülle ayırın)</label>
        <input type="text" id="videoTags" class="yt-input" placeholder="etiket1, etiket2" />
      </div>
      <div class="yt-form-group">
        <label class="yt-form-label">Video Dosyası</label>
        <input type="file" id="videoFile" class="yt-input" accept="video/*" onchange="checkShortsDuration(this)" />
        <p id="videoFileHint" style="font-size:12px; color:var(--yt-spec-text-secondary); margin-top:4px;"></p>
      </div>
      <div class="yt-form-group">
        <label class="yt-form-label">Thumbnail</label>
        <input type="file" id="videoBanner" class="yt-input" accept="image/*" />
      </div>
      <div class="yt-form-group">
        <label class="yt-checkbox-label">
          <input type="checkbox" id="commentsEnabled" class="yt-checkbox" checked />
          <span>Yorumları aç</span>
        </label>
      </div>
      <div class="yt-form-group">
        <label class="yt-checkbox-label">
          <input type="checkbox" id="likesVisible" class="yt-checkbox" checked />
          <span>Beğeni sayısını göster</span>
        </label>
      </div>
      <!-- Reklam seçeneği -->
    </div>

    <!-- Foto alanları -->
    <div id="photoFields" style="display:none;">
      <div class="yt-form-group">
        <label class="yt-form-label">Fotoğraf</label>
        <input type="file" id="photoFile" class="yt-input" accept="image/*" multiple />
      </div>
    </div>

    <div style="display:flex; gap:12px; margin-top:8px;">
      <button class="yt-btn" onclick="handleUpload()"><i class="fas fa-upload" style="margin-right:6px;"></i>Yükle</button>
      <button class="yt-btn yt-btn-secondary" onclick="closeModal()">İptal</button>
    </div>
    <div id="uploadProgress" style="display:none; margin-top:16px;"></div>
  `;

  showModal(modalContent, 'Yükle');
}

function switchUploadType(type) {
  ['reals','video','photo'].forEach(t => {
    const btn = document.getElementById(`typeBtn_${t}`);
    if (btn) btn.classList.toggle('active', t === type);
  });
  document.getElementById('videoFields').style.display = type !== 'photo' ? 'block' : 'none';
  document.getElementById('photoFields').style.display = type === 'photo' ? 'block' : 'none';
  // Reals için süre kontrolü
  const hint = document.getElementById('videoFileHint');
  if (hint) hint.textContent = type === 'reals' ? 'Maksimum 3 dakika' : '';
}

function handleUpload() {
  const type = document.querySelector('input[name="uploadType"]:checked')?.value || 'reals';
  if (type === 'photo') {
    uploadPhoto();
  } else {
    uploadVideo(type === 'reals');
  }
}

// Video yükleme
async function uploadVideo(isReals = false) {
  const title = document.getElementById('videoTitle').value.trim();
  const description = document.getElementById('videoDescription').value.trim();
  const videoType = document.getElementById('videoType')?.value || 'Reals';
  const tags = document.getElementById('videoTags')?.value?.trim() || '';
  const videoFile = document.getElementById('videoFile').files[0];
  const bannerFile = document.getElementById('videoBanner').files[0];
  const commentsEnabled = document.getElementById('commentsEnabled')?.checked ? 1 : 0;
  const likesVisible = document.getElementById('likesVisible')?.checked ? 1 : 0;
  const isShort = isReals ? 1 : 0;

  if (!title || !videoFile || !bannerFile) {
    showToast('Başlık, video ve banner gerekli', 'error');
    return;
  }

  const progressOverlay = document.getElementById('uploadProgressOverlay');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressPercentage = document.getElementById('uploadProgressPercentage');
  const progressTitle = document.getElementById('uploadProgressTitle');
  const progressStatus = document.getElementById('uploadProgressStatus');

  progressOverlay.classList.add('show');
  progressTitle.textContent = `"${title}" yükleniyor...`;
  progressStatus.textContent = 'Hazırlanıyor...';
  progressBar.style.width = '0%';
  progressPercentage.textContent = '0%';
  closeModal(); // Modal'ı hemen kapat, progress overlay devam eder

  const formData = new FormData();
  formData.append('channelId', currentChannel.id);
  formData.append('title', title);
  formData.append('description', description);
  formData.append('videoType', videoType);
  formData.append('tags', tags);
  formData.append('video', videoFile);
  formData.append('banner', bannerFile);
  formData.append('commentsEnabled', commentsEnabled);
  formData.append('likesVisible', likesVisible);
  formData.append('isShort', isShort);

  try {
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/video`);

      // Upload progress (server'a gönderme)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 60); // 0-60%
          progressBar.style.width = pct + '%';
          progressPercentage.textContent = pct + '%';
          const mb = (e.loaded / 1024 / 1024).toFixed(1);
          const total = (e.total / 1024 / 1024).toFixed(1);
          progressStatus.textContent = `Yükleniyor... ${mb}MB / ${total}MB`;
        }
      };

      xhr.upload.onload = () => {
        progressBar.style.width = '65%';
        progressPercentage.textContent = '65%';
        progressStatus.textContent = 'Yükleniyor...';
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          progressBar.style.width = '100%';
          progressPercentage.textContent = '100%';
          progressStatus.textContent = 'Tamamlandı!';
          resolve(data);
        } else {
          try {
            reject(new Error(JSON.parse(xhr.responseText).error || 'Yükleme başarısız'));
          } catch(e) {
            reject(new Error('Sunucu hatası: ' + xhr.status));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Ağ bağlantısı hatası'));
      xhr.ontimeout = () => reject(new Error('Zaman aşımı'));
      xhr.timeout = 900000; // 15 dakika
      xhr.send(formData);
    });

    // Başarılı - overlay'i kapat
    setTimeout(() => {
      progressOverlay.classList.remove('show');
      showToast('Video başarıyla yüklendi!', 'success');
      loadMyVideosPage();
    }, 1000);

  } catch (error) {
    progressOverlay.classList.remove('show');
    console.error('Video yükleme hatası:', error);
    showToast('Yükleme hatası: ' + error.message, 'error');
  }
}

// Fotoğraf yükleme
async function uploadPhoto() {
  const title = document.getElementById('videoTitle').value.trim() || 'Fotoğraf';
  const description = document.getElementById('videoDescription').value.trim();
  const photoFiles = document.getElementById('photoFile').files;

  if (!photoFiles || photoFiles.length === 0) {
    showToast('En az bir fotoğraf seçin', 'error');
    return;
  }

  const progressOverlay = document.getElementById('uploadProgressOverlay');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressPercentage = document.getElementById('uploadProgressPercentage');
  const progressTitle = document.getElementById('uploadProgressTitle');
  const progressStatus = document.getElementById('uploadProgressStatus');

  progressOverlay.classList.add('show');
  progressTitle.textContent = 'Fotoğraf yükleniyor...';
  progressStatus.textContent = 'Hazırlanıyor...';
  progressBar.style.width = '0%';
  progressPercentage.textContent = '0%';
  closeModal();

  try {
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const pct = Math.round(((i) / photoFiles.length) * 100);
      progressBar.style.width = pct + '%';
      progressPercentage.textContent = pct + '%';
      progressStatus.textContent = `${i + 1}/${photoFiles.length} yükleniyor...`;

      const formData = new FormData();
      formData.append('channelId', currentChannel.id);
      formData.append('title', title + (photoFiles.length > 1 ? ` (${i+1})` : ''));
      formData.append('description', description);
      formData.append('videoType', 'Fotoğraf');
      formData.append('tags', 'foto');
      formData.append('photo', file);
      formData.append('commentsEnabled', 1);
      formData.append('likesVisible', 1);
      formData.append('isPhoto', 1);

      await fetch(`${API_URL}/photo`, { method: 'POST', body: formData });
    }

    progressBar.style.width = '100%';
    progressPercentage.textContent = '100%';
    progressStatus.textContent = 'Tamamlandı!';

    setTimeout(() => {
      progressOverlay.classList.remove('show');
      showToast('Fotoğraf yüklendi!', 'success');
      closeModal();
      loadMyVideosPage();
    }, 800);
  } catch(e) {
    progressOverlay.classList.remove('show');
    showToast('Yükleme hatası: ' + e.message, 'error');
  }
}


// Videolarım sayfası
async function loadMyVideosPage() {
  if (!currentChannel) {
    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        <div style="width:80px; height:80px; background:rgba(255,0,51,0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
          <i class="fas fa-play" style="font-size:32px; color:#ff0033;"></i>
        </div>
        <h2 style="font-size:22px; font-weight:700; margin-bottom:10px;">Henüz kanalın yok</h2>
        <p style="color:var(--yt-spec-text-secondary); margin-bottom:24px;">İçerik paylaşmaya başlamak için bir kanal oluştur</p>
        <button class="yt-btn" style="height:48px; padding:0 32px; font-size:15px;" onclick="showCreateChannelOnboarding()">
          <i class="fas fa-plus" style="margin-right:8px;"></i>Kanal Oluştur
        </button>
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${API_URL}/videos/channel/${currentChannel.id}`);
    const videos = await response.json();

    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 class="section-header" style="margin: 0;">İçeriklerim</h2>
        <button class="yt-btn" onclick="showUploadVideoModal()"><i class="fas fa-upload"></i> Yükle</button>
      </div>
      <div id="myVideos"></div>
    `;

    renderMyVideos(videos);
  } catch (error) {
    console.error('Videolar yükleme hatası:', error);
  }
}

function renderMyVideos(videos) {
  const container = document.getElementById('myVideos');
  if (!container) return;
  if (!videos || videos.length === 0) {
    container.innerHTML = '<p style="color:var(--yt-spec-text-secondary); padding:20px 0;">Henüz içerik yok. Yükle butonuna bas!</p>';
    return;
  }
  container.innerHTML = videos.map(v => `
    <div style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--yt-spec-raised-background); border-radius:10px; margin-bottom:10px; ${v.is_hidden ? 'opacity:0.5;' : ''}">
      <img src="${v.banner_url}" style="width:100px; height:60px; object-fit:cover; border-radius:6px; flex-shrink:0; cursor:pointer;" onclick="playVideo(${v.id})" />
      <div style="flex:1; min-width:0;">
        <p style="font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</p>
        <div style="display:flex; gap:12px; margin-top:4px; flex-wrap:wrap;">
          <span style="font-size:12px; color:var(--yt-spec-text-secondary);"><i class="fas fa-eye"></i> ${v.views}</span>
          <span style="font-size:12px; color:var(--yt-spec-text-secondary);"><i class="fas fa-thumbs-up"></i> ${v.likes}</span>
          ${v.is_hidden ? '<span style="font-size:11px; background:rgba(255,165,0,0.2); color:orange; padding:2px 6px; border-radius:4px;">Gizli</span>' : ''}
          ${!v.comments_enabled ? '<span style="font-size:11px; background:rgba(255,0,0,0.15); color:#ff6b6b; padding:2px 6px; border-radius:4px;">Yorumlar kapalı</span>' : ''}
        </div>
      </div>
      <button onclick="showVideoManageMenu(${v.id}, '${v.title.replace(/'/g,"\\'")}', ${v.comments_enabled}, ${v.likes_visible}, ${v.is_hidden || 0})"
        style="background:none; border:none; color:var(--yt-spec-text-secondary); cursor:pointer; padding:8px; border-radius:6px; flex-shrink:0;"
        title="Yönet">
        <i class="fas fa-ellipsis-v" style="font-size:16px;"></i>
      </button>
    </div>
  `).join('');
}

function showVideoManageMenu(videoId, title, commentsEnabled, likesVisible, isHidden) {
  showModal(`
    <p style="font-size:13px; color:var(--yt-spec-text-secondary); margin-bottom:20px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</p>

    <div class="yt-form-group">
      <label class="yt-form-label">Başlık</label>
      <input type="text" id="editVTitle" class="yt-input" value="${title}" />
    </div>
    <div class="yt-form-group">
      <label class="yt-form-label">Açıklama</label>
      <textarea id="editVDesc" class="yt-textarea" placeholder="Açıklama..."></textarea>
    </div>

    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
      <label class="yt-checkbox-label">
        <input type="checkbox" id="editVComments" class="yt-checkbox" ${commentsEnabled ? 'checked' : ''} />
        <span>Yorumları aç</span>
      </label>
      <label class="yt-checkbox-label">
        <input type="checkbox" id="editVLikes" class="yt-checkbox" ${likesVisible ? 'checked' : ''} />
        <span>Beğeni sayısını göster</span>
      </label>
      <label class="yt-checkbox-label">
        <input type="checkbox" id="editVHidden" class="yt-checkbox" ${isHidden ? 'checked' : ''} />
        <span>Gizle (anasayfada görünmez)</span>
      </label>
    </div>

    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button class="yt-btn" onclick="saveVideoEdit(${videoId})" style="flex:1;">Kaydet</button>
      <button class="yt-btn yt-btn-secondary" onclick="confirmDeleteVideo(${videoId})" style="background:rgba(220,53,69,0.15); border-color:rgba(220,53,69,0.3); color:#ff6b6b;">
        <i class="fas fa-trash"></i> Sil
      </button>
      <button class="yt-btn yt-btn-secondary" onclick="closeModal()" style="flex:1;">İptal</button>
    </div>
  `, 'İçeriği Yönet');
}

async function saveVideoEdit(videoId) {
  const title = document.getElementById('editVTitle')?.value?.trim();
  const description = document.getElementById('editVDesc')?.value?.trim();
  const commentsEnabled = document.getElementById('editVComments')?.checked ? 1 : 0;
  const likesVisible = document.getElementById('editVLikes')?.checked ? 1 : 0;
  const isHidden = document.getElementById('editVHidden')?.checked ? 1 : 0;

  try {
    const res = await fetch(`${API_URL}/video/${videoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, commentsEnabled, likesVisible, isHidden, channelId: currentChannel.id })
    });
    if (res.ok) {
      showToast('Kaydedildi!', 'success');
      closeModal();
      loadMyVideosPage();
    } else {
      const d = await res.json();
      showToast(d.error || 'Hata', 'error');
    }
  } catch(e) { showToast('Hata', 'error'); }
}

function confirmDeleteVideo(videoId) {
  if (!confirm('Bu içeriği silmek istediğine emin misin? Bu işlem geri alınamaz.')) return;
  deleteVideo(videoId);
}

async function deleteVideo(videoId) {
  try {
    const res = await fetch(`${API_URL}/video/${videoId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: currentChannel.id })
    });
    if (res.ok) {
      showToast('İçerik silindi', 'success');
      closeModal();
      loadMyVideosPage();
    } else {
      showToast('Silinemedi', 'error');
    }
  } catch(e) { showToast('Hata', 'error'); }
}

// İzlenenler sayfası - her video bir kez
async function loadWatchedPage() {
  try {
    const response = await fetch(`${API_URL}/watched-unique/${currentUser.id}`);
    const history = await response.json();

    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <h2 class="section-header">İzlenenler</h2>
      <div id="watchedVideos" class="video-grid"></div>
    `;

    if (history.length === 0) {
      document.getElementById('watchedVideos').innerHTML = '<p style="color: var(--yt-spec-text-secondary);">Henüz izlenen video yok</p>';
      return;
    }

    const videos = history.map(h => ({
      id: h.video_id,
      title: h.title,
      banner_url: h.banner_url,
      video_url: h.video_url,
      channel_name: h.channel_name,
      nickname: h.nickname,
      profile_photo: h.profile_photo,
      views: h.views || 0,
      likes: h.likes || 0
    }));

    displayVideos(videos, 'watchedVideos');
  } catch (error) {
    console.error('İzlenenler yükleme hatası:', error);
  }
}

// Geçmiş sayfası
async function loadHistoryPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `
    <h2 class="section-header">Geçmiş</h2>
    <div style="display: flex; gap: 8px; margin-bottom: 20px;">
      <button class="category-chip active" id="tabWatch" onclick="switchHistoryTab('watch', this)">
        <i class="fas fa-clock" style="margin-right:6px;"></i>İzleme Geçmişi
      </button>
      <button class="category-chip" id="tabSearch" onclick="switchHistoryTab('search', this)">
        <i class="fas fa-search" style="margin-right:6px;"></i>Arama Geçmişi
      </button>
    </div>
    <div id="historyContent"></div>
  `;

  showHistoryTab('watch');
}

function switchHistoryTab(tab, btn) {
  document.querySelectorAll('#tabWatch, #tabSearch').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  showHistoryTab(tab);
}

async function showHistoryTab(tab) {
  const historyContent = document.getElementById('historyContent');

  if (tab === 'watch') {
    try {
      const response = await fetch(`${API_URL}/watch-history/${currentUser.id}`);
      const history = await response.json();

      if (history.length === 0) {
        historyContent.innerHTML = '<p style="color: var(--yt-spec-text-secondary);">İzleme geçmişi boş</p>';
        return;
      }

      historyContent.innerHTML = history.map(h => `
        <div style="display: flex; gap: 12px; padding: 12px; background: var(--yt-spec-raised-background); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: background 0.15s;"
             onmouseover="this.style.background='rgba(255,255,255,0.08)'" 
             onmouseout="this.style.background='var(--yt-spec-raised-background)'"
             onclick="playVideo(${h.video_id})">
          <img src="${h.banner_url}" style="width: 160px; height: 90px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" />
          <div style="flex: 1; min-width: 0;">
            <p style="font-weight: 500; font-size: 14px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${h.title}</p>
            <p style="color: var(--yt-spec-text-secondary); font-size: 13px; margin-bottom: 4px;">${h.channel_name}</p>
            <p style="color: var(--yt-spec-text-secondary); font-size: 12px;">
              ${h.watched_at || ''} &nbsp;|&nbsp;
              ${Math.floor(h.watch_duration / 60)}:${(h.watch_duration % 60).toString().padStart(2, '0')} / 
              ${Math.floor(h.total_duration / 60)}:${(h.total_duration % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('İzleme geçmişi yükleme hatası:', error);
    }
  } else if (tab === 'search') {
    try {
      const response = await fetch(`${API_URL}/search-history/${currentUser.id}`);
      const history = await response.json();

      if (history.length === 0) {
        historyContent.innerHTML = '<p style="color: var(--yt-spec-text-secondary);">Arama geçmişi boş</p>';
        return;
      }

      historyContent.innerHTML = history.map(h => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--yt-spec-raised-background); border-radius: 8px; margin-bottom: 8px;">
          <div>
            <p style="font-weight: 500; font-size: 14px;">${h.search_query}</p>
            <p style="color: var(--yt-spec-text-secondary); font-size: 12px; margin-top: 4px;">
              ${h.last_searched || ''}
            </p>
          </div>
          <button class="yt-btn yt-btn-secondary" onclick="document.getElementById('searchInput').value='${h.search_query}'; search();">
            <i class="fas fa-search"></i> Tekrar Ara
          </button>
        </div>
      `).join('');
    } catch (error) {
      console.error('Arama geçmişi yükleme hatası:', error);
    }
  }
}

// Algoritma sayfası
async function loadAlgorithmPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `
    <div style="text-align:center; padding:80px 20px;">
      <div style="width:120px; height:120px; background:linear-gradient(135deg, rgba(255,0,51,0.1), rgba(255,0,51,0.05)); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; position:relative;">
        <i class="fas fa-brain" style="font-size:48px; color:var(--yt-spec-brand-background-solid);"></i>
        <div style="position:absolute; top:-8px; right:-8px; width:40px; height:40px; background:var(--yt-spec-brand-background-solid); border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-clock" style="font-size:18px; color:white;"></i>
        </div>
      </div>
      <h2 style="font-size:28px; font-weight:700; margin-bottom:12px; background:linear-gradient(135deg, var(--yt-spec-brand-background-solid), #ff6b6b); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
        Çok Yakında
      </h2>
      <p style="color:var(--yt-spec-text-secondary); font-size:16px; line-height:1.6; max-width:500px; margin:0 auto 32px;">
        Kişiselleştirilmiş algoritma sistemi üzerinde çalışıyoruz. Yakında senin için özel içerikler önereceğiz!
      </p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <div style="background:var(--yt-spec-raised-background); padding:16px 24px; border-radius:12px; min-width:140px;">
          <i class="fas fa-chart-line" style="color:var(--yt-spec-brand-background-solid); font-size:24px; margin-bottom:8px; display:block;"></i>
          <p style="font-size:13px; color:var(--yt-spec-text-secondary);">Akıllı Öneriler</p>
        </div>
        <div style="background:var(--yt-spec-raised-background); padding:16px 24px; border-radius:12px; min-width:140px;">
          <i class="fas fa-heart" style="color:var(--yt-spec-brand-background-solid); font-size:24px; margin-bottom:8px; display:block;"></i>
          <p style="font-size:13px; color:var(--yt-spec-text-secondary);">Beğeni Analizi</p>
        </div>
        <div style="background:var(--yt-spec-raised-background); padding:16px 24px; border-radius:12px; min-width:140px;">
          <i class="fas fa-magic" style="color:var(--yt-spec-brand-background-solid); font-size:24px; margin-bottom:8px; display:block;"></i>
          <p style="font-size:13px; color:var(--yt-spec-text-secondary);">Kişiselleştirme</p>
        </div>
      </div>
    </div>
  `;
}

// Ayarlar sayfası
async function loadSettingsPage() {
  try {
    const [settingsResponse, badgesResponse] = await Promise.all([
      fetch(`${API_URL}/settings/${currentUser.id}`),
      fetch(`${API_URL}/user/${currentUser.id}/badges`)
    ]);
    const settings = await settingsResponse.json();
    const myBadges = await badgesResponse.json().catch(() => []);

    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <h2 class="section-header">Ayarlar</h2>
      
      <div class="settings-card">
        <h3 class="settings-card-title">Hesap Ayarları</h3>
        
        <div class="yt-form-group">
          <label class="yt-form-label">Kullanıcı Adı</label>
          <div style="display:flex; gap:12px; align-items:center;">
            <input type="text" id="newUsername" class="yt-input" value="${currentUser.username}" style="margin-bottom:0;" />
            <button class="yt-btn" style="width:auto; padding:0 20px; white-space:nowrap;" onclick="changeUsername()">Değiştir</button>
          </div>
        </div>
        
        <div class="yt-form-group">
          <label class="yt-form-label">Takma Ad</label>
          <div style="display:flex; gap:12px; align-items:center;">
            <input type="text" id="newNickname" class="yt-input" value="${currentUser.nickname}" style="margin-bottom:0;" />
            <button class="yt-btn" style="width:auto; padding:0 20px; white-space:nowrap;" onclick="changeNickname()">Değiştir</button>
          </div>
        </div>
        
        <div class="yt-form-group">
          <label class="yt-form-label">Şifre Değiştir</label>
          <input type="password" id="oldPassword" class="yt-input" placeholder="Eski şifre" />
          <input type="password" id="newPassword" class="yt-input" placeholder="Yeni şifre" />
          <button class="yt-btn"  onclick="changePassword()">Şifreyi Değiştir</button>
        </div>
      </div>
      
      <div class="settings-card">
        <h3 class="settings-card-title">Tema Ayarları</h3>
        <div class="theme-grid">
          ${[
            {id:'dark', name:'Gece Karanlığı', bg:'#0f0f0f', accent:'#ff0000'},
            {id:'neon-purple', name:'Elektrik Moru', bg:'#0d0d1a', accent:'#9b59b6'},
            {id:'ocean-blue', name:'Okyanus Mavisi', bg:'#0a0e1a', accent:'#1e90ff'},
            {id:'fire-red', name:'Ateş Kırmızısı', bg:'#1a0a0a', accent:'#ff4500'},
            {id:'forest-green', name:'Yeşil Orman', bg:'#0a1a0a', accent:'#2ecc71'},
            {id:'gold', name:'Altın Sarısı', bg:'#1a1500', accent:'#f1c40f'},
            {id:'light', name:'Gün Işığı', bg:'#f9f9f9', accent:'#ff0000'},
            {id:'midnight-blue', name:'Gece Mavisi', bg:'#050a1a', accent:'#3ea6ff'},
            {id:'orange-fire', name:'Turuncu Ateş', bg:'#1a0f00', accent:'#ff6b00'},
            {id:'pink-dream', name:'Pembe Rüya', bg:'#1a0a14', accent:'#e91e8c'}
          ].map(t => `
            <div class="theme-option ${(currentUser.theme || 'dark') === t.id ? 'active' : ''}" onclick="selectTheme('${t.id}')">
              <div class="theme-preview" style="background: ${t.bg};">
                <div style="width:100%; height:6px; background: ${t.accent}; border-radius: 3px; margin-bottom: 6px;"></div>
                <div style="display:flex; gap:4px;">
                  <div style="flex:1; height:20px; background: rgba(255,255,255,0.1); border-radius: 3px;"></div>
                  <div style="width:30px; height:20px; background: ${t.accent}; border-radius: 3px; opacity:0.8;"></div>
                </div>
              </div>
              <span class="theme-name">${t.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="settings-card">
        <h3 class="settings-card-title">Gizlilik Ayarları</h3>
        
        <label class="yt-checkbox-label" style="margin-bottom:16px;">
          <input type="checkbox" id="searchHistoryEnabled" class="yt-checkbox" ${settings.search_history_enabled ? 'checked' : ''} onchange="updateSettings()" />
          <span>Arama geçmişini kaydet</span>
        </label>
        
        <label class="yt-checkbox-label" style="margin-bottom:20px;">
          <input type="checkbox" id="watchHistoryEnabled" class="yt-checkbox" ${settings.watch_history_enabled ? 'checked' : ''} onchange="updateSettings()" />
          <span>İzleme geçmişini kaydet</span>
        </label>

        <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:20px; margin-top:4px;">
          <h3 class="settings-card-title" style="margin-bottom:12px;"><i class="fas fa-lock" style="margin-right:8px; color:var(--yt-spec-brand-background-solid);"></i>Gizlilik</h3>
          <label class="yt-checkbox-label" style="margin-bottom:8px;">
            <input type="checkbox" id="isPrivate" class="yt-checkbox" ${settings.is_private ? 'checked' : ''} onchange="updateSettings()" />
            <span>Gizli hesap</span>
          </label>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary); margin-left:28px; line-height:1.5;">
            Gizli hesapta videolarına ve fotoğraflarına sadece takip ettiklerin erişebilir. Takip etmek için istek gönderilmesi gerekir.
          </p>
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:20px; margin-top:20px;">
          <h3 class="settings-card-title" style="margin-bottom:12px;"><i class="fas fa-user-circle" style="margin-right:8px; color:var(--yt-spec-brand-background-solid);"></i>Hesap Türü</h3>
          <div style="display:flex; gap:12px; margin-bottom:12px;">
            <label class="yt-radio-label" style="flex:1; padding:16px; background:var(--yt-spec-raised-background); border-radius:8px; cursor:pointer; border:2px solid transparent;" id="accountTypeChannel">
              <input type="radio" name="accountType" value="channel" class="yt-radio" onchange="updateAccountType('channel')" />
              <div style="margin-left:8px;">
                <div style="font-weight:600; margin-bottom:4px;"><i class="fas fa-tv" style="margin-right:6px;"></i>Kanal</div>
                <div style="font-size:12px; color:var(--yt-spec-text-secondary);">Takipçiler "abone" olarak görünür</div>
              </div>
            </label>
            <label class="yt-radio-label" style="flex:1; padding:16px; background:var(--yt-spec-raised-background); border-radius:8px; cursor:pointer; border:2px solid transparent;" id="accountTypePersonal">
              <input type="radio" name="accountType" value="personal" class="yt-radio" onchange="updateAccountType('personal')" />
              <div style="margin-left:8px;">
                <div style="font-weight:600; margin-bottom:4px;"><i class="fas fa-user" style="margin-right:6px;"></i>Kişisel Hesap</div>
                <div style="font-size:12px; color:var(--yt-spec-text-secondary);">Takipçiler "takipçi" olarak görünür</div>
              </div>
            </label>
          </div>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary); line-height:1.5;">
            Hesap türünü değiştirerek profilinizin nasıl görüneceğini belirleyebilirsiniz.
          </p>
        </div>
        
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:20px;">
          <button class="yt-btn yt-btn-secondary"  onclick="clearSearchHistory()">Arama Geçmişini Temizle</button>
          <button class="yt-btn yt-btn-secondary"  onclick="clearWatchHistory()">İzleme Geçmişini Temizle</button>
        </div>
      </div>
      
      <div class="settings-card">
        <h3 class="settings-card-title">Güvenlik</h3>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <button class="yt-btn yt-btn-secondary" onclick="showLoginAttempts()">Giriş Denemelerini Göster</button>
          <button class="yt-btn yt-btn-secondary" onclick="showBlockedUsers()">Engellenen Kullanıcılar</button>
        </div>
      </div>

      ${myBadges.length > 0 ? `
      <div class="settings-card">
        <h3 class="settings-card-title"><i class="fas fa-certificate" style="margin-right:8px;color:var(--yt-spec-brand-background-solid)"></i>Rozetlerim</h3>
        <p style="font-size:13px;color:var(--yt-spec-text-secondary);margin-bottom:16px">Profilinde göstermek istediğin rozeti seç</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <div onclick="setActiveBadge(null)" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;cursor:pointer;border:2px solid ${!currentUser.active_badge_id ? 'var(--yt-spec-brand-background-solid)' : 'rgba(255,255,255,0.1)'};background:var(--yt-spec-raised-background)">
            <i class="fas fa-times" style="font-size:16px;color:#888"></i>
            <span style="font-size:13px">Rozet Yok</span>
          </div>
          ${myBadges.map(b => `
            <div onclick="setActiveBadge(${b.id})" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;cursor:pointer;border:2px solid ${currentUser.active_badge_id === b.id ? 'var(--yt-spec-brand-background-solid)' : 'rgba(255,255,255,0.1)'};background:var(--yt-spec-raised-background)">
              <i class="fas ${b.icon}" style="font-size:18px;color:${b.color}"></i>
              <span style="font-size:13px;color:${b.name_color}">${b.name}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}
      
      <button class="yt-btn" style="width:auto; padding:0 24px; background: linear-gradient(135deg,#dc3545,#a71d2a); box-shadow: 0 2px 8px rgba(220,53,69,0.3);" onclick="logout()">
        <i class="fas fa-sign-out-alt" style="margin-right:8px;"></i>Çıkış Yap
      </button>
    `;
    
    // Account type'ı yükle
    if (currentChannel) {
      const accountTypeRes = await fetch(`${API_URL}/account-type/${currentChannel.id}`).catch(() => null);
      if (accountTypeRes && accountTypeRes.ok) {
        const accountTypeData = await accountTypeRes.json();
        const accountType = accountTypeData.account_type || 'channel';
        const radio = document.querySelector(`input[name="accountType"][value="${accountType}"]`);
        if (radio) {
          radio.checked = true;
          const label = radio.closest('.yt-radio-label');
          if (label) label.style.borderColor = 'var(--yt-spec-brand-background-solid)';
        }
      }
    }
  } catch (error) {
    console.error('Ayarlar yükleme hatası:', error);
  }
}

async function changeUsername() {
  const newUsername = document.getElementById('newUsername').value.trim();

  if (!newUsername) {
    alert('Kullanıcı adı boş olamaz');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/user/${currentUser.id}/username`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newUsername })
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Kullanıcı adı değiştirildi. Kalan değişiklik hakkı: ${data.remainingChanges}`);
      currentUser.username = newUsername;
      localStorage.setItem('Tea_user', JSON.stringify(currentUser));
    } else {
      alert(data.error || 'Kullanıcı adı değiştirilemedi');
    }
  } catch (error) {
    console.error('Kullanıcı adı değiştirme hatası:', error);
    alert('Kullanıcı adı değiştirilemedi');
  }
}

async function changeNickname() {
  const newNickname = document.getElementById('newNickname').value.trim();

  if (!newNickname) {
    alert('Takma ad boş olamaz');
    return;
  }

  try {
    await fetch(`${API_URL}/user/${currentUser.id}/nickname`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newNickname })
    });

    alert('Takma ad değiştirildi');
    currentUser.nickname = newNickname;
    localStorage.setItem('Tea_user', JSON.stringify(currentUser));
    document.getElementById('userNickname').textContent = newNickname;
  } catch (error) {
    console.error('Takma ad değiştirme hatası:', error);
    alert('Takma ad değiştirilemedi');
  }
}

async function changePassword() {
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;

  if (!oldPassword || !newPassword) {
    alert('Eski ve yeni şifre gerekli');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/user/${currentUser.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Şifre değiştirildi');
      document.getElementById('oldPassword').value = '';
      document.getElementById('newPassword').value = '';
    } else {
      alert(data.error || 'Şifre değiştirilemedi');
    }
  } catch (error) {
    console.error('Şifre değiştirme hatası:', error);
    alert('Şifre değiştirilemedi');
  }
}

async function changeTheme() {
  const theme = document.getElementById('themeSelect').value;

  try {
    await fetch(`${API_URL}/user/${currentUser.id}/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    });

    currentUser.theme = theme;
    localStorage.setItem('Tea_user', JSON.stringify(currentUser));
    applyTheme(theme);
  } catch (error) {
    console.error('Tema değiştirme hatası:', error);
  }
}

async function selectTheme(theme) {
  try {
    await fetch(`${API_URL}/user/${currentUser.id}/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    });
    currentUser.theme = theme;
    localStorage.setItem('Tea_user', JSON.stringify(currentUser));
    applyTheme(theme);
    // Aktif tema kartını güncelle
    document.querySelectorAll('.theme-option').forEach(el => {
      el.classList.toggle('active', el.onclick.toString().includes(`'${theme}'`));
    });
    document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.theme-option').forEach(el => {
      if (el.getAttribute('onclick') === `selectTheme('${theme}')`) el.classList.add('active');
    });
  } catch(e) { console.error(e); }
}

function applyTheme(theme) {
  const root = document.documentElement;
  const themes = {
    'dark': {
      bg: '#0f0f0f', raised: '#212121', accent: '#ff0000', accentHover: '#cc0000', text: '#f1f1f1', textSec: '#aaaaaa'
    },
    'neon-purple': {
      bg: '#0d0d1a', raised: '#1a1a2e', accent: '#9b59b6', accentHover: '#7d3c98', text: '#f0e6ff', textSec: '#b39ddb'
    },
    'ocean-blue': {
      bg: '#0a0e1a', raised: '#0d1b2a', accent: '#1e90ff', accentHover: '#1565c0', text: '#e3f2fd', textSec: '#90caf9'
    },
    'fire-red': {
      bg: '#1a0a0a', raised: '#2d1010', accent: '#ff4500', accentHover: '#cc3700', text: '#fff3e0', textSec: '#ffab91'
    },
    'forest-green': {
      bg: '#0a1a0a', raised: '#0d2b0d', accent: '#2ecc71', accentHover: '#27ae60', text: '#e8f5e9', textSec: '#a5d6a7'
    },
    'gold': {
      bg: '#1a1500', raised: '#2a2200', accent: '#f1c40f', accentHover: '#d4ac0d', text: '#fffde7', textSec: '#fff176'
    },
    'light': {
      bg: '#f9f9f9', raised: '#ffffff', accent: '#ff0000', accentHover: '#cc0000', text: '#0f0f0f', textSec: '#606060'
    },
    'midnight-blue': {
      bg: '#050a1a', raised: '#0a1428', accent: '#3ea6ff', accentHover: '#1a7fd4', text: '#e8f4fd', textSec: '#90caf9'
    },
    'orange-fire': {
      bg: '#1a0f00', raised: '#2d1a00', accent: '#ff6b00', accentHover: '#cc5500', text: '#fff8e1', textSec: '#ffcc80'
    },
    'pink-dream': {
      bg: '#1a0a14', raised: '#2d1020', accent: '#e91e8c', accentHover: '#c2185b', text: '#fce4ec', textSec: '#f48fb1'
    }
  };

  const t = themes[theme] || themes['dark'];
  root.style.setProperty('--yt-spec-base-background', t.bg);
  root.style.setProperty('--yt-spec-raised-background', t.raised);
  root.style.setProperty('--yt-spec-menu-background', t.raised);
  root.style.setProperty('--yt-spec-brand-background-solid', t.accent);
  root.style.setProperty('--yt-spec-brand-background-hover', t.accentHover);
  root.style.setProperty('--yt-spec-text-primary', t.text);
  root.style.setProperty('--yt-spec-text-secondary', t.textSec);
  
  // Header gradient tema rengine göre
  const masthead = document.getElementById('masthead');
  if (masthead) {
    masthead.style.background = `linear-gradient(135deg, ${t.accent}22 0%, ${t.bg}dd 60%)`;
    masthead.style.borderBottom = `1px solid ${t.accent}44`;
  }

  // Light tema için özel ayarlar
  if (theme === 'light') {
    root.style.setProperty('--yt-spec-input-background', '#f0f0f0');
    root.style.setProperty('--yt-spec-border', 'rgba(0,0,0,0.12)');
    root.style.setProperty('--yt-spec-10-percent-layer', 'rgba(0,0,0,0.06)');
    root.style.setProperty('--yt-spec-wordmark-text', '#0f0f0f');
    root.style.setProperty('--yt-spec-text-disabled', '#999999');
    root.style.setProperty('--yt-spec-icon-inactive', '#606060');
    // Header ve sidebar için özel arka plan
    document.getElementById('masthead').style.background = 'rgba(255,255,255,0.97)';
    document.getElementById('guide').style.background = '#f9f9f9';
  } else {
    root.style.setProperty('--yt-spec-input-background', '#121212');
    root.style.setProperty('--yt-spec-border', 'rgba(255,255,255,0.12)');
    root.style.setProperty('--yt-spec-10-percent-layer', 'rgba(255,255,255,0.1)');
    root.style.setProperty('--yt-spec-wordmark-text', '#ffffff');
    root.style.setProperty('--yt-spec-text-disabled', '#717171');
    root.style.setProperty('--yt-spec-icon-inactive', '#909090');
    const masthead = document.getElementById('masthead');
    const guide = document.getElementById('guide');
    if (masthead) masthead.style.background = '';
    if (guide) guide.style.background = '';
  }
  
  document.body.setAttribute('data-theme', theme);
  showToast('Tema değiştirildi', 'success');
}

async function updateSettings() {
  const searchHistoryEnabled = document.getElementById('searchHistoryEnabled').checked ? 1 : 0;
  const watchHistoryEnabled = document.getElementById('watchHistoryEnabled').checked ? 1 : 0;
  const isPrivate = document.getElementById('isPrivate')?.checked ? 1 : 0;

  try {
    await fetch(`${API_URL}/settings/${currentUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_history_enabled: searchHistoryEnabled, watch_history_enabled: watchHistoryEnabled, is_private: isPrivate })
    });
    showToast('Ayarlar kaydedildi', 'success');
  } catch (error) {
    console.error('Ayarlar güncelleme hatası:', error);
  }
}

async function clearSearchHistory() {
  if (!confirm('Arama geçmişini temizlemek istediğinize emin misiniz?')) {
    return;
  }

  try {
    await fetch(`${API_URL}/search-history/${currentUser.id}`, {
      method: 'DELETE'
    });

    alert('Arama geçmişi temizlendi');
  } catch (error) {
    console.error('Arama geçmişi temizleme hatası:', error);
    alert('Arama geçmişi temizlenemedi');
  }
}

async function clearWatchHistory() {
  if (!confirm('İzleme geçmişini temizlemek istediğinize emin misiniz?')) {
    return;
  }

  try {
    await fetch(`${API_URL}/watch-history/${currentUser.id}`, {
      method: 'DELETE'
    });

    alert('İzleme geçmişi temizlendi');
  } catch (error) {
    console.error('İzleme geçmişi temizleme hatası:', error);
    alert('İzleme geçmişi temizlenemedi');
  }
}

async function updateAccountType(accountType) {
  if (!currentChannel) {
    showToast('Önce kanal oluşturun', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/account-type/${currentChannel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountType })
    });

    if (response.ok) {
      showToast('Hesap türü güncellendi', 'success');
      
      // Radio label'ları güncelle
      document.querySelectorAll('.yt-radio-label').forEach(label => {
        label.style.borderColor = 'transparent';
      });
      const selectedLabel = document.querySelector(`input[value="${accountType}"]`)?.closest('.yt-radio-label');
      if (selectedLabel) selectedLabel.style.borderColor = 'var(--yt-spec-brand-background-solid)';
      
      // Sidebar'daki "Hesabım" yazısını güncelle
      const myChannelLabel = document.getElementById('myChannelLabel');
      if (myChannelLabel) {
        myChannelLabel.textContent = accountType === 'personal' ? 'Hesabım' : 'Kanalım';
      }
    } else {
      showToast('Hesap türü güncellenemedi', 'error');
    }
  } catch (error) {
    console.error('Hesap türü güncelleme hatası:', error);
    showToast('Bir hata oluştu', 'error');
  }
}

async function showLoginAttempts() {
  // Önce şifre sor
  const modalContent = `
    <p style="color: var(--yt-spec-text-secondary); margin-bottom: 20px; font-size: 14px;">
      Giriş denemelerini görmek için hesap şifrenizi veya admin şifresini girin.
    </p>
    <div class="yt-form-group">
      <label class="yt-form-label">Şifre</label>
      <input type="password" id="attemptsPassword" class="yt-input" placeholder="Şifrenizi girin..." />
    </div>
    <div style="display:flex; gap:12px;">
      <button class="yt-btn" onclick="fetchLoginAttempts()">Göster</button>
      <button class="yt-btn yt-btn-secondary" onclick="closeModal()">İptal</button>
    </div>
    <div id="attemptsResult" style="margin-top: 20px;"></div>
  `;
  showModal(modalContent, 'Giriş Denemeleri');
  
  // Enter ile de gönder
  setTimeout(() => {
    const input = document.getElementById('attemptsPassword');
    if (input) input.addEventListener('keypress', e => { if (e.key === 'Enter') fetchLoginAttempts(); });
  }, 100);
}

async function fetchLoginAttempts() {
  const password = document.getElementById('attemptsPassword')?.value;
  if (!password) { showToast('Şifre girin', 'error'); return; }

  const resultDiv = document.getElementById('attemptsResult');
  resultDiv.innerHTML = '<div style="text-align:center; padding:20px;"><div class="yt-spinner" style="width:32px;height:32px;margin:auto;"></div></div>';

  try {
    const response = await fetch(`${API_URL}/login-attempts/${currentUser.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (response.status === 401) {
      resultDiv.innerHTML = '<p style="color:#f44336; text-align:center;">Şifre hatalı!</p>';
      return;
    }

    const attempts = await response.json();

    if (attempts.length === 0) {
      resultDiv.innerHTML = '<p style="color: var(--yt-spec-text-secondary); text-align:center; padding: 20px;">Henüz giriş denemesi yok</p>';
      return;
    }

    resultDiv.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width:100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid rgba(255,255,255,0.15);">
              <th style="text-align:left; padding: 10px 12px; color: var(--yt-spec-text-secondary); font-weight:500;">IP Adresi</th>
              <th style="text-align:left; padding: 10px 12px; color: var(--yt-spec-text-secondary); font-weight:500;">Denenen Şifre</th>
              <th style="text-align:left; padding: 10px 12px; color: var(--yt-spec-text-secondary); font-weight:500;">Durum</th>
              <th style="text-align:left; padding: 10px 12px; color: var(--yt-spec-text-secondary); font-weight:500;">Tarih (TR)</th>
            </tr>
          </thead>
          <tbody>
            ${attempts.map(a => {
              // Server TR saatini "YYYY-MM-DD HH:MM:SS" formatında gönderiyor
              const dateStr = a.attempted_at || '-';
              return `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.07);" 
                  onmouseover="this.style.background='rgba(255,255,255,0.05)'" 
                  onmouseout="this.style.background='transparent'">
                <td style="padding: 10px 12px;">
                  <span style="font-family: monospace; background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; font-size: 12px;">
                    ${a.ip_address}
                  </span>
                </td>
                <td style="padding: 10px 12px;">
                  ${a.success 
                    ? '<span style="color:#4caf50; font-size:18px;"><i class="fas fa-check-circle"></i></span>'
                    : `<span style="font-family: monospace; background: rgba(255,0,0,0.12); padding: 3px 8px; border-radius: 4px; font-size: 12px; color: #ff6b6b;">${a.attempted_password}</span>`
                  }
                </td>
                <td style="padding: 10px 12px;">
                  ${a.success 
                    ? '<span style="color:#4caf50; font-size:12px;"><i class="fas fa-check-circle"></i> Başarılı</span>'
                    : '<span style="color:#f44336; font-size:12px;"><i class="fas fa-times-circle"></i> Başarısız</span>'
                  }
                </td>
                <td style="padding: 10px 12px; color: var(--yt-spec-text-secondary); font-size: 12px;">
                  ${dateStr}
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    resultDiv.innerHTML = '<p style="color:#f44336; text-align:center;">Hata oluştu</p>';
  }
}

// Abonelikler sayfası
async function loadSubscriptionsPage() {
  try {
    const response = await fetch(`${API_URL}/subscriptions/${currentUser.id}`);
    const subscriptions = await response.json();

    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <h2 class="section-header">Takipler</h2>
      <div id="subscriptionsList" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px;"></div>
    `;

    const container = document.getElementById('subscriptionsList');

    if (subscriptions.length === 0) {
      container.innerHTML = '<p style="color: var(--yt-spec-text-secondary);">Henüz takip yok</p>';
      return;
    }

    container.innerHTML = subscriptions.map(sub => {
      const banner = sub.channel_banner || '';
      const avatar = getProfilePhotoUrl(sub.profile_photo);
      const bannerStyle = banner
        ? `background-image:url('${banner}'); background-size:cover; background-position:center;`
        : `background: linear-gradient(135deg,#1a1a2e,#0f3460);`;
      return `
        <div style="background:var(--yt-spec-raised-background); border-radius:12px; overflow:hidden; cursor:pointer; transition:transform 0.15s;" 
             onmouseover="this.style.transform='scale(1.02)'" 
             onmouseout="this.style.transform='scale(1)'"
             onclick="viewChannel(${sub.channel_id})">
          <div style="${bannerStyle} height:100px;"></div>
          <div style="padding:12px; display:flex; align-items:center; gap:10px;">
            <img src="${avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; flex-shrink:0; margin-top:-24px; border:2px solid var(--yt-spec-raised-background);" />
            <div style="min-width:0;">
              <p style="font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sub.channel_name}</p>
              <p style="color:var(--yt-spec-text-secondary); font-size:12px;">${sub.subscriber_count} takipçi • ${sub.video_count} içerik</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Takipler yükleme hatası:', error);
  }
}

// Favoriler sayfası
async function loadFavoritesPage() {
  try {
    const response = await fetch(`${API_URL}/favorites/${currentUser.id}`);
    const favorites = await response.json();

    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <h2>Favoriler</h2>
      <div id="favoritesList" class="video-grid"></div>
    `;

    if (favorites.length === 0) {
      document.getElementById('favoritesList').innerHTML = '<p style="color: var(--text-secondary);">Henüz favori video yok</p>';
      return;
    }

    const videos = favorites.map(f => ({
      id: f.video_id,
      title: f.title,
      banner_url: f.banner_url,
      video_url: f.video_url,
      channel_name: f.channel_name,
      nickname: f.nickname,
      profile_photo: f.profile_photo,
      views: f.views,
      likes: 0
    }));

    displayVideos(videos, 'favoritesList');
  } catch (error) {
    console.error('Favoriler yükleme hatası:', error);
  }
}

// Kaydedilenler sayfası
async function loadSavedPage() {
  try {
    const response = await fetch(`${API_URL}/saved/${currentUser.id}`);
    const saved = await response.json();

    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <h2>Kaydedilenler</h2>
      <div id="savedList" class="video-grid"></div>
    `;

    if (saved.length === 0) {
      document.getElementById('savedList').innerHTML = '<p style="color: var(--text-secondary);">Henüz kaydedilen video yok</p>';
      return;
    }

    const videos = saved.map(s => ({
      id: s.video_id,
      title: s.title,
      banner_url: s.banner_url,
      video_url: s.video_url,
      channel_name: s.channel_name,
      nickname: s.nickname,
      profile_photo: s.profile_photo,
      views: s.views,
      likes: 0
    }));

    displayVideos(videos, 'savedList');
  } catch (error) {
    console.error('Kaydedilenler yükleme hatası:', error);
  }
}

// Bildirimler sayfası
async function loadNotificationsPage() {
  try {
    const response = await fetch(`${API_URL}/notifications/${currentUser.id}`);
    const notifications = await response.json();

    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = `
      <h2 class="section-header">Bildirimler</h2>
      <div id="notificationsList"></div>
    `;

    const container = document.getElementById('notificationsList');

    if (notifications.length === 0) {
      container.innerHTML = '<p style="color: var(--yt-spec-text-secondary);">Henüz bildirim yok</p>';
      return;
    }

    // Sayfaya girilince tüm okunmamışları toplu okundu yap
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length > 0) {
      await fetch(`${API_URL}/notifications/${currentUser.id}/read-all`, { method: 'PUT' });
      loadNotifications(); // badge'i sıfırla
    }

    const icons = {
      new_video: 'fa-video', new_subscriber: 'fa-user-plus',
      new_comment: 'fa-comment', new_like: 'fa-thumbs-up',
      comment_reply: 'fa-reply', comment_like: 'fa-heart',
      supporter_request: 'fa-handshake', supporter_accepted: 'fa-check-circle',
      supporter_rejected: 'fa-times-circle',
      friend_request: 'fa-user-plus', friend_accepted: 'fa-user-check',
      follow_request: 'fa-user-clock'
    };

    container.innerHTML = notifications.map(notif => {
      const isPartnerRequest = notif.type === 'supporter_request';
      const isFollowRequest = notif.type === 'follow_request';
      return `
        <div style="display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--yt-spec-raised-background); border-radius:8px; margin-bottom:8px; ${!notif.is_read ? 'border-left:3px solid var(--yt-spec-brand-background-solid);' : ''}">
          <i class="fas ${icons[notif.type] || 'fa-bell'}" style="font-size:18px; color:var(--yt-spec-brand-background-solid); width:20px; text-align:center; flex-shrink:0;"></i>
          <div style="flex:1;">
            <p style="font-size:14px; margin-bottom:4px;">${notif.content}</p>
            <p style="font-size:12px; color:var(--yt-spec-text-secondary);">${notif.created_at || ''}</p>
          </div>
          ${isPartnerRequest ? `
            <div style="display:flex; gap:8px; flex-shrink:0;">
              <button class="yt-btn" onclick="respondPartnerFromNotif(${notif.related_id}, 'accept', ${notif.id})" style="height:30px; padding:0 12px; font-size:12px;">Kabul</button>
              <button class="yt-btn yt-btn-secondary" onclick="respondPartnerFromNotif(${notif.related_id}, 'reject', ${notif.id})" style="height:30px; padding:0 12px; font-size:12px;">Red</button>
            </div>
          ` : ''}
          ${isFollowRequest ? `
            <div style="display:flex; gap:8px; flex-shrink:0;">
              <button class="yt-btn" onclick="respondFollowRequest(${notif.related_id}, 'accept', ${notif.id})" style="height:30px; padding:0 12px; font-size:12px;"><i class="fas fa-check"></i> Kabul</button>
              <button class="yt-btn yt-btn-secondary" onclick="respondFollowRequest(${notif.related_id}, 'reject', ${notif.id})" style="height:30px; padding:0 12px; font-size:12px;"><i class="fas fa-times"></i> Red</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Bildirimler yükleme hatası:', error);
  }
}

async function loadNotifications() {
  try {
    const response = await fetch(`${API_URL}/notifications/${currentUser.id}`);
    const notifications = await response.json();

    const unreadCount = notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notifBadge');
    
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  } catch (error) {
    console.error('Bildirimler yükleme hatası:', error);
  }
}

async function markAsRead(notificationId) {
  try {
    await fetch(`${API_URL}/notification/${notificationId}/read`, {
      method: 'PUT'
    });

    loadNotificationsPage();
  } catch (error) {
    console.error('Bildirim okundu işareti hatası:', error);
  }
}

// Modal fonksiyonları
function showModal(content, title = '') {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const modalTitle = document.getElementById('modalTitle');
  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  modal.classList.add('show');
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('show');
}

// Modal dışına tıklandığında kapat
window.onclick = function(event) {
  const modal = document.getElementById('modal');
  if (event.target === modal) {
    closeModal();
  }
}

// ==================== KANAL OLUŞTURMA ONBOARDING ====================

function showCreateChannelOnboarding() {
  const overlay = document.createElement('div');
  overlay.id = 'channelOnboarding';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:9998; background:rgba(0,0,0,0.85);
    display:flex; align-items:center; justify-content:center; padding:16px;
  `;
  overlay.innerHTML = `
    <div style="background:var(--yt-spec-raised-background); border-radius:20px; padding:32px 28px; width:100%; max-width:420px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 24px 64px rgba(0,0,0,0.6);">
      <div style="text-align:center; margin-bottom:24px;">
        <div style="width:64px; height:64px; background:rgba(255,0,51,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
          <i class="fas fa-play" style="font-size:24px; color:#ff0033;"></i>
        </div>
        <h2 style="font-size:22px; font-weight:700; margin-bottom:8px;">Kanalını Oluştur</h2>
        <p style="font-size:14px; color:var(--yt-spec-text-secondary);">İçerik paylaşmaya başlamak için bir kanal adı belirle</p>
      </div>
      <div class="yt-form-group">
        <input type="text" id="onboardingChannelName" class="yt-input" placeholder="Kanal adın" value="${currentUser?.nickname || ''}" style="text-align:center; font-size:16px;" />
      </div>
      <button class="yt-btn" style="width:100%; height:50px; font-size:15px; font-weight:600; margin-top:8px;" onclick="createChannelFromOnboarding()">
        <i class="fas fa-rocket" style="margin-right:8px;"></i>Kanalı Oluştur
      </button>
      <button onclick="document.getElementById('channelOnboarding').remove()" style="width:100%; background:none; border:none; color:var(--yt-spec-text-secondary); font-size:13px; margin-top:12px; cursor:pointer; padding:8px;">Şimdi değil</button>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('onboardingChannelName')?.focus(), 100);
}

async function createChannelFromOnboarding() {
  const name = document.getElementById('onboardingChannelName')?.value?.trim();
  if (!name) { showToast('Kanal adı gerekli', 'error'); return; }

  try {
    const formData = new FormData();
    formData.append('userId', currentUser.id);
    formData.append('channelName', name);
    formData.append('about', '');
    formData.append('agreed', 'true');
    const res = await fetch(`${API_URL}/channel`, { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      const chRes = await fetch(`${API_URL}/channel/user/${currentUser.id}`);
      currentChannel = await chRes.json();
      document.getElementById('channelOnboarding')?.remove();
      showToast('Kanal oluşturuldu!', 'success');
    } else {
      showToast(data.error || 'Kanal oluşturulamadı', 'error');
    }
  } catch(e) {
    showToast('Hata oluştu', 'error');
  }
}

// ==================== REKLAM GÖSTERİM ====================

async function showVideoAd(currentChannelId) {
  try {
    const res = await fetch(`${API_URL}/ad/random?channelId=${currentChannelId || ''}`);
    const ad = await res.json();
    if (!ad) return;

    // Overlay reklam
    const overlay = document.createElement('div');
    overlay.id = 'adOverlay';
    overlay.style.cssText = `
      position:fixed; bottom:80px; right:20px; z-index:9999;
      background:rgba(0,0,0,0.92); border-radius:12px; padding:0;
      width:300px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.6);
      border:1px solid rgba(255,255,255,0.1); animation:slideInRight 0.3s ease;
    `;

    const isVideo = ad.video_type !== 'Fotoğraf';
    overlay.innerHTML = `
      <div style="position:relative;">
        ${isVideo
          ? `<video src="${ad.video_url}" autoplay muted loop style="width:100%; height:160px; object-fit:cover; display:block;"></video>`
          : `<img src="${ad.banner_url}" style="width:100%; height:160px; object-fit:cover; display:block;" />`
        }
        <div style="position:absolute; top:6px; left:8px; background:rgba(0,0,0,0.7); border-radius:4px; padding:2px 6px; font-size:10px; color:#aaa;">Reklam</div>
        <button onclick="document.getElementById('adOverlay')?.remove()" style="position:absolute; top:6px; right:8px; background:rgba(0,0,0,0.7); border:none; border-radius:50%; width:22px; height:22px; color:#fff; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;">×</button>
      </div>
      <div style="padding:10px 12px;">
        <p style="font-size:13px; font-weight:600; margin-bottom:2px;">${ad.ad_title}</p>
        ${ad.ad_description ? `<p style="font-size:11px; color:var(--yt-spec-text-secondary);">${ad.ad_description}</p>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);

    // 8 saniye sonra otomatik kapat
    setTimeout(() => overlay?.remove(), 8000);
  } catch(e) {}
}

async function showShortsAd(currentChannelId) {
  try {
    const res = await fetch(`${API_URL}/ad/random?channelId=${currentChannelId || ''}`);
    const ad = await res.json();
    if (!ad) return;

    // Shorts içine reklam kartı ekle — mevcut shorts player'ın üstüne
    const existing = document.getElementById('shortsAdBanner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'shortsAdBanner';
    banner.style.cssText = `
      position:fixed; top:0; left:0; right:0; bottom:0; z-index:8888;
      background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center;
      animation:fadeIn 0.2s ease;
    `;
    const isVideo = ad.video_type !== 'Fotoğraf';
    banner.innerHTML = `
      <div style="position:absolute; top:12px; left:16px; background:rgba(0,0,0,0.6); border-radius:6px; padding:3px 10px; font-size:11px; color:#aaa;">Reklam</div>
      ${isVideo
        ? `<video src="${ad.video_url}" autoplay muted loop style="width:100%; height:100%; object-fit:cover; position:absolute; inset:0;"></video>`
        : `<img src="${ad.banner_url}" style="width:100%; height:100%; object-fit:cover; position:absolute; inset:0;" />`
      }
      <div style="position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent,rgba(0,0,0,0.8)); padding:20px 16px 16px;">
        <p style="font-size:15px; font-weight:700; margin-bottom:4px;">${ad.ad_title}</p>
        ${ad.ad_description ? `<p style="font-size:12px; color:rgba(255,255,255,0.8);">${ad.ad_description}</p>` : ''}
      </div>
      <button id="adSkipBtn" style="position:absolute; bottom:16px; right:16px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); border-radius:6px; color:#fff; padding:8px 16px; cursor:pointer; font-size:13px; display:none;" onclick="document.getElementById('shortsAdBanner')?.remove()">Atla →</button>
    `;
    document.body.appendChild(banner);

    // 3 saniye sonra atla butonu çıkar
    setTimeout(() => {
      const skipBtn = document.getElementById('adSkipBtn');
      if (skipBtn) skipBtn.style.display = 'block';
    }, 3000);

    // 8 saniye sonra otomatik kapat
    setTimeout(() => banner?.remove(), 8000);
  } catch(e) {}
}

// Toast bildirimi
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'yt-toast';
  toast.textContent = message;
  
  if (type === 'error') {
    toast.style.background = '#dc3545';
  } else if (type === 'success') {
    toast.style.background = '#28a745';
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Kanal görüntüleme
async function viewChannel(channelId) {
  try {
    const [channelRes, videosRes, supportersRes, privRes, accountTypeRes] = await Promise.all([
      fetch(`${API_URL}/channel/${channelId}`),
      fetch(`${API_URL}/videos/channel/${channelId}`),
      fetch(`${API_URL}/supporter-channels/${channelId}`),
      fetch(`${API_URL}/channel-privacy/${channelId}`),
      fetch(`${API_URL}/account-type/${channelId}`)
    ]);
    const channel = await channelRes.json();
    const allVideos = await videosRes.json();
    const supporters = await supportersRes.json().catch(() => []);
    const privData = await privRes.json().catch(() => ({ is_private: 0 }));
    const accountTypeData = await accountTypeRes.json().catch(() => ({ account_type: 'channel' }));

    const isPrivate = privData.is_private === 1;
    const isOwner = currentChannel && currentChannel.user_id === channel.user_id;
    const isPersonal = accountTypeData.account_type === 'personal';
    const subscriberLabel = 'takipçi';
    const subscribeButtonLabel = 'Takip Et';
    const unsubscribeButtonLabel = 'Takipten Çık';

    // Gizli hesap: arkadaş değilse içerikleri gizle
    let isFriend = false;
    if (isPrivate && !isOwner) {
      const friendRes = await fetch(`${API_URL}/friends/${currentUser.id}`).catch(() => ({ json: () => [] }));
      const friends = await friendRes.json().catch(() => []);
      isFriend = friends.some(f => f.friend_id === channel.user_id);
    }

    const videos = (isPrivate && !isOwner && !isFriend) ? [] : allVideos;

    const pageContent = document.getElementById('pageContent');
    const bannerStyle = channel.channel_banner
      ? `background-image: url('${channel.channel_banner}'); background-size: cover; background-position: center;`
      : `background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);`;

    pageContent.innerHTML = `
      <!-- Banner -->
      <div style="${bannerStyle} height: 180px; border-radius: 12px; margin-bottom: 0; position:relative; overflow:hidden;">
        <div style="position:absolute; inset:0; background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6) 100%);"></div>
        ${isPrivate ? `<div style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.6); border-radius:20px; padding:4px 12px; font-size:12px; display:flex; align-items:center; gap:6px;"><i class="fas fa-lock"></i> Gizli Hesap</div>` : ''}
      </div>

      <!-- Kanal Header -->
      <div style="display:flex; align-items:flex-end; gap:16px; margin-top:-40px; margin-bottom:24px; padding:0 8px; position:relative; z-index:1;">
        <img src="${getProfilePhotoUrl(channel.profile_photo)}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid var(--yt-spec-base-background); flex-shrink:0;" />
        <div style="flex:1; padding-bottom:4px;">
          <h2 style="font-size:22px; font-weight:600; margin-bottom:2px;">${channel.channel_name} ${isPrivate ? '<i class="fas fa-lock" style="font-size:14px; color:var(--yt-spec-text-secondary);"></i>' : ''}</h2>
          <p style="color: var(--yt-spec-text-secondary); font-size:13px;">@${channel.username} • ${isPrivate && !isOwner && !isFriend ? '? ' + subscriberLabel : channel.subscriber_count + ' ' + subscriberLabel} • ${isPrivate && !isOwner && !isFriend ? '? gönderi' : channel.video_count + ' video'}</p>
        </div>
        ${!isOwner ? `<button class="yt-btn" id="channelSubscribeBtn" onclick="toggleSubscribe(${channel.id})" style="flex-shrink:0; margin-bottom:4px;">${subscribeButtonLabel}</button>` : ''}
      </div>

      <!-- Gizli hesap uyarısı -->
      ${isPrivate && !isOwner && !isFriend ? `
        <div style="text-align:center; padding:48px 20px; background:var(--yt-spec-raised-background); border-radius:12px; margin-bottom:24px;">
          <i class="fas fa-lock" style="font-size:48px; color:var(--yt-spec-text-secondary); margin-bottom:16px; display:block;"></i>
          <p style="font-size:16px; font-weight:600; margin-bottom:8px;">Bu hesap gizli</p>
          <p style="font-size:13px; color:var(--yt-spec-text-secondary); margin-bottom:20px;">İçerikleri görmek için takip isteği gönder</p>
        </div>
      ` : ''}

      <!-- Sekmeler -->
      <div style="display:flex; gap:0; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:24px;">
        <button class="channel-tab active" onclick="switchChannelTab(this,'videos')" style="padding:12px 20px; background:none; border:none; border-bottom:2px solid var(--yt-spec-brand-background-solid); color:var(--yt-spec-text-primary); font-size:14px; font-weight:500; cursor:pointer;">Videolar</button>
        <button class="channel-tab" onclick="switchChannelTab(this,'about')" style="padding:12px 20px; background:none; border:none; border-bottom:2px solid transparent; color:var(--yt-spec-text-secondary); font-size:14px; cursor:pointer;">Hakkında</button>
      </div>

      <!-- Videolar -->
      <div id="channelTabVideos">
        ${videos.length === 0 && (!isPrivate || isOwner || isFriend)
          ? '<p style="color: var(--yt-spec-text-secondary);">Henüz video yok</p>'
          : videos.length > 0 ? `<div class="video-grid" id="channelNormalVideos"></div>
             <div id="channelShortsSection" style="margin-top:24px; display:none;">
               <h3 style="font-size:16px; font-weight:500; margin-bottom:12px;">
                 <i class="fas fa-film" style="color:var(--yt-spec-brand-background-solid); margin-right:6px;"></i>Reals
               </h3>
               <div class="shorts-grid" id="channelShortsGrid"></div>
             </div>` : ''
        }
      </div>

      <!-- Hakkında -->
      <div id="channelTabAbout" style="display:none;">
        <div class="settings-card">
          <h3 class="settings-card-title">Kanal Hakkında</h3>
          <p style="color: var(--yt-spec-text-secondary); line-height:1.6;">${channel.about || 'Henüz açıklama eklenmemiş.'}</p>
          ${channel.channel_type ? `<p style="margin-top:12px; font-size:13px;"><strong>Tür:</strong> ${channel.channel_type}</p>` : ''}
          ${channel.links ? `<p style="margin-top:8px; font-size:13px;"><strong>Bağlantılar:</strong> ${channel.links}</p>` : ''}
        </div>
      </div>

      <!-- Partner Kanallar -->
      <div id="channelTabPartners" style="display:none;">
        ${supporters.length > 0 ? `
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap:12px;">
            ${supporters.map(s => `
              <div style="background: var(--yt-spec-raised-background); border-radius:10px; padding:14px; cursor:pointer; text-align:center; transition:background 0.15s;"
                   onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='var(--yt-spec-raised-background)'"
                   onclick="viewChannel(${s.supporter_channel_id})">
                <img src="${getProfilePhotoUrl(s.profile_photo)}" style="width:52px; height:52px; border-radius:50%; object-fit:cover; margin-bottom:8px;" />
                <p style="font-size:14px; font-weight:500;">${s.channel_name}</p>
                <p style="font-size:12px; color:var(--yt-spec-text-secondary);">@${s.username}</p>
              </div>
            `).join('')}
          </div>
        ` : `<p style="color:var(--yt-spec-text-secondary); font-size:14px; padding:24px 0;">Bu kanalın henüz partner kanalı yok.</p>`}
      </div>
    `;

    // Abonelik durumu
    checkChannelSubscriptionStatus(channel.id);
    document.querySelectorAll('.guide-item').forEach(i => i.classList.remove('active'));

    // Kanal videolarını normal/shorts olarak ayır
    if (videos.length > 0) {
      const normalVids = videos.filter(v => !v.is_short);
      const shortVids = videos.filter(v => v.is_short);
      
      const normalGrid = document.getElementById('channelNormalVideos');
      if (normalGrid) displayVideos(normalVids, 'channelNormalVideos');
      
      if (shortVids.length > 0) {
        const shortsSection = document.getElementById('channelShortsSection');
        if (shortsSection) {
          shortsSection.style.display = 'block';
          renderShortsGrid(shortVids, 'channelShortsGrid');
        }
      }
    }

  } catch (error) {
    console.error('Kanal görüntüleme hatası:', error);
  }
}

function switchChannelTab(btn, tab) {
  document.querySelectorAll('.channel-tab').forEach(b => {
    b.style.borderBottomColor = 'transparent';
    b.style.color = 'var(--yt-spec-text-secondary)';
  });
  btn.style.borderBottomColor = 'var(--yt-spec-brand-background-solid)';
  btn.style.color = 'var(--yt-spec-text-primary)';
  
  ['videos', 'about'].forEach(t => {
    const el = document.getElementById(`channelTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
}

async function checkChannelSubscriptionStatus(channelId) {
  try {
    const btn = document.getElementById('channelSubscribeBtn');
    if (!btn) return;

    const [subRes, privRes] = await Promise.all([
      fetch(`${API_URL}/is-subscribed/${currentUser.id}/${channelId}`),
      fetch(`${API_URL}/channel-privacy/${channelId}`)
    ]);
    const subData = await subRes.json();
    const privData = await privRes.json().catch(() => ({ is_private: 0 }));
    
    // Account type'ı al
    const accountTypeRes = await fetch(`${API_URL}/account-type/${channelId}`).catch(() => null);
    const accountTypeData = accountTypeRes ? await accountTypeRes.json().catch(() => ({ account_type: 'channel' })) : { account_type: 'channel' };
    const isPersonal = accountTypeData.account_type === 'personal';
    const unsubscribeLabel = 'Takipten Çık';

    if (subData.subscribed) {
      btn.textContent = unsubscribeLabel;
      btn.classList.add('yt-btn-secondary');
    } else if (privData.is_private) {
      // Bekleyen takip isteği var mı?
      const channel = await fetch(`${API_URL}/channel/${channelId}`).then(r => r.json()).catch(() => null);
      if (channel) {
        const reqRes = await fetch(`${API_URL}/follow-requests/${channel.user_id}`).catch(() => null);
        if (reqRes && reqRes.ok) {
          const requests = await reqRes.json().catch(() => []);
          const pending = requests.find(r => r.sender_id === currentUser.id);
          if (pending) {
            btn.textContent = 'İstek Gönderildi';
            btn.disabled = true;
          }
        }
      }
    }
  } catch(e) {}
}

async function loadPartnerRequests() {
  if (!currentChannel) return;
  const box = document.getElementById('partnerRequestsBox');
  if (!box) return;

  try {
    const [incomingRes, sentRes] = await Promise.all([
      fetch(`${API_URL}/partner-requests/${currentChannel.id}`),
      fetch(`${API_URL}/partner-sent/${currentChannel.id}`)
    ]);
    const incoming = await incomingRes.json();
    const sent = await sentRes.json();

    // Badge güncelle
    const badge = document.getElementById('partnerBadge');
    if (badge) {
      if (incoming.length > 0) {
        badge.textContent = incoming.length;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }

    if (incoming.length === 0 && sent.length === 0) {
      box.innerHTML = '<p style="color:var(--yt-spec-text-secondary); font-size:13px; padding:8px 0;">Bekleyen partner isteği yok.</p>';
      return;
    }

    box.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
        ${incoming.length > 0 ? `
          <div class="settings-card" style="border:1px solid var(--yt-spec-brand-background-solid);">
            <h3 class="settings-card-title" style="display:flex; align-items:center; gap:8px;">
              <i class="fas fa-inbox" style="color:var(--yt-spec-brand-background-solid);"></i>
              Gelen İstekler
              <span style="background:var(--yt-spec-brand-background-solid); color:white; font-size:11px; padding:2px 7px; border-radius:10px;">${incoming.length}</span>
            </h3>
            ${incoming.map(r => `
              <div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                <img src="${getProfilePhotoUrl(r.profile_photo)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; flex-shrink:0;" />
                <div style="flex:1; min-width:0;">
                  <p style="font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.requester_name}</p>
                  <p style="font-size:11px; color:var(--yt-spec-text-secondary);">@${r.username} • ${r.subscriber_count} abone</p>
                </div>
                <div style="display:flex; gap:6px; flex-shrink:0;">
                  <button class="yt-btn" onclick="respondPartner(${r.id}, 'accept')" style="height:30px; padding:0 12px; font-size:12px;"><i class="fas fa-check"></i> Kabul</button>
                  <button class="yt-btn yt-btn-secondary" onclick="respondPartner(${r.id}, 'reject')" style="height:30px; padding:0 12px; font-size:12px;"><i class="fas fa-times"></i> Red</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${sent.length > 0 ? `
          <div class="settings-card">
            <h3 class="settings-card-title" style="display:flex; align-items:center; gap:8px;">
              <i class="fas fa-paper-plane" style="color:var(--yt-spec-text-secondary);"></i>
              Gönderilen İstekler
            </h3>
            ${sent.map(r => `
              <div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                <img src="${getProfilePhotoUrl(r.profile_photo)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; flex-shrink:0;" />
                <div style="flex:1; min-width:0;">
                  <p style="font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.target_name}</p>
                  <p style="font-size:11px; color:var(--yt-spec-text-secondary);">@${r.username}</p>
                </div>
                <span style="font-size:11px; padding:3px 8px; border-radius:10px; flex-shrink:0;
                  background:${r.status === 'accepted' ? 'rgba(76,175,80,0.2)' : r.status === 'rejected' ? 'rgba(244,67,54,0.2)' : 'rgba(255,255,255,0.1)'};
                  color:${r.status === 'accepted' ? '#4caf50' : r.status === 'rejected' ? '#f44336' : 'var(--yt-spec-text-secondary)'};">
                  ${r.status === 'accepted' ? '✓ Kabul edildi' : r.status === 'rejected' ? '✗ Reddedildi' : '⏳ Bekliyor'}
                </span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } catch(e) {
    console.error(e);
  }
}

async function respondFollowRequest(senderId, action, notifId) {
  try {
    // follow_requests tablosunda id'yi bul
    const res = await fetch(`${API_URL}/follow-requests/${currentUser.id}`);
    const requests = await res.json();
    const req = requests.find(r => r.sender_id === senderId);
    if (!req) { showToast('İstek bulunamadı', 'error'); return; }

    await fetch(`${API_URL}/follow-request/${req.id}/${action}`, { method: 'PUT' });
    showToast(action === 'accept' ? 'Takip isteği kabul edildi!' : 'Takip isteği reddedildi', action === 'accept' ? 'success' : 'info');
    loadNotificationsPage();
  } catch(e) {
    showToast('Hata oluştu', 'error');
  }
}

async function respondPartnerFromNotif(fromChannelId, action, notifId) {
  // fromChannelId = isteği gönderen kanal ID'si (related_id)
  // toChannelId = bizim kanalımız
  try {
    if (!currentChannel) { showToast('Önce kanal oluşturun', 'error'); return; }

    const res = await fetch(`${API_URL}/partner-respond`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromChannelId, toChannelId: currentChannel.id, action })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(action === 'accept' ? 'Partner isteği kabul edildi!' : 'Partner isteği reddedildi', action === 'accept' ? 'success' : 'info');
      loadNotificationsPage();
    } else {
      showToast(data.error || 'İşlem başarısız', 'error');
    }
  } catch(e) {
    showToast('Hata oluştu', 'error');
  }
}

async function respondPartner(requestId, action) {
  try {
    // requestId = supporter_channels.id
    const endpoint = action === 'accept' ? 'accept' : 'reject';
    const res = await fetch(`${API_URL}/supporter-channel/${requestId}/${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (res.ok) {
      showToast(action === 'accept' ? 'Partner isteği kabul edildi!' : 'Partner isteği reddedildi', action === 'accept' ? 'success' : 'info');
      loadPartnerRequests();
      loadAcceptedPartners();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'İşlem başarısız', 'error');
    }
  } catch(e) {
    console.error('respondPartner error:', e);
    showToast('Bağlantı hatası: ' + e.message, 'error');
  }
}

function showAddPartnerModal() {
  showModal(`
    <p style="color: var(--yt-spec-text-secondary); margin-bottom: 16px; font-size: 14px;">
      Partner eklemek istediğiniz kanalı aşağıdan arayın veya listeden seçin.
    </p>
    <div class="yt-form-group">
      <label class="yt-form-label">Kanal Ara</label>
      <input type="text" id="partnerChannelName" class="yt-input" placeholder="Kanal adı yaz..." oninput="searchPartnerChannels()" />
    </div>
    <div id="partnerSearchResult" style="max-height:300px; overflow-y:auto;"></div>
  `, 'Partner Kanal Ekle');

  // Sayfa açılınca tüm kanalları göster
  searchPartnerChannels();
}

async function searchPartnerChannels() {
  const q = document.getElementById('partnerChannelName')?.value || '';
  const resultDiv = document.getElementById('partnerSearchResult');
  if (!resultDiv) return;

  try {
    const res = await fetch(`${API_URL}/search-channels?q=${encodeURIComponent(q || ' ')}`);
    const channels = await res.json();

    if (!channels || channels.length === 0) {
      resultDiv.innerHTML = '<p style="color: var(--yt-spec-text-secondary); font-size:13px; padding:8px;">Kanal bulunamadı</p>';
      return;
    }

    // Kendi kanalını filtrele
    const filtered = channels.filter(c => c.id !== currentChannel?.id);

    resultDiv.innerHTML = filtered.map(c => `
      <div style="display:flex; align-items:center; gap:12px; padding:10px; background:var(--yt-spec-raised-background); border-radius:8px; margin-bottom:8px; cursor:pointer; transition:background 0.15s;"
           onmouseover="this.style.background='rgba(255,255,255,0.1)'"
           onmouseout="this.style.background='var(--yt-spec-raised-background)'">
        <img src="${getProfilePhotoUrl(c.profile_photo)}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; flex-shrink:0;" />
        <div style="flex:1; min-width:0;">
          <p style="font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.channel_name}</p>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary);">@${c.username} • ${c.subscriber_count} abone</p>
        </div>
        <button class="yt-btn" onclick="sendPartnerRequest(${c.id})">İstek Gönder</button>
      </div>
    `).join('');
  } catch(e) {
    console.error(e);
  }
}

async function sendPartnerRequest(targetChannelId) {
  try {
    const res = await fetch(`${API_URL}/supporter-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: currentChannel.id, supporterChannelId: targetChannelId })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Partner isteği gönderildi!', 'success');
      closeModal();
    } else {
      showToast(data.error || 'İstek gönderilemedi', 'error');
    }
  } catch(e) {
    showToast('Hata oluştu', 'error');
  }
}

// Kanal düzenleme
function showEditChannelModal() {
  const modalContent = `
    <div class="yt-form-group">
      <label class="yt-form-label">Kanal Adı</label>
      <input type="text" id="editChannelName" class="yt-input" value="${currentChannel.channel_name}" />
    </div>
    
    <div class="yt-form-group">
      <label class="yt-form-label">Hakkında</label>
      <textarea id="editChannelAbout" class="yt-textarea">${currentChannel.about || ''}</textarea>
    </div>
    
    <div class="yt-form-group">
      <label class="yt-form-label">Kanal Türü</label>
      <input type="text" id="editChannelType" class="yt-input" value="${currentChannel.channel_type || ''}" placeholder="Örn: Gaming, Müzik, Eğitim..." />
    </div>
    
    <div class="yt-form-group">
      <label class="yt-form-label">Kanal Etiketleri (virgülle ayırın)</label>
      <input type="text" id="editChannelTags" class="yt-input" value="${currentChannel.channel_tags || ''}" placeholder="etiket1, etiket2" />
    </div>
    
    <div class="yt-form-group">
      <label class="yt-form-label">Bağlantılar (virgülle ayırın)</label>
      <input type="text" id="editChannelLinks" class="yt-input" value="${currentChannel.links || ''}" placeholder="https://..." />
    </div>
    
    <div class="yt-form-group">
      <label class="yt-form-label">Kanal Banner</label>
      <input type="file" id="editChannelBanner" class="yt-input" accept="image/*" />
    </div>
    
    <div style="display: flex; gap: 12px; margin-top: 8px;">
      <button class="yt-btn" onclick="updateChannel()" >Güncelle</button>
      <button class="yt-btn yt-btn-secondary" onclick="closeModal()" >İptal</button>
    </div>
  `;

  showModal(modalContent, 'Kanalı Düzenle');
}

async function updateChannel() {
  const channelName = document.getElementById('editChannelName').value.trim();
  const about = document.getElementById('editChannelAbout').value.trim();
  const channelType = document.getElementById('editChannelType').value.trim();
  const channelTags = document.getElementById('editChannelTags').value.trim();
  const links = document.getElementById('editChannelLinks').value.trim();
  const bannerFile = document.getElementById('editChannelBanner').files[0];

  if (!channelName) {
    alert('Kanal adı gerekli');
    return;
  }

  const formData = new FormData();
  formData.append('channelName', channelName);
  formData.append('about', about);
  formData.append('channelType', channelType);
  formData.append('channelTags', channelTags);
  formData.append('links', links);
  if (bannerFile) {
    formData.append('channel_banner', bannerFile);
  }

  try {
    const response = await fetch(`${API_URL}/channel/${currentChannel.id}`, {
      method: 'PUT',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      alert('Kanal güncellendi!');
      closeModal();
      
      // Kanalı yeniden yükle
      const channelResponse = await fetch(`${API_URL}/channel/user/${currentUser.id}`);
      currentChannel = await channelResponse.json();
      
      loadProfilePage();
    } else {
      alert(data.error || 'Kanal güncellenemedi');
    }
  } catch (error) {
    console.error('Kanal güncelleme hatası:', error);
    alert('Kanal güncelleme sırasında hata oluştu');
  }
}

// Bildirimleri periyodik olarak kontrol et
setInterval(() => {
  if (currentUser) {
    loadNotifications();
  }
}, 30000); // 30 saniyede bir


// Toast Notification Sistemi
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Loading Overlay
function showLoading() {
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="loading-spinner"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    document.body.removeChild(overlay);
  }
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K: Arama odağı
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput')?.focus();
  }
  
  // Escape: Modal kapat
  if (e.key === 'Escape') {
    closeModal();
  }
  
  // Ctrl/Cmd + U: Video yükle (kanal varsa)
  if ((e.ctrlKey || e.metaKey) && e.key === 'u' && currentChannel) {
    e.preventDefault();
    showUploadVideoModal();
  }
});

// Infinite Scroll
let isLoadingMore = false;
let currentVideoPage = 1;

function setupInfiniteScroll() {
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) return;
  
  mainContent.addEventListener('scroll', () => {
    if (isLoadingMore) return;
    
    const scrollTop = mainContent.scrollTop;
    const scrollHeight = mainContent.scrollHeight;
    const clientHeight = mainContent.clientHeight;
    
    if (scrollTop + clientHeight >= scrollHeight - 500) {
      loadMoreVideos();
    }
  });
}

async function loadMoreVideos() {
  if (currentPage !== 'home') return;
  
  isLoadingMore = true;
  currentVideoPage++;
  
  try {
    const response = await fetch(`${API_URL}/videos?page=${currentVideoPage}&limit=20`);
    const videos = await response.json();
    
    if (videos.length > 0) {
      const container = document.querySelector('.video-grid');
      videos.forEach(video => {
        const videoCard = createVideoCard(video);
        container.appendChild(videoCard);
      });
    }
  } catch (error) {
    console.error('Daha fazla video yükleme hatası:', error);
  } finally {
    isLoadingMore = false;
  }
}

function createVideoCard(video) {
  const card = document.createElement('div');
  card.className = 'video-card hover-lift';
  card.onclick = () => playVideo(video.id);
  
  card.innerHTML = `
    <img src="${video.banner_url}" alt="${video.title}" class="video-thumbnail" />
    <div class="video-info">
      <h3 class="video-title">${video.title}</h3>
      <div class="video-meta">
        <img src="${video.profile_photo === '?' ? 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14" fill="%23fff">?</text></svg>' : video.profile_photo}" alt="${video.nickname}" />
        <span>${video.channel_name}</span>
      </div>
      <div class="video-meta">
        <span><i class="fas fa-eye"></i> ${formatNumber(video.views)} görüntülenme</span>
        <span><i class="fas fa-thumbs-up"></i> ${formatNumber(video.likes)}</span>
      </div>
    </div>
  `;
  
  return card;
}

// Sayı formatlama
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Tarih formatlama
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} yıl önce`;
  if (months > 0) return `${months} ay önce`;
  if (days > 0) return `${days} gün önce`;
  if (hours > 0) return `${hours} saat önce`;
  if (minutes > 0) return `${minutes} dakika önce`;
  return 'Az önce';
}

// Video süre formatlama
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Clipboard kopyalama
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Panoya kopyalandı', 'success');
  } catch (error) {
    console.error('Kopyalama hatası:', error);
    showToast('Kopyalama başarısız', 'error');
  }
}

// Video paylaşma
function shareVideo(videoId, title) {
  const url = `${window.location.origin}/?video=${videoId}`;
  
  if (navigator.share) {
    navigator.share({
      title: title,
      text: `${title} - Tea'da izle`,
      url: url
    }).catch(err => console.log('Paylaşma iptal edildi'));
  } else {
    copyToClipboard(url);
  }
}

// Tam ekran toggle
function toggleFullscreen(element) {
  if (!document.fullscreenElement) {
    element.requestFullscreen().catch(err => {
      console.error('Tam ekran hatası:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// Sayfa görünürlüğü değiştiğinde
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Sayfa gizlendiğinde videoları duraklat
    const videos = document.querySelectorAll('video');
    videos.forEach(video => video.pause());
  }
});

// Online/Offline durumu
window.addEventListener('online', () => {
  showToast('İnternet bağlantısı geri geldi', 'success');
});

window.addEventListener('offline', () => {
  showToast('İnternet bağlantısı kesildi', 'error');
});

// Sayfa yüklendiğinde infinite scroll'u başlat
document.addEventListener('DOMContentLoaded', () => {
  setupInfiniteScroll();
});

// URL parametrelerinden video ID'si varsa oynat
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('video');
  if (videoId && currentUser) {
    playVideo(parseInt(videoId));
  }
});

// Performans optimizasyonu: Debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Arama için debounce
const debouncedSearch = debounce(() => {
  search();
}, 500);

// Arama inputuna debounce ekle
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debouncedSearch);
  }
});

// Hata yakalama
window.addEventListener('error', (e) => {
  console.error('Global hata:', e.error);
  showToast('Bir hata oluştu', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Promise hatası:', e.reason);
  showToast('Bir hata oluştu', 'error');
});

// Console log override (production için)
if (window.location.hostname !== 'localhost') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// Sayfa kapatılırken uyarı (form doluysa)
window.addEventListener('beforeunload', (e) => {
  const inputs = document.querySelectorAll('input[type="text"], textarea');
  let hasContent = false;
  
  inputs.forEach(input => {
    if (input.value.trim().length > 0) {
      hasContent = true;
    }
  });
  
  if (hasContent && document.getElementById('modal').style.display === 'block') {
    e.preventDefault();
    e.returnValue = '';
  }
});

console.log('%cTea v1.0.0', 'color: #ff0000; font-size: 24px; font-weight: bold;');
console.log('%cVideo Paylaşım Platformu', 'color: #666; font-size: 14px;');
console.log('%c⚠️ Bu konsolu kullanarak kod çalıştırmayın!', 'color: #ff0000; font-size: 16px; font-weight: bold;');




// Kullanım Koşulları Sayfası
function loadTermsPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
      <h2 class="section-header">Kullanım Koşulları</h2>
      
      <div class="settings-card">
        <h3 class="settings-card-title">Tea KVKK Açıklama Metni</h3>
        <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 12px; font-size: 16px;">Kişisel Verilerin Korunması ve İşlenmesine İlişkin Açıklama</h4>
        <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; margin-bottom: 20px;">
          Tea uygulamasına üye olarak veya giriş yaparak, aşağıdaki kişisel veri işleme yöntemlerini ve haklarınızı kabul etmiş olursunuz.
        </p>
        
        <h4 style="color: var(--yt-spec-text-primary); margin: 24px 0 12px; font-size: 15px;">Toplanan Kişisel Veriler</h4>
        <ul style="color: var(--yt-spec-text-secondary); line-height: 1.8; padding-left: 24px; margin-bottom: 20px;">
          <li>Kullanıcı adı, takma ad, şifre (hashlenmiş), IP adresi</li>
          <li>Profil fotoğrafı</li>
          <li>Video yükleme sırasında gönderilen banner ve video URL bilgileri</li>
          <li>Abonelik, favori ve kaydedilen videolarla ilgili bilgiler</li>
          <li>Uygulama içi kullanım istatistikleri (izlenen videolar, etkileşimler)</li>
          <li>Mesajlaşma ve arkadaşlık verileri</li>
        </ul>
        
        <h4 style="color: var(--yt-spec-text-primary); margin: 24px 0 12px; font-size: 15px;">Veri İşleme Amaçları</h4>
        <ul style="color: var(--yt-spec-text-secondary); line-height: 1.8; padding-left: 24px; margin-bottom: 20px;">
          <li>Kullanıcı kimliğini doğrulamak ve hesap güvenliğini sağlamak</li>
          <li>Kullanıcı deneyimini iyileştirmek ve öneri algoritmasını çalıştırmak</li>
          <li>Uygulama içi hataları ve güvenlik tehditlerini tespit etmek</li>
          <li>Beta sürecinde sistem testleri ve performans ölçümleri yapmak</li>
          <li>Kullanıcılar arası iletişimi sağlamak</li>
        </ul>
        
        <h4 style="color: var(--yt-spec-text-primary); margin: 24px 0 12px; font-size: 15px;">Veri Saklama Süresi</h4>
        <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; margin-bottom: 20px;">
          Kullanıcı verileri, hesabınız aktif olduğu sürece ve uygulama faaliyetleri boyunca saklanır. Kullanıcı hesabı silinirse, kişisel veriler makul bir süre içerisinde sistemden kalıcı olarak silinir.
        </p>
        
        <h4 style="color: var(--yt-spec-text-primary); margin: 24px 0 12px; font-size: 15px;">Veri Paylaşımı</h4>
        <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; margin-bottom: 20px;">
          Kullanıcı verileri üçüncü taraflarla paylaşılmaz. Sadece yasal zorunluluk hâlinde veya sistem güvenliği için yetkili kişilerle paylaşılır.
        </p>
        
        <h4 style="color: var(--yt-spec-text-primary); margin: 24px 0 12px; font-size: 15px;">Veri Güvenliği Önlemleri</h4>
        <ul style="color: var(--yt-spec-text-secondary); line-height: 1.8; padding-left: 24px; margin-bottom: 20px;">
          <li>Şifreler bcrypt ile hashlenir, düz metin olarak saklanmaz</li>
          <li>IP adresleri yalnızca güvenlik ve erişim logları için kaydedilir</li>
          <li>Veritabanı ve depolama servisleri SSL/TLS ile korunur</li>
          <li>Depolama servisleri (Cloudinary, Firebase) veri güvenliği standartlarına uygundur</li>
          <li>Başarısız giriş denemeleri takip edilir ve otomatik IP engelleme yapılır</li>
        </ul>
        
        <h4 style="color: var(--yt-spec-text-primary); margin: 24px 0 12px; font-size: 15px;">Kullanıcı Hakları</h4>
        <ul style="color: var(--yt-spec-text-secondary); line-height: 1.8; padding-left: 24px; margin-bottom: 20px;">
          <li>Kendi kişisel verilerinize erişme ve doğrulama</li>
          <li>Yanlış veya eksik verilerin düzeltilmesini talep etme</li>
          <li>Verilerinizin silinmesini talep etme</li>
          <li>Veri işleme ve paylaşımı ile ilgili itirazda bulunma</li>
          <li>Arama ve izleme geçmişinizi istediğiniz zaman temizleme</li>
          <li>Hesabınızı gizli yaparak içeriklerinizi sadece takipçilerinizle paylaşma</li>
        </ul>
        
        <h4 style="color: var(--yt-spec-text-primary); margin: 24px 0 12px; font-size: 15px;">İçerik Yönetimi</h4>
        <ul style="color: var(--yt-spec-text-secondary); line-height: 1.8; padding-left: 24px; margin-bottom: 20px;">
          <li>Yüklediğiniz videolar ve fotoğraflar üzerinde tam kontrole sahipsiniz</li>
          <li>İçeriklerinizi istediğiniz zaman düzenleyebilir veya silebilirsiniz</li>
          <li>Yorumları ve beğenileri kapatma/açma seçeneğiniz vardır</li>
          <li>İçeriklerinizi gizleyerek sadece siz görebilirsiniz</li>
        </ul>
        
        <h4 style="color: var(--yt-spec-text-primary); margin: 24px 0 12px; font-size: 15px;">Onay ve Kabul</h4>
        <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; margin-bottom: 20px;">
          Tea'a giriş yaparak veya üye olarak, yukarıda belirtilen kişisel veri işleme kurallarını ve güvenlik önlemlerini kabul etmiş olursunuz.
        </p>
        
        <div style="background: rgba(255,0,51,0.1); border-left: 3px solid var(--yt-spec-brand-background-solid); padding: 16px; border-radius: 8px; margin-top: 24px;">
          <p style="color: var(--yt-spec-text-primary); font-weight: 500; margin-bottom: 8px;">
            <i class="fas fa-info-circle" style="margin-right: 8px;"></i>Önemli Not
          </p>
          <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; font-size: 14px;">
            Bu kullanım koşulları, Tea platformunun beta sürümü için geçerlidir. Kullanım koşulları güncellendiğinde, değişiklikler bu sayfada yayınlanacaktır.
          </p>
        </div>
      </div>
    </div>
  `;
}

// Kullanım koşullarını modal olarak göster (kayıt ekranı için)
function showTermsPage() {
  const termsText = `
    <div style="max-height: 60vh; overflow-y: auto; padding-right: 8px;">
      <h3 style="color: var(--yt-spec-text-primary); margin-bottom: 16px;">Tea KVKK Açıklama Metni</h3>
      <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 12px; font-size: 15px;">Kişisel Verilerin Korunması ve İşlenmesine İlişkin Açıklama</h4>
      <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; margin-bottom: 16px; font-size: 14px;">
        Tea uygulamasına üye olarak veya giriş yaparak, aşağıdaki kişisel veri işleme yöntemlerini ve haklarınızı kabul etmiş olursunuz.
      </p>
      
      <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 10px; font-size: 14px;">Toplanan Kişisel Veriler</h4>
      <ul style="color: var(--yt-spec-text-secondary); line-height: 1.7; padding-left: 20px; margin-bottom: 16px; font-size: 13px;">
        <li>Kullanıcı adı, takma ad, şifre (hashlenmiş), IP adresi</li>
        <li>Profil fotoğrafı</li>
        <li>Video yükleme sırasında gönderilen banner ve video URL bilgileri</li>
        <li>Abonelik, favori ve kaydedilen videolarla ilgili bilgiler</li>
        <li>Uygulama içi kullanım istatistikleri (izlenen videolar, etkileşimler)</li>
        <li>Mesajlaşma ve arkadaşlık verileri</li>
      </ul>
      
      <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 10px; font-size: 14px;">Veri İşleme Amaçları</h4>
      <ul style="color: var(--yt-spec-text-secondary); line-height: 1.7; padding-left: 20px; margin-bottom: 16px; font-size: 13px;">
        <li>Kullanıcı kimliğini doğrulamak ve hesap güvenliğini sağlamak</li>
        <li>Kullanıcı deneyimini iyileştirmek ve öneri algoritmasını çalıştırmak</li>
        <li>Uygulama içi hataları ve güvenlik tehditlerini tespit etmek</li>
        <li>Beta sürecinde sistem testleri ve performans ölçümleri yapmak</li>
        <li>Kullanıcılar arası iletişimi sağlamak</li>
      </ul>
      
      <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 10px; font-size: 14px;">Veri Saklama Süresi</h4>
      <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; margin-bottom: 16px; font-size: 13px;">
        Kullanıcı verileri, hesabınız aktif olduğu sürece ve uygulama faaliyetleri boyunca saklanır. Kullanıcı hesabı silinirse, kişisel veriler makul bir süre içerisinde sistemden kalıcı olarak silinir.
      </p>
      
      <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 10px; font-size: 14px;">Veri Paylaşımı</h4>
      <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; margin-bottom: 16px; font-size: 13px;">
        Kullanıcı verileri üçüncü taraflarla paylaşılmaz. Sadece yasal zorunluluk hâlinde veya sistem güvenliği için yetkili kişilerle paylaşılır.
      </p>
      
      <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 10px; font-size: 14px;">Veri Güvenliği Önlemleri</h4>
      <ul style="color: var(--yt-spec-text-secondary); line-height: 1.7; padding-left: 20px; margin-bottom: 16px; font-size: 13px;">
        <li>Şifreler bcrypt ile hashlenir, düz metin olarak saklanmaz</li>
        <li>IP adresleri yalnızca güvenlik ve erişim logları için kaydedilir</li>
        <li>Veritabanı ve depolama servisleri SSL/TLS ile korunur</li>
        <li>Depolama servisleri (Cloudinary, Firebase) veri güvenliği standartlarına uygundur</li>
        <li>Başarısız giriş denemeleri takip edilir ve otomatik IP engelleme yapılır</li>
      </ul>
      
      <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 10px; font-size: 14px;">Kullanıcı Hakları</h4>
      <ul style="color: var(--yt-spec-text-secondary); line-height: 1.7; padding-left: 20px; margin-bottom: 16px; font-size: 13px;">
        <li>Kendi kişisel verilerinize erişme ve doğrulama</li>
        <li>Yanlış veya eksik verilerin düzeltilmesini talep etme</li>
        <li>Verilerinizin silinmesini talep etme</li>
        <li>Veri işleme ve paylaşımı ile ilgili itirazda bulunma</li>
        <li>Arama ve izleme geçmişinizi istediğiniz zaman temizleme</li>
        <li>Hesabınızı gizli yaparak içeriklerinizi sadece takipçilerinizle paylaşma</li>
      </ul>
      
      <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 10px; font-size: 14px;">İçerik Yönetimi</h4>
      <ul style="color: var(--yt-spec-text-secondary); line-height: 1.7; padding-left: 20px; margin-bottom: 16px; font-size: 13px;">
        <li>Yüklediğiniz videolar ve fotoğraflar üzerinde tam kontrole sahipsiniz</li>
        <li>İçeriklerinizi istediğiniz zaman düzenleyebilir veya silebilirsiniz</li>
        <li>Yorumları ve beğenileri kapatma/açma seçeneğiniz vardır</li>
        <li>İçeriklerinizi gizleyerek sadece siz görebilirsiniz</li>
      </ul>
      
      <h4 style="color: var(--yt-spec-text-primary); margin: 20px 0 10px; font-size: 14px;">Onay ve Kabul</h4>
      <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; margin-bottom: 16px; font-size: 13px;">
        Tea'a giriş yaparak veya üye olarak, yukarıda belirtilen kişisel veri işleme kurallarını ve güvenlik önlemlerini kabul etmiş olursunuz.
      </p>
      
      <div style="background: rgba(255,0,51,0.1); border-left: 3px solid var(--yt-spec-brand-background-solid); padding: 12px; border-radius: 6px; margin-top: 20px;">
        <p style="color: var(--yt-spec-text-primary); font-weight: 500; margin-bottom: 6px; font-size: 13px;">
          <i class="fas fa-info-circle" style="margin-right: 6px;"></i>Önemli Not
        </p>
        <p style="color: var(--yt-spec-text-secondary); line-height: 1.6; font-size: 12px;">
          Bu kullanım koşulları, Tea platformunun beta sürümü için geçerlidir. Kullanım koşulları güncellendiğinde, değişiklikler bu sayfada yayınlanacaktır.
        </p>
      </div>
    </div>
  `;
  
  showModal(termsText, 'Kullanım Koşulları');
}


// Yorum menüsünü göster (video sahibi için)
function showCommentMenu(commentId, videoId, isPinned, isHidden, likedByOwner) {
  const menu = document.createElement('div');
  menu.style.cssText = `
    position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.6);
    display:flex; align-items:flex-end;
  `;
  menu.innerHTML = `
    <div style="width:100%; background:var(--yt-spec-raised-background); border-radius:20px 20px 0 0; padding:20px 16px 32px;">
      <div style="width:40px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:0 auto 20px;"></div>
      
      <button onclick="togglePinComment(${commentId}, ${videoId}, ${!isPinned}); document.getElementById('commentMenu').remove();"
        style="width:100%; display:flex; align-items:center; gap:16px; background:none; border:none; color:var(--yt-spec-text-primary); padding:14px 8px; font-size:16px; cursor:pointer; border-radius:10px;">
        <div style="width:44px; height:44px; background:rgba(255,0,51,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-thumbtack" style="color:#ff0033; font-size:18px;"></i>
        </div>
        <div style="text-align:left;">
          <p style="font-weight:600; margin-bottom:2px;">${isPinned ? 'Sabitlemeyi Kaldır' : 'Yorumu Sabitle'}</p>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary);">${isPinned ? 'Sabitlemeyi kaldır' : 'Yorumu en üste sabitle'}</p>
        </div>
      </button>
      
      <button onclick="toggleHideComment(${commentId}, ${videoId}, ${!isHidden}); document.getElementById('commentMenu').remove();"
        style="width:100%; display:flex; align-items:center; gap:16px; background:none; border:none; color:var(--yt-spec-text-primary); padding:14px 8px; font-size:16px; cursor:pointer; border-radius:10px;">
        <div style="width:44px; height:44px; background:rgba(255,165,0,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-eye-slash" style="color:orange; font-size:18px;"></i>
        </div>
        <div style="text-align:left;">
          <p style="font-weight:600; margin-bottom:2px;">${isHidden ? 'Askıdan Kaldır' : 'Askıya Al'}</p>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary);">${isHidden ? 'Yorumu tekrar göster' : 'Yorumu gizle'}</p>
        </div>
      </button>
      
      <button onclick="toggleOwnerLike(${commentId}, ${videoId}, ${!likedByOwner}); document.getElementById('commentMenu').remove();"
        style="width:100%; display:flex; align-items:center; gap:16px; background:none; border:none; color:var(--yt-spec-text-primary); padding:14px 8px; font-size:16px; cursor:pointer; border-radius:10px;">
        <div style="width:44px; height:44px; background:rgba(255,0,51,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-heart" style="color:#ff0033; font-size:18px;"></i>
        </div>
        <div style="text-align:left;">
          <p style="font-weight:600; margin-bottom:2px;">${likedByOwner ? 'Beğeniyi Kaldır' : 'Beğen'}</p>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary);">${likedByOwner ? 'Beğeni işaretini kaldır' : 'Yorumu beğenildi olarak işaretle'}</p>
        </div>
      </button>
      
      <button onclick="document.getElementById('commentMenu').remove()"
        style="width:100%; background:rgba(255,255,255,0.06); border:none; color:var(--yt-spec-text-secondary); padding:14px; border-radius:10px; font-size:14px; cursor:pointer; margin-top:8px;">
        İptal
      </button>
    </div>
  `;
  menu.id = 'commentMenu';
  menu.addEventListener('click', e => { if (e.target === menu) menu.remove(); });
  document.body.appendChild(menu);
}

// Yorumu sabitle/sabitlemeyi kaldır
async function togglePinComment(commentId, videoId, pin) {
  try {
    const res = await fetch(`${API_URL}/comment/${commentId}/pin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, videoId, pin })
    });
    if (res.ok) {
      showToast(pin ? 'Yorum sabitlendi' : 'Sabitleme kaldırıldı', 'success');
      // Video detayını yeniden yükle
      const videoData = await fetch(`${API_URL}/video/${videoId}?userId=${currentUser.id}`).then(r => r.json());
      loadComments(videoId, videoData.user_id);
    }
  } catch(e) {
    showToast('Hata', 'error');
  }
}

// Yorumu askıya al/kaldır
async function toggleHideComment(commentId, videoId, hide) {
  try {
    const res = await fetch(`${API_URL}/comment/${commentId}/hide`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, videoId, isHidden: hide })
    });
    if (res.ok) {
      showToast(hide ? 'Yorum askıya alındı' : 'Askıdan kaldırıldı', 'success');
      const videoData = await fetch(`${API_URL}/video/${videoId}?userId=${currentUser.id}`).then(r => r.json());
      loadComments(videoId, videoData.user_id);
    }
  } catch(e) {
    showToast('Hata', 'error');
  }
}

// Video sahibi beğenisi
async function toggleOwnerLike(commentId, videoId, liked) {
  try {
    const res = await fetch(`${API_URL}/comment/${commentId}/owner-like`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, videoId, liked })
    });
    if (res.ok) {
      showToast(liked ? 'Yorum beğenildi olarak işaretlendi' : 'Beğeni kaldırıldı', 'success');
      const videoData = await fetch(`${API_URL}/video/${videoId}?userId=${currentUser.id}`).then(r => r.json());
      loadComments(videoId, videoData.user_id);
    }
  } catch(e) {
    showToast('Hata', 'error');
  }
}

// Kullanıcı engelleme
async function blockUserFromComment(userId, nickname) {
  if (!confirm(`${nickname} kullanıcısını engellemek istediğinize emin misiniz? Bu kullanıcı size mesaj gönderemez, yorumlarınızı göremez ve içeriklerinize erişemez.`)) {
    return;
  }

  try {
    // Cihaz ID'si oluştur (tarayıcı fingerprint)
    const deviceId = await getDeviceId();
    
    // IP adresini al (backend'de de alınacak ama frontend'den de gönderelim)
    const res = await fetch(`${API_URL}/block-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockerId: currentUser.id,
        blockedId: userId,
        blockedDevice: deviceId
      })
    });

    if (res.ok) {
      showToast(`${nickname} engellendi`, 'success');
    } else {
      showToast('Engelleme başarısız', 'error');
    }
  } catch(e) {
    showToast('Hata', 'error');
  }
}

// Cihaz ID'si oluştur (basit fingerprint)
async function getDeviceId() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);
  const canvasData = canvas.toDataURL();
  
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvasData.substring(0, 100)
  ].join('|');
  
  // Basit hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'device_' + Math.abs(hash).toString(36);
}

// Engellenen kullanıcıları göster
async function showBlockedUsers() {
  try {
    const res = await fetch(`${API_URL}/blocked-users/${currentUser.id}`);
    const blocked = await res.json();

    const content = `
      <h3 style="margin-bottom:16px;">Engellenen Kullanıcılar</h3>
      ${blocked.length === 0 ? '<p style="color:var(--yt-spec-text-secondary);">Henüz engellenmiş kullanıcı yok</p>' : ''}
      ${blocked.map(b => `
        <div style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--yt-spec-raised-background); border-radius:8px; margin-bottom:8px;">
          <img src="${getProfilePhotoUrl(b.profile_photo)}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />
          <div style="flex:1;">
            <p style="font-weight:500;">${b.nickname}</p>
            <p style="font-size:12px; color:var(--yt-spec-text-secondary);">@${b.username}</p>
          </div>
          <button class="yt-btn yt-btn-secondary" onclick="unblockUser(${b.blocked_id}, '${b.nickname}')" style="padding:8px 16px; font-size:13px;">
            Engeli Kaldır
          </button>
        </div>
      `).join('')}
    `;

    showModal(content, 'Engellenen Kullanıcılar');
  } catch(e) {
    showToast('Hata', 'error');
  }
}

// Engeli kaldır
async function unblockUser(blockedId, nickname) {
  if (!confirm(`${nickname} kullanıcısının engelini kaldırmak istediğinize emin misiniz?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_URL}/block-user/${currentUser.id}/${blockedId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showToast('Engel kaldırıldı', 'success');
      closeModal();
      showBlockedUsers();
    }
  } catch(e) {
    showToast('Hata', 'error');
  }
}


// ==================== TS MUSIC ====================
let tsMusicAudio = null;
let tsMusicCurrentSong = null;
let tsMusicIsPlaying = false;

async function loadTSMusicPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<div class="yt-loading"><div class="yt-spinner"></div></div>';
  try {
    const [statusRes, homeRes] = await Promise.all([
      fetch(API_URL + '/music/apply/status/' + currentUser.id).catch(() => null),
      fetch(API_URL + '/music/home').catch(() => null)
    ]);
    const status = statusRes ? await statusRes.json() : {};
    const homeData = homeRes ? await homeRes.json() : { newSongs:[], newArtists:[], popularSongs:[] };
    const isArtist = !!(status && status.artist);
    const hasPending = !!(status && status.application && status.application.status === 'pending');
    const isRejected = !!(status && status.application && status.application.status === 'rejected');
    renderTSMusicHome(homeData, isArtist, hasPending, isRejected, status);
  } catch(e) {
    document.getElementById('pageContent').innerHTML = '<p style="color:red">Hata: ' + e.message + '</p>';
  }
}

function renderTSMusicHome(data, isArtist, hasPending, isRejected, status) {
  const pageContent = document.getElementById('pageContent');
  
  let topBanner = '';
  if (isArtist) {
    topBanner = `<button class="yt-btn" onclick="showUploadSongModal()" style="margin-bottom:16px"><i class="fas fa-upload" style="margin-right:6px"></i>Şarkı Yükle</button>`;
  } else if (hasPending) {
    topBanner = `<div style="background:rgba(255,200,0,0.1);border:1px solid rgba(255,200,0,0.3);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#ffc800"><i class="fas fa-clock" style="margin-right:6px"></i>Başvurunuz inceleniyor...</div>`;
  } else if (isRejected) {
    const note = status.application && status.application.admin_note ? ' Not: ' + status.application.admin_note : '';
    topBanner = `<div style="background:rgba(255,0,51,0.1);border:1px solid rgba(255,0,51,0.3);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px"><i class="fas fa-times-circle" style="margin-right:6px;color:#ff0033"></i>Başvurunuz reddedildi.${note} <button class="yt-btn" onclick="showArtistApplyModal()" style="margin-left:8px;height:28px;padding:0 12px;font-size:12px">Tekrar Başvur</button></div>`;
  } else {
    topBanner = `<div style="margin-bottom:16px"><button class="yt-btn" onclick="showArtistApplyModal()" style="background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)"><i class="fas fa-microphone" style="margin-right:6px"></i>Artist Ol</button></div>`;
  }

  const popularHtml = (data.popularSongs || []).length
    ? `<h3 style="font-size:15px;font-weight:600;margin-bottom:12px">Popüler</h3><div style="display:flex;flex-direction:column;gap:4px;margin-bottom:24px">${(data.popularSongs || []).map(s => renderTSSongRow(s)).join('')}</div>`
    : '';

  const artistsHtml = (data.newArtists || []).length
    ? `<h3 style="font-size:15px;font-weight:600;margin-bottom:12px">Yeni Sanatçılar</h3><div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;margin-bottom:24px">${(data.newArtists || []).map(a => renderTSArtistCard(a)).join('')}</div>`
    : '';

  const newSongsHtml = (data.newSongs || []).length
    ? (data.newSongs || []).map(s => renderTSSongRow(s)).join('')
    : '<p style="color:var(--yt-spec-text-secondary)">Henüz şarkı yok</p>';

  pageContent.innerHTML = `
    <div style="padding-bottom:120px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <h2 style="font-size:22px;font-weight:700"><i class="fas fa-music" style="color:#1db954;margin-right:8px"></i>TS Music</h2>
        <div style="display:flex;gap:8px">
          <button class="yt-btn" onclick="showTSMusicSearch()" style="background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)"><i class="fas fa-search"></i></button>
          <button class="yt-btn" onclick="showMyPlaylists()" style="background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)"><i class="fas fa-list"></i></button>
        </div>
      </div>
      ${topBanner}
      ${popularHtml}
      ${artistsHtml}
      <h3 style="font-size:15px;font-weight:600;margin-bottom:12px">Yeni Çıkanlar</h3>
      <div style="display:flex;flex-direction:column;gap:4px">${newSongsHtml}</div>
    </div>
  `;
}

function renderTSSongRow(s) {
  const playCount = s.show_play_count ? `<span style="font-size:11px;color:var(--yt-spec-text-secondary)">${s.play_count || 0} dinlenme</span>` : '';
  return `
    <div onclick="playSong(${s.id})" style="display:flex;align-items:center;gap:12px;padding:8px;border-radius:10px;cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
      <img src="${s.cover_url}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=48 height=48%3E%3Crect width=48 height=48 fill=%23333/%3E%3C/svg%3E'" />
      <div style="flex:1;min-width:0">
        <p style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title || ''}</p>
        <p style="font-size:12px;color:var(--yt-spec-text-secondary)">${s.artist_name || ''}</p>
      </div>
      ${playCount}
      <button onclick="event.stopPropagation();addToPlaylistPrompt(${s.id})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;padding:4px 8px"><i class="fas fa-plus"></i></button>
    </div>`;
}

function renderTSArtistCard(a) {
  const photo = a.cover_photo || a.profile_photo || '';
  return `
    <div onclick="viewArtistPage(${a.id})" style="flex-shrink:0;width:100px;cursor:pointer;text-align:center">
      <img src="${photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 6px;display:block" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=80 height=80%3E%3Ccircle cx=40 cy=40 r=40 fill=%23333/%3E%3C/svg%3E'" />
      <p style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.artist_name || ''}</p>
      <p style="font-size:11px;color:var(--yt-spec-text-secondary)">${a.song_count || 0} şarkı</p>
    </div>`;
}

async function playSong(songId) {
  try {
    const r = await fetch(API_URL + '/music/song/' + songId);
    const song = await r.json();
    if (!r.ok) return;
    if (tsMusicAudio) { tsMusicAudio.pause(); tsMusicAudio = null; }
    tsMusicCurrentSong = song;
    tsMusicAudio = new Audio(song.audio_url);
    tsMusicAudio.play();
    tsMusicIsPlaying = true;
    tsMusicAudio.onended = () => { tsMusicIsPlaying = false; updateTSMiniPlayer(); };
    updateTSMiniPlayer();
  } catch(e) { showToast('Şarkı yüklenemedi', 'error'); }
}

function updateTSMiniPlayer() {
  let player = document.getElementById('tsMiniPlayer');
  if (!tsMusicCurrentSong) { if (player) player.remove(); return; }
  if (!player) {
    player = document.createElement('div');
    player.id = 'tsMiniPlayer';
    player.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:5000;background:var(--yt-spec-raised-background);border-top:1px solid rgba(255,255,255,0.08);padding:10px 16px;display:flex;align-items:center;gap:12px;backdrop-filter:blur(10px)';
    document.body.appendChild(player);
  }
  const s = tsMusicCurrentSong;
  player.innerHTML = `
    <img src="${s.cover_url}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0" />
    <div style="flex:1;min-width:0">
      <p style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title || ''}</p>
      <p style="font-size:11px;color:var(--yt-spec-text-secondary)">${s.artist_name || ''}</p>
    </div>
    <button onclick="toggleTSMusicPlay()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;padding:4px 8px">
      <i class="fas ${tsMusicIsPlaying ? 'fa-pause' : 'fa-play'}"></i>
    </button>
    <button onclick="closeTSMiniPlayer()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:16px;padding:4px 8px">
      <i class="fas fa-times"></i>
    </button>`;
}

function toggleTSMusicPlay() {
  if (!tsMusicAudio) return;
  if (tsMusicIsPlaying) { tsMusicAudio.pause(); tsMusicIsPlaying = false; }
  else { tsMusicAudio.play(); tsMusicIsPlaying = true; }
  updateTSMiniPlayer();
}

function closeTSMiniPlayer() {
  if (tsMusicAudio) { tsMusicAudio.pause(); tsMusicAudio = null; }
  tsMusicCurrentSong = null; tsMusicIsPlaying = false;
  document.getElementById('tsMiniPlayer')?.remove();
}

function showTSMusicSearch() {
  showModal(`
    <h3 style="margin-bottom:16px">🔍 Müzik Ara</h3>
    <input id="musicSearchInput" class="yt-input" placeholder="Şarkı, sanatçı veya sözler..." style="width:100%;margin-bottom:12px" oninput="searchTSMusic(this.value)" />
    <div id="musicSearchResults"></div>
  `);
}

async function searchTSMusic(q) {
  const results = document.getElementById('musicSearchResults');
  if (!results || !q || q.length < 2) { if(results) results.innerHTML = ''; return; }
  results.innerHTML = '<div class="yt-loading"><div class="yt-spinner"></div></div>';
  try {
    const r = await fetch(API_URL + '/music/search?q=' + encodeURIComponent(q));
    const d = await r.json();
    let html = '';
    if (d.artists && d.artists.length) {
      html += '<p style="font-size:12px;color:var(--yt-spec-text-secondary);margin-bottom:8px">Sanatçılar</p>';
      html += d.artists.map(a => `<div onclick="viewArtistPage(${a.id});closeModal()" style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;background:var(--yt-spec-raised-background);margin-bottom:6px"><img src="${a.cover_photo||a.profile_photo||''}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" /><div><p style="font-size:13px;font-weight:500">${a.artist_name||''}</p><p style="font-size:11px;color:var(--yt-spec-text-secondary)">${a.song_count||0} şarkı</p></div></div>`).join('');
    }
    if (d.songs && d.songs.length) {
      html += '<p style="font-size:12px;color:var(--yt-spec-text-secondary);margin:8px 0">Şarkılar</p>';
      html += d.songs.map(s => `<div onclick="playSong(${s.id});closeModal()" style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;background:var(--yt-spec-raised-background);margin-bottom:6px"><img src="${s.cover_url}" style="width:36px;height:36px;border-radius:6px;object-fit:cover" /><div><p style="font-size:13px;font-weight:500">${s.title||''}</p><p style="font-size:11px;color:var(--yt-spec-text-secondary)">${s.artist_name||''}</p></div></div>`).join('');
    }
    results.innerHTML = html || '<p style="color:var(--yt-spec-text-secondary);text-align:center;padding:20px">Sonuç bulunamadı</p>';
  } catch(e) { results.innerHTML = '<p style="color:var(--yt-spec-text-secondary)">Arama hatası</p>'; }
}

async function viewArtistPage(artistId) {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<div class="yt-loading"><div class="yt-spinner"></div></div>';
  try {
    const r = await fetch(API_URL + '/music/artist/' + artistId);
    const d = await r.json();
    const { artist, songs } = d;
    pageContent.innerHTML = `
      <div style="padding-bottom:120px">
        <button onclick="loadTSMusicPage()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;margin-bottom:16px;font-size:13px"><i class="fas fa-arrow-left" style="margin-right:6px"></i>Geri</button>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
          <img src="${artist.cover_photo||artist.profile_photo||''}" style="width:80px;height:80px;border-radius:50%;object-fit:cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=80 height=80%3E%3Ccircle cx=40 cy=40 r=40 fill=%23333/%3E%3C/svg%3E'" />
          <div>
            <h2 style="font-size:20px;font-weight:700">${artist.artist_name||''}</h2>
            ${artist.artist_alias ? `<p style="font-size:13px;color:var(--yt-spec-text-secondary)">${artist.artist_alias}</p>` : ''}
            <p style="font-size:12px;color:var(--yt-spec-text-secondary);margin-top:4px">${artist.song_count||0} şarkı</p>
          </div>
        </div>
        ${artist.bio ? `<p style="font-size:13px;color:var(--yt-spec-text-secondary);margin-bottom:20px">${artist.bio}</p>` : ''}
        <h3 style="font-size:15px;font-weight:600;margin-bottom:12px">Şarkılar</h3>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${songs.length ? songs.map(s => renderTSSongRow(s)).join('') : '<p style="color:var(--yt-spec-text-secondary)">Henüz şarkı yok</p>'}
        </div>
      </div>`;
  } catch(e) { pageContent.innerHTML = '<p>Hata oluştu</p>'; }
}

async function showMyPlaylists() {
  try {
    const r = await fetch(API_URL + '/music/playlists/' + currentUser.id);
    const playlists = await r.json();
    showModal(`
      <h3 style="margin-bottom:16px">📋 Playlistlerim</h3>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input id="newPlaylistName" class="yt-input" placeholder="Yeni playlist adı..." style="flex:1" />
        <button class="yt-btn" onclick="createTSPlaylist()">Oluştur</button>
      </div>
      <div id="playlistList">
        ${playlists.length ? playlists.map(p => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--yt-spec-raised-background);border-radius:8px;margin-bottom:6px">
            <div onclick="viewTSPlaylist(${p.id});closeModal()" style="cursor:pointer;flex:1">
              <p style="font-size:14px;font-weight:500">${p.name||''}</p>
              <p style="font-size:12px;color:var(--yt-spec-text-secondary)">${p.song_count||0} şarkı</p>
            </div>
            <button onclick="deleteTSPlaylist(${p.id})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer"><i class="fas fa-trash"></i></button>
          </div>`).join('') : '<p style="color:var(--yt-spec-text-secondary);text-align:center;padding:20px">Henüz playlist yok</p>'}
      </div>`);
  } catch(e) { showToast('Hata', 'error'); }
}

async function createTSPlaylist() {
  const name = document.getElementById('newPlaylistName')?.value.trim();
  if (!name) return;
  await fetch(API_URL + '/music/playlist', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, name }) });
  showToast('Playlist oluşturuldu', 'success');
  showMyPlaylists();
}

async function deleteTSPlaylist(playlistId) {
  if (!confirm('Playlist silinsin mi?')) return;
  await fetch(API_URL + '/music/playlist/' + playlistId, { method:'DELETE' });
  showToast('Playlist silindi', 'success');
  showMyPlaylists();
}

async function viewTSPlaylist(playlistId) {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<div class="yt-loading"><div class="yt-spinner"></div></div>';
  try {
    const r = await fetch(API_URL + '/music/playlist/' + playlistId);
    const d = await r.json();
    pageContent.innerHTML = `
      <div style="padding-bottom:120px">
        <button onclick="loadTSMusicPage()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;margin-bottom:16px;font-size:13px"><i class="fas fa-arrow-left" style="margin-right:6px"></i>Geri</button>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:20px">${d.playlist.name||''}</h2>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${d.songs.length ? d.songs.map(s => renderTSSongRow(s)).join('') : '<p style="color:var(--yt-spec-text-secondary)">Playlist boş</p>'}
        </div>
      </div>`;
  } catch(e) { pageContent.innerHTML = '<p>Hata oluştu</p>'; }
}

async function addToPlaylistPrompt(songId) {
  try {
    const r = await fetch(API_URL + '/music/playlists/' + currentUser.id);
    const playlists = await r.json();
    if (!playlists.length) { showToast('Önce playlist oluştur', 'error'); return; }
    showModal(`<h3 style="margin-bottom:16px">Playlist Seç</h3>` +
      playlists.map(p => `<button onclick="addSongToTSPlaylist(${p.id},${songId});closeModal()" style="width:100%;background:var(--yt-spec-raised-background);border:none;color:var(--yt-spec-text-primary);padding:12px;border-radius:8px;margin-bottom:6px;cursor:pointer;text-align:left;font-size:14px">${p.name||''}</button>`).join(''));
  } catch(e) { showToast('Hata', 'error'); }
}

async function addSongToTSPlaylist(playlistId, songId) {
  await fetch(API_URL + '/music/playlist/' + playlistId + '/song', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ songId }) });
  showToast("Playlist'e eklendi", 'success');
}

function showArtistApplyModal() {
  showModal(`
    <h3 style="margin-bottom:16px">Artist Başvurusu</h3>
    <p style="font-size:13px;color:var(--yt-spec-text-secondary);margin-bottom:16px">TS Music'te şarkı yükleyebilmek için artist başvurusu yapman gerekiyor.</p>
    <div class="yt-form-group"><label class="yt-form-label">Ad Soyad *</label><input id="applyRealName" class="yt-input" placeholder="Gerçek adın ve soyadın" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Artist Adı *</label><input id="applyArtistName" class="yt-input" placeholder="Sahne adın" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Mahlas (opsiyonel)</label><input id="applyArtistAlias" class="yt-input" placeholder="Diğer adın" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Telefon</label><input id="applyPhone" class="yt-input" placeholder="+90 5xx xxx xx xx" /></div>
    <div class="yt-form-group"><label class="yt-form-label">E-posta</label><input id="applyEmail" class="yt-input" placeholder="ornek@mail.com" /></div>
    <button class="yt-btn" style="width:100%;margin-top:8px" onclick="submitArtistApply()">Başvuru Gönder</button>`);
}

async function submitArtistApply() {
  const realName = document.getElementById('applyRealName')?.value.trim();
  const artistName = document.getElementById('applyArtistName')?.value.trim();
  if (!realName) { showToast('Ad Soyad gerekli', 'error'); return; }
  if (!artistName) { showToast('Artist adı gerekli', 'error'); return; }
  try {
    const r = await fetch(API_URL + '/music/apply', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: currentUser.id, artistName, artistAlias: document.getElementById('applyArtistAlias')?.value.trim(), phone: document.getElementById('applyPhone')?.value.trim(), email: document.getElementById('applyEmail')?.value.trim(), realName })
    });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || 'Hata', 'error'); return; }
    showToast('Başvurunuz gönderildi!', 'success');
    closeModal();
    loadTSMusicPage();
  } catch(e) { showToast('Hata oluştu', 'error'); }
}

function showUploadSongModal() {
  showModal(`
    <h3 style="margin-bottom:16px">Şarkı Yükle</h3>
    <div class="yt-form-group"><label class="yt-form-label">Şarkı Adı *</label><input id="songTitle" class="yt-input" placeholder="Şarkı adı" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Tür</label><input id="songGenre" class="yt-input" placeholder="Pop, Rock, Hip-Hop..." /></div>
    <div class="yt-form-group"><label class="yt-form-label">Ses Dosyası * (MP3, WAV)</label><input type="file" id="songAudio" class="yt-input" accept="audio/*" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Kapak Fotoğrafı *</label><input type="file" id="songCover" class="yt-input" accept="image/*" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Şarkı Sözleri (opsiyonel)</label><textarea id="songLyrics" class="yt-input" style="height:80px;resize:vertical" placeholder="Şarkı sözleri..."></textarea></div>
    <button class="yt-btn" style="width:100%;margin-top:8px" onclick="uploadTSSong()">Yükle</button>`);
}

async function uploadTSSong() {
  const title = document.getElementById('songTitle')?.value.trim();
  const genre = document.getElementById('songGenre')?.value.trim();
  const audio = document.getElementById('songAudio')?.files[0];
  const cover = document.getElementById('songCover')?.files[0];
  const lyrics = document.getElementById('songLyrics')?.value.trim();
  if (!title || !audio || !cover) { showToast('Başlık, ses ve kapak gerekli', 'error'); return; }
  const formData = new FormData();
  formData.append('userId', currentUser.id);
  formData.append('title', title);
  if (genre) formData.append('genre', genre);
  if (lyrics) formData.append('lyrics', lyrics);
  formData.append('audio', audio);
  formData.append('cover', cover);
  closeModal();
  showToast('Yükleniyor...', 'success');
  try {
    const r = await fetch(API_URL + '/music/song', { method:'POST', body: formData });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || 'Yükleme hatası', 'error'); return; }
    showToast('Şarkı yüklendi!', 'success');
    loadTSMusicPage();
  } catch(e) { showToast('Yükleme hatası', 'error'); }
}


// ==================== GRUPLAR ====================

async function loadGroupsPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<div class="yt-loading"><div class="yt-spinner"></div></div>';

  try {
    const [myGroups, allGroups] = await Promise.all([
      fetch(`${API_URL}/groups/user/${currentUser.id}`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/groups/all?userId=${currentUser.id}`).then(r => r.json()).catch(() => [])
    ]);

    // Üye olmadığım gruplar
    const myGroupIds = new Set(myGroups.map(g => g.id));
    const otherGroups = allGroups.filter(g => !myGroupIds.has(g.id));

    pageContent.innerHTML = `
      <div style="max-width:700px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h2 class="section-header" style="margin:0">Gruplar</h2>
          <button class="yt-btn" onclick="showCreateGroupModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Grup Oluştur</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <input class="yt-input" id="groupSearchInput" placeholder="Grup ara..." oninput="searchGroups(this.value)" style="flex:1" />
        </div>
        <div id="groupSearchResults" style="margin-bottom:16px"></div>

        ${myGroups.length > 0 ? `
          <h3 style="font-size:14px;color:var(--yt-spec-text-secondary);margin-bottom:12px;font-weight:600">Gruplarım (${myGroups.length})</h3>
          <div style="margin-bottom:24px">
            ${myGroups.map(g => renderGroupCard(g)).join('')}
          </div>
        ` : ''}

        ${otherGroups.length > 0 ? `
          <h3 style="font-size:14px;color:var(--yt-spec-text-secondary);margin-bottom:12px;font-weight:600">Tüm Gruplar (${otherGroups.length})</h3>
          <div>
            ${otherGroups.map(g => renderGroupCard(g, true)).join('')}
          </div>
        ` : myGroups.length === 0 ? '<p style="color:var(--yt-spec-text-secondary)">Henüz grup yok</p>' : ''}
      </div>`;
  } catch(e) { pageContent.innerHTML = '<p>Hata oluştu</p>'; }
}

function renderGroupCard(g, showJoin = false) {
  const roleIcon = g.role === 'owner' ? '<i class="fas fa-crown" style="color:#ffc800;font-size:11px;margin-left:4px"></i>' :
                   g.role === 'moderator' ? '<i class="fas fa-shield-alt" style="color:#3ea6ff;font-size:11px;margin-left:4px"></i>' : '';
  return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--yt-spec-raised-background);border-radius:12px;margin-bottom:8px;cursor:pointer;transition:background 0.2s" onclick="openGroup(${g.id})" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='var(--yt-spec-raised-background)'">
      <img src="${g.photo_url || 'data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=48 height=48%3E%3Ccircle cx=24 cy=24 r=24 fill=%23333/%3E%3C/svg%3E'}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0" />
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:4px">
          <p style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</p>
          ${roleIcon}
          ${g.is_private ? '<i class="fas fa-lock" style="font-size:11px;color:var(--yt-spec-text-secondary)"></i>' : ''}
        </div>
        <p style="font-size:12px;color:var(--yt-spec-text-secondary)">${g.member_count} üye</p>
      </div>
      ${showJoin ? `
        <button onclick="event.stopPropagation();joinGroup(${g.id})" class="yt-btn" style="height:30px;padding:0 14px;font-size:12px;flex-shrink:0">
          ${g.is_private ? 'İstek Gönder' : 'Katıl'}
        </button>
      ` : '<i class="fas fa-chevron-right" style="color:var(--yt-spec-text-secondary);font-size:14px"></i>'}
    </div>`;
}

async function searchGroups(q) {
  const results = document.getElementById('groupSearchResults');
  if (!results) return;
  if (!q || q.length < 2) { results.innerHTML = ''; return; }
  try {
    const groups = await fetch(`${API_URL}/groups/search?q=${encodeURIComponent(q)}&userId=${currentUser.id}`).then(r => r.json());
    if (!groups.length) { results.innerHTML = '<p style="font-size:13px;color:var(--yt-spec-text-secondary)">Grup bulunamadı</p>'; return; }
    results.innerHTML = '<p style="font-size:12px;color:var(--yt-spec-text-secondary);margin-bottom:8px">Arama Sonuçları</p>' +
      groups.map(g => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--yt-spec-raised-background);border-radius:10px;margin-bottom:6px">
          <img src="${g.photo_url || 'data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=40 height=40%3E%3Ccircle cx=20 cy=20 r=20 fill=%23333/%3E%3C/svg%3E'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />
          <div style="flex:1"><p style="font-size:13px;font-weight:500">${g.name}</p><p style="font-size:11px;color:var(--yt-spec-text-secondary)">${g.member_count} üye ${g.is_private ? '• Özel' : '• Açık'}</p></div>
          ${g.my_role ? '<span style="font-size:12px;color:var(--yt-spec-brand-background-solid)">Üyesin</span>' : `<button class="yt-btn" onclick="joinGroup(${g.id})" style="height:30px;padding:0 12px;font-size:12px">${g.is_private ? 'İstek Gönder' : 'Katıl'}</button>`}
        </div>`).join('');
  } catch(e) {}
}

async function joinGroup(groupId) {
  try {
    const r = await fetch(`${API_URL}/groups/${groupId}/join`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id }) });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || 'Hata', 'error'); return; }
    showToast(d.pending ? 'Katılma isteği gönderildi' : 'Gruba katıldın!', 'success');
    loadGroupsPage();
  } catch(e) { showToast('Hata', 'error'); }
}

function showCreateGroupModal() {
  showModal(`
    <h3 style="margin-bottom:16px">Grup Oluştur</h3>
    <div class="yt-form-group"><label class="yt-form-label">Grup Fotoğrafı</label><input type="file" id="groupPhoto" class="yt-input" accept="image/*" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Grup Adı *</label><input id="groupName" class="yt-input" placeholder="Grup adı" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Açıklama</label><input id="groupDesc" class="yt-input" placeholder="Grup açıklaması (opsiyonel)" /></div>
    <div class="yt-form-group">
      <label class="yt-checkbox-label">
        <input type="checkbox" id="groupPrivate" class="yt-checkbox" />
        <span>Özel Grup (istekle katılım)</span>
      </label>
    </div>
    <button class="yt-btn" style="width:100%;margin-top:8px" onclick="createGroup()">Oluştur</button>`);
}

async function createGroup() {
  const name = document.getElementById('groupName')?.value.trim();
  if (!name) { showToast('Grup adı gerekli', 'error'); return; }
  const photoFile = document.getElementById('groupPhoto')?.files[0];
  const isPrivate = document.getElementById('groupPrivate')?.checked;
  const desc = document.getElementById('groupDesc')?.value.trim();

  const formData = new FormData();
  formData.append('userId', currentUser.id);
  formData.append('name', name);
  if (desc) formData.append('description', desc);
  formData.append('isPrivate', isPrivate ? '1' : '0');
  if (photoFile) formData.append('photo', photoFile);

  try {
    const r = await fetch(`${API_URL}/groups`, { method:'POST', body: formData });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || 'Hata: ' + JSON.stringify(d), 'error'); return; }
    showToast('Grup oluşturuldu!', 'success');
    closeModal();
    openGroup(d.groupId);
  } catch(e) { showToast('Hata: ' + e.message, 'error'); }
}

async function openGroup(groupId) {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<div class="yt-loading"><div class="yt-spinner"></div></div>';

  try {
    const [groupRes, membersRes] = await Promise.all([
      fetch(`${API_URL}/groups/${groupId}?userId=${currentUser.id}`),
      fetch(`${API_URL}/groups/${groupId}/members`)
    ]);
    const group = await groupRes.json();
    const members = await membersRes.json();

    const myMember = members.find(m => m.user_id === currentUser.id);
    const myRole = myMember?.role || null;
    const isOwner = myRole === 'owner';
    const isMod = myRole === 'moderator';
    const isMember = !!myRole;
    const isMuted = myMember?.is_muted && (!myMember.muted_until || new Date(myMember.muted_until) > new Date());
    const canWrite = isMember && !isMuted && (group.allow_member_messages !== 0 || isOwner || isMod);

    pageContent.innerHTML = `
      <div style="display:flex;flex-direction:column;height:calc(100vh - 120px);max-width:700px">
        <!-- Başlık -->
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:0;flex-shrink:0">
          <button onclick="loadGroupsPage()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:16px;padding:4px 8px"><i class="fas fa-arrow-left"></i></button>
          <img src="${group.photo_url || 'data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=40 height=40%3E%3Ccircle cx=20 cy=20 r=20 fill=%23333/%3E%3C/svg%3E'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0" />
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <p style="font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${group.name}</p>
              ${group.is_private ? '<i class="fas fa-lock" style="font-size:11px;color:var(--yt-spec-text-secondary)"></i>' : ''}
            </div>
            <p style="font-size:12px;color:var(--yt-spec-text-secondary)">${group.member_count} üye</p>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="showGroupMembersPanel(${group.id})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:16px;padding:4px 8px"><i class="fas fa-users"></i></button>
            ${isOwner ? `<button onclick="showGroupSettings(${group.id})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:16px;padding:4px 8px"><i class="fas fa-cog"></i></button>` : ''}
            ${isMember && !isOwner ? `<button onclick="leaveGroup(${group.id})" style="background:none;border:none;color:#ff4444;cursor:pointer;font-size:14px;padding:4px 8px"><i class="fas fa-sign-out-alt"></i></button>` : ''}
            ${!isMember ? `<button class="yt-btn" onclick="joinGroup(${group.id})" style="height:30px;padding:0 12px;font-size:12px">${group.is_private ? 'İstek Gönder' : 'Katıl'}</button>` : ''}
          </div>
        </div>

        <!-- Mesajlar -->
        <div id="groupMessages" style="flex:1;overflow-y:auto;padding:12px 0;display:flex;flex-direction:column;gap:8px">
          <div class="yt-loading"><div class="yt-spinner"></div></div>
        </div>

        <!-- Mesaj Gönder -->
        ${isMember ? `
          <div style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;align-items:flex-end;flex-shrink:0">
            <img src="${getProfilePhotoUrl(currentUser?.profile_photo)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0" />
            ${canWrite ? `
              <textarea id="groupMsgInput" class="yt-input" placeholder="Mesaj yaz..." style="flex:1;min-height:36px;max-height:100px;resize:none;padding:8px 12px;line-height:1.4" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendGroupMessage(${group.id})}"></textarea>
              <button onclick="sendGroupMessage(${group.id})" style="background:none;border:none;color:var(--yt-spec-brand-background-solid);cursor:pointer;font-size:18px;padding:4px 8px;flex-shrink:0"><i class="fas fa-paper-plane"></i></button>
            ` : `<p style="flex:1;font-size:13px;color:var(--yt-spec-text-secondary);padding:8px 0">${isMuted ? 'Susturuldunuz' : 'Mesaj gönderme kapalı'}</p>`}
          </div>
        ` : ''}
      </div>`;

    // Mesajları yükle
    loadGroupMessages(groupId, members);
  } catch(e) { pageContent.innerHTML = '<p>Hata oluştu</p>'; }
}

function loadGroupMessages(groupId, members) {
  const container = document.getElementById('groupMessages');
  if (!container || !window.firebaseDB) {
    if (container) container.innerHTML = '<p style="text-align:center;color:var(--yt-spec-text-secondary);padding:20px">Mesajlar yüklenemedi</p>';
    return;
  }

  const memberMap = {};
  members.forEach(m => { memberMap[m.user_id] = m; });

  const msgsRef = window.firebaseRef(window.firebaseDB, `group_chats/${groupId}/messages`);
  window.firebaseOnValue(msgsRef, snap => {
    const msgs = [];
    snap.forEach(child => { msgs.push({ id: child.key, ...child.val() }); });
    
    if (!msgs.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--yt-spec-text-secondary);padding:40px 0;font-size:13px">Henüz mesaj yok</p>';
      return;
    }

    container.innerHTML = msgs.map(msg => {
      const isMe = msg.senderId == currentUser.id;
      const sender = memberMap[msg.senderId];
      const senderName = sender?.nickname || 'Kullanıcı';
      const senderPhoto = getProfilePhotoUrl(sender?.profile_photo);
      const senderRole = sender?.role;
      const roleIcon = senderRole === 'owner' ? '<i class="fas fa-crown" style="color:#ffc800;font-size:10px;margin-left:3px"></i>' :
                       senderRole === 'moderator' ? '<i class="fas fa-shield-alt" style="color:#3ea6ff;font-size:10px;margin-left:3px"></i>' : '';
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'}) : '';

      return `
        <div style="display:flex;gap:8px;align-items:flex-start;${isMe ? 'flex-direction:row-reverse' : ''}">
          ${!isMe ? `<img src="${senderPhoto}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-top:2px" />` : ''}
          <div style="max-width:70%;${isMe ? 'align-items:flex-end' : 'align-items:flex-start'};display:flex;flex-direction:column;gap:2px">
            ${!isMe ? `<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px"><span style="font-size:11px;font-weight:600;color:var(--yt-spec-text-secondary)">${senderName}</span>${roleIcon}</div>` : ''}
            ${msg.imageUrl ? `<img src="${msg.imageUrl}" style="max-width:200px;border-radius:10px;cursor:pointer" onclick="window.open('${msg.imageUrl}')" />` : ''}
            ${msg.text ? `<div style="background:${isMe ? 'var(--yt-spec-brand-background-solid)' : 'var(--yt-spec-raised-background)'};padding:8px 12px;border-radius:${isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};font-size:14px;line-height:1.4;word-break:break-word">${msg.text}</div>` : ''}
            <span style="font-size:10px;color:var(--yt-spec-text-secondary)">${time}</span>
          </div>
        </div>`;
    }).join('');

    // En alta scroll
    container.scrollTop = container.scrollHeight;
  });
}

async function sendGroupMessage(groupId) {
  const input = document.getElementById('groupMsgInput');
  const text = input?.value.trim();
  if (!text || !window.firebaseDB) return;

  try {
    await window.firebasePush(window.firebaseRef(window.firebaseDB, `group_chats/${groupId}/messages`), {
      senderId: currentUser.id,
      text,
      timestamp: Date.now()
    });
    input.value = '';
    input.style.height = 'auto';
  } catch(e) { showToast('Mesaj gönderilemedi', 'error'); }
}

function showGroupMembersPanel(groupId) {
  fetch(`${API_URL}/groups/${groupId}/members`).then(r => r.json()).then(members => {
    showModal(`
      <h3 style="margin-bottom:16px">Üyeler (${members.length})</h3>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto">
        ${members.map(m => {
          const roleIcon = m.role === 'owner' ? '<i class="fas fa-crown" style="color:#ffc800;font-size:11px;margin-left:4px"></i>' :
                           m.role === 'moderator' ? '<i class="fas fa-shield-alt" style="color:#3ea6ff;font-size:11px;margin-left:4px"></i>' : '';
          return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;background:var(--yt-spec-raised-background)">
            <img src="${getProfilePhotoUrl(m.profile_photo)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" />
            <div style="flex:1"><div style="display:flex;align-items:center;gap:4px"><span style="font-size:13px;font-weight:500">${m.nickname}</span>${roleIcon}</div><span style="font-size:11px;color:var(--yt-spec-text-secondary)">@${m.username}</span></div>
          </div>`;
        }).join('')}
      </div>`);
  });
}

async function leaveGroup(groupId) {
  if (!confirm('Gruptan ayrılmak istediğine emin misin?')) return;
  await fetch(`${API_URL}/groups/${groupId}/leave`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id }) });
  showToast('Gruptan ayrıldın', 'success');
  loadGroupsPage();
}

async function loadJoinRequests(groupId) {
  const section = document.getElementById('joinRequestsSection');
  if (!section) return;
  const requests = await fetch(`${API_URL}/groups/${groupId}/requests`).then(r => r.json()).catch(() => []);
  if (!requests.length) { section.innerHTML = '<p style="font-size:13px;color:var(--yt-spec-text-secondary)">Bekleyen istek yok</p>'; return; }
  section.innerHTML = `<h3 style="font-size:14px;font-weight:600;margin-bottom:10px">Katılma İstekleri (${requests.length})</h3>` +
    requests.map(r => `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--yt-spec-raised-background);border-radius:8px;margin-bottom:6px">
      <img src="${getProfilePhotoUrl(r.profile_photo)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" />
      <div style="flex:1"><p style="font-size:13px;font-weight:500">${r.nickname}</p><p style="font-size:11px;color:var(--yt-spec-text-secondary)">@${r.username}</p></div>
      <button class="yt-btn" onclick="respondGroupRequest(${groupId},${r.id},'accepted')" style="height:28px;padding:0 10px;font-size:12px">Kabul</button>
      <button class="yt-btn" onclick="respondGroupRequest(${groupId},${r.id},'rejected')" style="height:28px;padding:0 10px;font-size:12px;background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)">Red</button>
    </div>`).join('');
}

async function respondGroupRequest(groupId, requestId, action) {
  await fetch(`${API_URL}/groups/${groupId}/requests/${requestId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action, adminId: currentUser.id }) });
  showToast(action === 'accepted' ? 'Kabul edildi' : 'Reddedildi', 'success');
  loadJoinRequests(groupId);
}

function showMemberActions(groupId, memberId, memberName, memberRole) {
  const myMember = { role: 'owner' }; // Gerçekte API'den alınmalı
  showModal(`
    <h3 style="margin-bottom:16px">${memberName}</h3>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="yt-btn" onclick="setModerator(${groupId},${memberId},'${memberRole}');closeModal()" style="background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3)">
        ${memberRole === 'moderator' ? '<i class="fas fa-user" style="margin-right:6px"></i>Moderatörlüğü Kaldır' : '<i class="fas fa-shield-alt" style="margin-right:6px"></i>Moderatör Yap'}
      </button>
      <button class="yt-btn" onclick="muteGroupMember(${groupId},${memberId});closeModal()" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3)">
        <i class="fas fa-microphone-slash" style="margin-right:6px"></i>Sustur
      </button>
      <button class="yt-btn" onclick="banGroupMember(${groupId},${memberId});closeModal()" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)">
        <i class="fas fa-ban" style="margin-right:6px"></i>Banla
      </button>
      <button class="yt-btn" onclick="kickGroupMember(${groupId},${memberId});closeModal()" style="background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)">
        <i class="fas fa-user-times" style="margin-right:6px"></i>Gruptan At
      </button>
      <button class="yt-btn" onclick="transferOwnership(${groupId},${memberId},'${memberName}');closeModal()" style="background:rgba(255,200,0,0.15);color:#ffc800;border:1px solid rgba(255,200,0,0.3)">
        <i class="fas fa-crown" style="margin-right:6px"></i>Yöneticilik Devret
      </button>
    </div>`);
}

async function setModerator(groupId, memberId, currentRole) {
  const newRole = currentRole === 'moderator' ? 'member' : 'moderator';
  let permissions = {};
  if (newRole === 'moderator') {
    // Varsayılan moderatör yetkileri
    permissions = { can_delete_messages: true, can_kick: true, can_mute: true, can_ban: false };
  }
  await fetch(`${API_URL}/groups/${groupId}/members/${memberId}/role`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, role: newRole, permissions }) });
  showToast(newRole === 'moderator' ? 'Moderatör yapıldı' : 'Moderatörlük kaldırıldı', 'success');
  openGroup(groupId);
}

async function muteGroupMember(groupId, memberId) {
  const duration = prompt('Susturma süresi (dakika, boş bırak = sınırsız):');
  const mutedUntil = duration ? new Date(Date.now() + parseInt(duration) * 60000).toISOString() : null;
  await fetch(`${API_URL}/groups/${groupId}/members/${memberId}/mute`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, mutedUntil }) });
  showToast('Üye susturuldu', 'success');
  openGroup(groupId);
}

async function banGroupMember(groupId, memberId) {
  const duration = prompt('Ban süresi (dakika, boş bırak = sınırsız):');
  const bannedUntil = duration ? new Date(Date.now() + parseInt(duration) * 60000).toISOString() : null;
  await fetch(`${API_URL}/groups/${groupId}/members/${memberId}/ban`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, bannedUntil }) });
  showToast('Üye banlandı', 'success');
  openGroup(groupId);
}

async function kickGroupMember(groupId, memberId) {
  if (!confirm('Üyeyi gruptan atmak istediğine emin misin?')) return;
  await fetch(`${API_URL}/groups/${groupId}/members/${memberId}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id }) });
  showToast('Üye gruptan atıldı', 'success');
  openGroup(groupId);
}

async function transferOwnership(groupId, memberId, memberName) {
  if (!confirm(`Yöneticilik ${memberName} kişisine devredilsin mi?`)) return;
  await fetch(`${API_URL}/groups/${groupId}/transfer`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, newOwnerId: memberId }) });
  showToast('Yöneticilik devredildi', 'success');
  openGroup(groupId);
}

function showGroupSettings(groupId) {
  showModal(`
    <h3 style="margin-bottom:16px">Grup Ayarları</h3>
    <div class="yt-form-group"><label class="yt-form-label">Grup Adı</label><input id="gsName" class="yt-input" placeholder="Grup adı" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Açıklama</label><input id="gsDesc" class="yt-input" placeholder="Açıklama" /></div>
    <div class="yt-form-group">
      <label class="yt-checkbox-label"><input type="checkbox" id="gsPrivate" class="yt-checkbox" /><span>Özel Grup</span></label>
    </div>
    <div class="yt-form-group">
      <label class="yt-checkbox-label"><input type="checkbox" id="gsAllowMsg" class="yt-checkbox" checked /><span>Üyeler mesaj yazabilir</span></label>
    </div>
    <div class="yt-form-group">
      <label class="yt-checkbox-label"><input type="checkbox" id="gsAllowPhoto" class="yt-checkbox" checked /><span>Üyeler fotoğraf gönderebilir</span></label>
    </div>
    <button class="yt-btn" style="width:100%;margin-top:8px" onclick="saveGroupSettings(${groupId})">Kaydet</button>
    <button class="yt-btn" style="width:100%;margin-top:8px;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)" onclick="deleteGroup(${groupId})">Grubu Sil</button>`);
}

async function saveGroupSettings(groupId) {
  const name = document.getElementById('gsName')?.value.trim();
  const desc = document.getElementById('gsDesc')?.value.trim();
  const isPrivate = document.getElementById('gsPrivate')?.checked;
  const allowMsg = document.getElementById('gsAllowMsg')?.checked;
  const allowPhoto = document.getElementById('gsAllowPhoto')?.checked;
  if (!name) { showToast('Grup adı gerekli', 'error'); return; }
  await fetch(`${API_URL}/groups/${groupId}/settings`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, name, description: desc, isPrivate, allowMemberMessages: allowMsg, allowMemberPhotos: allowPhoto }) });
  showToast('Ayarlar kaydedildi', 'success');
  closeModal();
  openGroup(groupId);
}

async function deleteGroup(groupId) {
  if (!confirm('Grubu silmek istediğine emin misin? Bu işlem geri alınamaz!')) return;
  await fetch(`${API_URL}/groups/${groupId}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id }) });
  showToast('Grup silindi', 'success');
  closeModal();
  loadGroupsPage();
}

// ==================== ROZET SİSTEMİ ====================

async function setActiveBadge(badgeId) {
  try {
    const r = await fetch(`${API_URL}/user/${currentUser.id}/active-badge`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId })
    });
    if (r.ok) {
      currentUser.active_badge_id = badgeId;
      localStorage.setItem('Tea_user', JSON.stringify(currentUser));
      showToast('Rozet güncellendi', 'success');
      loadSettingsPage();
    }
  } catch(e) { showToast('Hata', 'error'); }
}