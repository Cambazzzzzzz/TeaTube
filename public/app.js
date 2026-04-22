// API URL - localhost'ta 3456, production'da aynı origin
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3456/api'
  : window.location.origin + '/api';

console.log('API_URL:', API_URL);
console.log('Current hostname:', window.location.hostname);
let currentUser = null;
let currentChannel = null;
let currentPage = 'home';
let sidebarOpen = true;

// ==================== MESAJ BİLDİRİM SİSTEMİ ====================
let messageNotificationSound = null;
let lastNotifiedMessages = new Set(); // Aynı mesajı tekrar bildirmemek için
let notificationPermissionGranted = false;
let globalMessageListeners = {}; // Tüm arkadaşlar için mesaj dinleyicileri

function initMessageNotifications() {
  // Bildirim sesini yükle - Direkt ses dosyası
  messageNotificationSound = new Audio('https://media.vocaroo.com/mp3/135Nxz6kVvI8');
  messageNotificationSound.volume = 0.7;
  messageNotificationSound.preload = 'auto';
  messageNotificationSound.load();
  
  messageNotificationSound.addEventListener('canplaythrough', () => {
    console.log('Mesaj bildirim sesi yüklendi');
  });
  
  // Bildirim izni iste
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      notificationPermissionGranted = permission === 'granted';
      console.log('Bildirim izni:', permission);
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    notificationPermissionGranted = true;
  }
  
  // Tüm arkadaşlar için mesaj dinleyicilerini başlat
  startGlobalMessageListeners();
}

function playMessageNotificationSound() {
  if (messageNotificationSound) {
    messageNotificationSound.currentTime = 0;
    const playPromise = messageNotificationSound.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('Mesaj bildirim sesi çalıyor');
      }).catch(e => {
        console.log('Bildirim sesi çalamadı:', e);
        // Kullanıcı etkileşimi gerekebilir
        const playOnInteraction = () => {
          messageNotificationSound.play().then(() => {
            console.log('Bildirim sesi kullanıcı etkileşimi ile çaldı');
          }).catch(console.error);
        };
        
        document.addEventListener('click', playOnInteraction, { once: true });
        document.addEventListener('touchstart', playOnInteraction, { once: true });
      });
    }
  }
}

function showMessageNotification(senderName, messageText, senderPhoto, senderId) {
  // Ekran bildirimi (Toast) - Her zaman göster
  showToastNotification(senderName, messageText, senderPhoto, senderId);
  
  // Tarayıcı bildirimi - Sadece site arka plandaysa
  if (notificationPermissionGranted && document.hidden) {
    try {
      const notification = new Notification(`${senderName}`, {
        body: messageText || '📷 Fotoğraf',
        icon: senderPhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(senderName),
        badge: '/favicon.ico',
        tag: 'teatube-message-' + senderId,
        requireInteraction: false,
        silent: false
      });
      
      notification.onclick = () => {
        window.focus();
        showPage('messages');
        setTimeout(() => {
          if (String(senderId).startsWith('group_')) {
            const groupId = senderId.replace('group_', '');
            openGroup(groupId);
          } else {
            openChat(senderId, senderName, senderPhoto);
          }
        }, 300);
        notification.close();
      };
      
      // 5 saniye sonra otomatik kapat
      setTimeout(() => notification.close(), 5000);
    } catch(e) {
      console.log('Bildirim gösterilemedi:', e);
    }
  }
  
  // Ses bildirimi (site açık olsa bile çal)
  playMessageNotificationSound();
}

function showToastNotification(senderName, messageText, senderPhoto, senderId) {
  const toast = document.createElement('div');
  const toastId = 'toast_' + Date.now();
  toast.id = toastId;
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    background: var(--yt-spec-raised-background, #212121);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 12px 16px;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    cursor: pointer;
    animation: slideInRight 0.3s ease-out;
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  
  const photoUrl = senderPhoto && senderPhoto !== '?' 
    ? senderPhoto 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=ff0033&color=fff&size=48`;
  
  toast.innerHTML = `
    <img src="${photoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=ff0033&color=fff&size=48'" />
    <div style="flex: 1; min-width: 0;">
      <p style="font-size: 14px; font-weight: 600; color: var(--yt-spec-text-primary, #fff); margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${senderName}</p>
      <p style="font-size: 13px; color: var(--yt-spec-text-secondary, #aaa); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${messageText}</p>
    </div>
    <button onclick="event.stopPropagation(); document.getElementById('${toastId}').remove();" style="background: none; border: none; color: var(--yt-spec-text-secondary, #aaa); font-size: 18px; cursor: pointer; padding: 4px; flex-shrink: 0;">×</button>
  `;
  
  // Tıklayınca mesaja git
  toast.addEventListener('click', () => {
    if (String(senderId).startsWith('group_')) {
      const groupId = senderId.replace('group_', '');
      showPage('groups');
      setTimeout(() => openGroup(groupId), 300);
    } else {
      showPage('messages');
      setTimeout(() => openChat(senderId, senderName, senderPhoto), 300);
    }
    toast.remove();
  });
  
  document.body.appendChild(toast);
  
  // Animasyon stili ekle
  if (!document.getElementById('toastAnimationStyle')) {
    const style = document.createElement('style');
    style.id = 'toastAnimationStyle';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Diğer toast'ları aşağı kaydır
  const existingToasts = document.querySelectorAll('[id^="toast_"]');
  existingToasts.forEach((t, index) => {
    if (t.id !== toastId) {
      t.style.top = (80 + (index + 1) * 80) + 'px';
    }
  });
}

async function startGlobalMessageListeners() {
  if (!window.firebaseDB || !currentUser) return;
  
  try {
    // Tüm arkadaşları al
    const res = await fetch(`${API_URL}/friends/${currentUser.id}`);
    const friends = await res.json();
    
    friends.forEach(friend => {
      const friendId = friend.friend_id;
      const chatId = getChatId(currentUser.id, friendId);
      
      // Bu arkadaş için zaten dinleyici varsa atla
      if (globalMessageListeners[friendId]) return;
      
      const msgsRef = window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`);
      const listener = window.firebaseOnValue(msgsRef, snap => {
        snap.forEach(child => {
          const msg = child.val();
          const msgId = child.key;
          
          // Sadece karşı taraftan gelen mesajlar
          if (msg.senderId != currentUser.id) {
            // Bu mesajı daha önce bildirdik mi?
            if (!lastNotifiedMessages.has(msgId)) {
              lastNotifiedMessages.add(msgId);
              
              // Mesaj yeni mi kontrol et (son 10 saniye içinde)
              const msgTime = msg.timestamp || 0;
              const now = Date.now();
              if (now - msgTime < 10000) { // 10 saniye içinde
                // Bildirim göster
                const messageText = msg.text ? decodeURIComponent(msg.text) : (msg.imageUrl ? '📷 Fotoğraf' : (msg.videoShare ? '🎥 Video' : 'Yeni mesaj'));
                showMessageNotification(
                  friend.nickname || friend.username,
                  messageText,
                  friend.profile_photo,
                  friendId
                );
              }
            }
          }
        });
      });
      
      globalMessageListeners[friendId] = listener;
    });
    
    // Grup mesajları için dinleyiciler
    const groupsRes = await fetch(`${API_URL}/groups/user/${currentUser.id}`);
    const groups = await groupsRes.json();
    
    groups.forEach(group => {
      const groupId = group.id;
      
      // Bu grup için zaten dinleyici varsa atla
      if (globalMessageListeners['group_' + groupId]) return;
      
      const msgsRef = window.firebaseRef(window.firebaseDB, `group_chats/${groupId}/messages`);
      const listener = window.firebaseOnValue(msgsRef, snap => {
        snap.forEach(child => {
          const msg = child.val();
          const msgId = child.key;
          
          // Sadece başkalarından gelen mesajlar
          if (msg.userId != currentUser.id) {
            // Bu mesajı daha önce bildirdik mi?
            if (!lastNotifiedMessages.has(msgId)) {
              lastNotifiedMessages.add(msgId);
              
              // Mesaj yeni mi kontrol et (son 10 saniye içinde)
              const msgTime = msg.timestamp || 0;
              const now = Date.now();
              if (now - msgTime < 10000) { // 10 saniye içinde
                // Bildirim göster
                const messageText = msg.text ? decodeURIComponent(msg.text) : (msg.imageUrl ? '📷 Fotoğraf' : 'Yeni mesaj');
                showMessageNotification(
                  `${msg.userName} (${group.name})`,
                  messageText,
                  group.photo_url,
                  'group_' + groupId
                );
              }
            }
          }
        });
      });
      
      globalMessageListeners['group_' + groupId] = listener;
    });
    
    console.log('Global mesaj dinleyicileri başlatıldı:', friends.length, 'arkadaş,', groups.length, 'grup');
  } catch(e) {
    console.error('Global mesaj dinleyicileri başlatılamadı:', e);
  }
}

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
      <button onclick="event.stopPropagation(); document.getElementById('mobileUploadSheet').remove(); setTimeout(() => { showUploadVideoModal(); setTimeout(() => switchUploadType('reals'), 50); }, 100);"
        style="width:100%; display:flex; align-items:center; gap:16px; background:none; border:none; color:var(--yt-spec-text-primary); padding:14px 8px; font-size:16px; cursor:pointer; border-radius:10px;">
        <div style="width:44px; height:44px; background:rgba(255,0,51,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-film" style="color:#ff0033; font-size:18px;"></i>
        </div>
        <div style="text-align:left;">
          <p style="font-weight:600; margin-bottom:2px;">Reals</p>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary);">Kısa video paylaş</p>
        </div>
      </button>
      <button onclick="event.stopPropagation(); document.getElementById('mobileUploadSheet').remove(); setTimeout(() => { showUploadVideoModal(); setTimeout(() => switchUploadType('photo'), 50); }, 100);"
        style="width:100%; display:flex; align-items:center; gap:16px; background:none; border:none; color:var(--yt-spec-text-primary); padding:14px 8px; font-size:16px; cursor:pointer; border-radius:10px;">
        <div style="width:44px; height:44px; background:rgba(255,165,0,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <i class="fas fa-image" style="color:orange; font-size:18px;"></i>
        </div>
        <div style="text-align:left;">
          <p style="font-weight:600; margin-bottom:2px;">Fotoğraf</p>
          <p style="font-size:12px; color:var(--yt-spec-text-secondary);">Fotoğraf paylaş</p>
        </div>
      </button>
      <button onclick="event.stopPropagation(); document.getElementById('mobileUploadSheet').remove();"
        style="width:100%; background:rgba(255,255,255,0.06); border:none; color:var(--yt-spec-text-secondary); padding:14px; border-radius:10px; font-size:14px; cursor:pointer; margin-top:8px;">
        İptal
      </button>
    </div>
  `;
  
  sheet.addEventListener('click', e => { 
    if (e.target === sheet) sheet.remove(); 
  });
  
  document.body.appendChild(sheet);
}

// Metin paylaşma modalı
function showTextPostModal() {
  const modal = document.createElement('div');
  modal.id = 'textPostModal';
  modal.style.cssText = `
    position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.8);
    display:flex; align-items:center; justify-content:center; padding:20px;
  `;
  modal.innerHTML = `
    <div style="width:100%; max-width:600px; background:var(--yt-spec-raised-background); border-radius:16px; padding:24px; max-height:90vh; overflow-y:auto;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
        <h2 style="font-size:20px; font-weight:700; margin:0;">Metin Paylaş</h2>
        <button onclick="document.getElementById('textPostModal').remove();" style="background:none; border:none; color:var(--yt-spec-text-secondary); font-size:24px; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <input type="text" id="textPostTitle" placeholder="Başlık (opsiyonel)" style="width:100%; padding:12px; background:var(--yt-spec-10-percent-layer); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--yt-spec-text-primary); font-size:16px; margin-bottom:12px; font-weight:600;" maxlength="100" />
      
      <textarea id="textPostContent" placeholder="Ne düşünüyorsun?" style="width:100%; min-height:200px; padding:12px; background:var(--yt-spec-10-percent-layer); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--yt-spec-text-primary); font-size:15px; resize:vertical; font-family:inherit; line-height:1.5;" maxlength="5000"></textarea>
      
      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08);">
        <span id="textPostCharCount" style="font-size:13px; color:var(--yt-spec-text-secondary);">0 / 5000</span>
        <button onclick="publishTextPost()" style="background:#1d9bf0; border:none; color:#fff; padding:10px 24px; border-radius:20px; font-size:15px; font-weight:700; cursor:pointer;">
          Paylaş
        </button>
      </div>
    </div>
  `;
  
  modal.addEventListener('click', e => { 
    if (e.target === modal) modal.remove(); 
  });
  
  document.body.appendChild(modal);
  
  // Karakter sayacı
  const textarea = document.getElementById('textPostContent');
  const charCount = document.getElementById('textPostCharCount');
  textarea.addEventListener('input', () => {
    charCount.textContent = `${textarea.value.length} / 5000`;
    if (textarea.value.length > 4900) {
      charCount.style.color = '#ff4444';
    } else {
      charCount.style.color = 'var(--yt-spec-text-secondary)';
    }
  });
  
  setTimeout(() => textarea.focus(), 100);
}

// Metin gönderisi yayınla
async function publishTextPost() {
  const title = document.getElementById('textPostTitle').value.trim();
  const content = document.getElementById('textPostContent').value.trim();
  
  if (!content) {
    alert('Lütfen bir şeyler yaz!');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/text-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        title: title || null,
        content: content
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('textPostModal').remove();
      alert('Metin paylaşıldı! ✅');
      // Ana sayfayı yenile
      if (currentPage === 'home') {
        loadHomeFeed();
      }
    } else {
      alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
    }
  } catch (err) {
    console.error('Metin paylaşma hatası:', err);
    alert('Bir hata oluştu!');
  }
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
        <img src="${getProfilePhotoUrl(currentUser?.profile_photo)}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" onerror="onProfilePhotoError(this)" />
        <div>
          <p style="font-weight:600; font-size:16px;">${currentUser?.nickname || ''}</p>
          <p style="font-size:13px; color:var(--yt-spec-text-secondary);">@${currentUser?.username || ''}</p>
        </div>
      </div>
      ${[
        { icon:'fa-photo-video', label:'İçeriklerim', page:'my-videos' },
        { icon:'fa-users', label:'Takip Ettiklerim', page:'subscriptions' },
        { icon:'fa-music', label:'Şarkılarım', page:'my-songs' },
        { icon:'fa-bookmark', label:'Kaydedilenler', page:'saved' },
        { icon:'fa-history', label:'Geçmiş', page:'history' },
        { icon:'fa-layer-group', label:'Gruplar', page:'groups' },
        { icon:'fa-music', label:'TS Music', page:'ts-music' },
        { icon:'fa-cog', label:'Ayarlar', page:'settings' },
      ].map(item => `
        <button onclick="document.getElementById('mobileProfileSheet').remove(); showPage('${item.page}');"
          style="width:100%; display:flex; align-items:center; gap:14px; background:none; border:none; color:var(--yt-spec-text-primary); padding:12px 8px; font-size:15px; cursor:pointer; border-radius:8px; text-align:left;">
          <i class="fas ${item.icon}" style="width:20px; color:var(--yt-spec-text-secondary);"></i>
          ${item.label}
        </button>
      `).join('')}
      <button onclick="document.getElementById('mobileProfileSheet').remove(); setTimeout(showMobileUploadMenu, 50);"
        style="width:100%; display:flex; align-items:center; gap:14px; background:rgba(255,0,51,0.1); border:1px solid rgba(255,0,51,0.2); color:#ff0033; padding:12px 8px; font-size:15px; cursor:pointer; border-radius:8px; margin-bottom:4px;">
        <i class="fas fa-upload" style="width:20px;"></i>
        Reals / Fotoğraf Yükle
      </button>
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

// Mobil profil fotosu güncelle (artık kullanılmıyor)
function updateMobileProfilePhoto() {
  // Profil fotoğrafları kaldırıldı, bu fonksiyon artık boş
}

async function searchFriendsInMessages() {
  const q = document.getElementById('msgFriendSearch')?.value?.trim();
  const results = document.getElementById('msgFriendSearchResults');
  if (!results) return;
  if (!q) { results.innerHTML = ''; return; }

  try {
    // Sadece mevcut arkadaşları ara
    const res = await fetch(`${API_URL}/friends/${currentUser.id}`);
    const friends = await res.json();
    const filtered = friends.filter(f =>
      f.nickname?.toLowerCase().includes(q.toLowerCase()) ||
      f.username?.toLowerCase().includes(q.toLowerCase())
    );

    if (!filtered.length) {
      results.innerHTML = '<p style="font-size:13px;color:var(--yt-spec-text-secondary);padding:4px 0;">Arkadaş bulunamadı</p>';
      return;
    }

    results.innerHTML = filtered.map(f => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--yt-spec-raised-background);border-radius:10px;margin-bottom:6px;">
        <img src="${getProfilePhotoUrl(f.profile_photo)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;" />
        <div style="flex:1;min-width:0;"><p style="font-size:14px;font-weight:500;">${f.nickname}</p><p style="font-size:12px;color:var(--yt-spec-text-secondary);">@${f.username}</p></div>
        <button class="yt-btn" onclick="openMobileChat(${f.friend_id},'${f.nickname.replace(/'/g,"\\'")}','${getProfilePhotoUrl(f.profile_photo)}')" style="height:30px;padding:0 12px;font-size:12px;flex-shrink:0"><i class="fas fa-comment"></i> Mesaj</button>
      </div>
    `).join('');
  } catch(e) {}
}

// Mobil arama toggle
function toggleMobileSearch() {
  const center = document.getElementById('center');
  if (!center) return;
  const isVisible = center.style.display === 'flex';
  if (isVisible) {
    center.style.display = 'none';
    document.getElementById('searchOverlay')?.remove();
  } else {
    center.style.display = 'flex';
    center.style.position = 'fixed';
    center.style.top = 'var(--ytd-masthead-height, 56px)';
    center.style.left = '0';
    center.style.right = '0';
    center.style.transform = 'none';
    center.style.background = 'var(--yt-spec-base-background)';
    center.style.padding = '8px 12px';
    center.style.zIndex = '2021';
    center.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    center.style.width = '100%';
    center.style.boxSizing = 'border-box';
    
    // Arama kutusunu mobil için optimize et
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.style.width = '100%';
      searchInput.style.maxWidth = 'none';
    }
    
    setTimeout(() => {
      const input = document.getElementById('searchInput');
      if (input) {
        input.focus();
        input.click(); // Mobil klavyeyi açmak için
      }
    }, 100);
    
    const overlay = document.createElement('div');
    overlay.id = 'searchOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2020;background:rgba(0,0,0,0.5);';
    overlay.addEventListener('click', () => {
      center.style.display = 'none';
      overlay.remove();
    });
    document.body.appendChild(overlay);
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
  console.log('DOM yüklendi, otomatik giriş kontrol ediliyor...');
  
  const savedUser = localStorage.getItem('Tea_user');
  const timestamp = localStorage.getItem('Tea_user_timestamp');
  
  // 30 gün = 30 * 24 * 60 * 60 * 1000 ms
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  
  if (savedUser && timestamp) {
    const age = Date.now() - parseInt(timestamp);
    
    if (age > THIRTY_DAYS) {
      console.log('Oturum süresi dolmuş (30 gün), temizleniyor...');
      localStorage.removeItem('Tea_user');
      localStorage.removeItem('Tea_user_timestamp');
      document.getElementById('authScreen').style.display = 'flex';
      document.getElementById('mainApp').style.display = 'none';
      return;
    }
    
    try {
      currentUser = JSON.parse(savedUser);
      console.log('Kaydedilmiş kullanıcı bulundu:', currentUser.username);
      loadUserData().catch(e => {
        console.error('loadUserData hatası:', e);
        // Hata olsa bile giriş ekranını göster
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
      });
    } catch (e) {
      console.error('Kaydedilmiş kullanıcı parse hatası:', e);
      localStorage.removeItem('Tea_user');
      localStorage.removeItem('Tea_user_timestamp');
      document.getElementById('authScreen').style.display = 'flex';
      document.getElementById('mainApp').style.display = 'none';
    }
  } else {
    console.log('Kaydedilmiş kullanıcı yok, giriş ekranı gösteriliyor');
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
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
    <div style="background:rgba(255,0,51,0.12);border:1px solid rgba(255,0,51,0.4);border-radius:10px;padding:12px 16px;margin-bottom:20px;">
      <p style="color:#ff4444;font-weight:700;font-size:15px;margin:0;"><i class="fas fa-exclamation-triangle" style="margin-right:8px;"></i>Bu platformu kullanmak için 15 yaş ve üstü olmanız gerekir.</p>
    </div>
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
  const birth_date = document.getElementById('regBirthDate')?.value;

  if (!username || !nickname || !password) {
    alert('Lütfen tüm alanları doldurun');
    return;
  }

  if (!birth_date) {
    const errEl = document.getElementById('ageError');
    if (errEl) { errEl.textContent = 'Doğum tarihi gereklidir'; errEl.style.display = 'block'; }
    return;
  }

  // Frontend yaş kontrolü
  const birth = new Date(birth_date);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 15) {
    const errEl = document.getElementById('ageError');
    if (errEl) { errEl.textContent = 'Bu platformu kullanmak için 15 yaş ve üstü olmanız gerekir.'; errEl.style.display = 'block'; }
    return;
  }

  const formData = new FormData();
  formData.append('username', username);
  formData.append('nickname', nickname);
  formData.append('password', password);
  formData.append('agreed', 'true');
  formData.append('birth_date', birth_date);
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

  console.log('🔥 LOGIN BAŞLADI:', username);

  if (!username || !password) {
    alert('Kullanıcı adı ve şifre gerekli');
    return;
  }

  // Admin girişi kontrolü
  if (username === 'AdminTeaS' && password === 'bcics4128.316!') {
    window.location.href = '/bcics.html';
    return;
  }

  // Loading göster
  const loginBtn = document.querySelector('#loginForm button');
  if (!loginBtn) {
    console.error('❌ Login butonu bulunamadı!');
    return;
  }
  
  const originalText = loginBtn.textContent;
  loginBtn.textContent = 'Giriş yapılıyor...';
  loginBtn.disabled = true;

  try {
    console.log('📡 API isteği gönderiliyor:', API_URL + '/login');
    
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    console.log('📥 Response alındı:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Login başarısız:', errorData);
      alert(errorData.error || 'Giriş başarısız');
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
      return;
    }
    
    const data = await response.json();
    console.log('✅ Login başarılı:', data);

    currentUser = data.user;
    
    // KALICI KAYIT - 30 gün
    localStorage.setItem('Tea_user', JSON.stringify(currentUser));
    localStorage.setItem('Tea_user_timestamp', Date.now().toString());
    console.log('💾 User localStorage\'a kaydedildi (30 gün)');
    
    // HEMEN ana ekranı göster
    console.log('🚀 Ana ekran gösteriliyor...');
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Tema uygula
    const theme = currentUser.theme || 'dark';
    document.body.setAttribute('data-theme', theme);
    applyTheme(theme);
    
    // Ana sayfayı göster
    showPage('home');
    console.log('✅ GİRİŞ TAMAMLANDI!');
    
  } catch (error) {
    console.error('💥 Login hatası:', error);
    alert('Giriş sırasında bir hata oluştu: ' + error.message);
    loginBtn.textContent = originalText;
    loginBtn.disabled = false;
  }
}

async function loadUserData() {
  try {
    console.log('loadUserData başladı...');
    
    // HEMEN ana ekranı göster - hiçbir şey bekleme!
    console.log('Ana ekran gösteriliyor...');
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Temayı uygula
    document.body.setAttribute('data-theme', currentUser.theme || 'dark');
    applyTheme(currentUser.theme || 'dark');
    console.log('Tema uygulandı');
    
    // Ana sayfayı göster
    showPage('home');
    console.log('Ana ekran gösterildi - GİRİŞ TAMAMLANDI!');

    // Diğer işlemleri arka planda yap - HATA OLSA BİLE DEVAM ET
    setTimeout(async () => {
      try {
        // Kullanıcı bilgilerini güncelle
        const userResponse = await fetch(`${API_URL}/user/${currentUser.id}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          currentUser = { ...currentUser, ...userData };
          localStorage.setItem('Tea_user', JSON.stringify(currentUser));
          console.log('Kullanıcı bilgileri güncellendi (arka plan)');
        }

        // Kanalı kontrol et
        const channelResponse = await fetch(`${API_URL}/channel/user/${currentUser.id}`);
        if (channelResponse.ok) {
          currentChannel = await channelResponse.json();
        }
        
        if (!currentChannel) {
          const formData = new FormData();
          formData.append('userId', currentUser.id);
          formData.append('channelName', currentUser.nickname || currentUser.username);
          formData.append('about', '');
          formData.append('agreed', 'true');
          const createRes = await fetch(`${API_URL}/channel`, { method: 'POST', body: formData });
          if (createRes.ok) {
            const chRes = await fetch(`${API_URL}/channel/user/${currentUser.id}`);
            if (chRes.ok) {
              currentChannel = await chRes.json();
            }
          }
        }
        
        // Diğer işlemler - hata olsa bile devam et
        loadNotifications().catch(() => console.log('Bildirimler yüklenemedi'));
        loadActiveAnnouncements().catch(() => console.log('Duyurular yüklenemedi'));

        // Mesaj bildirim sistemini başlat
        initMessageNotifications();

        // Socket.IO bağlantısını başlat (sesli arama için)
        try { initVoiceSocket(); } catch(e) { console.log('Voice socket başlatılamadı'); }
        
        fetch(`${API_URL}/groups/user/${currentUser.id}`)
          .then(r => r.json())
          .then(groups => { if (groups.length > 0) watchGroupUnreadBadges(groups.map(g => g.id)); })
          .catch(() => console.log('Gruplar yüklenemedi'));
          
        fetch(`${API_URL}/music/artist-status/${currentUser.id}`)
          .then(r => r.json())
          .then(s => {
            const mySongsItem = document.getElementById('mySongsMenuItem');
            if (mySongsItem) mySongsItem.style.display = s.isArtist ? 'flex' : 'none';
          }).catch(() => console.log('Müzik durumu yüklenemedi'));
          
        initOnlinePresence();
        
      } catch (e) {
        console.error('Arka plan işlem hatası (önemli değil):', e);
      }
    }, 100);
      
  } catch (error) {
    console.error('Kullanıcı verisi yükleme hatası:', error);
    // Hata olsa bile ana ekranı göster
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    showPage('home');
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

  // Reals player'ı temizle (fixed position olduğu için diğer sayfaları engelleyebilir)
  if (page !== 'reals' && page !== 'shorts') {
    const shortsContainer = document.getElementById('shortsContainer');
    if (shortsContainer) shortsContainer.remove();
    // Animasyonu geri aç
    const pc = document.getElementById('pageContent');
    if (pc) { pc.style.animation = ''; void pc.offsetWidth; pc.style.animation = null; }
  }

  // Bottom nav aktif durumu güncelle
  const navMap = { home:'mbb-home', reals:'mbb-reals', messages:'mbb-messages', 'my-channel':'mbb-profile' };
  document.querySelectorAll('.mbb-btn').forEach(b => b.classList.remove('active'));
  if (navMap[page]) document.getElementById(navMap[page])?.classList.add('active');

  // Profil fotoğrafı artık yok, bu kod kaldırıldı
  
  // Özel sayfaları gizle (song-writings, my-writings, writing-detail)
  ['song-writings-page','my-writings-page','writing-detail-page'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  
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
      document.getElementById('pageContent').style.animation = 'none';
      loadShortsPage();
      break;
    case 'reals':
      document.getElementById('pageContent').style.animation = 'none';
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
    case 'my-songs':
      loadMySongsPage();
      break;
    case 'watched':
      loadWatchedPage();
      break;
    case 'history':
      loadHistoryPage();
      break;
    case 'ts-music':
      loadTSMusicPage();
      break;
    case 'song-writings': {
      pageContent.innerHTML = '';
      ['song-writings-page','my-writings-page','writing-detail-page'].forEach(eid => {
        const el = document.getElementById(eid); if (el) el.style.display = 'none';
      });
      const swPage = document.getElementById('song-writings-page');
      if (swPage) {
        swPage.style.display = 'block';
        const writeBtn = document.getElementById('sw-write-btn');
        if (writeBtn) writeBtn.style.display = currentUser ? 'block' : 'none';
        loadSongWritingsPage();
      }
      break;
    }
    case 'my-writings': {
      pageContent.innerHTML = '';
      ['song-writings-page','my-writings-page','writing-detail-page'].forEach(eid => {
        const el = document.getElementById(eid); if (el) el.style.display = 'none';
      });
      const mwPage = document.getElementById('my-writings-page');
      if (mwPage) { mwPage.style.display = 'block'; showMyWritings(); }
      break;
    }
    case 'writing-detail': {
      pageContent.innerHTML = '';
      ['song-writings-page','my-writings-page','writing-detail-page'].forEach(eid => {
        const el = document.getElementById(eid); if (el) el.style.display = 'none';
      });
      const wdPage = document.getElementById('writing-detail-page');
      if (wdPage) wdPage.style.display = 'block';
      break;
    }
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
    const [friends, incoming, sent, groupRequests] = await Promise.all([
      fetch(`${API_URL}/friends/${currentUser.id}`).then(r => r.json()),
      fetch(`${API_URL}/friend-requests/incoming/${currentUser.id}`).then(r => r.json()),
      fetch(`${API_URL}/friend-requests/sent/${currentUser.id}`).then(r => r.json()),
      fetch(`${API_URL}/groups/my-requests/${currentUser.id}`).then(r => r.json()).catch(() => [])
    ]);

    pageContent.innerHTML = `
      <h2 class="section-header">Arkadaşlar</h2>
      <div class="settings-card" style="margin-bottom:16px;">
        <h3 class="settings-card-title"><i class="fas fa-user-plus" style="margin-right:8px; color:var(--yt-spec-brand-background-solid);"></i>Arkadaş Ara</h3>
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
              <div style="flex:1;min-width:0"><p style="font-size:14px; font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.nickname}</p><p style="font-size:12px; color:var(--yt-spec-text-secondary);">@${r.username}</p></div>
              <div style="display:flex; gap:6px;flex-shrink:0">
                <button class="yt-btn" onclick="respondFriendRequest(${r.id},'accept')" style="height:32px; padding:0 12px; font-size:12px;">Kabul</button>
                <button class="yt-btn yt-btn-secondary" onclick="respondFriendRequest(${r.id},'reject')" style="height:32px; padding:0 12px; font-size:12px;">Red</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${sent.length > 0 ? `
        <div class="settings-card" style="margin-bottom:16px;">
          <h3 class="settings-card-title"><i class="fas fa-paper-plane" style="margin-right:8px;"></i>Gönderilen Arkadaş İstekleri</h3>
          ${sent.map(r => `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
              <img src="${getProfilePhotoUrl(r.profile_photo)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" />
              <div style="flex:1;min-width:0"><p style="font-size:14px; font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.nickname}</p><p style="font-size:12px; color:var(--yt-spec-text-secondary);">@${r.username}</p></div>
              <button class="yt-btn yt-btn-secondary" onclick="cancelFriendRequest(${r.id})" style="height:32px; padding:0 12px; font-size:12px;flex-shrink:0">İptal</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${groupRequests.length > 0 ? `
        <div class="settings-card" style="margin-bottom:16px;">
          <h3 class="settings-card-title"><i class="fas fa-layer-group" style="margin-right:8px;"></i>Bekleyen Grup İstekleri</h3>
          ${groupRequests.map(r => `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
              <img src="${r.group_photo || 'data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=36 height=36%3E%3Ccircle cx=18 cy=18 r=18 fill=%23333/%3E%3C/svg%3E'}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" />
              <div style="flex:1;min-width:0"><p style="font-size:14px; font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.group_name}</p><p style="font-size:12px; color:#ffc800;">Onay bekleniyor</p></div>
              <button class="yt-btn yt-btn-secondary" onclick="cancelGroupRequest(${r.id})" style="height:32px; padding:0 12px; font-size:12px;flex-shrink:0">İptal</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="settings-card">
        <h3 class="settings-card-title"><i class="fas fa-users" style="margin-right:8px;"></i>Arkadaşlarım (${friends.length})</h3>
        ${friends.length === 0 ? '<p style="color:var(--yt-spec-text-secondary); font-size:14px;">Henüz arkadaşın yok</p>' : friends.map(f => `
          <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
            <img src="${getProfilePhotoUrl(f.profile_photo)}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;cursor:pointer" onclick="viewChannel(${f.channel_id || 0})" />
            <div style="flex:1;min-width:0"><p style="font-size:14px; font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.nickname}</p><p style="font-size:12px; color:var(--yt-spec-text-secondary);">@${f.username}</p></div>
            <div style="display:flex; gap:6px;flex-shrink:0">
              <button class="yt-btn" onclick="openChat(${f.friend_id},'${f.nickname}','${getProfilePhotoUrl(f.profile_photo)}')" style="height:32px; padding:0 12px; font-size:12px;"><i class="fas fa-comment"></i></button>
              <button class="yt-btn yt-btn-secondary" onclick="removeFriend(${f.id})" style="height:32px; padding:0 10px; font-size:12px;" title="Arkadaşlıktan çıkar"><i class="fas fa-user-minus"></i></button>
              <button onclick="blockUser(${f.friend_id},'${f.nickname}')" style="height:32px;padding:0 10px;background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.3);color:#ff4444;border-radius:8px;cursor:pointer;font-size:12px" title="Engelle"><i class="fas fa-ban"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="settings-card" style="margin-top:8px;" id="blockedUsersCard">
        <h3 class="settings-card-title"><i class="fas fa-ban" style="margin-right:8px;color:#ff4444;"></i>Engellenenler</h3>
        <div id="blockedUsersList"><div class="yt-loading" style="padding:12px 0;"><div class="yt-spinner" style="width:20px;height:20px;border-width:2px;"></div></div></div>
      </div>
    `;

    // Engellenenler listesini yükle
    fetch(`${API_URL}/blocked-users/${currentUser.id}`)
      .then(r => r.json())
      .then(blocked => {
        const el = document.getElementById('blockedUsersList');
        if (!el) return;
        if (!blocked.length) {
          el.innerHTML = '<p style="font-size:13px;color:var(--yt-spec-text-secondary);">Engellenen kullanıcı yok</p>';
          return;
        }
        el.innerHTML = blocked.map(b => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,68,68,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fas fa-ban" style="color:#ff4444;font-size:18px;"></i>
            </div>
            <div style="flex:1;min-width:0;">
              <p style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.nickname}</p>
              <p style="font-size:12px;color:#ff4444;">@${b.username} · Engellendi</p>
            </div>
            <button class="yt-btn yt-btn-secondary" onclick="unblockUser(${b.blocked_id},'${b.nickname}')" style="height:32px;padding:0 12px;font-size:12px;flex-shrink:0;">Kaldır</button>
          </div>
        `).join('');
      })
      .catch(() => {
        const el = document.getElementById('blockedUsersList');
        if (el) el.innerHTML = '<p style="font-size:13px;color:var(--yt-spec-text-secondary);">Yüklenemedi</p>';
      });
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
  showToast('İstek iptal edildi', 'success');
  loadFriendsPage();
}

async function cancelGroupRequest(requestId) {
  try {
    await fetch(`${API_URL}/groups/request/${requestId}`, { method: 'DELETE' });
    showToast('Grup isteği iptal edildi', 'success');
    loadFriendsPage();
  } catch(e) { showToast('İptal edilemedi', 'error'); }
}

async function blockUser(userId, nickname) {
  if (!confirm(`${nickname} kullanıcısını engellemek istediğine emin misin?\nEngellenince seni göremeyecek, içeriklerine erişemeyecek.`)) return;
  try {
    await fetch(`${API_URL}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockerId: currentUser.id, blockedId: userId })
    });
    showToast(`${nickname} engellendi`, 'success');
    loadFriendsPage();
  } catch(e) { showToast('Engellenemedi', 'error'); }
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

  // Firebase bekleme - max 3 saniye, sonra devam et
  const loadWithOrWithoutFirebase = () => {
    Promise.all([
      fetch(`${API_URL}/friends/${currentUser.id}`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/groups/user/${currentUser.id}`).then(r => r.json()).catch(() => [])
    ]).then(([friends, groups]) => {
      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        pageContent.innerHTML = `
          <div class="mobile-messages-page">
            <!-- Başlık + Arama -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;">
              <h2 style="font-size:20px;font-weight:800;margin:0;">Mesajlar</h2>
              <div style="display:flex;gap:4px;align-items:center;">
                <button onclick="showPage('friends')" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:18px;padding:6px;"><i class="fas fa-user-friends"></i></button>
                <button onclick="toggleMobileSearch()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:18px;padding:6px;"><i class="fas fa-search"></i></button>
              </div>
            </div>

            <!-- Sekmeler: Mesajlar | Gruplar -->
            <div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:4px;">
              <button id="msgTab-dm" onclick="switchMsgTab('dm')" style="flex:1;padding:10px;background:none;border:none;color:var(--yt-spec-text-primary);font-size:14px;font-weight:700;border-bottom:2px solid var(--yt-spec-brand-background-solid);cursor:pointer;">Mesajlar</button>
              <button id="msgTab-groups" onclick="switchMsgTab('groups')" style="flex:1;padding:10px;background:none;border:none;color:var(--yt-spec-text-secondary);font-size:14px;font-weight:500;border-bottom:2px solid transparent;cursor:pointer;">Gruplar</button>
            </div>

            <!-- DM Sekmesi -->
            <div id="msgTabContent-dm">
              <div style="padding:0 16px 12px;">
                <div style="display:flex;gap:8px;background:rgba(255,255,255,0.06);border-radius:12px;padding:10px 14px;align-items:center;">
                  <i class="fas fa-search" style="color:var(--yt-spec-text-secondary);font-size:14px;"></i>
                  <input type="text" id="msgFriendSearch" placeholder="Kullanıcı ara..."
                    style="background:none;border:none;outline:none;color:var(--yt-spec-text-primary);font-size:14px;flex:1;"
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
              <div style="border-top:1px solid rgba(255,255,255,0.06);">
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

            <!-- Gruplar Sekmesi -->
            <div id="msgTabContent-groups" style="display:none;">
              <div style="padding:12px 16px;">
                <button onclick="showCreateGroupModal()" style="width:100%;padding:12px;background:rgba(255,255,255,0.06);border:1px dashed rgba(255,255,255,0.15);border-radius:12px;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;">
                  <i class="fas fa-plus"></i> Yeni Grup Oluştur
                </button>
              </div>
              ${groups.length === 0
                ? '<p style="padding:24px 16px;color:var(--yt-spec-text-secondary);text-align:center;">Henüz grubun yok</p>'
                : groups.map(g => `
                  <div class="mobile-chat-row" onclick="openGroup(${g.id})">
                    <div style="position:relative;flex-shrink:0;">
                      <img src="${g.photo_url || 'data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=48 height=48%3E%3Ccircle cx=24 cy=24 r=24 fill=%23333/%3E%3C/svg%3E'}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
                      <span id="groupUnread_${g.id}" class="unread-badge" style="display:none;position:absolute;top:-3px;right:-3px;min-width:16px;height:16px;font-size:10px;padding:0 4px;"></span>
                    </div>
                    <div style="flex:1;min-width:0;">
                      <p style="font-size:14px;font-weight:600;margin-bottom:2px;">${g.name}</p>
                      <p style="font-size:12px;color:var(--yt-spec-text-secondary);">${g.member_count} üye</p>
                    </div>
                    <i class="fas fa-chevron-right" style="color:var(--yt-spec-text-secondary);font-size:12px;"></i>
                  </div>
                `).join('')
              }
            </div>
          </div>
        `;

        // Grup badge'lerini dinle
        if (window.firebaseDB && groups.length > 0) {
          watchGroupUnreadBadges(groups.map(g => g.id));
        }
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
  }; // loadWithOrWithoutFirebase sonu

  if (window.firebaseDB) {
    loadWithOrWithoutFirebase();
  } else {
    // Firebase olmadan hemen yükle, arka planda Firebase gelince listener'ları başlat
    loadWithOrWithoutFirebase();
    document.addEventListener('firebaseReady', () => {
      // Sadece listener'ları başlat, sayfayı yeniden render etme
      fetch(`${API_URL}/friends/${currentUser.id}`).then(r => r.json()).catch(() => []).then(friends => {
        friends.forEach(f => {
          listenLastMessage(f.friend_id, f.nickname);
          listenFriendPresence(f.friend_id);
        });
      });
    }, { once: true });
  }
}

// Mesajlar sekme geçişi
function switchMsgTab(tab) {
  ['dm','groups'].forEach(t => {
    const content = document.getElementById(`msgTabContent-${t}`);
    const btn = document.getElementById(`msgTab-${t}`);
    if (content) content.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      btn.style.color = t === tab ? 'var(--yt-spec-text-primary)' : 'var(--yt-spec-text-secondary)';
      btn.style.fontWeight = t === tab ? '700' : '500';
      btn.style.borderBottom = t === tab ? '2px solid var(--yt-spec-brand-background-solid)' : '2px solid transparent';
    }
  });
}

// Mobil tam ekran chat
function openMobileChat(friendId, friendName, friendPhoto) {
  console.log('🔥 openMobileChat çağrıldı:', { friendId, friendName, friendPhoto });
  console.log('🔥 currentUser:', currentUser);
  console.log('🔥 window.firebaseDB:', !!window.firebaseDB);
  
  // Parametreleri kontrol et
  if (!friendId || !friendName) {
    console.error('❌ Eksik parametreler:', { friendId, friendName });
    showToast('Hatalı mesaj parametreleri', 'error');
    return;
  }
  
  // Profil fotoğrafı yoksa varsayılan kullan
  friendPhoto = friendPhoto && friendPhoto !== '?' && friendPhoto !== 'null' ? friendPhoto : getProfilePhotoUrl(null);
  console.log('🔥 İşlenmiş friendPhoto:', friendPhoto);
  
  if (!window.firebaseDB) {
    console.log('⏳ Firebase bekleniyor...');
    showToast('Bağlantı kuruluyor...', 'info');
    document.addEventListener('firebaseReady', () => {
      console.log('🔥 Firebase hazır, tekrar deneniyor...');
      openMobileChat(friendId, friendName, friendPhoto);
    }, { once: true });
    return;
  }

  console.log('🔥 Engel kontrolü yapılıyor...');
  // Engel kontrolü
  fetch(`${API_URL}/is-blocked/${currentUser.id}/${friendId}`)
    .then(r => {
      console.log('🔥 Engel kontrolü response status:', r.status);
      return r.json();
    })
    .then(d => {
      console.log('🔥 Engel kontrolü sonucu:', d);
      if (d.isBlocked) {
        console.log('🚫 Kullanıcı engellenmiş');
        showBlockedChatWarning(friendId, friendName, friendPhoto, true);
      } else {
        console.log('✅ Kullanıcı engellenmemiş, chat açılıyor...');
        _openMobileChatDirect(friendId, friendName, friendPhoto);
      }
    })
    .catch(e => {
      console.error('❌ Engel kontrolü hatası:', e);
      console.log('🔄 Hata olmasına rağmen chat açılmaya çalışılıyor...');
      _openMobileChatDirect(friendId, friendName, friendPhoto);
    });
}

function _openMobileChatDirect(friendId, friendName, friendPhoto) {
  console.log('🔥 _openMobileChatDirect çağrıldı:', { friendId, friendName, friendPhoto });
  
  const chatId = getChatId(currentUser.id, friendId);
  console.log('🔥 Chat ID hesaplandı:', chatId);
  
  const pageContent = document.getElementById('pageContent');
  
  if (!pageContent) {
    console.error('❌ pageContent bulunamadı!');
    showToast('Sayfa içeriği bulunamadı!', 'error');
    return;
  }
  
  console.log('✅ pageContent bulundu');
  currentChatFriendId = friendId;
  console.log('🔥 currentChatFriendId ayarlandı:', currentChatFriendId);

  try {
    console.log('🔥 HTML içeriği oluşturuluyor...');
    
    const htmlContent = `
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
          <button onclick="startDirectCall(${friendId},'${friendName.replace(/'/g,"\\'")}','${friendPhoto}')" title="Sesli Arama" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;padding:8px;font-size:18px;flex-shrink:0;">
            <i class="fas fa-phone"></i>
          </button>
        </div>
        <div id="selectToolbar" class="select-toolbar" style="display:none;">
          <button onclick="exitSelectMode()" style="background:none;border:none;color:inherit;cursor:pointer;padding:4px 8px;font-size:18px;"><i class="fas fa-times"></i></button>
          <span id="selectCount" style="font-size:14px;font-weight:600;flex:1;">0 seçildi</span>
          <button id="deleteMineBtn" onclick="confirmBulkDelete('${chatId}','sender')" style="display:none;background:rgba(244,67,54,0.15);border:1px solid #f44336;color:#f44336;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;white-space:nowrap"><i class="fas fa-trash"></i> Benden Sil</button>
          <button id="deleteAllBtn" onclick="confirmBulkDelete('${chatId}','all')" style="display:none;background:rgba(244,67,54,0.25);border:1px solid #f44336;color:#f44336;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap"><i class="fas fa-trash-alt"></i> Herkesten Sil</button>
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
            <textarea id="chatInput" class="chat-input chat-textarea" placeholder="Mesaj yaz..." onkeydown="handleChatKey(event,${friendId})" oninput="sendTypingStatus(${friendId},this.value.length>0)"></textarea>
            <button class="chat-send-btn" onclick="sendMessage(${friendId})"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    `;
    
    console.log('🔥 HTML içeriği hazırlandı, DOM\'a ekleniyor...');
    pageContent.innerHTML = htmlContent;
    console.log('✅ HTML içeriği DOM\'a eklendi');
    
  } catch(e) {
    console.error('❌ HTML oluşturma hatası:', e);
    showToast('Mesaj açılamadı: ' + e.message, 'error');
    return;
  }

  try {
    const msgsRef = window.firebaseQuery(
      window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`),
      window.firebaseOrderByChild('timestamp')
    );
    
    console.log('Firebase listener başlatılıyor...');
    
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
            ${msg.videoShare ? `
              <div onclick="event.stopPropagation();${msg.videoShare.isShort ? `openShortFromHome(${msg.videoShare.videoId})` : `playVideo(${msg.videoShare.videoId})`}" style="cursor:pointer;border-radius:10px;overflow:hidden;max-width:220px;background:rgba(0,0,0,0.3)">
                <video src="${msg.videoShare.videoUrl}" style="width:100%;max-height:160px;object-fit:cover;display:block;pointer-events:none" muted></video>
                <div style="padding:8px 10px;display:flex;align-items:center;gap:6px">
                  <i class="fas fa-play-circle" style="color:#ff0033;font-size:16px;flex-shrink:0"></i>
                  <p style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${msg.videoShare.title}</p>
                </div>
              </div>
            ` : msg.imageUrl ? `<img src="${msg.imageUrl}" style="max-width:200px;max-height:200px;border-radius:10px;display:block;" />` : `<p style="white-space:pre-wrap;">${decodeURIComponent(msg.text || '')}</p>`}
            <div class="chat-meta">${time} ${readIcon}</div>
          </div>
          ${isMe ? `<img src="${getProfilePhotoUrl(currentUser.profile_photo)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;align-self:flex-end;margin-left:6px;" />` : ''}
        `;
        let pressTimer;
        div.addEventListener('pointerdown', (e) => { pressTimer = setTimeout(() => { showMsgMenu(e, msgId, isMe, chatId); }, 500); });
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
    console.log('Mobil chat başarıyla açıldı');
    
  } catch(e) {
    console.error('Firebase listener hatası:', e);
    showToast('Mesaj yüklenemedi: ' + e.message, 'error');
  }
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
      el.textContent = deleted ? '' : (isMe ? 'Sen: ' : '') + (msg.text ? decodeURIComponent(msg.text) : (msg.imageUrl ? '📷 Fotoğraf' : ''));
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
  // Tüm unread badge'leri topla (DM + grup)
  let total = 0;
  document.querySelectorAll('[id^="unread_"], [id^="unread2_"], [id^="groupUnread_"]').forEach(el => {
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
  // Gruplar nav badge'ini güncelle
  const groupNavBadge = document.getElementById('groupNavBadge');
  if (groupNavBadge) {
    let groupTotal = 0;
    document.querySelectorAll('[id^="groupUnread_"]').forEach(el => {
      if (el.style.display !== 'none') groupTotal += parseInt(el.textContent) || 0;
    });
    if (groupTotal > 0) {
      groupNavBadge.textContent = groupTotal > 9 ? '9+' : groupTotal;
      groupNavBadge.style.display = 'flex';
    } else {
      groupNavBadge.style.display = 'none';
    }
  }
}

// Grup okunmamış mesajlarını Firebase'den dinle
let groupUnreadListeners = {};
function watchGroupUnreadBadges(groupIds) {
  if (!window.firebaseDB || !currentUser) return;
  // Önceki listener'ları temizle
  Object.values(groupUnreadListeners).forEach(unsub => { try { unsub(); } catch(e) {} });
  groupUnreadListeners = {};

  const lastReadKey = `groupLastRead_${currentUser.id}`;
  const lastReadMap = JSON.parse(localStorage.getItem(lastReadKey) || '{}');

  groupIds.forEach(groupId => {
    const ref = window.firebaseRef(window.firebaseDB, `group_chats/${groupId}/messages`);
    const unsub = window.firebaseOnValue(ref, snap => {
      const lastRead = lastReadMap[groupId] || 0;
      let unread = 0;
      snap.forEach(child => {
        const msg = child.val();
        if (msg.senderId != currentUser.id && msg.timestamp > lastRead && !msg.deletedForAll) {
          const hidden = msg.hiddenFor || [];
          if (!hidden.includes(String(currentUser.id))) unread++;
        }
      });
      const badge = document.getElementById(`groupUnread_${groupId}`);
      if (badge) {
        if (unread > 0) {
          badge.textContent = unread > 9 ? '9+' : unread;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
      updateTotalMsgBadge();
    });
    groupUnreadListeners[groupId] = unsub;
  });
}

// Grup açıldığında okundu olarak işaretle
function markGroupAsRead(groupId) {
  if (!currentUser) return;
  const lastReadKey = `groupLastRead_${currentUser.id}`;
  const lastReadMap = JSON.parse(localStorage.getItem(lastReadKey) || '{}');
  lastReadMap[groupId] = Date.now();
  localStorage.setItem(lastReadKey, JSON.stringify(lastReadMap));
  const badge = document.getElementById(`groupUnread_${groupId}`);
  if (badge) badge.style.display = 'none';
  updateTotalMsgBadge();
}

function listenFriendPresence(friendId) {
  if (!window.firebaseDB) return;
  const presRef = window.firebaseRef(window.firebaseDB, `presence/${friendId}`);
  window.firebaseOnValue(presRef, snap => {
    const val = snap.val();
    // Sadece açıkça online:true ise çevrimiçi say
    const isOnline = val !== null && val?.online === true;
    const dot = document.getElementById(`online_${friendId}`);
    const dot2 = document.getElementById(`online2_${friendId}`);
    const item = document.getElementById(`friend_${friendId}`);
    if (dot) dot.style.display = isOnline ? 'block' : 'none';
    if (dot2) dot2.style.display = isOnline ? 'block' : 'none';
    if (item) item.style.opacity = '1'; // opacity değiştirme
  });
}

function openChat(friendId, friendName, friendPhoto) {
  friendPhoto = friendPhoto && friendPhoto !== '?' && friendPhoto !== 'null' ? friendPhoto : getProfilePhotoUrl(null);
  currentChatFriendId = friendId;

  // Firebase hazır değilse bekle
  if (!window.firebaseDB) {
    showToast('Bağlantı kuruluyor, lütfen bekle...', 'info');
    document.addEventListener('firebaseReady', () => openChat(friendId, friendName, friendPhoto), { once: true });
    return;
  }

  // Engel kontrolü
  fetch(`${API_URL}/is-blocked/${currentUser.id}/${friendId}`)
    .then(r => r.json())
    .then(d => {
      if (d.isBlocked) {
        showBlockedChatWarning(friendId, friendName, friendPhoto, false);
      } else {
        _openChatDirect(friendId, friendName, friendPhoto);
      }
    })
    .catch(() => _openChatDirect(friendId, friendName, friendPhoto));
}

function showBlockedChatWarning(friendId, friendName, friendPhoto, isMobile) {
  const overlay = document.createElement('div');
  overlay.id = 'blockedChatOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:var(--yt-spec-raised-background,#1f1f1f);border-radius:16px;padding:28px;width:100%;max-width:320px;text-align:center;">
      <i class="fas fa-ban" style="font-size:44px;color:#ff4444;margin-bottom:14px;display:block;"></i>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;">Bu kişiyi engellediniz</div>
      <div style="font-size:14px;color:var(--yt-spec-text-secondary,#aaa);margin-bottom:20px;">${friendName} adlı kullanıcıya mesaj atamazsınız.</div>
      <input type="password" id="blockBypassInput" style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px 14px;color:#fff;font-size:14px;outline:none;margin-bottom:12px;" placeholder="Şifre ile devam et..." />
      <div style="display:flex;gap:8px;">
        <button onclick="checkBlockBypass(${friendId},'${friendName}','${friendPhoto}',${isMobile})" style="flex:1;background:#ff0033;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;">Devam</button>
        <button onclick="document.getElementById('blockedChatOverlay').remove()" style="flex:1;background:rgba(255,255,255,0.08);border:none;color:#aaa;border-radius:10px;padding:12px;font-size:14px;cursor:pointer;">İptal</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function checkBlockBypass(friendId, friendName, friendPhoto, isMobile) {
  const val = document.getElementById('blockBypassInput')?.value;
  if (val === 'engellersemengellerim394543') {
    document.getElementById('blockedChatOverlay')?.remove();
    if (isMobile) _openMobileChatDirect(friendId, friendName, friendPhoto);
    else _openChatDirect(friendId, friendName, friendPhoto);
  } else {
    showToast('Yanlış şifre', 'error');
  }
}

function _openChatDirect(friendId, friendName, friendPhoto) {
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
      <button class="yt-icon-button" onclick="startDirectCall(${friendId},'${friendName.replace(/'/g,"\\'")}','${friendPhoto}')" title="Sesli Arama">
        <i class="fas fa-phone" style="font-size:14px;"></i>
      </button>
      <button class="yt-icon-button" onclick="openFloatingChat(${friendId},'${friendName}','${friendPhoto}')" title="Mini pencere">
        <i class="fas fa-external-link-alt" style="font-size:14px;"></i>
      </button>
    </div>

    <!-- Seçim Toolbar (gizli) -->
    <div id="selectToolbar" class="select-toolbar" style="display:none;">
      <button onclick="exitSelectMode()" style="background:none;border:none;color:inherit;cursor:pointer;padding:4px 8px;font-size:18px;"><i class="fas fa-times"></i></button>
      <span id="selectCount" style="font-size:14px; font-weight:600; flex:1;">0 seçildi</span>
      <button id="deleteMineBtn" onclick="confirmBulkDelete('${chatId}','sender')" style="display:none;background:rgba(244,67,54,0.15);border:1px solid #f44336;color:#f44336;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;white-space:nowrap"><i class="fas fa-trash"></i> Benden Sil</button>
      <button id="deleteAllBtn" onclick="confirmBulkDelete('${chatId}','all')" style="display:none;background:rgba(244,67,54,0.25);border:1px solid #f44336;color:#f44336;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap"><i class="fas fa-trash-alt"></i> Herkesten Sil</button>
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
                  onkeydown="handleChatKey(event,${friendId})" oninput="sendTypingStatus(${friendId},this.value.length>0)"></textarea>
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

      // Long press ile menü aç (Instagram tarzı)
      let pressTimer;
      div.addEventListener('pointerdown', (e) => {
        pressTimer = setTimeout(() => showMsgMenu(e, msgId, isMe, chatId), 500);
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
  // Backend'de engel kontrolü - İKİ YÖNLÜ: engellenen kişi mesaj atamaz VE engelleyen kişiye mesaj atılamaz
  try {
    const blockCheck = await fetch(`${API_URL}/is-blocked/${currentUser.id}/${friendId}`);
    const blockData = await blockCheck.json();
    if (blockData.isBlocked) {
      showToast('Bu kişiye mesaj atamazsınız', 'error');
      return;
    }
  } catch(e) { /* kontrol başarısız olsa bile devam etme */ return; }

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

  // Düzenleme modu
  if (input.dataset.editMode === 'true') {
    const editMsgId = input.dataset.editMsgId;
    const msgRef = window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages/${editMsgId}`);
    await window.firebaseUpdate(msgRef, { text, edited: true });
    input.value = '';
    input.style.height = 'auto';
    delete input.dataset.editMode;
    delete input.dataset.editMsgId;
    delete input.dataset.editChatId;
    document.getElementById('replyBanner')?.remove();
    sendTypingStatus(friendId, false);
    return;
  }

  const msgsRef = window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`);
  
  // Türkçe karakter encoding sorunu için text'i encode et
  const encodedText = encodeURIComponent(text);
  
  const msgData = {
    senderId: currentUser.id,
    receiverId: friendId,
    text: encodedText, // Encoded text gönder
    timestamp: Date.now(),
    read: false,
    deletedForSender: false,
    deletedForReceiver: false
  };

  // Yanıtlama modu
  if (input.dataset.replyMode === 'true') {
    msgData.replyTo = {
      msgId: input.dataset.replyMsgId,
      text: input.dataset.replyText
    };
    delete input.dataset.replyMode;
    delete input.dataset.replyMsgId;
    delete input.dataset.replyChatId;
    delete input.dataset.replyText;
    document.getElementById('replyBanner')?.remove();
  }

  try {
    await window.firebasePush(msgsRef, msgData);
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

  // Toolbar butonlarını güncelle
  updateSelectToolbarButtons();
}

function updateSelectToolbarButtons() {
  const deleteMineBtn = document.getElementById('deleteMineBtn');
  const deleteAllBtn = document.getElementById('deleteAllBtn');
  if (!deleteMineBtn || !deleteAllBtn) return;

  const count = selectedMessages.size;
  if (count === 0) {
    deleteMineBtn.style.display = 'none';
    deleteAllBtn.style.display = 'none';
    return;
  }

  const hasOthers = [...selectedMessages.values()].some(m => !m.isMe);
  // Her zaman "Benden Sil" göster
  deleteMineBtn.style.display = 'inline-flex';
  // Sadece kendi mesajları seçiliyse "Herkesten Sil" de göster
  deleteAllBtn.style.display = hasOthers ? 'none' : 'inline-flex';
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
    // Hepsi benim → seçenek sun: benden sil veya herkesten sil
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
    // Karşının mesajı var → sadece benden sil (karşının mesajları sadece kendi görünümünden gizlenir)
    await confirmBulkDelete(chatId, 'sender');
  }
}

async function confirmBulkDelete(chatId, type) {
  if (!window.firebaseDB) return;
  const promises = [];
  for (const [msgId, info] of selectedMessages) {
    const msgRef = window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages/${msgId}`);
    if (type === 'all') {
      // Herkesten sil: sadece kendi mesajlarımı herkesten silebilirim
      if (info.isMe) {
        promises.push(window.firebaseUpdate(msgRef, { deletedForSender: true, deletedForReceiver: true }));
      } else {
        // Karşının mesajı - sadece benden gizle
        promises.push(window.firebaseUpdate(msgRef, { deletedForReceiver: true }));
      }
    } else {
      // Benden sil: kendi mesajım → deletedForSender, karşınınki → deletedForReceiver (sadece benim görünümümden gizle)
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
  document.getElementById('msgContextMenu')?.remove();

  // Instagram tarzı bottom sheet
  const sheet = document.createElement('div');
  sheet.id = 'msgContextMenu';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;';

  const items = isMe ? [
    { icon: 'fa-reply', text: 'Yanıtla', color: 'var(--yt-spec-text-primary)', action: () => startReplyMessage(msgId, chatId) },
    { icon: 'fa-edit', text: 'Düzenle', color: 'var(--yt-spec-text-primary)', action: () => editChatMessage(chatId, msgId) },
    { icon: 'fa-check-square', text: 'Seç', color: 'var(--yt-spec-text-primary)', action: () => { enterSelectMode(msgId, true, chatId); } },
    { icon: 'fa-trash', text: 'Benden Sil', color: '#f44336', action: () => deleteMessage(chatId, msgId, 'sender') },
    { icon: 'fa-trash-alt', text: 'Herkesten Sil', color: '#f44336', action: () => deleteMessage(chatId, msgId, 'all') }
  ] : [
    { icon: 'fa-reply', text: 'Yanıtla', color: 'var(--yt-spec-text-primary)', action: () => startReplyMessage(msgId, chatId) },
    { icon: 'fa-check-square', text: 'Seç', color: 'var(--yt-spec-text-primary)', action: () => { enterSelectMode(msgId, false, chatId); } },
    { icon: 'fa-trash', text: 'Benden Sil', color: '#f44336', action: () => deleteMessage(chatId, msgId, 'receiver') }
  ];

  sheet.innerHTML = `
    <div style="width:100%;background:var(--yt-spec-raised-background);border-radius:20px 20px 0 0;padding:8px 0 24px;box-shadow:0 -8px 32px rgba(0,0,0,0.5)">
      <div style="width:36px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;margin:8px auto 16px"></div>
      ${items.map(item => `
        <button class="msg-menu-item" data-action="${item.text}" style="width:100%;display:flex;align-items:center;gap:16px;background:none;border:none;color:${item.color};padding:14px 24px;font-size:15px;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent">
          <i class="fas ${item.icon}" style="width:20px;text-align:center"></i>
          ${item.text}
        </button>
      `).join('')}
    </div>
  `;

  // Butonlara action bağla
  const btns = sheet.querySelectorAll('.msg-menu-item');
  btns.forEach((btn, i) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      sheet.remove();
      items[i].action();
    });
    btn.addEventListener('touchstart', () => btn.style.background = 'rgba(255,255,255,0.06)', { passive: true });
    btn.addEventListener('touchend', () => btn.style.background = '', { passive: true });
  });

  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
  document.body.appendChild(sheet);
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
  if (!bubble) { showToast('Mesaj bulunamadı', 'error'); return; }
  const current = bubble.textContent.trim();
  const input = document.getElementById('chatInput');
  if (input) {
    // Input'a düzenleme modunu aç
    input.value = current;
    input.dataset.editMode = 'true';
    input.dataset.editMsgId = msgId;
    input.dataset.editChatId = chatId;
    input.focus();
    // Düzenleme banner'ı göster
    showReplyBanner(`✏️ Düzenleniyor: ${current.substring(0, 40)}${current.length > 40 ? '...' : ''}`, () => {
      input.value = '';
      delete input.dataset.editMode;
      delete input.dataset.editMsgId;
      delete input.dataset.editChatId;
    });
  }
}

function startReplyMessage(msgId, chatId) {
  const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
  const textEl = msgEl?.querySelector('.msg-text');
  const text = textEl?.textContent?.trim() || 'Mesaj';
  const input = document.getElementById('chatInput');
  if (input) {
    input.dataset.replyMode = 'true';
    input.dataset.replyMsgId = msgId;
    input.dataset.replyChatId = chatId;
    input.dataset.replyText = text;
    input.focus();
    showReplyBanner(`↩️ Yanıtlanıyor: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`, () => {
      delete input.dataset.replyMode;
      delete input.dataset.replyMsgId;
      delete input.dataset.replyChatId;
      delete input.dataset.replyText;
    });
  }
}

function showReplyBanner(text, onCancel) {
  document.getElementById('replyBanner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'replyBanner';
  banner.style.cssText = 'padding:8px 12px;background:rgba(255,255,255,0.06);border-left:3px solid #ff0033;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--yt-spec-text-secondary)';
  banner.innerHTML = `<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${text}</span><button onclick="document.getElementById('replyBanner').remove();(${onCancel.toString()})()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:16px;padding:0 4px">×</button>`;
  const wrapper = document.querySelector('.chat-input-wrapper');
  if (wrapper) wrapper.insertBefore(banner, wrapper.firstChild);
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
          <p style="white-space:pre-wrap;margin:0;">${decodeURIComponent(msg.text || '')}</p>
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
    const res = await fetch(`${API_URL}/shorts?userId=${currentUser?.id || ''}`);
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
    // Her girmede karışık sırala (Fisher-Yates shuffle)
    for (let i = shortsVideos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shortsVideos[i], shortsVideos[j]] = [shortsVideos[j], shortsVideos[i]];
    }
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

        <!-- Video Kutusu -->
        <div class="shorts-video-box" onclick="toggleShortPlay()">
          <video id="shortsVideo" src="${v.video_url}" autoplay loop playsinline
                 style="width:100%; height:100%; object-fit:cover; border-radius:12px;"></video>

          <!-- Play/Pause overlay -->
          <div id="shortPlayOverlay" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity:0; transition:opacity 0.3s;">
            <div style="background:rgba(0,0,0,0.5); border-radius:50%; width:72px; height:72px; display:flex; align-items:center; justify-content:center;">
              <i id="shortPlayIcon" class="fas fa-pause" style="font-size:32px; color:white;"></i>
            </div>
          </div>

          <!-- Ses Kontrolü (sol üst) - sabit pozisyon, kayma yok -->
          <div style="position:absolute;top:14px;left:14px;display:flex;align-items:center;gap:6px;z-index:20;pointer-events:auto;" onclick="event.stopPropagation()">
            <button id="shortMuteBtn" onclick="toggleShortMute()" style="background:rgba(0,0,0,0.55);border:none;color:#fff;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-tap-highlight-color:transparent;flex-shrink:0;">
              <i class="fas fa-volume-up" id="shortMuteIcon"></i>
            </button>
            <input type="range" id="shortVolumeSlider" min="0" max="100" value="100"
              oninput="setShortVolume(this.value)"
              style="width:70px;height:4px;accent-color:#ff0033;cursor:pointer;flex-shrink:0;opacity:1;"
              class="short-vol-slider" />
          </div>

          <!-- Geri Dön (sağ üst) -->
          <button onclick="event.stopPropagation();showPage('home')" style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.6);border:none;color:#fff;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);z-index:20;-webkit-tap-highlight-color:transparent">
            <i class="fas fa-times"></i>
          </button>

          <!-- Kanal + Başlık (sol alt) - siyahlık yok, temiz -->
          <div class="shorts-info" style="background:none;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <div style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;min-width:0;" onclick="event.stopPropagation();viewChannel(${v.channel_id})">
                <img src="${getProfilePhotoUrl(v.profile_photo)}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.8);flex-shrink:0;" onerror="onProfilePhotoError(this)" />
                <div style="min-width:0;">
                  <p style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px;text-shadow:0 1px 4px rgba(0,0,0,0.8);">${v.channel_name}${redVerifiedBadge(v.is_red_verified, 12)}</p>
                </div>
              </div>
              <button id="shortFollowBtn" onclick="event.stopPropagation();toggleShortFollow(${v.channel_id})" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.5);color:#fff;padding:5px 14px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;backdrop-filter:blur(4px);flex-shrink:0;display:none;">
                Takip Et
              </button>
            </div>
            <p style="font-size:13px;line-height:1.4;text-shadow:0 1px 4px rgba(0,0,0,0.8);margin:0;" id="shortTitleEl">${v.title}</p>
          </div>

          <!-- Sağ: Aksiyonlar -->
          <div class="shorts-right-actions" onclick="event.stopPropagation()">
            <button class="sra-btn" id="shortLikeBtn" onclick="likeShort(${v.id}, 1)">
              <i class="fas fa-heart" id="shortLikeIcon"></i>
              <span id="shortLikeCount">${v.likes || 0}</span>
            </button>
            <button class="sra-btn" onclick="toggleShortsComments(${v.id}, ${v.channel_id})">
              <i class="fas fa-comment"></i>
              <span>${v.comment_count || 0}</span>
            </button>
            <button class="sra-btn" onclick="shareContent(${v.id}, '${(v.title || '').replace(/'/g, "\\'")}', '${v.video_url}', true)">
              <i class="fas fa-paper-plane"></i>
              <span>Paylaş</span>
            </button>
            <button class="sra-btn" onclick="toggleSaved(${v.id})">
              <i class="fas fa-bookmark"></i>
              <span>Kaydet</span>
            </button>
            <button class="sra-btn" onclick="interestedShort(${v.id},'${(v.tags||'').replace(/'/g,"\\'")}')">
              <i class="fas fa-fire" style="color:#ff6b35;"></i>
              <span>İlgi</span>
            </button>
            <button class="sra-btn" onclick="notInterestedShort(${v.id},'${(v.tags||'').replace(/'/g,"\\'")}')" title="İlgilenmiyorum">
              <i class="fas fa-times-circle"></i>
              <span>İlgisiz</span>
            </button>
          </div>
        </div>

        <!-- Navigasyon butonları sadece PC'de görünür, mobilde swipe ile geçiş -->
        <div class="shorts-nav-col">
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

  // Klavye (ok tuşları + scroll)
  document.onkeydown = (e) => {
    if (currentPage !== 'shorts' && currentPage !== 'reals') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); nextShort(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); prevShort(); }
    if (e.key === ' ') { e.preventDefault(); toggleShortPlay(); }
    if (e.key === 'm' || e.key === 'M') toggleShortMute();
  };

  // Mouse scroll ile geçiş (PC)
  const container = document.getElementById('shortsContainer');
  if (container) {
    let scrollCooldown = false;
    let scrollAccumulator = 0;
    const SCROLL_THRESHOLD = 120; // Daha yüksek eşik - daha az hassas
    const COOLDOWN_TIME = 300; // Daha kısa cooldown (300ms)
    
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (scrollCooldown) return;
      
      // Scroll miktarını biriktir
      scrollAccumulator += Math.abs(e.deltaY);
      
      // Eşik değerine ulaşınca video değiştir
      if (scrollAccumulator >= SCROLL_THRESHOLD) {
        scrollCooldown = true;
        scrollAccumulator = 0;
        setTimeout(() => scrollCooldown = false, COOLDOWN_TIME);
        
        if (e.deltaY > 0) nextShort();
        else prevShort();
      }
      
      // Accumulator'ı sıfırla (800ms içinde yeterli scroll yoksa)
      setTimeout(() => { scrollAccumulator = 0; }, 800);
    }, { passive: false });

    // Touch swipe (mobil) - daha az hassas
    let touchStartY = 0;
    container.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
    container.addEventListener('touchend', e => {
      const diff = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 60) {
        if (scrollCooldown) return;
        scrollCooldown = true;
        setTimeout(() => scrollCooldown = false, 400);
        if (diff > 0) nextShort(); else prevShort(); 
      }
    }, { passive: true });

    // Giriş animasyonu
    container.style.opacity = '0';
    container.style.transform = 'translateY(30px)';
    container.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.25s';
        container.style.transform = 'translateY(0)';
        container.style.opacity = '1';
      });
    });
  }

  checkShortLikeStatus(v.id);
  saveWatchProgress(v.id, 0, 0);

  // Kaydedilmiş ses ayarını uygula
  const shortsVid = document.getElementById('shortsVideo');
  const shortSlider = document.getElementById('shortVolumeSlider');
  const shortIcon = document.getElementById('shortMuteIcon');
  if (shortsVid) {
    const savedVol = parseFloat(localStorage.getItem('tea_volume') ?? '1');
    const savedMuted = localStorage.getItem('tea_muted') === 'true';
    shortsVid.volume = savedVol;
    shortsVid.muted = savedMuted;
    if (shortSlider) shortSlider.value = savedMuted ? 0 : Math.round(savedVol * 100);
    if (shortIcon) shortIcon.className = savedMuted ? 'fas fa-volume-mute' : (savedVol < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up');
  }
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

function toggleShortMute() {
  const video = document.getElementById('shortsVideo');
  const icon = document.getElementById('shortMuteIcon');
  const slider = document.getElementById('shortVolumeSlider');
  if (!video) return;
  video.muted = !video.muted;
  if (icon) icon.className = video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
  if (slider) slider.value = video.muted ? 0 : Math.round(video.volume * 100);
  localStorage.setItem('tea_muted', video.muted);
  showVolumeSlider();
}

function setShortVolume(val) {
  const video = document.getElementById('shortsVideo');
  const icon = document.getElementById('shortMuteIcon');
  if (!video) return;
  const v = parseInt(val) / 100;
  video.volume = v;
  video.muted = v === 0;
  localStorage.setItem('tea_volume', v);
  localStorage.setItem('tea_muted', v === 0);
  if (icon) {
    if (v === 0) icon.className = 'fas fa-volume-mute';
    else if (v < 0.5) icon.className = 'fas fa-volume-down';
    else icon.className = 'fas fa-volume-up';
  }
}

function showVolumeSlider() {
  // Slider artık her zaman görünür, bu fonksiyon sadece uyumluluk için
  const slider = document.getElementById('shortVolumeSlider');
  if (slider) { slider.style.opacity = '1'; slider.style.pointerEvents = 'auto'; }
}

// ==================== PAYLAŞ ====================
async function shareContent(videoId, title, videoUrl, isShort = false) {
  // Arkadaşları ve grupları yükle
  const [friendsRes, groupsRes] = await Promise.all([
    fetch(`${API_URL}/friends/${currentUser.id}`).then(r => r.json()).catch(() => []),
    fetch(`${API_URL}/groups/user/${currentUser.id}`).then(r => r.json()).catch(() => [])
  ]);

  const shareMsg = `🎬 ${title}\n${window.location.origin}/?v=${videoId}`;
  let selectedTargets = new Set();

  const html = `
    <h3 style="margin-bottom:16px;font-size:17px;font-weight:700"><i class="fas fa-paper-plane" style="color:#ff0033;margin-right:8px"></i>Paylaş</h3>
    
    <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;margin-bottom:16px;font-size:13px;color:var(--yt-spec-text-secondary)">
      <i class="fas fa-film" style="margin-right:6px;color:#ff0033"></i>${title}
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button onclick="selectAllShareTargets()" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:var(--yt-spec-text-primary);padding:7px;border-radius:8px;cursor:pointer;font-size:12px">Tümünü Seç</button>
      <button onclick="clearAllShareTargets()" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:var(--yt-spec-text-primary);padding:7px;border-radius:8px;cursor:pointer;font-size:12px">Temizle</button>
    </div>

    ${friendsRes.length > 0 ? `
      <p style="font-size:11px;font-weight:600;color:var(--yt-spec-text-secondary);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Arkadaşlar</p>
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:16px">
        ${friendsRes.map(f => `
          <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'" class="share-target-row">
            <input type="checkbox" class="share-chk" data-type="friend" data-id="${f.friend_id}" style="width:16px;height:16px;accent-color:#ff0033;cursor:pointer" />
            <img src="${getProfilePhotoUrl(f.profile_photo)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0" />
            <span style="font-size:14px">${f.nickname || f.username}</span>
          </label>
        `).join('')}
      </div>
    ` : ''}

    ${groupsRes.length > 0 ? `
      <p style="font-size:11px;font-weight:600;color:var(--yt-spec-text-secondary);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Gruplar</p>
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:16px">
        ${groupsRes.map(g => `
          <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'" class="share-target-row">
            <input type="checkbox" class="share-chk" data-type="group" data-id="${g.id}" style="width:16px;height:16px;accent-color:#ff0033;cursor:pointer" />
            <img src="${g.photo_url || 'data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=32 height=32%3E%3Ccircle cx=16 cy=16 r=16 fill=%23333/%3E%3C/svg%3E'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0" />
            <span style="font-size:14px">${g.name}</span>
          </label>
        `).join('')}
      </div>
    ` : ''}

    ${friendsRes.length === 0 && groupsRes.length === 0 ? '<p style="color:var(--yt-spec-text-secondary);text-align:center;padding:20px 0">Paylaşacak arkadaş veya grup yok</p>' : ''}

    <button onclick="sendShareMessages(${videoId},'${title.replace(/'/g, "\\'")}','${videoUrl}')" style="width:100%;background:#ff0033;border:none;color:#fff;padding:12px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;margin-top:4px">
      <i class="fas fa-paper-plane" style="margin-right:6px"></i>Gönder
    </button>
  `;
  showModal(html, 'Paylaş');
}

function selectAllShareTargets() {
  document.querySelectorAll('.share-chk').forEach(c => c.checked = true);
}
function clearAllShareTargets() {
  document.querySelectorAll('.share-chk').forEach(c => c.checked = false);
}

async function sendShareMessages(videoId, title, videoUrl) {
  const checked = document.querySelectorAll('.share-chk:checked');
  if (!checked.length) { showToast('En az bir kişi/grup seç', 'error'); return; }

  // Video önizleme kartı olarak gönder
  const shareText = `📹 ${title}`;
  const shareData = { type: 'video_share', videoId, title, videoUrl, isShort: !!isShort };
  const promises = [];

  checked.forEach(chk => {
    const type = chk.dataset.type;
    const id = chk.dataset.id;

    if (type === 'friend') {
      const chatId = getChatId(currentUser.id, parseInt(id));
      promises.push(
        window.firebasePush(window.firebaseRef(window.firebaseDB, `chats/${chatId}/messages`), {
          senderId: currentUser.id,
          receiverId: parseInt(id),
          text: shareText,
          videoShare: shareData,
          timestamp: Date.now(),
          read: false,
          deletedForSender: false,
          deletedForReceiver: false
        })
      );
    } else if (type === 'group') {
      promises.push(
        window.firebasePush(window.firebaseRef(window.firebaseDB, `group_chats/${id}/messages`), {
          senderId: currentUser.id,
          text: shareText,
          videoShare: shareData,
          timestamp: Date.now()
        })
      );
    }
  });

  try {
    await Promise.all(promises);
    closeModal();
    showToast(`${promises.length} kişi/gruba paylaşıldı`, 'success');
  } catch(e) {
    showToast('Paylaşım başarısız', 'error');
  }
}


function nextShort() {
  if (currentShortIndex < shortsVideos.length - 1) {
    const container = document.getElementById('shortsContainer');
    if (container) {
      container.style.transition = 'transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.18s';
      container.style.transform = 'translateY(-80px)';
      container.style.opacity = '0';
      setTimeout(() => { currentShortIndex++; renderShortsPlayer(); }, 180);
    } else {
      currentShortIndex++; renderShortsPlayer();
    }
  }
}
function prevShort() {
  if (currentShortIndex > 0) {
    const container = document.getElementById('shortsContainer');
    if (container) {
      container.style.transition = 'transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.18s';
      container.style.transform = 'translateY(80px)';
      container.style.opacity = '0';
      setTimeout(() => { currentShortIndex--; renderShortsPlayer(); }, 180);
    } else {
      currentShortIndex--; renderShortsPlayer();
    }
  }
}

async function likeShort(videoId, likeType) {
  // Anlık UI güncelle (optimistic)
  const likeBtn = document.getElementById('shortLikeBtn');
  const likeIcon = document.getElementById('shortLikeIcon');
  const likeCount = document.getElementById('shortLikeCount');
  const currentLiked = likeBtn?.classList.contains('liked');
  
  if (likeIcon) {
    if (currentLiked) {
      likeIcon.style.color = 'white';
      likeBtn?.classList.remove('liked');
      if (likeCount) likeCount.textContent = Math.max(0, parseInt(likeCount.textContent) - 1);
    } else {
      likeIcon.style.color = '#ff0033';
      likeBtn?.classList.add('liked');
      if (likeCount) likeCount.textContent = parseInt(likeCount.textContent || 0) + 1;
    }
  }

  try {
    await fetch(`${API_URL}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, userId: currentUser.id, likeType })
    });
  } catch(e) {
    // Hata olursa geri al
    if (likeIcon) {
      likeIcon.style.color = currentLiked ? '#ff0033' : 'white';
      if (currentLiked) likeBtn?.classList.add('liked');
      else likeBtn?.classList.remove('liked');
    }
  }
}

async function checkShortLikeStatus(videoId) {
  try {
    const res = await fetch(`${API_URL}/like-status/${videoId}/${currentUser.id}`);
    const data = await res.json();
    const lb = document.getElementById('shortLikeBtn');
    const icon = document.getElementById('shortLikeIcon');
    if (data.likeType === 1) {
      lb?.classList.add('liked');
      if (icon) icon.style.color = '#ff0033';
    } else {
      lb?.classList.remove('liked');
      if (icon) icon.style.color = 'white';
    }
  } catch(e) {}

  // Takip durumunu kontrol et
  try {
    const v = shortsVideos[currentShortIndex];
    if (!v || !v.channel_id) return;
    // Kendi kanalı ise takip butonu gösterme
    if (v.channel_owner_id === currentUser.id) return;
    const subRes = await fetch(`${API_URL}/is-subscribed/${currentUser.id}/${v.channel_id}`);
    const subData = await subRes.json();
    const followBtn = document.getElementById('shortFollowBtn');
    if (followBtn) {
      if (subData.subscribed) {
        followBtn.style.display = 'none'; // Zaten takip ediyorsa gösterme
      } else {
        followBtn.style.display = 'block';
      }
    }
  } catch(e) {}
}

async function notInterestedShort(videoId, tags) {
  try {
    const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (tagList.length > 0) {
      await Promise.all(tagList.map(tag =>
        fetch(`${API_URL}/not-interested`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, tag })
        })
      ));
    }
    // Bu videoyu listeden çıkar ve sonrakine geç
    shortsVideos.splice(currentShortIndex, 1);
    if (currentShortIndex >= shortsVideos.length) currentShortIndex = Math.max(0, shortsVideos.length - 1);
    showToast('İLGİLENMEDİN', 'info');
    if (shortsVideos.length > 0) renderShortsPlayer();
    else showPage('home');
  } catch(e) { showToast('Hata', 'error'); }
}

async function interestedShort(videoId, tags) {
  try {
    const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (tagList.length > 0) {
      await Promise.all(tagList.map(tag =>
        fetch(`${API_URL}/interested`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, tag })
        })
      ));
    }
    showToast('İLGİLENDİN', 'success');
  } catch(e) {}
}

async function toggleShortFollow(channelId) {
  try {
    const btn = document.getElementById('shortFollowBtn');
    await fetch(`${API_URL}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, channelId })
    });
    if (btn) btn.style.display = 'none'; // Takip ettikten sonra gizle
    showToast('Takip edildi', 'success');
  } catch(e) { showToast('Hata', 'error'); }
}

// Reals yorum paneli (Instagram stili)
function toggleShortsComments(videoId, channelId) {
  const existing = document.getElementById('shortsCommentPanel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'shortsCommentPanel';
  panel.style.cssText = `
    position:fixed; bottom:0; left:0; right:0; height:70vh;
    background:#1a1a1a; border-radius:20px 20px 0 0;
    z-index:4000; display:flex; flex-direction:column;
    box-shadow:0 -8px 40px rgba(0,0,0,0.7);
  `;
  panel.innerHTML = `
    <!-- Handle -->
    <div style="padding:10px 0 4px;display:flex;justify-content:center">
      <div style="width:36px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px"></div>
    </div>
    <!-- Başlık -->
    <div style="padding:8px 16px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08)">
      <span style="font-size:15px;font-weight:700">Yorumlar</span>
      <button onclick="document.getElementById('shortsCommentPanel').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;cursor:pointer;width:28px;height:28px;border-radius:50%;font-size:14px;display:flex;align-items:center;justify-content:center">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <!-- Yorum Listesi -->
    <div id="shortsCommentList" style="flex:1;overflow-y:auto;padding:12px 16px;-webkit-overflow-scrolling:touch">
      <div class="yt-loading"><div class="yt-spinner"></div></div>
    </div>
    <!-- Yorum Gir -->
    <div style="padding:10px 16px 20px;border-top:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:10px;background:#1a1a1a">
      <img src="${getProfilePhotoUrl(currentUser?.profile_photo)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0" />
      <div style="flex:1;display:flex;align-items:center;background:rgba(255,255,255,0.08);border-radius:24px;padding:0 14px;height:40px">
        <input id="shortsCommentInput" placeholder="Yorum ekle..." style="flex:1;background:none;border:none;outline:none;color:#fff;font-size:14px" onkeydown="if(event.key==='Enter')addShortsComment(${videoId},${channelId})" />
        <button onclick="addShortsComment(${videoId},${channelId})" style="background:none;border:none;color:#ff0033;cursor:pointer;font-size:16px;padding:0;flex-shrink:0">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
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
    if (!comments.length) {
      list.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:32px 0;font-size:14px">Henüz yorum yok. İlk yorumu sen yap!</p>';
      return;
    }
    
    const channelRes = await fetch(`${API_URL}/channel/${channelId}`);
    const channel = await channelRes.json();
    const isOwner = channel.user_id === currentUser.id;

    list.innerHTML = comments.map(c => {
      const isMyComment = c.user_id === currentUser.id;
      const canDelete = isMyComment || isOwner;
      const canPin = isOwner;
      const liked = c.user_like === 1;
      return `
        <div style="display:flex;gap:10px;margin-bottom:18px;${c.is_pinned ? 'background:rgba(255,255,255,0.03);border-radius:10px;padding:8px;' : ''}">
          <img src="${getProfilePhotoUrl(c.profile_photo)}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;cursor:pointer" onclick="viewChannel(${c.channel_id || 0})" />
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
              <span style="font-size:13px;font-weight:600;color:#fff">${c.nickname}</span>
              <span style="font-size:11px;color:rgba(255,255,255,0.4)">${timeAgo(c.created_at)}</span>
              ${c.is_pinned ? '<span style="font-size:10px;color:#ff0033"><i class="fas fa-thumbtack"></i> Sabitlendi</span>' : ''}
            </div>
            <p id="commentText_${c.id}" style="font-size:14px;line-height:1.5;color:rgba(255,255,255,0.9);word-break:break-word">${c.comment_text}</p>
            <div style="display:flex;gap:14px;margin-top:6px;align-items:center">
              <button onclick="likeComment(${c.id},1,${videoId},${channelId})" style="background:none;border:none;color:${liked ? '#ff0033' : 'rgba(255,255,255,0.5)'};cursor:pointer;font-size:12px;display:flex;align-items:center;gap:4px;padding:0">
                <i class="fas fa-heart${liked ? '' : '-o'}" style="font-size:14px"></i>
                <span>${c.likes || 0}</span>
              </button>
              ${isMyComment ? `<button onclick="editShortsComment(${c.id})" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:12px;padding:0">Düzenle</button>` : ''}
              ${canDelete ? `<button onclick="deleteShortsComment(${c.id},${videoId},${channelId})" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:12px;padding:0">Sil</button>` : ''}
              ${canPin ? `<button onclick="pinShortsComment(${c.id},${videoId},${channelId},${c.is_pinned?0:1})" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:12px;padding:0">${c.is_pinned ? 'Sabiti Kaldır' : 'Sabitle'}</button>` : ''}
            </div>
          </div>
          <!-- Beğeni butonu sağda (Instagram tarzı) -->
          <button onclick="likeComment(${c.id},1,${videoId},${channelId})" style="background:none;border:none;color:${liked ? '#ff0033' : 'rgba(255,255,255,0.4)'};cursor:pointer;font-size:18px;padding:0 0 0 4px;flex-shrink:0;align-self:flex-start;margin-top:2px">
            <i class="fas fa-heart"></i>
          </button>
        </div>`;
    }).join('');
  } catch(e) { list.innerHTML = '<p style="color:rgba(255,255,255,0.4)">Yüklenemedi</p>'; }
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
      <button class="category-chip" onclick="filterCategory(this, 'reals')">
        <i class="fas fa-film" style="margin-right:4px; font-size:11px;"></i>Reals
      </button>
      <button class="category-chip" onclick="filterCategory(this, 'photo')">
        <i class="fas fa-image" style="margin-right:4px; font-size:11px;"></i>Foto
      </button>
      <button class="category-chip" onclick="filterCategory(this, 'text')">
        <i class="fas fa-align-left" style="margin-right:4px; font-size:11px;"></i>Metin
      </button>
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
    const [allVideos, reals, songs] = await Promise.all([
      fetch(`${API_URL}/videos?limit=60`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/shorts?order=recent&userId=${currentUser?.id || ''}`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/music/home`).then(r => r.json()).catch(() => ({ newSongs:[], popularSongs:[] }))
    ]);

    const photoItems = allVideos.filter(v => v.video_type === 'Fotoğraf');
    const normalVideos = allVideos.filter(v => v.video_type !== 'Fotoğraf' && !v.is_short);

    // İzlenen story'leri localStorage'dan al
    const watchedStories = JSON.parse(localStorage.getItem('Tea_watched_stories') || '[]');
    
    // Reals'ları kullanıcı bazında tekil yap
    const uniqueReals = [];
    const seenUsers = new Set();
    for (const real of reals) {
      const uid = real.channel_id || real.user_id || real.id;
      if (!seenUsers.has(uid)) { uniqueReals.push(real); seenUsers.add(uid); }
    }

    // Reals'ları her girmede karışık sırala (Fisher-Yates)
    for (let i = uniqueReals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueReals[i], uniqueReals[j]] = [uniqueReals[j], uniqueReals[i]];
    }
    const realsItems = uniqueReals.slice(0, 15);

    // Günlük şarkı önerileri - seed olarak günün tarihi kullan
    const today = new Date().toDateString();
    const allSongs = [...(songs.popularSongs || []), ...(songs.newSongs || [])];
    const uniqueSongs = allSongs.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
    // Günlük seed ile karıştır
    const seedNum = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const dailySongs = [...uniqueSongs].sort((a, b) => {
      const ha = (a.id * seedNum) % 997;
      const hb = (b.id * seedNum) % 997;
      return ha - hb;
    }).slice(0, 8);

    pageContent.innerHTML = `
      <div class="mobile-feed">
        <!-- Günlük Şarkı Önerileri -->
        ${dailySongs.length > 0 ? `
          <div style="padding:12px 16px 4px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <p style="font-size:13px;font-weight:700;margin:0;display:flex;align-items:center;gap:6px;">
                <i class="fas fa-music" style="color:#1db954;font-size:12px;"></i>Bugünün Önerileri
              </p>
              <button onclick="showPage('ts-music')" style="background:none;border:none;color:#1db954;cursor:pointer;font-size:12px;font-weight:600;">Tümü →</button>
            </div>
            <div style="display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;">
              ${dailySongs.map(s => `
                <div onclick="playSong(${s.id})" style="flex-shrink:0;width:80px;cursor:pointer;-webkit-tap-highlight-color:transparent;" title="${s.title}">
                  <div style="position:relative;width:80px;height:80px;border-radius:10px;overflow:hidden;margin-bottom:5px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
                    <img src="${s.cover_url}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.src='logoteatube.png'" />
                    <div style="position:absolute;inset:0;background:rgba(0,0,0,0);transition:background 0.15s;display:flex;align-items:center;justify-content:center;">
                      <i class="fas fa-play" style="color:#fff;font-size:20px;opacity:0;transition:opacity 0.15s;"></i>
                    </div>
                  </div>
                  <p style="font-size:11px;font-weight:600;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.title || ''}</p>
                  <p style="font-size:10px;color:#1db954;margin:1px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.artist_name || ''}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Normal Videolar -->
        ${normalVideos.length > 0 ? `
          <div style="margin-bottom:4px">
            ${normalVideos.slice(0,10).map(v => `
              <div onclick="playVideo(${v.id})" class="insta-post-card">
                <div class="insta-post-header">
                  <img src="${getProfilePhotoUrl(v.profile_photo)}" class="insta-post-avatar" onerror="onProfilePhotoError(this)" />
                  <div style="flex:1;min-width:0">
                    <p style="font-size:13px;font-weight:600;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.channel_name}${redVerifiedBadge(v.is_red_verified, 11)}</p>
                    <p style="font-size:11px;color:var(--yt-spec-text-secondary);margin:0">${formatNumber(v.views)} görüntülenme</p>
                  </div>
                </div>
                <div style="aspect-ratio:16/9;overflow:hidden;background:#111">
                  <img src="${v.banner_url}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" />
                </div>
                <div style="padding:8px 12px 12px">
                  <p style="font-size:13px;font-weight:600;margin:0 0 2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${v.title}</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Fotoğraf Grid -->
        ${photoItems.length > 0 ? `
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
    // Reals kategorisi
    if (category === 'reals') {
      const shorts = await fetch(`${API_URL}/shorts?userId=${currentUser?.id||''}`).then(r => r.json()).catch(() => []);
      if (loading) loading.style.display = 'none';
      if (!shorts.length) {
        container.innerHTML = '<p style="color:var(--yt-spec-text-secondary);">Henüz reals yok</p>';
        return;
      }
      let shown = 4;
      const renderRealsGrid = () => {
        container.innerHTML = `
          <h2 class="section-header" style="margin-bottom:16px;">
            <i class="fas fa-film" style="color:var(--yt-spec-brand-background-solid); margin-right:8px;"></i>Reals
          </h2>
          <div class="shorts-grid" id="shortsGrid"></div>
          ${shown < shorts.length ? `<div style="text-align:center;margin-top:20px"><button id="loadMoreReals" class="yt-btn" style="background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)">Daha Fazla Yükle</button></div>` : ''}
        `;
        renderShortsGrid(shorts.slice(0, shown), 'shortsGrid');
        document.getElementById('loadMoreReals')?.addEventListener('click', () => {
          shown += 8;
          renderRealsGrid();
        });
      };
      renderRealsGrid();
      return;
    }

    // Foto kategorisi
    if (category === 'photo') {
      const allVideos = await fetch(`${API_URL}/videos?limit=100`).then(r => r.json()).catch(() => []);
      const photos = allVideos.filter(v => v.video_type === 'Fotoğraf');
      if (loading) loading.style.display = 'none';
      if (!photos.length) {
        container.innerHTML = '<p style="color:var(--yt-spec-text-secondary);">Henüz fotoğraf yok</p>';
        return;
      }
      container.innerHTML = `
        <h2 class="section-header" style="margin-bottom:16px;">
          <i class="fas fa-image" style="color:var(--yt-spec-brand-background-solid); margin-right:8px;"></i>Fotoğraflar
        </h2>
        <div class="photo-grid" id="photoGrid"></div>
      `;
      renderPhotoGrid(photos, 'photoGrid');
      return;
    }

    // Metin kategorisi
    if (category === 'text') {
      const allVideos = await fetch(`${API_URL}/videos?limit=100`).then(r => r.json()).catch(() => []);
      const texts = allVideos.filter(v => v.text_content && v.text_content.trim());
      if (loading) loading.style.display = 'none';
      if (!texts.length) {
        container.innerHTML = '<p style="color:var(--yt-spec-text-secondary);">Henüz metin içerik yok</p>';
        return;
      }
      container.innerHTML = `
        <h2 class="section-header" style="margin-bottom:16px;">
          <i class="fas fa-align-left" style="color:var(--yt-spec-brand-background-solid); margin-right:8px;"></i>Metin İçerikler
        </h2>
        <div class="text-grid" id="textGrid"></div>
      `;
      renderTextGrid(texts, 'textGrid');
      return;
    }

    // Tümü: normal videolar üstte, shorts altta
    if (!category || category === '') {
      const [recent, popular, subs, rec, shorts, songs] = await Promise.all([
        fetch(`${API_URL}/videos/recent?limit=8`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/videos/popular?limit=8`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/videos/subscriptions/${currentUser.id}?limit=8`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/videos/recommended/${currentUser.id}?limit=8`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/shorts`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/music/home`).then(r => r.json()).catch(() => ({ popularSongs:[], newSongs:[] }))
      ]);

      // Normal videolar (is_short = 0)
      const allNormal = [...subs, ...rec, ...recent, ...popular].filter(v => !v.is_short);
      const seen = new Set();
      const normalVideos = allNormal.filter(v => { if (seen.has(v.id)) return false; seen.add(v.id); return true; });

      // Günlük şarkı önerileri
      const today = new Date().toDateString();
      const allSongs = [...(songs.popularSongs || []), ...(songs.newSongs || [])];
      const uniqueSongs = allSongs.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
      const seedNum = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const dailySongs = [...uniqueSongs].sort((a, b) => ((a.id * seedNum) % 997) - ((b.id * seedNum) % 997)).slice(0, 8);

      if (loading) loading.style.display = 'none';

      container.innerHTML = `
        ${dailySongs.length > 0 ? `
          <div style="margin-bottom:28px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h2 class="section-header" style="margin:0;font-size:16px;">
                <i class="fas fa-music" style="color:#1db954;margin-right:8px;"></i>Bugünün Müzik Önerileri
              </h2>
              <button onclick="showPage('ts-music')" style="background:none;border:none;color:#1db954;cursor:pointer;font-size:13px;font-weight:600">Tümü →</button>
            </div>
            <div style="display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;">
              ${dailySongs.map(s => `
                <div onclick="playSongFromHome(${s.id})" style="flex-shrink:0;width:90px;cursor:pointer;" title="${s.title}">
                  <div style="width:90px;height:90px;border-radius:10px;overflow:hidden;margin-bottom:6px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
                    <img src="${s.cover_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='logoteatube.png'" />
                  </div>
                  <p style="font-size:12px;font-weight:600;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.title || ''}</p>
                  <p style="font-size:11px;color:#1db954;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.artist_name || ''}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div id="normalVideosGrid" class="video-grid"></div>
        ${shorts.length > 0 ? `
          <div style="margin-top:40px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <h2 class="section-header" style="margin:0;">
                <i class="fas fa-film" style="color:var(--yt-spec-brand-background-solid); margin-right:8px;"></i>Reals Önerileri
              </h2>
              ${shorts.length > 4 ? `<button onclick="showPage('reals')" style="background:none;border:none;color:var(--yt-spec-brand-background-solid);cursor:pointer;font-size:13px;font-weight:600">Tümünü Gör <i class="fas fa-chevron-right"></i></button>` : ''}
            </div>
            <div class="shorts-grid" id="shortsGrid"></div>
          </div>
        ` : ''}
      `;

      displayVideos(normalVideos, 'normalVideosGrid');
      if (shorts.length > 0) renderShortsGrid(shorts.slice(0, 4), 'shortsGrid');
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
  // Bu grid'deki videoları shortsVideos'a kaydet (tıklanınca doğru açılsın)
  if (shorts.length > 0) {
    // Mevcut listede yoksa ekle
    shorts.forEach(v => {
      if (!shortsVideos.find(s => s.id === v.id)) shortsVideos.push(v);
    });
  }
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
        <p class="short-card-meta">${formatNumber(v.views)} görüntülenme</p>
      </div>
    </div>
  `).join('');
}

// Foto grid - kare grid
function renderPhotoGrid(photos, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = photos.map(v => `
    <div class="photo-card" onclick="playVideo(${v.id})">
      <img src="${v.video_url}" alt="${v.title}" />
      <div class="photo-card-overlay">
        <div class="photo-card-stats">
          <span><i class="fas fa-heart"></i> ${v.likes || 0}</span>
          <span><i class="fas fa-eye"></i> ${v.views || 0}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Metin grid - TeaWeet ve Düz Metin kartları
function renderTextGrid(texts, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = texts.map(v => {
    const content = v.text_content || v.description || '';
    const isTeaWeet = v.video_type === 'TeaWeet' || v.text_type === 'teaweet';
    
    // TeaWeet için hashtag'leri mavi yap
    let displayContent = content;
    if (isTeaWeet) {
      displayContent = content.replace(/#(\w+)/g, '<span style="color:#1da1f2; font-weight:600;">#$1</span>');
    }
    
    return `
      <div class="text-card" onclick="playVideo(${v.id})">
        <div class="text-card-header">
          <img src="${getProfilePhotoUrl(v.profile_photo)}" class="text-card-avatar" onerror="onProfilePhotoError(this)" />
          <div class="text-card-user">
            <p class="text-card-name">${v.channel_name || 'Kullanıcı'}</p>
            <p class="text-card-time">${timeAgo(v.created_at)}</p>
          </div>
          ${isTeaWeet ? '<span class="text-card-badge"><i class="fas fa-shield-alt"></i> TeaWeet</span>' : '<span class="text-card-badge"><i class="fas fa-align-left"></i> Düz Metin</span>'}
        </div>
        <div class="text-card-content ${isTeaWeet ? 'teaweet-content' : 'plain-content'}">
          ${displayContent}
        </div>
        <div class="text-card-footer">
          <span><i class="fas fa-heart"></i> ${v.likes || 0}</span>
          <span><i class="fas fa-comment"></i> ${v.comment_count || 0}</span>
          <span><i class="fas fa-eye"></i> ${v.views || 0}</span>
        </div>
      </div>
    `;
  }).join('');
}

function openShortFromHome(videoId) {
  videoId = parseInt(videoId);
  // Önce mevcut listede ara
  const idx = shortsVideos.findIndex(v => v.id === videoId);
  if (idx !== -1) {
    // Tıklanan videoyu başa al
    const target = shortsVideos.splice(idx, 1)[0];
    shortsVideos = [target, ...shortsVideos];
    currentShortIndex = 0;
    showPage('reals');
  } else {
    // Shorts listesini yükle, hedef videoyu başa koy
    fetch(`${API_URL}/shorts?order=recent&userId=${currentUser?.id || ''}`)
      .then(r => r.json())
      .then(shorts => {
        const targetIdx = shorts.findIndex(v => v.id === videoId);
        if (targetIdx !== -1) {
          const t = shorts.splice(targetIdx, 1)[0];
          shortsVideos = [t, ...shorts];
        } else {
          // Listede yoksa tek video olarak aç
          shortsVideos = shorts.length > 0 ? shorts : [{ id: videoId }];
        }
        currentShortIndex = 0;
        showPage('reals');
      })
      .catch(() => {
        shortsVideos = [];
        currentShortIndex = 0;
        showPage('reals');
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
              <img src="${getProfilePhotoUrl(p.profile_photo)}" class="channel-avatar" style="width:22px;height:22px;" onerror="onProfilePhotoError(this)" />
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
          ${video.duration ? `<div class="video-duration">${formatDuration(video.duration)}</div>` : ''}
        </div>
        <div class="video-info">
          <img src="${getProfilePhotoUrl(video.profile_photo)}" alt="${video.nickname}" class="channel-avatar" onerror="onProfilePhotoError(this)" />
          <div class="video-details">
            <div class="video-title">${video.title}</div>
            <div class="video-channel">${video.channel_name}${redVerifiedBadge(video.is_red_verified)}</div>
            <div class="video-metadata">
              <span>${formatNumber(video.views)} görüntülenme</span>
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
  if (!photo || photo === '?' || photo === 'null' || photo === 'undefined' || photo === 'undefined') {
    return 'logoteatube.png';
  }
  return photo;
}

// Kırmızı tik HTML'i döndür - fa-check-circle kullan
function redVerifiedBadge(isRedVerified, size = 14) {
  if (!isRedVerified) return '';
  return `<i class="fas fa-check-circle" style="color:#ff0033;font-size:${size}px;margin-left:3px;flex-shrink:0;" title="Kırmızı Tik"></i>`;
}

// Profil fotoğrafı yükleme hatası için fallback
function onProfilePhotoError(img) {
  if (img.src !== window.location.origin + '/logoteatube.png') {
    img.src = 'logoteatube.png';
  }
}

// Rozet HTML'i oluştur
function renderBadge(badge, size = 14) {
  if (!badge) return '';
  return `<i class="fas ${badge.icon}" style="color:${badge.color};font-size:${size}px;margin-left:4px;flex-shrink:0;" title="${badge.name}"></i>`;
}

// Kullanıcı adını rozet rengiyle render et - rozet varsa isim rozet renginde, kırmızı tik varsa rozet gider
function renderUsername(nickname, badge, isRedVerified = false) {
  if (isRedVerified) {
    // Kırmızı tik aktifse rozet gösterme, isim normal renkte
    return `<span>${nickname}</span><i class="fas fa-check-circle" style="color:#ff0033;font-size:13px;margin-left:3px;flex-shrink:0;" title="Kırmızı Tik"></i>`;
  }
  if (badge) {
    const color = badge.name_color || '#ffffff';
    const badgeHtml = renderBadge(badge);
    return `<span style="color:${color}">${nickname}</span>${badgeHtml}`;
  }
  return `<span>${nickname}</span>`;
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
          <img src="${getProfilePhotoUrl(video.profile_photo)}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; cursor:pointer; flex-shrink:0;" onclick="viewChannel(${video.channel_id})" onerror="onProfilePhotoError(this)" />
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
                <input type="text" id="commentInput" class="yt-input" placeholder="Yorum ekle..." style="margin-bottom:0; height:36px;" onkeydown="if(event.key==='Enter'){event.preventDefault();addComment(${video.id})}" />
                <button class="yt-btn" onclick="addComment(${video.id})" style="height:36px; padding:0 14px; font-size:13px;">Gönder</button>
              </div>
            </div>
            <div id="commentsList" data-owner-id="${video.user_id || ''}"></div>
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

    // Engel kontrolü - engellenen veya engelleyen kişinin videosunu gösterme
    if (currentUser && video.user_id) {
      const blockCheck = await fetch(`${API_URL}/is-blocked/${currentUser.id}/${video.user_id}`);
      const blockData = await blockCheck.json();
      if (blockData.isBlocked) {
        const pageContent = document.getElementById('pageContent');
        pageContent.innerHTML = `
          <div style="text-align:center; padding:80px 20px;">
            <i class="fas fa-ban" style="font-size:64px; color:var(--yt-spec-text-secondary); margin-bottom:16px;"></i>
            <p style="font-size:18px; color:var(--yt-spec-text-secondary); margin-bottom:8px;">Video görüntülenemiyor</p>
            <p style="font-size:14px; color:var(--yt-spec-text-secondary);">Bu içerik artık mevcut değil</p>
          </div>`;
        return;
      }
    }

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
              <span><i class="fas fa-eye"></i> ${formatNumber(video.views)} görüntülenme</span>
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
                  <input type="text" id="commentInput" class="yt-input" placeholder="Yorum ekle..." style="margin-bottom:0;" onkeydown="if(event.key==='Enter'){event.preventDefault();addComment(${video.id})}" />
                  <button class="yt-btn" onclick="addComment(${video.id})">Gönder</button>
                </div>
              </div>
              <div id="commentsList" data-owner-id="${video.user_id || ''}"></div>
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
      // Takipten çık
      await fetch(`${API_URL}/subscribe`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, channelId })
      });
      showToast('Takipten çıkıldı', 'success');
      checkChannelSubscriptionStatus(channelId);
    } else {
      // Gizli hesap kontrolü
      const privRes = await fetch(`${API_URL}/channel-privacy/${channelId}`);
      const privData = await privRes.json();

      if (privData.is_private) {
        // Takip isteği gönder
        const ownerId = await getChannelOwnerId(channelId);
        const reqRes = await fetch(`${API_URL}/follow-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: currentUser.id, receiverId: ownerId })
        });
        const reqData = await reqRes.json();
        if (reqRes.ok) {
          showToast('Takip isteği gönderildi', 'success');
          const btn = document.getElementById('channelSubscribeBtn');
          if (btn) { btn.textContent = 'İstek Gönderildi'; btn.disabled = true; btn.style.opacity = '0.6'; }
        } else {
          showToast(reqData.error || 'İstek gönderilemedi', 'error');
        }
      } else {
        // Herkese açık hesap - direkt takip et
        const res = await fetch(`${API_URL}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, channelId })
        });
        if (res.ok) {
          showToast('Takip edildi', 'success');
          checkChannelSubscriptionStatus(channelId);
        } else {
          const d = await res.json();
          showToast(d.error || 'Takip edilemedi', 'error');
        }
      }
    }
  } catch (error) {
    console.error('Takip hatası:', error);
    showToast('Bir hata oluştu', 'error');
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
    if (!currentUser || !currentUser.id) {
      const commentsList = document.getElementById('commentsList');
      if (commentsList) commentsList.innerHTML = '<p style="color:var(--yt-spec-text-secondary);padding:8px 0;font-size:13px;">Yorumları görmek için giriş yapın</p>';
      return;
    }

    const response = await fetch(`${API_URL}/comments/${videoId}?userId=${currentUser.id}`);
    
    if (!response.ok) {
      const commentsList = document.getElementById('commentsList');
      if (commentsList) commentsList.innerHTML = '<p style="color:var(--yt-spec-text-secondary);padding:8px 0;font-size:13px;">Yorumlar yüklenirken hata oluştu</p>';
      return;
    }

    const comments = await response.json();
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    // data-owner-id'den al (parametre yoksa)
    if (!videoOwnerId && commentsList.dataset.ownerId) {
      videoOwnerId = parseInt(commentsList.dataset.ownerId) || null;
    }
    
    if (comments.length === 0) {
      commentsList.innerHTML = '<p style="color: var(--yt-spec-text-secondary); padding: 16px 0;">Henüz yorum yok. İlk yorumu sen yap!</p>';
      return;
    }

    const pinnedComments = comments.filter(c => c.is_pinned === 1);
    const regularComments = comments.filter(c => c.is_pinned !== 1);
    const sortedComments = [...pinnedComments, ...regularComments];

    commentsList.innerHTML = sortedComments.map(c => renderComment(c, videoId, false, videoOwnerId)).join('');
  } catch (error) {
    console.error('Yorumlar yükleme hatası:', error);
    const commentsList = document.getElementById('commentsList');
    if (commentsList) commentsList.innerHTML = '<p style="color:var(--yt-spec-text-secondary);padding:8px 0;font-size:13px;">Yorumlar yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.</p>';
  }
}

function renderComment(c, videoId, isReply = false, videoOwnerId = null) {
  const likeActive = c.user_like === 1 ? 'color:#4caf50;' : '';
  const dislikeActive = c.user_like === -1 ? 'color:#f44336;' : '';
  // == kullan (string/number karışıklığı için)
  const isOwner = videoOwnerId != null && currentUser && currentUser.id == videoOwnerId;
  const isCommentOwner = currentUser && currentUser.id == c.user_id;
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
          ${isCommentOwner ? `
            <button onclick="editComment(${c.id})" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--yt-spec-text-secondary);" title="Düzenle">
              <i class="fas fa-pen"></i>
            </button>
            <button onclick="deleteMyComment(${c.id}, ${videoId})" style="background:none; border:none; cursor:pointer; font-size:13px; color:#f44336;" title="Sil">
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
          ${isOwner && !isReply ? `
            <button onclick="showCommentMenu(${c.id}, ${videoId}, ${isPinned}, ${isHidden}, ${likedByOwner})" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--yt-spec-text-secondary);">
              <i class="fas fa-ellipsis-v"></i>
            </button>
          ` : ''}
          ${currentUser && !isCommentOwner ? `
            <button onclick="blockUserFromComment(${c.user_id}, '${c.nickname}')" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--yt-spec-text-secondary);" title="Engelle">
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

async function deleteMyComment(commentId, videoId) {
  if (!confirm('Yorumu silmek istediğine emin misin?')) return;
  try {
    await fetch(`${API_URL}/comment/${commentId}`, { method: 'DELETE' });
    const ownerEl = document.getElementById('commentsList');
    const ownerId = ownerEl?.dataset?.ownerId ? parseInt(ownerEl.dataset.ownerId) : null;
    loadComments(videoId, ownerId);
  } catch(e) { showToast('Silinemedi', 'error'); }
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
    const res = await fetch(`${API_URL}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, userId: currentUser.id, commentText })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Yorum eklenemedi', 'error'); return; }
    commentInput.value = '';
    // videoOwnerId'yi data-owner attribute'undan al
    const ownerEl = document.getElementById('commentsList');
    const ownerId = ownerEl?.dataset?.ownerId ? parseInt(ownerEl.dataset.ownerId) : null;
    loadComments(videoId, ownerId);
  } catch (error) {
    console.error('Yorum ekleme hatası:', error);
    showToast('Yorum eklenemedi', 'error');
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
    showToast('Arama yapmak için bir şeyler yaz', 'error');
    return;
  }

  if (!currentUser || !currentUser.id) {
    showToast('Arama yapmak için giriş yapmalısın', 'error');
    return;
  }

  // Önce home sayfasına geç ki pageContent görünür olsun
  showPage('home');

  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `<div class="yt-loading"><div class="yt-spinner"></div></div>`;

  try {
    const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&userId=${currentUser.id}`);
    const videos = await response.json();

    pageContent.innerHTML = `
      <h2 class="section-header">Arama Sonuçları: "${query}"</h2>
      <div id="searchResults" class="video-grid"></div>
    `;

    if (videos.length === 0) {
      document.getElementById('searchResults').innerHTML = '<p style="color:var(--yt-spec-text-secondary);padding:40px 0;text-align:center;">Sonuç bulunamadı</p>';
    } else {
      displayVideos(videos, 'searchResults');
    }
  } catch (error) {
    console.error('Arama hatası:', error);
    showToast('Arama yapılırken hata oluştu', 'error');
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
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:4px;">
        <label class="upload-type-btn active" id="typeBtn_reals" onclick="switchUploadType('reals')">
          <input type="radio" name="uploadType" value="reals" checked style="display:none;" />
          <i class="fas fa-film" style="font-size:20px; margin-bottom:6px;"></i>
          <span>Reals</span>
          <small>Kısa video (max 3dk)</small>
        </label>
        <label class="upload-type-btn" id="typeBtn_photo" onclick="switchUploadType('photo')">
          <input type="radio" name="uploadType" value="photo" style="display:none;" />
          <i class="fas fa-image" style="font-size:20px; margin-bottom:6px;"></i>
          <span>Foto</span>
          <small>Fotoğraf paylaş</small>
        </label>
      </div>
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
        <label class="yt-form-label">Etiketler <span style="color:#ff0033">*</span> <span style="font-size:11px;color:var(--yt-spec-text-secondary)">(virgülle ayırın - videonuzu tanıtan etiket girmelisiniz)</span></label>
        <input type="text" id="videoTags" class="yt-input" placeholder="örn: oyun, minecraft, eğlence" />
      </div>
      <div class="yt-form-group">
        <label class="yt-form-label">Video Dosyası</label>
        <input type="file" id="videoFile" class="yt-input" accept="video/*" onchange="checkShortsDuration(this)" />
        <p id="videoFileHint" style="font-size:12px; color:var(--yt-spec-text-secondary); margin-top:4px;"></p>
      </div>
      <div class="yt-form-group">
        <label class="yt-form-label">Thumbnail <span id="bannerOptionalHint" style="font-size:11px;color:var(--yt-spec-text-secondary)">(opsiyonel - boş bırakırsan video'dan alınır)</span></label>
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
  ['reals','video','photo','text'].forEach(t => {
    const btn = document.getElementById(`typeBtn_${t}`);
    if (btn) btn.classList.toggle('active', t === type);
  });
  document.getElementById('videoFields').style.display = (type === 'reals' || type === 'video') ? 'block' : 'none';
  document.getElementById('photoFields').style.display = type === 'photo' ? 'block' : 'none';
  document.getElementById('textFields').style.display = type === 'text' ? 'block' : 'none';
  // Reals için süre kontrolü
  const hint = document.getElementById('videoFileHint');
  if (hint) hint.textContent = type === 'reals' ? 'Maksimum 3 dakika' : '';
}

function switchTextType(textType) {
  ['teaweet','plain'].forEach(t => {
    const btn = document.getElementById(`textTypeBtn_${t}`);
    if (btn) btn.classList.toggle('active', t === textType);
  });
  const hint = document.getElementById('textTypeHint');
  if (hint) {
    if (textType === 'teaweet') {
      hint.innerHTML = '<i class="fas fa-info-circle"></i> TeaWeet: #hashtag kullanabilirsiniz, kısa ve öz olmalı';
    } else {
      hint.innerHTML = '<i class="fas fa-info-circle"></i> Düz Metin: Uzun yazılar yazabilirsiniz';
    }
  }
}

function handleUpload() {
  const type = document.querySelector('input[name="uploadType"]:checked')?.value || 'reals';
  if (type === 'photo') {
    uploadPhoto();
  } else if (type === 'text') {
    uploadText();
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

  // Reals için banner zorunlu değil
  if (!title || !videoFile) {
    showToast('Başlık ve video gerekli', 'error');
    return;
  }
  if (!tags) {
    showToast('Videonuzu tanıtan bir etiket girmelisiniz', 'error');
    document.getElementById('videoTags')?.focus();
    return;
  }
  if (!isReals && !bannerFile) {
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
  if (bannerFile) formData.append('banner', bannerFile);
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

// Metin yükleme
async function uploadText() {
  const title = document.getElementById('videoTitle').value.trim();
  const description = document.getElementById('videoDescription').value.trim();
  const textContent = document.getElementById('textContent').value.trim();
  const textType = document.querySelector('input[name="textType"]:checked')?.value || 'teaweet';

  if (!title) {
    showToast('Başlık gerekli', 'error');
    return;
  }

  if (!textContent) {
    showToast('Metin içeriği gerekli', 'error');
    return;
  }

  const progressOverlay = document.getElementById('uploadProgressOverlay');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressPercentage = document.getElementById('uploadProgressPercentage');
  const progressTitle = document.getElementById('uploadProgressTitle');
  const progressStatus = document.getElementById('uploadProgressStatus');

  progressOverlay.classList.add('show');
  progressTitle.textContent = 'Metin yükleniyor...';
  progressStatus.textContent = 'Hazırlanıyor...';
  progressBar.style.width = '0%';
  progressPercentage.textContent = '0%';
  closeModal();

  try {
    progressBar.style.width = '50%';
    progressPercentage.textContent = '50%';
    progressStatus.textContent = 'Gönderiliyor...';

    const formData = new FormData();
    formData.append('channelId', currentChannel.id);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('videoType', 'Metin');
    formData.append('textContent', textContent);
    formData.append('textType', textType);
    formData.append('tags', textType === 'teaweet' ? 'teaweet' : 'metin');
    formData.append('commentsEnabled', 1);
    formData.append('likesVisible', 1);

    const res = await fetch(`${API_URL}/text`, { method: 'POST', body: formData });
    const resData = await res.json();
    
    if (!res.ok) {
      progressOverlay.classList.remove('show');
      showToast('Hata: ' + (resData.error || 'Bilinmeyen hata'), 'error');
      return;
    }

    progressBar.style.width = '100%';
    progressPercentage.textContent = '100%';
    progressStatus.textContent = 'Tamamlandı!';

    setTimeout(() => {
      progressOverlay.classList.remove('show');
      showToast('Metin paylaşıldı!', 'success');
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
  
  // Reals formatında grid göster
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;">
      ${videos.map(v => `
        <div style="position: relative;">
          <div style="position: relative; width: 100%; padding-bottom: 177.78%; background: #000; border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform 0.2s; ${v.is_hidden ? 'opacity:0.6;' : ''}"
               onmouseover="this.style.transform='scale(1.02)'" 
               onmouseout="this.style.transform='scale(1)'"
               onclick="playVideo(${v.id})">
            <img src="${v.banner_url}" 
                 style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" 
                 onerror="this.src='logoteatube.png'" />
            <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; color: white; text-shadow: 0 2px 8px rgba(0,0,0,0.8);">
              <p style="font-size: 13px; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 4px;">${v.title}</p>
              <div style="display: flex; gap: 8px; font-size: 11px; opacity: 0.9;">
                <span><i class="fas fa-eye"></i> ${v.views}</span>
                <span><i class="fas fa-thumbs-up"></i> ${v.likes}</span>
              </div>
            </div>
            ${v.is_hidden ? '<div style="position: absolute; top: 8px; left: 8px; background: rgba(255,165,0,0.9); backdrop-filter: blur(4px); padding: 4px 8px; border-radius: 6px; font-size: 10px; color: white; font-weight: 600;"><i class="fas fa-eye-slash"></i> GİZLİ</div>' : ''}
            ${!v.comments_enabled ? '<div style="position: absolute; top: 8px; right: 8px; background: rgba(255,0,0,0.9); backdrop-filter: blur(4px); padding: 4px 8px; border-radius: 6px; font-size: 10px; color: white; font-weight: 600;"><i class="fas fa-comment-slash"></i></div>' : ''}
          </div>
          <button onclick="event.stopPropagation(); showVideoManageMenu(${v.id}, '${v.title.replace(/'/g,"\\'")}', ${v.comments_enabled}, ${v.likes_visible}, ${v.is_hidden || 0})"
            style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); border: none; color: white; cursor: pointer; padding: 6px 10px; border-radius: 6px; z-index: 10;"
            title="Yönet">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      `).join('')}
    </div>
  `;
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

    if (history.length === 0) {
      pageContent.innerHTML = `
        <h2 class="section-header">İzlenenler</h2>
        <p style="color:var(--yt-spec-text-secondary);">Henüz izlenen video yok</p>`;
      return;
    }

    // Reals ve normal videoları ayır
    const reals = history.filter(h => h.is_short === 1);
    const normalVideos = history.filter(h => h.is_short !== 1);

    let html = '<h2 class="section-header">İzlenenler</h2>';

    // Reals bölümü - grid
    if (reals.length > 0) {
      html += `<h3 style="font-size:15px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><i class="fas fa-film" style="color:var(--yt-spec-brand-background-solid)"></i>Reals</h3>
        <div class="shorts-grid" style="margin-bottom:28px;">
          ${reals.map(h => `
            <div class="short-card" onclick="openWatchedShort(${h.video_id}, ${JSON.stringify(reals.map(r => r.video_id)).replace(/"/g,"'")})">
              <div class="short-card-thumb">
                <img src="${h.banner_url}" alt="${h.title}" loading="lazy" />
                <div class="short-badge"><i class="fas fa-film"></i> Reals</div>
                <div class="short-duration-overlay"><i class="fas fa-play" style="font-size:20px;color:white;opacity:0.9;"></i></div>
              </div>
              <div class="short-card-info">
                <p class="short-card-title">${h.title}</p>
                <p class="short-card-meta">${h.channel_name}</p>
              </div>
            </div>`).join('')}
        </div>`;
    }

    // Normal videolar
    if (normalVideos.length > 0) {
      html += `<h3 style="font-size:15px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><i class="fas fa-video" style="color:var(--yt-spec-brand-background-solid)"></i>Videolar</h3>
        <div id="watchedNormalVideos" class="video-grid"></div>`;
    }

    pageContent.innerHTML = html;

    if (normalVideos.length > 0) {
      displayVideos(normalVideos.map(h => ({
        id: h.video_id,
        title: h.title,
        banner_url: h.banner_url,
        video_url: h.video_url,
        channel_name: h.channel_name,
        channel_id: h.channel_id,
        nickname: h.nickname,
        profile_photo: h.profile_photo,
        views: h.views || 0,
        likes: h.likes || 0
      })), 'watchedNormalVideos');
    }
  } catch (error) {
    console.error('İzlenenler yükleme hatası:', error);
  }
}

function openWatchedShort(videoId, allIds) {
  // Tüm izlenen Reals'ları shortsVideos'a yükle, tıklananı başa al
  fetch(`${API_URL}/shorts?order=recent&userId=${currentUser?.id || ''}`)
    .then(r => r.json())
    .then(shorts => {
      const idx = shorts.findIndex(v => v.id === videoId);
      if (idx !== -1) {
        const t = shorts.splice(idx, 1)[0];
        shortsVideos = [t, ...shorts];
      } else {
        // Listede yoksa direkt fetch et
        fetch(`${API_URL}/videos/${videoId}?userId=${currentUser?.id || ''}`)
          .then(r => r.json())
          .then(v => { shortsVideos = [v, ...shorts]; });
      }
      currentShortIndex = 0;
      showPage('reals');
    })
    .catch(() => openShortFromHome(videoId));
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

      // Reals formatında göster
      historyContent.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;">
          ${history.map(h => `
            <div style="cursor: pointer; transition: transform 0.2s;" 
                 onmouseover="this.style.transform='scale(1.02)'" 
                 onmouseout="this.style.transform='scale(1)'"
                 onclick="playVideo(${h.video_id})">
              <div style="position: relative; width: 100%; padding-bottom: 177.78%; background: #000; border-radius: 12px; overflow: hidden;">
                <img src="${h.banner_url}" 
                     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" 
                     onerror="this.src='logoteatube.png'" />
                <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; color: white; text-shadow: 0 2px 8px rgba(0,0,0,0.8);">
                  <p style="font-size: 13px; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 4px;">${h.title}</p>
                  <p style="font-size: 11px; opacity: 0.9;">${h.channel_name}</p>
                  <p style="font-size: 10px; opacity: 0.7; margin-top: 2px;">${h.watched_at || ''}</p>
                </div>
                ${h.watch_duration && h.total_duration ? `
                  <div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); padding: 3px 6px; border-radius: 4px; font-size: 10px; color: white; font-weight: 600;">
                    ${Math.floor((h.watch_duration / h.total_duration) * 100)}%
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (error) {
      console.error('İzleme geçmişi yükleme hatası:', error);
      historyContent.innerHTML = '<p style="color: var(--yt-spec-text-secondary);">İzleme geçmişi yüklenemedi</p>';
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
        
        <!-- Profil Fotoğrafı -->
        <div class="yt-form-group" style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--yt-spec-raised-background);border-radius:10px;margin-bottom:16px">
          <img src="${getProfilePhotoUrl(currentUser.profile_photo)}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0" />
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;margin-bottom:4px">${currentUser.nickname}</p>
            <p style="font-size:12px;color:var(--yt-spec-text-secondary)">@${currentUser.username}</p>
          </div>
          <label class="yt-btn" style="cursor:pointer;height:34px;padding:0 14px;font-size:13px;display:flex;align-items:center">
            <i class="fas fa-camera" style="margin-right:6px"></i>Fotoğraf Değiştir
            <input type="file" accept="image/*" style="display:none" onchange="changeProfilePhoto(this)" />
          </label>
        </div>
        
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
          <label class="yt-form-label">Hakkımda</label>
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <textarea id="settingsAbout" class="yt-textarea" placeholder="Kendiniz hakkında bir şeyler yazın..." style="flex:1;min-height:80px;resize:vertical">${currentChannel?.about || ''}</textarea>
            <button class="yt-btn" style="width:auto; padding:0 20px; white-space:nowrap;flex-shrink:0" onclick="saveAbout()">Kaydet</button>
          </div>
        </div>
        
        <div class="yt-form-group">
          <label class="yt-form-label">Şifre Değiştir</label>
          <input type="password" id="oldPassword" class="yt-input" placeholder="Eski şifre" />
          <input type="password" id="newPassword" class="yt-input" placeholder="Yeni şifre" />
          <button class="yt-btn"  onclick="changePassword()">Şifreyi Değiştir</button>
        </div>

        <div class="yt-form-group">
          <label class="yt-form-label">Doğum Tarihi</label>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;font-size:14px;color:var(--yt-spec-text-secondary);">
            <i class="fas fa-birthday-cake" style="margin-right:8px;color:var(--yt-spec-brand-background-solid);"></i>
            ${currentUser.birth_date ? new Date(currentUser.birth_date).toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric'}) : 'Belirtilmemiş'}
          </div>
          <p style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:4px;">Doğum tarihi değiştirilemez.</p>
        </div>
      </div>
      
      <div class="settings-card">
        <h3 class="settings-card-title">Tema Ayarları</h3>
        <div class="theme-grid">
          ${[
            {id:'dark', name:'Gece Karanlığı', bg:'#0f0f0f', accent:'#ff0000', preview:'linear-gradient(135deg,#0f0f0f,#1a1a1a)'},
            {id:'neon-purple', name:'Elektrik Moru', bg:'#0d0d1a', accent:'#9b59b6', preview:'linear-gradient(135deg,#0d0d1a,#1a1a2e)'},
            {id:'ocean-blue', name:'Okyanus Mavisi', bg:'#0a0e1a', accent:'#1e90ff', preview:'linear-gradient(135deg,#0a0e1a,#0d1b3e)'},
            {id:'fire-red', name:'Ateş Kırmızısı', bg:'#1a0a0a', accent:'#ff4500', preview:'linear-gradient(135deg,#1a0a0a,#2d0f0f)'},
            {id:'forest-green', name:'Yeşil Orman', bg:'#0a1a0a', accent:'#2ecc71', preview:'linear-gradient(135deg,#0a1a0a,#0f2d0f)'},
            {id:'gold', name:'Altın Sarısı', bg:'#1a1500', accent:'#f1c40f', preview:'linear-gradient(135deg,#1a1500,#2d2400)'},
            {id:'light', name:'Gün Işığı', bg:'#f9f9f9', accent:'#ff0000', preview:'linear-gradient(135deg,#f9f9f9,#eeeeee)'},
            {id:'midnight-blue', name:'Gece Mavisi', bg:'#050a1a', accent:'#3ea6ff', preview:'linear-gradient(135deg,#050a1a,#0a1530)'},
            {id:'orange-fire', name:'Turuncu Ateş', bg:'#1a0f00', accent:'#ff6b00', preview:'linear-gradient(135deg,#1a0f00,#2d1a00)'},
            {id:'pink-dream', name:'Pembe Rüya', bg:'#1a0a14', accent:'#e91e8c', preview:'linear-gradient(135deg,#1a0a14,#2d0f22)'},
            // 5 Gradient Tema
            {id:'aurora', name:'Aurora Borealis', bg:'#050d1a', accent:'#00e5ff', preview:'linear-gradient(135deg,#050d1a 0%,#0d2137 40%,#1a0d37 100%)'},
            {id:'sunset-glow', name:'Gün Batımı', bg:'#1a0a00', accent:'#ff6b35', preview:'linear-gradient(135deg,#1a0a00 0%,#2d1500 40%,#1a0a1a 100%)'},
            {id:'deep-space', name:'Derin Uzay', bg:'#020408', accent:'#7c3aed', preview:'linear-gradient(135deg,#020408 0%,#0d0520 50%,#020408 100%)'},
            {id:'emerald-night', name:'Zümrüt Gece', bg:'#020d0a', accent:'#10b981', preview:'linear-gradient(135deg,#020d0a 0%,#051a12 50%,#020d0a 100%)'},
            {id:'rose-gold', name:'Gül Altını', bg:'#1a0a0f', accent:'#f43f5e', preview:'linear-gradient(135deg,#1a0a0f 0%,#2d0f1a 40%,#1a0a0f 100%)'},
          ].map(t => `
            <div class="theme-option ${(currentUser.theme || 'dark') === t.id ? 'active' : ''}" onclick="selectTheme('${t.id}')">
              <div class="theme-preview" style="background: ${t.preview || t.bg};">
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

      ${myBadges.length > 0 || currentUser.is_red_verified ? `
      <div class="settings-card">
        <h3 class="settings-card-title"><i class="fas fa-check-circle" style="margin-right:8px;color:var(--yt-spec-brand-background-solid)"></i>Rozetlerim</h3>
        <p style="font-size:13px;color:var(--yt-spec-text-secondary);margin-bottom:16px">Profilinde göstermek istediğin rozeti seç. Kırmızı tik seçilirse rozet gizlenir.</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <div onclick="setActiveBadge(null)" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;cursor:pointer;border:2px solid ${!currentUser.active_badge_id && !currentUser.is_red_verified ? 'var(--yt-spec-brand-background-solid)' : 'rgba(255,255,255,0.1)'};background:var(--yt-spec-raised-background)">
            <i class="fas fa-times" style="font-size:16px;color:#888"></i>
            <span style="font-size:13px">Rozet Yok</span>
          </div>
          ${currentUser.is_red_verified ? `
          <div onclick="setRedVerifiedActive()" id="redTickOption" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;cursor:pointer;border:2px solid ${currentUser.active_red_tick ? 'var(--yt-spec-brand-background-solid)' : 'rgba(255,255,255,0.1)'};background:var(--yt-spec-raised-background)">
            <i class="fas fa-check-circle" style="font-size:18px;color:#ff0033"></i>
            <span style="font-size:13px;color:#ff0033">Kırmızı Tik</span>
          </div>` : ''}
          ${myBadges.map(b => `
            <div onclick="setActiveBadge(${b.id})" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;cursor:pointer;border:2px solid ${currentUser.active_badge_id === b.id && !currentUser.active_red_tick ? 'var(--yt-spec-brand-background-solid)' : 'rgba(255,255,255,0.1)'};background:var(--yt-spec-raised-background)">
              <i class="fas ${b.icon}" style="font-size:18px;color:${b.color}"></i>
              <span style="font-size:13px;color:${b.name_color}">${b.name}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}
      
      <button class="yt-btn" style="width:auto; padding:0 24px; background: linear-gradient(135deg,#dc3545,#a71d2a); box-shadow: 0 2px 8px rgba(220,53,69,0.3);" onclick="logout()">
        <i class="fas fa-sign-out-alt" style="margin-right:8px;"></i>Çıkış Yap
      </button>

      <!-- İmza -->
      <div style="margin-top:32px;padding:16px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
        <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0;letter-spacing:0.5px;">© 2026 TeaTube</p>
      </div>
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

async function changeProfilePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  showToast('Fotoğraf yükleniyor...', 'success');
  try {
    const formData = new FormData();
    formData.append('profile_photo', file);
    const r = await fetch(`${API_URL}/user/${currentUser.id}/photo`, { method: 'PUT', body: formData });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || 'Hata', 'error'); return; }
    currentUser.profile_photo = d.photoUrl;
    localStorage.setItem('Tea_user', JSON.stringify(currentUser));
    const userPhoto = document.getElementById('userPhoto');
    if (userPhoto) userPhoto.src = d.photoUrl;
    updateMobileProfilePhoto();
    showToast('Profil fotoğrafı güncellendi!', 'success');
    loadSettingsPage();
  } catch(e) { showToast('Hata oluştu', 'error'); }
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

    showToast('Takma ad değiştirildi', 'success');
    currentUser.nickname = newNickname;
    localStorage.setItem('Tea_user', JSON.stringify(currentUser));
    document.getElementById('userNickname').textContent = newNickname;
  } catch (error) {
    console.error('Takma ad değiştirme hatası:', error);
    showToast('Takma ad değiştirilemedi', 'error');
  }
}

async function saveAbout() {
  const about = document.getElementById('settingsAbout')?.value?.trim() || '';
  if (!currentChannel) { showToast('Kanal bulunamadı', 'error'); return; }
  try {
    await fetch(`${API_URL}/channel/${currentChannel.id}/about`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ about })
    });
    if (currentChannel) currentChannel.about = about;
    showToast('Hakkımda güncellendi', 'success');
  } catch(e) { showToast('Kaydedilemedi', 'error'); }
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
    },
    'aurora': {
      bg: '#050d1a', raised: '#0d1f35', accent: '#00e5ff', accentHover: '#00b8d4', text: '#e0f7fa', textSec: '#80deea',
      bodyGradient: 'linear-gradient(160deg,#050d1a 0%,#0d2137 50%,#1a0d37 100%)'
    },
    'sunset-glow': {
      bg: '#1a0a00', raised: '#2d1500', accent: '#ff6b35', accentHover: '#e64a19', text: '#fff3e0', textSec: '#ffcc80',
      bodyGradient: 'linear-gradient(160deg,#1a0a00 0%,#2d1500 40%,#1a0a1a 100%)'
    },
    'deep-space': {
      bg: '#020408', raised: '#0d0520', accent: '#7c3aed', accentHover: '#6d28d9', text: '#ede9fe', textSec: '#c4b5fd',
      bodyGradient: 'linear-gradient(160deg,#020408 0%,#0d0520 50%,#020408 100%)'
    },
    'emerald-night': {
      bg: '#020d0a', raised: '#051a12', accent: '#10b981', accentHover: '#059669', text: '#d1fae5', textSec: '#6ee7b7',
      bodyGradient: 'linear-gradient(160deg,#020d0a 0%,#051a12 50%,#020d0a 100%)'
    },
    'rose-gold': {
      bg: '#1a0a0f', raised: '#2d0f1a', accent: '#f43f5e', accentHover: '#e11d48', text: '#ffe4e6', textSec: '#fda4af',
      bodyGradient: 'linear-gradient(160deg,#1a0a0f 0%,#2d0f1a 40%,#1a0a0f 100%)'
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
  
  // Gradient tema ise body'ye uygula
  if (t.bodyGradient) {
    document.body.style.background = t.bodyGradient;
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    document.body.style.background = '';
    document.body.style.backgroundAttachment = '';
  }
  
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
    root.style.setProperty('--yt-spec-input-background', t.raised || 'rgba(255,255,255,0.08)');
    root.style.setProperty('--yt-spec-border', `${t.accent}33` || 'rgba(255,255,255,0.12)');
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
      <h2 class="section-header">Takip Ettiklerim</h2>
      <div id="subscriptionsList" style="display:flex;flex-direction:column;gap:8px;max-width:600px"></div>
    `;

    const container = document.getElementById('subscriptionsList');

    if (subscriptions.length === 0) {
      container.innerHTML = '<p style="color: var(--yt-spec-text-secondary);">Henüz kimseyi takip etmiyorsun</p>';
      return;
    }

    // Her biri için karşılıklı takip durumunu kontrol et
    const followBackChecks = await Promise.all(
      subscriptions.map(sub =>
        fetch(`${API_URL}/is-subscribed/${sub.channel_id}/${currentChannel?.id || 0}`)
          .then(r => r.json()).catch(() => ({ subscribed: false }))
      )
    );

    container.innerHTML = subscriptions.map((sub, i) => {
      const followsBack = followBackChecks[i]?.subscribed;
      const avatar = getProfilePhotoUrl(sub.profile_photo);
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--yt-spec-raised-background);border-radius:12px;cursor:pointer;transition:background 0.15s"
             onclick="viewChannel(${sub.channel_id})"
             onmouseover="this.style.background='rgba(255,255,255,0.08)'"
             onmouseout="this.style.background='var(--yt-spec-raised-background)'">
          <img src="${avatar}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
          <div style="flex:1;min-width:0">
            <p style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub.channel_name}</p>
            <p style="font-size:12px;color:var(--yt-spec-text-secondary);margin-top:2px">${sub.subscriber_count} takipçi • ${sub.video_count} içerik</p>
            ${followsBack ? '<p style="font-size:11px;color:#4caf50;margin-top:2px"><i class="fas fa-check-circle" style="margin-right:3px"></i>Seni takip ediyor</p>' : '<p style="font-size:11px;color:var(--yt-spec-text-secondary);margin-top:2px">Seni takip etmiyor</p>'}
          </div>
          <button onclick="event.stopPropagation();unsubscribeFromList(${sub.channel_id},this)" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:var(--yt-spec-text-secondary);padding:6px 12px;border-radius:20px;cursor:pointer;font-size:12px;flex-shrink:0;white-space:nowrap">
            Takipten Çık
          </button>
        </div>`;
    }).join('');
  } catch(e) {
    document.getElementById('pageContent').innerHTML = '<p style="color:var(--yt-spec-text-secondary)">Yüklenemedi</p>';
  }
}

async function unsubscribeFromList(channelId, btn) {
  try {
    await fetch(`${API_URL}/subscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, channelId })
    });
    btn.closest('div[style]').remove();
    showToast('Takipten çıkıldı', 'success');
  } catch(e) { showToast('Hata', 'error'); }
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
      <h2 class="section-header">Kaydedilenler</h2>
      <div id="savedList"></div>
    `;

    if (saved.length === 0) {
      document.getElementById('savedList').innerHTML = '<p style="color:var(--yt-spec-text-secondary);">Henüz kaydedilen içerik yok</p>';
      return;
    }

    const container = document.getElementById('savedList');
    const reals = saved.filter(s => s.is_short);
    const photos = saved.filter(s => s.video_type === 'Fotoğraf');
    const videos = saved.filter(s => !s.is_short && s.video_type !== 'Fotoğraf');

    let html = '';

    if (reals.length > 0) {
      html += `<h3 style="font-size:15px;font-weight:600;margin-bottom:12px;margin-top:16px"><i class="fas fa-film" style="color:#ff0033;margin-right:8px"></i>Reals (${reals.length})</h3>
        <div class="shorts-grid" id="savedRealsGrid"></div>`;
    }
    if (photos.length > 0) {
      html += `<h3 style="font-size:15px;font-weight:600;margin-bottom:12px;margin-top:16px"><i class="fas fa-image" style="color:#ff0033;margin-right:8px"></i>Fotoğraflar (${photos.length})</h3>
        <div class="photo-grid" id="savedPhotosGrid"></div>`;
    }
    if (videos.length > 0) {
      html += `<h3 style="font-size:15px;font-weight:600;margin-bottom:12px;margin-top:16px"><i class="fas fa-video" style="color:#ff0033;margin-right:8px"></i>Videolar (${videos.length})</h3>
        <div class="video-grid" id="savedVideosGrid"></div>`;
    }

    container.innerHTML = html;

    if (reals.length > 0) renderShortsGrid(reals.map(s => ({ ...s, id: s.video_id })), 'savedRealsGrid');
    if (photos.length > 0) renderPhotoGrid(photos.map(s => ({ ...s, id: s.video_id })), 'savedPhotosGrid');
    if (videos.length > 0) displayVideos(videos.map(s => ({ ...s, id: s.video_id })), 'savedVideosGrid');

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
      const isComment = notif.type === 'new_comment' || notif.type === 'comment_reply';
      return `
        <div style="display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--yt-spec-raised-background); border-radius:8px; margin-bottom:8px; ${!notif.is_read ? 'border-left:3px solid var(--yt-spec-brand-background-solid);' : ''} ${isComment && notif.related_id ? 'cursor:pointer;' : ''}" ${isComment && notif.related_id ? `onclick="playVideo(${notif.related_id})"` : ''}>
          <i class="fas ${icons[notif.type] || 'fa-bell'}" style="font-size:18px; color:var(--yt-spec-brand-background-solid); width:20px; text-align:center; flex-shrink:0;"></i>
          <div style="flex:1;">
            <p style="font-size:14px; margin-bottom:4px;">${notif.content}</p>
            <p style="font-size:12px; color:var(--yt-spec-text-secondary);">${notif.created_at || ''}</p>
            ${isComment && notif.related_id ? `<p style="font-size:12px;color:var(--yt-spec-brand-background-solid);margin-top:4px"><i class="fas fa-external-link-alt" style="margin-right:4px"></i>Videoya git</p>` : ''}
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
    // Engel kontrolü - engellenen veya engelleyen kişinin profilini gösterme
    if (currentUser) {
      const blockCheck = await fetch(`${API_URL}/is-blocked/${currentUser.id}/${channelId}`);
      const blockData = await blockCheck.json();
      if (blockData.isBlocked) {
        const pageContent = document.getElementById('pageContent');
        pageContent.innerHTML = `
          <div style="text-align:center; padding:80px 20px;">
            <i class="fas fa-user-slash" style="font-size:64px; color:var(--yt-spec-text-secondary); margin-bottom:16px;"></i>
            <p style="font-size:18px; color:var(--yt-spec-text-secondary); margin-bottom:8px;">Kullanıcı bulunamadı</p>
            <p style="font-size:14px; color:var(--yt-spec-text-secondary);">Bu profil görüntülenemiyor</p>
          </div>`;
        return;
      }
    }

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
        <button class="channel-tab active" onclick="switchChannelTab(this,'videos')" style="padding:12px 20px; background:none; border:none; border-bottom:2px solid var(--yt-spec-brand-background-solid); color:var(--yt-spec-text-primary); font-size:14px; font-weight:500; cursor:pointer;">İçerikler</button>
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

    if (subData.subscribed) {
      btn.textContent = 'Takipten Çık';
      btn.style.background = 'rgba(255,255,255,0.08)';
      btn.style.color = 'var(--yt-spec-text-primary)';
      btn.disabled = false;
      btn.style.opacity = '1';
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
            btn.style.opacity = '0.6';
            return;
          }
        }
      }
      btn.textContent = 'Takip Et';
      btn.disabled = false;
      btn.style.opacity = '1';
    } else {
      btn.textContent = 'Takip Et';
      btn.disabled = false;
      btn.style.opacity = '1';
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
  if (!num && num !== 0) return '0';
  num = parseInt(num) || 0;
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0','') + 'MR';
  if (num >= 1000000)    return (num / 1000000).toFixed(1).replace('.0','') + 'M';
  if (num >= 1000)       return (num / 1000).toFixed(1).replace('.0','') + 'B';
  return num.toString();
}

// Video süresi formatlama
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
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
  pageContent.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--yt-spec-text-secondary);"></i></div>';
  
  // API'den kullanım koşullarını çek
  fetch(`${API_URL}/terms`)
    .then(r => r.json())
    .then(data => {
      pageContent.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
          <h2 class="section-header">Kullanım Koşulları</h2>
          
          <div class="settings-card">
            <div style="white-space: pre-wrap; color: var(--yt-spec-text-secondary); line-height: 1.8;">
              ${data.content || 'Kullanım koşulları henüz belirlenmemiş.'}
            </div>
            
            ${data.version ? `
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: var(--yt-spec-text-secondary);">
                Versiyon: ${data.version} | Son Güncelleme: ${new Date(data.updated_at).toLocaleDateString('tr-TR')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    })
    .catch(err => {
      console.error('Kullanım koşulları yüklenemedi:', err);
      pageContent.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
          <h2 class="section-header">Kullanım Koşulları</h2>
          <div class="settings-card">
            <p style="color: var(--yt-spec-text-secondary);">Kullanım koşulları yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
          </div>
        </div>
      `;
    });
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
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      // Canvas desteklenmiyorsa fallback
      return 'device_' + Math.random().toString(36).substr(2, 9);
    }
    
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
  } catch (e) {
    // Canvas hatası durumunda fallback
    const data = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      'fallback_' + Math.random().toString(36).substr(2, 9)
    ].join('|');
  }
  
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


// ==================== TEASOCIAL MUSIC ====================
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
    topBanner = `
      <div style="display:flex;gap:10px;margin-bottom:20px;padding:14px 16px;background:rgba(29,185,84,0.08);border-radius:14px;border:1px solid rgba(29,185,84,0.2);align-items:center;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <p style="font-size:13px;font-weight:700;color:#1db954;margin:0 0 2px;"><i class="fas fa-check-circle" style="margin-right:5px;"></i>Artist Hesabı</p>
          <p style="font-size:12px;color:var(--yt-spec-text-secondary);margin:0;">Şarkı yükle, yaz ve paylaş</p>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button onclick="showUploadSongModal()" style="background:#1db954;border:none;color:#000;font-weight:700;padding:8px 16px;border-radius:20px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;-webkit-tap-highlight-color:transparent">
            <i class="fas fa-upload"></i> Yükle
          </button>
          <button onclick="showWriteSongModal()" style="background:rgba(29,185,84,0.15);border:1px solid rgba(29,185,84,0.4);color:#1db954;font-weight:600;padding:8px 16px;border-radius:20px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;-webkit-tap-highlight-color:transparent">
            <i class="fas fa-pen"></i> Yaz
          </button>
          <button onclick="showMyWritings()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:var(--yt-spec-text-secondary);font-weight:500;padding:8px 14px;border-radius:20px;cursor:pointer;font-size:13px;-webkit-tap-highlight-color:transparent">
            <i class="fas fa-book-open"></i>
          </button>
        </div>
      </div>`;
  } else if (hasPending) {
    topBanner = `<div style="background:rgba(255,200,0,0.1);border:1px solid rgba(255,200,0,0.3);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#ffc800"><i class="fas fa-clock" style="margin-right:6px"></i>Başvurunuz inceleniyor...</div>`;
  } else if (isRejected) {
    const note = status.application && status.application.admin_note ? ' Not: ' + status.application.admin_note : '';
    topBanner = `<div style="background:rgba(255,0,51,0.1);border:1px solid rgba(255,0,51,0.3);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px"><i class="fas fa-times-circle" style="margin-right:6px;color:#ff0033"></i>Başvurunuz reddedildi.${note} <button class="yt-btn" onclick="showArtistApplyModal()" style="margin-left:8px;height:28px;padding:0 12px;font-size:12px">Tekrar Başvur</button></div>`;
  } else {
    topBanner = `<div style="margin-bottom:16px"><button class="yt-btn" onclick="showArtistApplyModal()" style="background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)"><i class="fas fa-microphone" style="margin-right:6px"></i>Artist Ol</button></div>`;
  }

  const popularHtml = (data.popularSongs || []).length
    ? `<h3 style="font-size:15px;font-weight:600;margin-bottom:12px">Popüler</h3>
       <div style="border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;margin-bottom:8px;">
         <div style="display:grid;grid-template-columns:32px 1fr auto auto;align-items:center;gap:12px;padding:4px 12px;color:var(--yt-spec-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">
           <span style="text-align:center;">#</span>
           <span>Başlık</span>
           <span>Çalma</span>
           <span><i class="fas fa-clock"></i></span>
         </div>
       </div>
       <div style="margin-bottom:24px">${(data.popularSongs || []).map((s,i) => { window[`_tsQ_pop_${s.id}`] = {q:data.popularSongs,i}; return renderTSSongRow(s, null, i); }).join('')}</div>`
    : '';

  const artistsHtml = (data.newArtists || []).length
    ? `<h3 style="font-size:15px;font-weight:600;margin-bottom:12px">Yeni Sanatçılar</h3><div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;margin-bottom:24px">${(data.newArtists || []).map(a => renderTSArtistCard(a)).join('')}</div>`
    : '';

  // Queue'ları global olarak sakla
  window._tsMusicNewQueue = data.newSongs || [];
  window._tsMusicPopQueue = data.popularSongs || [];

  const newSongsHtml = (data.newSongs || []).length
    ? `<div style="border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;margin-bottom:8px;">
         <div style="display:grid;grid-template-columns:32px 1fr auto auto;align-items:center;gap:12px;padding:4px 12px;color:var(--yt-spec-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">
           <span style="text-align:center;">#</span>
           <span>Başlık</span>
           <span>Çalma</span>
           <span><i class="fas fa-clock"></i></span>
         </div>
       </div>
       ${(data.newSongs || []).map((s,i) => renderTSSongRow(s, null, i)).join('')}`
    : '<p style="color:var(--yt-spec-text-secondary)">Henüz şarkı yok</p>';

  pageContent.innerHTML = `
    <div style="padding-bottom:120px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <h2 style="font-size:22px;font-weight:700"><i class="fas fa-music" style="color:#1db954;margin-right:8px"></i>TS Music</h2>
        <div style="display:flex;gap:8px">
          <button class="yt-btn" onclick="showTSMusicSearch()" style="background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)"><i class="fas fa-search"></i></button>
          <button class="yt-btn" onclick="loadSongWritingsPage()" style="background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)" title="Yazılan Şarkılar"><i class="fas fa-book-open"></i></button>
          <button class="yt-btn" onclick="showMyPlaylists()" style="background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)"><i class="fas fa-list"></i></button>
        </div>
      </div>
      ${topBanner}
      ${popularHtml}
      ${artistsHtml}
      <h3 style="font-size:15px;font-weight:600;margin-bottom:12px">Yeni Çıkanlar</h3>
      <div style="display:flex;flex-direction:column;gap:4px">${newSongsHtml}</div>
      
      <!-- Şarkı Yazıları Bölümü -->
      <div style="margin-top:28px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h3 style="font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px">
            <i class="fas fa-pen" style="color:#1db954"></i>Şarkı Yazıları
          </h3>
          <button onclick="loadSongWritingsPage()" style="background:none;border:none;color:#1db954;cursor:pointer;font-size:13px">Tümünü Gör →</button>
        </div>
        <div id="songWritingsPreview"><div class="yt-loading"><div class="yt-spinner"></div></div></div>
      </div>

      <!-- İmza -->
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
        <p style="font-size:11px;color:rgba(255,255,255,0.18);margin:0;letter-spacing:0.5px;">© 2026 TeaTube</p>
      </div>
    </div>
  `;

  // Şarkı yazıları önizlemesini yükle
  fetch(`${API_URL}/music/writings?userId=${currentUser.id}`)
    .then(r => r.json())
    .then(writings => {
      const el = document.getElementById('songWritingsPreview');
      if (!el) return;
      if (!writings.length) { el.innerHTML = '<p style="color:var(--yt-spec-text-secondary);font-size:13px">Henüz şarkı yazısı yok</p>'; return; }
      el.innerHTML = writings.slice(0, 3).map(w => renderWritingCard(w)).join('');
    }).catch(() => {});
}

function renderTSSongRow(s, queue = null, index = -1) {
  const playCount = s.show_play_count ? formatNumber(s.play_count || 0) : '—';
  const queueParam = queue ? `window._tsMusicQueue_${s.id}` : 'null';
  const rowIndex = index >= 0 ? index + 1 : '♪';
  
  return `
    <div data-song-id="${s.id}" style="display:grid;grid-template-columns:32px 1fr auto auto;align-items:center;gap:12px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:all 0.15s;group" onmouseover="this.style.background='rgba(255,255,255,0.07)';this.querySelector('.play-btn').style.opacity='1'" onmouseout="this.style.background='transparent';this.querySelector('.play-btn').style.opacity='0'">
      
      <!-- Index/Play Button -->
      <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
        <span class="track-number" style="font-size:14px;color:var(--yt-spec-text-secondary);font-weight:500;">${rowIndex}</span>
        <button class="play-btn" onclick="event.stopPropagation();playSongFromHome(${s.id})" style="position:absolute;width:32px;height:32px;border-radius:50%;background:#1db954;border:none;color:#000;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:all 0.15s;transform:scale(0.9)" onmouseover="this.style.transform='scale(1)'" onmouseout="this.style.transform='scale(0.9)'" data-song-id="${s.id}">
          <i class="fas fa-play" style="margin-left:2px;"></i>
        </button>
      </div>

      <!-- Song Info -->
      <div style="display:flex;align-items:center;gap:12px;min-width:0;">
        <img src="${s.cover_url}" onclick="event.stopPropagation();openSongDetailPage(${s.id})" style="width:40px;height:40px;border-radius:4px;object-fit:cover;flex-shrink:0;cursor:pointer" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=40 height=40%3E%3Crect width=40 height=40 fill=%23333/%3E%3C/svg%3E'" />
        <div style="min-width:0;flex:1;">
          <p onclick="event.stopPropagation();openSongDetailPage(${s.id})" style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;margin:0 0 2px;color:#fff" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${s.title || ''}</p>
          <p onclick="event.stopPropagation();viewArtistPage(${s.artist_id})" style="font-size:12px;color:var(--yt-spec-text-secondary);cursor:pointer;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" onmouseover="this.style.color='#fff';this.style.textDecoration='underline'" onmouseout="this.style.color='var(--yt-spec-text-secondary)';this.style.textDecoration='none'">${s.artist_name || ''}</p>
        </div>
      </div>

      <!-- Play Count -->
      <span style="font-size:13px;color:var(--yt-spec-text-secondary);text-align:right;min-width:60px;">${playCount}</span>

      <!-- Actions -->
      <div style="display:flex;align-items:center;gap:8px;">
        <button onclick="event.stopPropagation();addToPlaylistPrompt(${s.id})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;padding:6px;border-radius:50%;transition:all 0.15s;opacity:0.7" onmouseover="this.style.color='#fff';this.style.background='rgba(255,255,255,0.1);this.style.opacity='1'" onmouseout="this.style.color='var(--yt-spec-text-secondary)';this.style.background='transparent';this.style.opacity='0.7'" title="Playlist'e Ekle">
          <i class="fas fa-plus"></i>
        </button>
        <span style="font-size:13px;color:var(--yt-spec-text-secondary);min-width:35px;text-align:right;">3:24</span>
      </div>
    </div>`;
}

function renderTSArtistCard(a) {
  const photo = a.cover_photo || a.profile_photo || 'logoteatube.png';
  return `
    <div onclick="viewArtistPage(${a.id})" style="flex-shrink:0;width:100px;cursor:pointer;text-align:center">
      <img src="${photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 6px;display:block" onerror="this.src='logoteatube.png'" />
      <p style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;justify-content:center;gap:3px">${a.artist_name || ''}<i class="fas fa-check-circle" style="color:#1db954;font-size:10px;flex-shrink:0"></i></p>
      <p style="font-size:11px;color:var(--yt-spec-text-secondary)">${a.song_count || 0} şarkı</p>
    </div>`;
}

// TeaSocial Music global queue (anasayfa için)
let tsMusicHomeQueue = [];
let tsMusicHomeIndex = -1;
let tsMusicHomeShuffle = false;

async function playSong(songId, queue = null, index = -1) {
  try {
    const r = await fetch(API_URL + '/music/song/' + songId);
    const song = await r.json();
    if (!r.ok) return;
    if (tsMusicAudio) { tsMusicAudio.pause(); tsMusicAudio = null; }
    tsMusicCurrentSong = song;

    // Queue güncelle
    if (queue) {
      tsMusicHomeQueue = queue;
      tsMusicHomeIndex = index >= 0 ? index : queue.findIndex(s => s.id === songId);
    } else if (tsMusicHomeQueue.length === 0) {
      // Anasayfadaki listeyi queue olarak al
      tsMusicHomeQueue = Array.from(document.querySelectorAll('[data-song-id]'))
        .map(el => ({ id: parseInt(el.dataset.songId) }))
        .filter(s => s.id);
      tsMusicHomeIndex = tsMusicHomeQueue.findIndex(s => s.id === songId);
    } else {
      tsMusicHomeIndex = tsMusicHomeQueue.findIndex(s => s.id === songId);
    }

    tsMusicAudio = new Audio(song.audio_url);
    
    // Kaydedilmiş ses seviyesini uygula
    const savedVolume = parseFloat(localStorage.getItem('tea_volume') ?? '1');
    const savedMuted = localStorage.getItem('tea_muted') === 'true';
    tsMusicAudio.volume = savedVolume;
    tsMusicAudio.muted = savedMuted;
    
    tsMusicAudio.play();
    tsMusicIsPlaying = true;

    tsMusicAudio.onended = () => {
      tsMusicIsPlaying = false;
      _playNextTSMusicSong();
    };

    updateTSMiniPlayer();
    document.querySelectorAll(`[data-song-id="${songId}"] .song-play-count`).forEach(el => {
      el.textContent = (parseInt(el.textContent) || 0) + 1 + ' dinlenme';
    });
  } catch(e) { showToast('Şarkı yüklenemedi', 'error'); }
}

function playSongFromHome(songId) {
  // Eğer aynı şarkı çalıyorsa pause/play yap
  if (tsMusicCurrentSong && tsMusicCurrentSong.id == songId) {
    toggleTSMusicPlay();
    return;
  }
  
  // Hangi listede olduğunu bul (yeni çıkanlar veya popüler)
  const newQ = window._tsMusicNewQueue || [];
  const popQ = window._tsMusicPopQueue || [];
  let queue = newQ;
  let idx = newQ.findIndex(s => s.id === songId);
  if (idx === -1) {
    idx = popQ.findIndex(s => s.id === songId);
    if (idx !== -1) queue = popQ;
  }
  if (idx === -1) { queue = []; idx = 0; }
  playSong(songId, queue.length ? queue : null, idx);
}

function _playNextTSMusicSong() {
  if (!tsMusicHomeQueue.length) { updateTSMiniPlayer(); return; }

  let nextIndex;
  if (tsMusicHomeShuffle) {
    // Gerçek karışık çalma - mevcut şarkı hariç rastgele seç
    const availableIndices = tsMusicHomeQueue.map((_, i) => i).filter(i => i !== tsMusicHomeIndex);
    if (availableIndices.length === 0) { updateTSMiniPlayer(); return; }
    nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  } else {
    nextIndex = tsMusicHomeIndex + 1;
    if (nextIndex >= tsMusicHomeQueue.length) { updateTSMiniPlayer(); return; }
  }

  tsMusicHomeIndex = nextIndex;
  const nextSong = tsMusicHomeQueue[nextIndex];
  if (nextSong) playSong(nextSong.id);
}

function toggleTSHomeShuffle() {
  tsMusicHomeShuffle = !tsMusicHomeShuffle;
  const btn = document.getElementById('tsMiniShuffleBtn');
  if (btn) {
    btn.style.color = tsMusicHomeShuffle ? '#ff0033' : 'var(--yt-spec-text-secondary)';
    btn.title = tsMusicHomeShuffle ? 'Karışık: Açık' : 'Karışık: Kapalı';
  }
  showToast(tsMusicHomeShuffle ? 'Karışık çal açık' : 'Karışık çal kapalı', 'success');
}

function updateTSMiniPlayer() {
  let player = document.getElementById('tsMiniPlayer');
  if (!tsMusicCurrentSong) { 
    if (player) player.remove(); 
    // Tüm play butonlarını sıfırla
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.style.opacity = '0';
      btn.innerHTML = '<i class="fas fa-play" style="margin-left:2px;"></i>';
    });
    document.querySelectorAll('.track-number').forEach(num => {
      num.style.display = 'block';
    });
    return; 
  }
  
  // Aktif şarkının play butonunu güncelle
  const currentSongId = tsMusicCurrentSong.id;
  document.querySelectorAll('.play-btn').forEach(btn => {
    const songId = btn.getAttribute('data-song-id');
    if (songId == currentSongId) {
      btn.style.opacity = '1';
      btn.innerHTML = `<i class="fas ${tsMusicIsPlaying ? 'fa-pause' : 'fa-play'}" style="margin-left:${tsMusicIsPlaying ? '0' : '2px'}px;"></i>`;
      // Track number'ı gizle
      const trackNumber = btn.parentElement.querySelector('.track-number');
      if (trackNumber) trackNumber.style.display = 'none';
    } else {
      btn.style.opacity = '0';
      btn.innerHTML = '<i class="fas fa-play" style="margin-left:2px;"></i>';
      // Track number'ı göster
      const trackNumber = btn.parentElement.querySelector('.track-number');
      if (trackNumber) trackNumber.style.display = 'block';
    }
  });
  
  if (!player) {
    player = document.createElement('div');
    player.id = 'tsMiniPlayer';
    player.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:5000;background:var(--yt-spec-raised-background);border-top:1px solid rgba(255,255,255,0.08);padding:8px 16px 12px;backdrop-filter:blur(10px)';
    document.body.appendChild(player);
  }
  const s = tsMusicCurrentSong;
  const dur = tsMusicAudio?.duration || 0;
  const cur = tsMusicAudio?.currentTime || 0;
  const vol = tsMusicAudio?.volume !== undefined ? Math.round(tsMusicAudio.volume * 100) : 100;
  const fmt = t => { const m = Math.floor(t/60); const sec = Math.floor(t%60); return m+':'+(sec<10?'0':'')+sec; };

  player.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <img src="${s.cover_url}" onclick="openSongDetailPage(${s.id})" style="width:36px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0;cursor:pointer" />
      <div style="flex:1;min-width:0;cursor:pointer" onclick="openSongDetailPage(${s.id})">
        <p style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title || ''}</p>
        <p style="font-size:11px;color:#1db954">${s.artist_name || ''}</p>
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
        <i class="fas fa-volume-up" style="font-size:11px;color:var(--yt-spec-text-secondary)"></i>
        <input type="range" min="0" max="100" value="${vol}" oninput="setTSVolume(this.value)" style="width:56px;height:3px;accent-color:#ff0033;cursor:pointer" />
      </div>
      <button onclick="toggleTSMusicPlay()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;padding:4px 6px;flex-shrink:0">
        <i class="fas ${tsMusicIsPlaying ? 'fa-pause' : 'fa-play'}"></i>
      </button>
      <button id="tsMiniShuffleBtn" onclick="toggleTSHomeShuffle()" style="background:none;border:none;color:${tsMusicHomeShuffle ? '#ff0033' : 'var(--yt-spec-text-secondary)'};cursor:pointer;font-size:14px;padding:4px 6px;flex-shrink:0" title="${tsMusicHomeShuffle ? 'Karışık: Açık' : 'Karışık: Kapalı'}">
        <i class="fas fa-random"></i>
      </button>
      <button onclick="closeTSMiniPlayer()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:16px;padding:4px 6px;flex-shrink:0">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <span id="tsMiniCur" style="font-size:10px;color:var(--yt-spec-text-secondary);width:28px;text-align:right;flex-shrink:0">${fmt(cur)}</span>
      <input id="tsMiniSeek" type="range" min="0" max="${Math.round(dur)||100}" value="${Math.round(cur)}" oninput="seekTSMusic(this.value)" style="flex:1;height:3px;accent-color:#ff0033;cursor:pointer" />
      <span style="font-size:10px;color:var(--yt-spec-text-secondary);width:28px;flex-shrink:0">${fmt(dur)}</span>
    </div>`;

  // Seek bar'ı canlı güncelle
  if (tsMusicAudio) {
    tsMusicAudio.ontimeupdate = () => {
      const seek = document.getElementById('tsMiniSeek');
      const curEl = document.getElementById('tsMiniCur');
      if (seek && tsMusicAudio.duration) {
        seek.max = Math.round(tsMusicAudio.duration);
        seek.value = Math.round(tsMusicAudio.currentTime);
      }
      if (curEl) curEl.textContent = fmt(tsMusicAudio.currentTime);
    };
  }
}

function seekTSMusic(val) {
  if (tsMusicAudio) tsMusicAudio.currentTime = parseFloat(val);
}

function setTSVolume(val) {
  const volume = parseFloat(val) / 100;
  if (tsMusicAudio) {
    tsMusicAudio.volume = volume;
    tsMusicAudio.muted = volume === 0;
  }
  // Ses seviyesini kaydet
  localStorage.setItem('tea_volume', volume);
  localStorage.setItem('tea_muted', volume === 0);
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

// ==================== ŞARKILARIM ====================
async function loadMySongsPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<div class="yt-loading"><div class="yt-spinner"></div></div>';
  try {
    // Artist mi kontrol et
    const statusRes = await fetch(`${API_URL}/music/artist-status/${currentUser.id}`);
    const status = await statusRes.json();
    if (!status.isArtist) {
      pageContent.innerHTML = `
        <div style="text-align:center;padding:60px 20px">
          <i class="fas fa-music" style="font-size:48px;color:rgba(255,255,255,0.1);margin-bottom:16px;display:block"></i>
          <p style="font-size:16px;font-weight:600;margin-bottom:8px">Sanatçı Değilsin</p>
          <p style="font-size:13px;color:var(--yt-spec-text-secondary);margin-bottom:20px">Şarkı yükleyebilmek için sanatçı başvurusu yapman gerekiyor.</p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button class="yt-btn" onclick="showArtistApplicationModal()" style="background:#1db954;color:#000;font-weight:700;">
              <i class="fas fa-star" style="margin-right:6px;"></i>Sanatçı Ol
            </button>
            <button class="yt-btn" onclick="showPage('ts-music')" style="background:rgba(255,255,255,0.1);">
              <i class="fas fa-music" style="margin-right:6px;"></i>TS Music'e Git
            </button>
          </div>
        </div>`;
      return;
    }

    const r = await fetch(`${API_URL}/music/my-songs/${currentUser.id}`);
    const songs = await r.json();

    pageContent.innerHTML = `
      <div style="max-width:700px;padding-bottom:120px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
          <h2 style="font-size:22px;font-weight:700"><i class="fas fa-music" style="color:#1db954;margin-right:8px"></i>Şarkılarım</h2>
          <button class="yt-btn" onclick="showUploadSongModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Yeni Şarkı</button>
        </div>
        ${songs.length === 0 ? '<p style="color:var(--yt-spec-text-secondary);text-align:center;padding:40px 0">Henüz şarkın yok</p>' : `
          <div style="display:flex;flex-direction:column;gap:4px">
            ${songs.map((s, i) => `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
                <span style="width:20px;text-align:center;font-size:13px;color:var(--yt-spec-text-secondary);flex-shrink:0">${i + 1}</span>
                <img src="${s.cover_url}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;cursor:pointer" onclick="playSong(${s.id})" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=44 height=44%3E%3Crect width=44 height=44 fill=%23333/%3E%3C/svg%3E'" />
                <div style="flex:1;min-width:0;cursor:pointer" onclick="showSongDetail(${s.id})">
                  <p style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title}</p>
                  <p style="font-size:12px;color:var(--yt-spec-text-secondary)">${formatNumber(s.play_count || 0)} dinlenme</p>
                </div>
                <button onclick="editMySong(${s.id},'${s.title.replace(/'/g,"\\'")}','${s.cover_url}','${s.genre||''}','${s.lyrics||''}')" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;padding:6px 8px;border-radius:8px;font-size:14px" title="Düzenle"><i class="fas fa-edit"></i></button>
                <button onclick="deleteMySong(${s.id},'${s.title.replace(/'/g,"\\'")}',this)" style="background:none;border:none;color:rgba(255,0,0,0.5);cursor:pointer;padding:6px 8px;border-radius:8px;font-size:14px" title="Sil"><i class="fas fa-trash"></i></button>
              </div>
            `).join('')}
          </div>
        `}
      </div>`;
  } catch(e) { pageContent.innerHTML = '<p>Hata oluştu</p>'; }
}

function editMySong(songId, title, coverUrl, genre, lyrics) {
  showModal(`
    <h3 style="margin-bottom:16px">Şarkıyı Düzenle</h3>
    <div class="yt-form-group"><label class="yt-form-label">Şarkı Adı</label><input id="editSongTitle" class="yt-input" value="${title}" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Tür</label><input id="editSongGenre" class="yt-input" value="${genre}" placeholder="Pop, Rock..." /></div>
    <div class="yt-form-group"><label class="yt-form-label">Yeni Kapak Fotoğrafı (opsiyonel)</label><input type="file" id="editSongCover" class="yt-input" accept="image/*" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Şarkı Sözleri</label><textarea id="editSongLyrics" class="yt-input" style="height:80px;resize:vertical">${lyrics}</textarea></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="yt-btn" onclick="saveMySongEdit(${songId})" style="flex:1">Kaydet</button>
      <button class="yt-btn" onclick="closeModal()" style="background:rgba(255,255,255,0.1);flex:1">İptal</button>
    </div>
  `);
}

function showArtistApplicationModal() {
  showModal(`
    <h3 style="margin-bottom:16px;display:flex;align-items:center;gap:8px;">
      <i class="fas fa-star" style="color:#1db954;"></i>Sanatçı Başvurusu
    </h3>
    <p style="font-size:14px;color:var(--yt-spec-text-secondary);margin-bottom:20px;line-height:1.5;">
      Sanatçı olarak şarkı yükleyebilmek için aşağıdaki bilgileri doldur. Başvurun incelendikten sonra onaylanacak.
    </p>
    <div class="yt-form-group">
      <label class="yt-form-label">Sanatçı Adın</label>
      <input id="artistName" class="yt-input" placeholder="Sahne adın veya gerçek adın" maxlength="50" />
    </div>
    <div class="yt-form-group">
      <label class="yt-form-label">Müzik Türün</label>
      <select id="artistGenre" class="yt-input">
        <option value="">Seç...</option>
        <option value="Pop">Pop</option>
        <option value="Rock">Rock</option>
        <option value="Hip-Hop">Hip-Hop</option>
        <option value="R&B">R&B</option>
        <option value="Electronic">Electronic</option>
        <option value="Jazz">Jazz</option>
        <option value="Classical">Classical</option>
        <option value="Folk">Folk</option>
        <option value="Alternative">Alternative</option>
        <option value="Other">Diğer</option>
      </select>
    </div>
    <div class="yt-form-group">
      <label class="yt-form-label">Hakkında (Opsiyonel)</label>
      <textarea id="artistBio" class="yt-input" style="height:80px;resize:vertical;" placeholder="Müzik geçmişin, tarzın hakkında kısa bilgi..." maxlength="500"></textarea>
    </div>
    <div class="yt-form-group">
      <label class="yt-form-label">Sosyal Medya Linkleri (Opsiyonel)</label>
      <input id="artistSocial" class="yt-input" placeholder="Instagram, YouTube, Spotify vb. linkler" />
    </div>
    <div style="display:flex;gap:8px;margin-top:20px;">
      <button class="yt-btn" onclick="submitArtistApplication()" style="flex:1;background:#1db954;color:#000;font-weight:700;">
        <i class="fas fa-paper-plane" style="margin-right:6px;"></i>Başvuru Gönder
      </button>
      <button class="yt-btn" onclick="closeModal()" style="background:rgba(255,255,255,0.1);flex:1;">İptal</button>
    </div>
  `);
}

async function submitArtistApplication() {
  const artistName = document.getElementById('artistName')?.value?.trim();
  const artistGenre = document.getElementById('artistGenre')?.value;
  const artistBio = document.getElementById('artistBio')?.value?.trim();
  const artistSocial = document.getElementById('artistSocial')?.value?.trim();
  
  if (!artistName) {
    showToast('Sanatçı adını gir', 'error');
    return;
  }
  
  if (!artistGenre) {
    showToast('Müzik türünü seç', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/music/artist-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        artistName,
        genre: artistGenre,
        bio: artistBio,
        socialLinks: artistSocial
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      closeModal();
      showToast('Başvurun gönderildi! İnceleme süreci 1-3 gün sürer.', 'success');
    } else {
      showToast('Hata: ' + (data.error || 'Başvuru gönderilemedi'), 'error');
    }
  } catch(e) {
    console.error('Artist başvuru hatası:', e);
    showToast('Bir hata oluştu!', 'error');
  }
}

async function saveMySongEdit(songId) {
  const title = document.getElementById('editSongTitle')?.value.trim();
  const genre = document.getElementById('editSongGenre')?.value.trim();
  const lyrics = document.getElementById('editSongLyrics')?.value.trim();
  const coverFile = document.getElementById('editSongCover')?.files[0];

  if (!title) { showToast('Şarkı adı gerekli', 'error'); return; }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('genre', genre || '');
  formData.append('lyrics', lyrics || '');
  if (coverFile) formData.append('cover', coverFile);

  try {
    const r = await fetch(`${API_URL}/music/song/${songId}`, { method: 'PUT', body: formData });
    if (!r.ok) throw new Error('Güncellenemedi');
    showToast('Şarkı güncellendi', 'success');
    closeModal();
    loadMySongsPage();
  } catch(e) { showToast('Hata: ' + e.message, 'error'); }
}

async function deleteMySong(songId, title, btn) {
  if (!confirm(`"${title}" şarkısını silmek istediğine emin misin?`)) return;
  if (!confirm(`Bu işlem geri alınamaz. "${title}" kalıcı olarak silinecek. Devam et?`)) return;
  try {
    const r = await fetch(`${API_URL}/music/song/${songId}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Silinemedi');
    showToast('Şarkı silindi', 'success');
    btn.closest('div[style]').remove();
  } catch(e) { showToast('Hata: ' + e.message, 'error'); }
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
          <img src="${artist.cover_photo||artist.profile_photo||'logoteatube.png'}" style="width:80px;height:80px;border-radius:50%;object-fit:cover" onerror="this.src='logoteatube.png'" />
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

// Şarkı sözlerini modal'da göster
function showSongLyrics(songId, title, lyrics) {
  const lyricsText = lyrics.replace(/\\n/g, '\n');
  showModal(`
    <div style="max-height:70vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <i class="fas fa-book-open" style="color:#1db954;font-size:20px;"></i>
        <h3 style="margin:0;font-size:17px;font-weight:700;">${title}</h3>
      </div>
      <div style="background:#fff;color:#111;border-radius:12px;padding:20px;white-space:pre-wrap;font-size:15px;line-height:1.8;font-family:'Courier New',monospace;">${lyricsText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    </div>
  `);
}

// Spotify tarzı şarkı detay sayfası
async function openSongDetailPage(songId) {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<div class="yt-loading"><div class="yt-spinner"></div></div>';
  showPage('ts-music'); // sayfayı ts-music olarak işaretle

  try {
    const r = await fetch(API_URL + '/music/song/' + songId);
    const s = await r.json();
    if (!r.ok) throw new Error(s.error || 'Hata');

    const year = s.created_at ? new Date(s.created_at).getFullYear() : new Date().getFullYear();
    const lyricsHtml = s.lyrics ? `
      <div style="margin-top:32px;padding:24px;background:rgba(255,255,255,0.05);border-radius:12px;">
        <h3 style="font-size:14px;font-weight:700;color:#fff;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;">Şarkı Sözleri</h3>
        <pre style="font-size:14px;line-height:1.8;color:rgba(255,255,255,0.85);white-space:pre-wrap;font-family:inherit;margin:0;">${s.lyrics.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
      </div>` : '';

    pageContent.innerHTML = `
      <div style="max-width:800px;margin:0 auto;padding:0 16px 120px;">
        <!-- Geri -->
        <button onclick="loadTSMusicPage()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;margin-bottom:20px;font-size:13px;display:flex;align-items:center;gap:6px;padding:0;">
          <i class="fas fa-arrow-left"></i> Geri
        </button>

        <!-- Hero: Kapak + Bilgi -->
        <div style="display:flex;gap:24px;align-items:flex-end;margin-bottom:28px;flex-wrap:wrap;">
          <img src="${s.cover_url}" style="width:200px;height:200px;border-radius:8px;object-fit:cover;box-shadow:0 8px 32px rgba(0,0,0,0.5);flex-shrink:0;" onerror="this.src='logoteatube.png'" />
          <div style="flex:1;min-width:0;">
            <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--yt-spec-text-secondary);margin:0 0 8px;">Single</p>
            <h1 style="font-size:clamp(24px,5vw,48px);font-weight:900;margin:0 0 12px;line-height:1.1;">${s.title || ''}</h1>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <img src="${s.profile_photo || 'logoteatube.png'}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;" onerror="this.src='logoteatube.png'" />
              <span onclick="viewArtistPage(${s.artist_id})" style="font-size:13px;font-weight:700;cursor:pointer;color:#fff;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${s.artist_name || ''}</span>
              <span style="color:var(--yt-spec-text-secondary);font-size:13px;">• ${year} • 1 şarkı</span>
            </div>
          </div>
        </div>

        <!-- Kontroller -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;">
          <button onclick="playSong(${s.id})" style="width:52px;height:52px;border-radius:50%;background:#1db954;border:none;color:#000;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 0.1s;" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform=''">
            <i class="fas fa-play" style="margin-left:3px;"></i>
          </button>
          <button onclick="addToPlaylistPrompt(${s.id})" style="background:none;border:2px solid rgba(255,255,255,0.3);color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:border-color 0.15s;" onmouseover="this.style.borderColor='#fff'" onmouseout="this.style.borderColor='rgba(255,255,255,0.3)'" title="Playlist'e Ekle">
            <i class="fas fa-plus"></i>
          </button>
        </div>

        <!-- Şarkı Listesi (tek şarkı) -->
        <div style="border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;margin-bottom:8px;">
          <div style="display:grid;grid-template-columns:32px 1fr auto auto;align-items:center;gap:12px;padding:4px 8px;color:var(--yt-spec-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">
            <span style="text-align:center;">#</span>
            <span>Başlık</span>
            <span>Çalma</span>
            <span><i class="fas fa-clock"></i></span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:32px 1fr auto auto;align-items:center;gap:12px;padding:8px;border-radius:6px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.background=''" onclick="playSong(${s.id})">
          <span style="text-align:center;color:var(--yt-spec-text-secondary);font-size:14px;">1</span>
          <div style="min-width:0;">
            <p style="font-size:14px;font-weight:500;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.title || ''}</p>
            <p style="font-size:12px;color:var(--yt-spec-text-secondary);margin:2px 0 0;display:flex;align-items:center;gap:4px;">${s.artist_name || ''}<i class="fas fa-check-circle" style="color:#1db954;font-size:10px;"></i></p>
          </div>
          <span style="font-size:13px;color:var(--yt-spec-text-secondary);">${s.show_play_count ? formatNumber(s.play_count || 0) : ''}</span>
          <span style="font-size:13px;color:var(--yt-spec-text-secondary);">—</span>
        </div>

        <!-- Tarih + Copyright -->
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="font-size:13px;color:var(--yt-spec-text-secondary);margin:0 0 4px;">${year > 2000 ? new Date(s.created_at || Date.now()).toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric'}) : ''}</p>
          ${s.company_name ? `
            <p style="font-size:12px;color:var(--yt-spec-text-secondary);margin:2px 0;">© ${year} ${s.company_name}</p>
            <p style="font-size:12px;color:var(--yt-spec-text-secondary);margin:2px 0;">℗ ${year} ${s.company_name}</p>
          ` : ''}
        </div>

        <!-- Şarkı Sözleri -->
        ${lyricsHtml}
      </div>`;
  } catch(e) {
    pageContent.innerHTML = '<p style="color:var(--yt-spec-text-secondary);padding:20px;">Şarkı yüklenemedi: ' + e.message + '</p>';
  }
}

async function showMyPlaylists() {
  try {
    const r = await fetch(API_URL + '/music/playlists/' + currentUser.id);
    const playlists = await r.json();
    showModal(`
      <h3 style="margin-bottom:20px;font-size:18px;font-weight:700"><i class="fas fa-list" style="color:#ff0033;margin-right:8px"></i>Playlistlerim</h3>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <input id="newPlaylistName" class="yt-input" placeholder="Yeni playlist adı..." style="flex:1" />
        <button class="yt-btn" onclick="createTSPlaylist()"><i class="fas fa-plus" style="margin-right:4px"></i>Oluştur</button>
      </div>
      <div id="playlistList">
        ${playlists.length ? playlists.map(p => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--yt-spec-raised-background);border-radius:12px;margin-bottom:8px;cursor:pointer;transition:background 0.15s;border:1px solid rgba(255,255,255,0.06)" onclick="viewTSPlaylist(${p.id});closeModal()" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='var(--yt-spec-raised-background)'">
            <div style="width:48px;height:48px;background:rgba(255,0,51,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="fas fa-music" style="color:#ff0033;font-size:18px"></i>
            </div>
            <div style="flex:1;min-width:0">
              <p style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name || ''}</p>
              <p style="font-size:12px;color:var(--yt-spec-text-secondary);margin-top:2px">${p.song_count || 0} şarkı</p>
            </div>
            <button onclick="event.stopPropagation();deleteTSPlaylist(${p.id})" style="background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;padding:6px;font-size:16px;border-radius:8px" onmouseover="this.style.color='#ff4444'" onmouseout="this.style.color='rgba(255,255,255,0.3)'"><i class="fas fa-trash"></i></button>
          </div>`).join('') : '<div style="text-align:center;padding:32px 0"><i class="fas fa-music" style="font-size:40px;color:rgba(255,255,255,0.1);margin-bottom:12px;display:block"></i><p style="color:var(--yt-spec-text-secondary)">Henüz playlist yok</p></div>'}
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

// Playlist çalma state
let tsPlaylistQueue = [];
let tsPlaylistIndex = 0;
let tsPlaylistShuffle = false;
let tsPlaylistRepeat = false; // false = kapalı, 'one' = tek, 'all' = hepsi

async function viewTSPlaylist(playlistId) {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<div class="yt-loading"><div class="yt-spinner"></div></div>';
  try {
    const r = await fetch(API_URL + '/music/playlist/' + playlistId);
    const d = await r.json();
    const songs = d.songs || [];

    pageContent.innerHTML = `
      <div style="padding-bottom:140px;max-width:700px">
        <button onclick="loadTSMusicPage()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;margin-bottom:20px;font-size:13px;display:flex;align-items:center;gap:6px"><i class="fas fa-arrow-left"></i>Geri</button>
        
        <!-- Playlist Header -->
        <div style="display:flex;align-items:center;gap:20px;margin-bottom:28px;padding:20px;background:linear-gradient(135deg,rgba(255,0,51,0.15),rgba(255,0,51,0.05));border-radius:16px;border:1px solid rgba(255,0,51,0.2)">
          <div style="width:80px;height:80px;background:rgba(255,0,51,0.2);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas fa-music" style="font-size:32px;color:#ff0033"></i>
          </div>
          <div style="flex:1;min-width:0">
            <p style="font-size:11px;font-weight:600;color:var(--yt-spec-text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Playlist</p>
            <h2 style="font-size:22px;font-weight:700;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.playlist.name || ''}</h2>
            <p style="font-size:13px;color:var(--yt-spec-text-secondary)">${songs.length} şarkı</p>
          </div>
        </div>

        <!-- Kontrol Butonları -->
        ${songs.length > 0 ? `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
          <button onclick="playTSPlaylist(${playlistId}, 0, false)" style="width:52px;height:52px;background:#ff0033;border:none;border-radius:50%;color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(255,0,51,0.4);flex-shrink:0">
            <i class="fas fa-play"></i>
          </button>
          <button id="tsShuffleBtn" onclick="toggleTSPlaylistShuffle(${playlistId})" style="width:44px;height:44px;background:rgba(255,255,255,0.08);border:none;border-radius:50%;color:var(--yt-spec-text-secondary);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s" title="Karışık Çal">
            <i class="fas fa-random"></i>
          </button>
          <button id="tsRepeatBtn" onclick="cycleTSPlaylistRepeat(${playlistId})" style="width:44px;height:44px;background:rgba(255,255,255,0.08);border:none;border-radius:50%;color:var(--yt-spec-text-secondary);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s" title="Tekrar">
            <i class="fas fa-redo"></i>
          </button>
          <span id="tsPlayModeLabel" style="font-size:12px;color:var(--yt-spec-text-secondary)">Sıralı çal</span>
        </div>
        ` : ''}

        <!-- Şarkı Listesi -->
        <div style="display:flex;flex-direction:column;gap:2px" id="tsPlaylistSongList">
          ${songs.length ? songs.map((s, i) => `
            <div id="tsPlSong_${s.id}" data-song-id="${s.id}" onclick="playTSPlaylist(${playlistId}, ${i}, tsPlaylistShuffle)" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
              <span style="width:20px;text-align:center;font-size:13px;color:var(--yt-spec-text-secondary);flex-shrink:0">${i + 1}</span>
              <img src="${s.cover_url}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=44 height=44%3E%3Crect width=44 height=44 fill=%23333/%3E%3C/svg%3E'" />
              <div style="flex:1;min-width:0">
                <p style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title || ''}</p>
                <p style="font-size:12px;color:var(--yt-spec-text-secondary)">${s.artist_name || ''}</p>
              </div>
              <button onclick="event.stopPropagation();removeSongFromPlaylist(${playlistId},${s.id})" style="background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;padding:4px 8px;font-size:14px;opacity:0;transition:opacity 0.15s" class="pl-remove-btn"><i class="fas fa-times"></i></button>
            </div>
          `).join('') : '<p style="color:var(--yt-spec-text-secondary);text-align:center;padding:40px 0">Playlist boş</p>'}
        </div>
      </div>`;

    // Hover'da sil butonu göster
    document.querySelectorAll('#tsPlaylistSongList > div').forEach(row => {
      const btn = row.querySelector('.pl-remove-btn');
      if (btn) {
        row.addEventListener('mouseenter', () => btn.style.opacity = '1');
        row.addEventListener('mouseleave', () => btn.style.opacity = '0');
      }
    });

    // Mevcut state'i yansıt
    updateTSPlaylistButtons();

  } catch(e) { pageContent.innerHTML = '<p>Hata oluştu</p>'; }
}

function updateTSPlaylistButtons() {
  const shuffleBtn = document.getElementById('tsShuffleBtn');
  const repeatBtn = document.getElementById('tsRepeatBtn');
  const label = document.getElementById('tsPlayModeLabel');
  if (shuffleBtn) {
    shuffleBtn.style.color = tsPlaylistShuffle ? '#ff0033' : 'var(--yt-spec-text-secondary)';
    shuffleBtn.style.background = tsPlaylistShuffle ? 'rgba(255,0,51,0.15)' : 'rgba(255,255,255,0.08)';
  }
  if (repeatBtn) {
    const icon = repeatBtn.querySelector('i');
    if (tsPlaylistRepeat === 'one') {
      repeatBtn.style.color = '#ff0033';
      repeatBtn.style.background = 'rgba(255,0,51,0.15)';
      if (icon) icon.className = 'fas fa-redo-alt';
    } else if (tsPlaylistRepeat === 'all') {
      repeatBtn.style.color = '#ff0033';
      repeatBtn.style.background = 'rgba(255,0,51,0.15)';
      if (icon) icon.className = 'fas fa-redo';
    } else {
      repeatBtn.style.color = 'var(--yt-spec-text-secondary)';
      repeatBtn.style.background = 'rgba(255,255,255,0.08)';
      if (icon) icon.className = 'fas fa-redo';
    }
  }
  if (label) {
    if (tsPlaylistShuffle) label.textContent = 'Karışık çal';
    else if (tsPlaylistRepeat === 'one') label.textContent = 'Tek tekrar';
    else if (tsPlaylistRepeat === 'all') label.textContent = 'Hepsini tekrar';
    else label.textContent = 'Sıralı çal';
  }
}

function toggleTSPlaylistShuffle(playlistId) {
  tsPlaylistShuffle = !tsPlaylistShuffle;
  updateTSPlaylistButtons();
}

function cycleTSPlaylistRepeat(playlistId) {
  if (!tsPlaylistRepeat) tsPlaylistRepeat = 'all';
  else if (tsPlaylistRepeat === 'all') tsPlaylistRepeat = 'one';
  else tsPlaylistRepeat = false;
  updateTSPlaylistButtons();
}

async function playTSPlaylist(playlistId, startIndex, shuffle) {
  try {
    const r = await fetch(API_URL + '/music/playlist/' + playlistId);
    const d = await r.json();
    const songs = d.songs || [];
    if (!songs.length) return;

    tsPlaylistQueue = [...songs];
    if (shuffle || tsPlaylistShuffle) {
      // Fisher-Yates karıştır
      for (let i = tsPlaylistQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tsPlaylistQueue[i], tsPlaylistQueue[j]] = [tsPlaylistQueue[j], tsPlaylistQueue[i]];
      }
      tsPlaylistIndex = 0;
    } else {
      tsPlaylistIndex = startIndex;
    }

    playTSPlaylistSong();
  } catch(e) { showToast('Playlist yüklenemedi', 'error'); }
}

async function playTSPlaylistSong() {
  if (!tsPlaylistQueue.length) return;
  const song = tsPlaylistQueue[tsPlaylistIndex];
  if (!song) return;

  // Şarkı detayını al ve çal
  try {
    const r = await fetch(API_URL + '/music/song/' + song.id);
    const fullSong = await r.json();
    if (!r.ok) return;

    if (tsMusicAudio) { tsMusicAudio.pause(); tsMusicAudio = null; }
    tsMusicCurrentSong = fullSong;
    tsMusicAudio = new Audio(fullSong.audio_url);
    
    // Kaydedilmiş ses seviyesini uygula
    const savedVolume = parseFloat(localStorage.getItem('tea_volume') ?? '1');
    const savedMuted = localStorage.getItem('tea_muted') === 'true';
    tsMusicAudio.volume = savedVolume;
    tsMusicAudio.muted = savedMuted;
    
    tsMusicAudio.play();
    tsMusicIsPlaying = true;

    // Aktif şarkıyı vurgula
    document.querySelectorAll('[id^="tsPlSong_"]').forEach(el => {
      el.style.background = '';
      const numEl = el.querySelector('span');
      if (numEl) numEl.style.color = 'var(--yt-spec-text-secondary)';
    });
    const activeEl = document.getElementById(`tsPlSong_${song.id}`);
    if (activeEl) {
      activeEl.style.background = 'rgba(255,0,51,0.1)';
      const numEl = activeEl.querySelector('span');
      if (numEl) { numEl.innerHTML = '<i class="fas fa-volume-up" style="color:#ff0033;font-size:12px"></i>'; }
    }

    tsMusicAudio.onended = () => {
      tsMusicIsPlaying = false;
      // Sonraki şarkıya geç
      if (tsPlaylistRepeat === 'one') {
        tsMusicAudio = new Audio(fullSong.audio_url);
        tsMusicAudio.play();
        tsMusicIsPlaying = true;
        tsMusicAudio.onended = arguments.callee;
      } else if (tsPlaylistIndex < tsPlaylistQueue.length - 1) {
        tsPlaylistIndex++;
        playTSPlaylistSong();
      } else if (tsPlaylistRepeat === 'all') {
        tsPlaylistIndex = 0;
        playTSPlaylistSong();
      } else {
        updateTSMiniPlayer();
      }
    };

    updateTSMiniPlayer();
  } catch(e) { showToast('Şarkı yüklenemedi', 'error'); }
}

async function removeSongFromPlaylist(playlistId, songId) {
  try {
    await fetch(`${API_URL}/music/playlist/${playlistId}/song/${songId}`, { method: 'DELETE' });
    showToast('Şarkı kaldırıldı', 'success');
    viewTSPlaylist(playlistId);
  } catch(e) { showToast('Hata', 'error'); }
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
    <div class="yt-form-group"><label class="yt-form-label">Mahlas (Artist Adı) *</label><input id="applyArtistName" class="yt-input" placeholder="Sahne adın / mahlasın" /></div>
    <div class="yt-form-group">
      <label class="yt-form-label">Örnek Şarkı (MP3/WAV) *</label>
      <p style="font-size:12px;color:var(--yt-spec-text-secondary);margin-bottom:8px">Seni değerlendirmemiz için herhangi bir şarkını yükle. Adminler dinleyip başvurunu değerlendirecek.</p>
      <input type="file" id="applySampleAudio" class="yt-input" accept="audio/*" />
    </div>
    <button class="yt-btn" style="width:100%;margin-top:8px" onclick="submitArtistApply()">Başvuru Gönder</button>`);
}

async function submitArtistApply() {
  const artistName = document.getElementById('applyArtistName')?.value.trim();
  const audioFile = document.getElementById('applySampleAudio')?.files[0];
  if (!artistName) { showToast('Mahlas gerekli', 'error'); return; }
  if (!audioFile) { showToast('Örnek şarkı gerekli', 'error'); return; }

  const btn = document.querySelector('#modalBody .yt-btn:last-child');
  if (btn) { btn.disabled = true; btn.textContent = 'Yükleniyor...'; }

  try {
    const fd = new FormData();
    fd.append('userId', currentUser.id);
    fd.append('artistName', artistName);
    fd.append('sampleAudio', audioFile);

    const r = await fetch(API_URL + '/music/apply', { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || 'Hata', 'error'); return; }
    showToast('Başvurunuz gönderildi!', 'success');
    closeModal();
    loadTSMusicPage();
  } catch(e) { showToast('Hata oluştu', 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Başvuru Gönder'; } }
}

function showUploadSongModal() {
  showModal(`
    <h3 style="margin-bottom:16px">Şarkı Yükle</h3>
    <div class="yt-form-group"><label class="yt-form-label">Şarkı Adı *</label><input id="songTitle" class="yt-input" placeholder="Şarkı adı" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Tür</label><input id="songGenre" class="yt-input" placeholder="Pop, Rock, Hip-Hop..." /></div>
    <div class="yt-form-group"><label class="yt-form-label">Company Name (opsiyonel)</label><input id="songCompany" class="yt-input" placeholder="Mamba Music, Universal..." /></div>
    <div class="yt-form-group"><label class="yt-form-label">Ses Dosyası * (MP3, WAV)</label><input type="file" id="songAudio" class="yt-input" accept="audio/*" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Kapak Fotoğrafı *</label><input type="file" id="songCover" class="yt-input" accept="image/*" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Şarkı Sözleri (opsiyonel)</label><textarea id="songLyrics" class="yt-input" style="height:80px;resize:vertical" placeholder="Şarkı sözleri..."></textarea></div>
    <button class="yt-btn" style="width:100%;margin-top:8px" onclick="uploadTSSong()">Yükle</button>`);
}

async function uploadTSSong() {
  const title = document.getElementById('songTitle')?.value.trim();
  const genre = document.getElementById('songGenre')?.value.trim();
  const company = document.getElementById('songCompany')?.value.trim();
  const audio = document.getElementById('songAudio')?.files[0];
  const cover = document.getElementById('songCover')?.files[0];
  const lyrics = document.getElementById('songLyrics')?.value.trim();
  if (!title || !audio || !cover) { showToast('Başlık, ses ve kapak gerekli', 'error'); return; }
  const formData = new FormData();
  formData.append('userId', currentUser.id);
  formData.append('title', title);
  if (genre) formData.append('genre', genre);
  if (lyrics) formData.append('lyrics', lyrics);
  if (company) formData.append('companyName', company);
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
    const [myGroups, allGroups, pendingRequests, myRequests] = await Promise.all([
      fetch(`${API_URL}/groups/user/${currentUser.id}`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/groups/all?userId=${currentUser.id}`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/groups/pending-requests/${currentUser.id}`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/groups/my-requests/${currentUser.id}`).then(r => r.json()).catch(() => [])
    ]);

    const myGroupIds = new Set(myGroups.map(g => g.id));
    const otherGroups = allGroups.filter(g => !myGroupIds.has(g.id));

    // Bekleyen istekleri gruba göre grupla
    const requestsByGroup = {};
    pendingRequests.forEach(r => {
      if (!requestsByGroup[r.group_id]) requestsByGroup[r.group_id] = { name: r.group_name, photo: r.group_photo, requests: [] };
      requestsByGroup[r.group_id].requests.push(r);
    });

    const pendingHtml = Object.keys(requestsByGroup).length > 0 ? `
      <div style="margin-bottom:24px;background:rgba(255,0,51,0.06);border:1px solid rgba(255,0,51,0.2);border-radius:14px;padding:16px">
        <h3 style="font-size:14px;font-weight:600;color:var(--yt-spec-brand-background-solid);margin-bottom:12px">
          <i class="fas fa-user-plus" style="margin-right:6px"></i>Bekleyen Katılma İstekleri (${pendingRequests.length})
        </h3>
        ${Object.values(requestsByGroup).map(g => `
          <div style="margin-bottom:12px">
            <p style="font-size:12px;font-weight:600;color:var(--yt-spec-text-secondary);margin-bottom:8px">${g.name}</p>
            ${g.requests.map(r => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--yt-spec-raised-background);border-radius:10px;margin-bottom:6px">
                <img src="${getProfilePhotoUrl(r.profile_photo)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0" />
                <div style="flex:1;min-width:0">
                  <p style="font-size:13px;font-weight:500">${r.nickname}</p>
                  <p style="font-size:11px;color:var(--yt-spec-text-secondary)">@${r.username}</p>
                </div>
                <button class="yt-btn" onclick="respondGroupRequest(${r.group_id},${r.id},'accepted')" style="height:28px;padding:0 10px;font-size:12px;flex-shrink:0">Kabul</button>
                <button class="yt-btn" onclick="respondGroupRequest(${r.group_id},${r.id},'rejected')" style="height:28px;padding:0 10px;font-size:12px;background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary);flex-shrink:0">Red</button>
              </div>`).join('')}
          </div>`).join('')}
      </div>` : '';

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

        ${pendingHtml}

        ${myRequests.length > 0 ? `
          <div style="margin-bottom:24px;background:rgba(255,200,0,0.06);border:1px solid rgba(255,200,0,0.2);border-radius:14px;padding:16px">
            <h3 style="font-size:14px;font-weight:600;color:#ffc800;margin-bottom:12px">
              <i class="fas fa-clock" style="margin-right:6px"></i>Gönderdiğim İstekler (${myRequests.length})
            </h3>
            ${myRequests.map(r => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--yt-spec-raised-background);border-radius:10px;margin-bottom:6px">
                <img src="${r.group_photo || 'data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=36 height=36%3E%3Ccircle cx=18 cy=18 r=18 fill=%23333/%3E%3C/svg%3E'}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0" />
                <div style="flex:1;min-width:0">
                  <p style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.group_name}</p>
                  <p style="font-size:11px;color:#ffc800"><i class="fas fa-clock" style="margin-right:3px"></i>Onay bekleniyor</p>
                </div>
              </div>`).join('')}
          </div>` : ''}

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

    // Grup okunmamış mesaj badge'lerini Firebase'den dinle
    if (window.firebaseDB && myGroups.length > 0) {
      watchGroupUnreadBadges(myGroups.map(g => g.id));
    }
  } catch(e) { pageContent.innerHTML = '<p>Hata oluştu</p>'; }
}

function renderGroupCard(g, showJoin = false) {
  const roleIcon = g.role === 'owner' ? '<i class="fas fa-crown" style="color:#ffc800;font-size:11px;margin-left:4px"></i>' :
                   g.role === 'moderator' ? '<i class="fas fa-shield-alt" style="color:#3ea6ff;font-size:11px;margin-left:4px"></i>' : '';
  return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--yt-spec-raised-background);border-radius:12px;margin-bottom:8px;cursor:pointer;transition:background 0.2s" onclick="openGroup(${g.id})" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='var(--yt-spec-raised-background)'">
      <div style="position:relative;flex-shrink:0">
        <img src="${g.photo_url || 'data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=48 height=48%3E%3Ccircle cx=24 cy=24 r=24 fill=%23333/%3E%3C/svg%3E'}" style="width:48px;height:48px;border-radius:50%;object-fit:cover" />
        <span id="groupUnread_${g.id}" class="unread-badge" style="display:none;position:absolute;top:-3px;right:-3px;min-width:16px;height:16px;font-size:10px;padding:0 4px;"></span>
      </div>
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
  markGroupAsRead(groupId); // Okundu olarak işaretle
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
      <div style="display:flex;flex-direction:column;height:calc(100dvh - var(--ytd-masthead-height, 56px) - 60px);max-width:700px;overflow:hidden">
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
            ${isMember ? `<button onclick="joinVoiceRoom(${group.id},'${group.name.replace(/'/g,"\\'")}'); this.style.color='#1db954';" title="Sesli Sohbet" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:16px;padding:4px 8px" id="voiceJoinBtn_${group.id}"><i class="fas fa-headphones"></i></button>` : ''}
            <button onclick="showGroupMembersPanel(${group.id},${isOwner || isMod})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:16px;padding:4px 8px" id="groupMembersBtn"><i class="fas fa-users"></i></button>
            ${isOwner ? `<button onclick="showGroupSettings(${group.id})" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:16px;padding:4px 8px"><i class="fas fa-cog"></i></button>` : ''}
            ${isMember && !isOwner ? `<button onclick="leaveGroup(${group.id})" style="background:none;border:none;color:#ff4444;cursor:pointer;font-size:14px;padding:4px 8px"><i class="fas fa-sign-out-alt"></i></button>` : ''}
            ${!isMember ? `<button class="yt-btn" onclick="joinGroup(${group.id})" style="height:30px;padding:0 12px;font-size:12px">${group.is_private ? 'İstek Gönder' : 'Katıl'}</button>` : ''}
          </div>
        </div>

        <!-- Mesajlar -->
        <div id="groupMessages" style="flex:1;overflow-y:auto;padding:8px 4px;display:flex;flex-direction:column;gap:6px;-webkit-overflow-scrolling:touch">
          <div class="yt-loading"><div class="yt-spinner"></div></div>
        </div>

        <!-- Mesaj Gönder -->
        ${isMember ? `
          <div style="padding:8px 12px 12px;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;background:var(--yt-spec-base-background)">
            ${canWrite ? `
              <div style="display:flex;align-items:center;gap:8px;background:var(--yt-spec-input-background, rgba(255,255,255,0.06));border-radius:28px;padding:6px 6px 6px 14px;border:1px solid var(--yt-spec-border, rgba(255,255,255,0.1))">
                <textarea id="groupMsgInput" placeholder="Mesaj yaz..." style="flex:1;background:none;border:none;outline:none;color:var(--yt-spec-text-primary);font-size:15px;resize:none;min-height:22px;max-height:120px;line-height:1.5;padding:0;font-family:inherit" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendGroupMessage(${group.id})}" oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"></textarea>
                <input type="file" id="groupPhotoInput" accept="image/*" style="display:none" onchange="uploadGroupPhoto(${group.id},this)" />
                <button onclick="sendGroupPhoto(${group.id})" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:18px;padding:4px 6px;flex-shrink:0;-webkit-tap-highlight-color:transparent"><i class="fas fa-image"></i></button>
                <button onclick="sendGroupMessage(${group.id})" style="width:38px;height:38px;background:var(--yt-spec-brand-background-solid);border:none;border-radius:50%;color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent"><i class="fas fa-paper-plane"></i></button>
              </div>
            ` : `<p style="text-align:center;font-size:13px;color:var(--yt-spec-text-secondary);padding:8px 0">${isMuted ? '🔇 Susturuldunuz' : 'Mesaj gönderme kapalı'}</p>`}
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

  // Seçim modu state
  let selectMode = false;
  let selectedMsgs = new Set();

  const msgsRef = window.firebaseRef(window.firebaseDB, `group_chats/${groupId}/messages`);
  window.firebaseOnValue(msgsRef, snap => {
    const msgs = [];
    snap.forEach(child => { msgs.push({ id: child.key, ...child.val() }); });
    
    if (!msgs.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--yt-spec-text-secondary);padding:40px 0;font-size:13px">Henüz mesaj yok</p>';
      return;
    }

    // Seçim toolbar'ı
    let toolbar = document.getElementById('groupSelectToolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'groupSelectToolbar';
      toolbar.style.cssText = 'display:none;position:sticky;top:0;background:var(--yt-spec-raised-background);padding:8px 12px;border-radius:10px;margin-bottom:8px;display:none;align-items:center;gap:8px;z-index:10';
      toolbar.innerHTML = `
        <span id="groupSelectCount" style="flex:1;font-size:13px;font-weight:500">0 seçildi</span>
        <button onclick="deleteGroupSelected('${groupId}')" style="background:rgba(255,0,0,0.15);border:1px solid rgba(255,0,0,0.3);color:#ff4444;padding:5px 12px;border-radius:8px;cursor:pointer;font-size:12px">Sil</button>
        <button onclick="exitGroupSelectMode()" style="background:rgba(255,255,255,0.08);border:none;color:var(--yt-spec-text-secondary);padding:5px 12px;border-radius:8px;cursor:pointer;font-size:12px">İptal</button>
      `;
      container.parentNode.insertBefore(toolbar, container);
    }

    function updateToolbar() {
      toolbar.style.display = selectedMsgs.size > 0 ? 'flex' : 'none';
      const cnt = document.getElementById('groupSelectCount');
      if (cnt) cnt.textContent = selectedMsgs.size + ' seçildi';
    }

    function exitGroupSelectMode() {
      selectMode = false;
      selectedMsgs.clear();
      toolbar.style.display = 'none';
      container.querySelectorAll('.gmsg').forEach(el => {
        el.classList.remove('gmsg-selected');
        const chk = el.querySelector('.gmsg-chk');
        if (chk) chk.style.display = 'none';
      });
    }
    window.exitGroupSelectMode = exitGroupSelectMode;

    async function deleteGroupSelected(gId) {
      if (!selectedMsgs.size) return;
      const isOwnerOrMod = members.find(m => m.user_id === currentUser.id && ['owner','moderator'].includes(m.role));
      
      // Seçilenler arasında başkasının mesajı var mı?
      const hasOthers = [...selectedMsgs].some(id => {
        const msg = msgs.find(m => m.id === id);
        return msg && msg.senderId != currentUser.id;
      });
      const allMine = !hasOthers;

      if (allMine) {
        // Hepsi benim → seçenek sun: benden sil veya herkesten sil
        const menu = document.createElement('div');
        menu.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--yt-spec-raised-background);border-radius:14px;padding:20px;z-index:9999;min-width:240px;box-shadow:0 8px 32px rgba(0,0,0,0.5)';
        menu.innerHTML = `
          <p style="font-size:14px;font-weight:600;margin-bottom:14px">${selectedMsgs.size} mesajı sil</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button onclick="doDeleteGroupMsgs('${gId}','me');this.closest('div[style]').remove()" style="padding:10px;background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.3);border-radius:8px;color:#ff4444;cursor:pointer;font-size:13px;text-align:left"><i class="fas fa-trash" style="margin-right:8px"></i>Benden Sil</button>
            <button onclick="doDeleteGroupMsgs('${gId}','all');this.closest('div[style]').remove()" style="padding:10px;background:rgba(255,0,0,0.2);border:1px solid rgba(255,0,0,0.4);border-radius:8px;color:#ff4444;cursor:pointer;font-size:13px;text-align:left;font-weight:600"><i class="fas fa-trash-alt" style="margin-right:8px"></i>Herkesten Sil</button>
            <button onclick="this.closest('div[style]').remove()" style="padding:10px;background:rgba(255,255,255,0.06);border:none;border-radius:8px;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:13px">İptal</button>
          </div>`;
        document.body.appendChild(menu);
        setTimeout(() => document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.remove(); }, { once: true }), 100);
      } else {
        // Karışık seçim (başkasının mesajı da var) → sadece benden sil
        // Kendi mesajlarım: benden sil, başkasının mesajları: sadece benim görünümümden gizle
        await doDeleteGroupMsgs(gId, 'me');
      }
    }
    window.deleteGroupSelected = deleteGroupSelected;

    async function doDeleteGroupMsgs(gId, type) {
      const promises = [];
      for (const msgId of selectedMsgs) {
        const msg = msgs.find(m => m.id === msgId);
        if (!msg) continue;
        const ref = window.firebaseRef(window.firebaseDB, `group_chats/${gId}/messages/${msgId}`);
        const isMyMsg = msg.senderId == currentUser.id;
        
        if (type === 'all' && isMyMsg) {
          // Herkesten sil: sadece kendi mesajlarımı herkesten silebilirim
          promises.push(window.firebaseUpdate(ref, { deletedForAll: true, text: null, imageUrl: null }));
        } else {
          // Benden sil: sadece benim görünümümden gizle
          const hidden = msg.hiddenFor || [];
          if (!hidden.includes(String(currentUser.id))) hidden.push(String(currentUser.id));
          promises.push(window.firebaseUpdate(ref, { hiddenFor: hidden }));
        }
      }
      await Promise.all(promises);
      exitGroupSelectMode();
      showToast(promises.length + ' mesaj silindi', 'success');
    }
    window.doDeleteGroupMsgs = doDeleteGroupMsgs;

    const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;

    container.innerHTML = msgs.map(msg => {
      // Silinmiş veya gizlenmiş mesajları filtrele
      if (msg.deletedForAll) return `<div style="text-align:center;padding:4px 0"><span style="font-size:11px;color:var(--yt-spec-text-secondary);font-style:italic">Mesaj silindi</span></div>`;
      const hiddenFor = msg.hiddenFor || [];
      if (hiddenFor.includes(String(currentUser.id))) return '';

      const isMe = msg.senderId == currentUser.id;
      const sender = memberMap[msg.senderId];
      const senderName = sender?.nickname || 'Kullanıcı';
      const senderPhoto = getProfilePhotoUrl(sender?.profile_photo);
      const senderRole = sender?.role;
      const roleIcon = senderRole === 'owner' ? '<i class="fas fa-crown" style="color:#ffc800;font-size:10px;margin-left:3px"></i>' :
                       senderRole === 'moderator' ? '<i class="fas fa-shield-alt" style="color:#3ea6ff;font-size:10px;margin-left:3px"></i>' : '';
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'}) : '';

      return `
        <div class="gmsg" data-id="${msg.id}" data-sender="${msg.senderId}" style="display:flex;gap:8px;align-items:flex-start;${isMe ? 'flex-direction:row-reverse' : ''};padding:2px 4px;border-radius:8px;cursor:pointer;transition:background 0.15s"
          onclick="handleGroupMsgClick(this,'${msg.id}','${groupId}')"
          oncontextmenu="event.preventDefault();showGroupMsgMenu(event,'${msg.id}','${groupId}',${isMe})"
          ontouchstart="startGroupMsgLongPress(event,this,'${msg.id}','${groupId}',${isMe})"
          ontouchend="clearGroupMsgLongPress()">
          <div class="gmsg-chk" style="display:none;align-self:center;width:20px;height:20px;border-radius:50%;border:2px solid var(--yt-spec-brand-background-solid);flex-shrink:0;background:transparent;transition:all 0.15s"></div>
          ${!isMe ? `<img src="${senderPhoto}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-top:2px" />` : ''}
          <div style="max-width:70%;${isMe ? 'align-items:flex-end' : 'align-items:flex-start'};display:flex;flex-direction:column;gap:2px">
            ${!isMe ? `<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px"><span style="font-size:11px;font-weight:600;color:var(--yt-spec-text-secondary)">${senderName}</span>${roleIcon}</div>` : ''}
            ${msg.imageUrl ? `<img src="${msg.imageUrl}" style="max-width:200px;border-radius:10px;cursor:pointer" onclick="event.stopPropagation();window.open('${msg.imageUrl}')" />` : ''}
            ${msg.text ? `<div style="background:${isMe ? 'var(--yt-spec-brand-background-solid)' : 'var(--yt-spec-raised-background)'};padding:8px 12px;border-radius:${isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};font-size:14px;line-height:1.4;word-break:break-word">${decodeURIComponent(msg.text)}</div>` : ''}
            <span style="font-size:10px;color:var(--yt-spec-text-secondary)">${time}</span>
          </div>
        </div>`;
    }).join('');

    // Seçim modunu koru
    if (selectMode) {
      container.querySelectorAll('.gmsg').forEach(el => {
        const chk = el.querySelector('.gmsg-chk');
        if (chk) chk.style.display = 'flex';
        if (selectedMsgs.has(el.dataset.id)) {
          el.classList.add('gmsg-selected');
          el.style.background = 'rgba(255,0,51,0.08)';
          if (chk) { chk.style.background = 'var(--yt-spec-brand-background-solid)'; chk.innerHTML = '<i class="fas fa-check" style="font-size:10px;color:#fff;margin:auto"></i>'; }
        }
      });
    }

    if (wasAtBottom) container.scrollTop = container.scrollHeight;
  });

  // Tıklama handler
  window.handleGroupMsgClick = function(el, msgId, gId) {
    if (!selectMode) return;
    const chk = el.querySelector('.gmsg-chk');
    if (selectedMsgs.has(msgId)) {
      selectedMsgs.delete(msgId);
      el.classList.remove('gmsg-selected');
      el.style.background = '';
      if (chk) { chk.style.background = 'transparent'; chk.innerHTML = ''; }
    } else {
      selectedMsgs.add(msgId);
      el.classList.add('gmsg-selected');
      el.style.background = 'rgba(255,0,51,0.08)';
      if (chk) { chk.style.background = 'var(--yt-spec-brand-background-solid)'; chk.innerHTML = '<i class="fas fa-check" style="font-size:10px;color:#fff;margin:auto;display:flex;align-items:center;justify-content:center;width:100%;height:100%"></i>'; }
    }
    updateToolbar();
  };

  // Sağ tık / uzun basma menüsü
  window.showGroupMsgMenu = function(event, msgId, gId, isMe) {
    document.getElementById('groupMsgCtxMenu')?.remove();
    const menu = document.createElement('div');
    menu.id = 'groupMsgCtxMenu';
    menu.style.cssText = `position:fixed;top:${Math.min(event.clientY, window.innerHeight-160)}px;left:${Math.min(event.clientX, window.innerWidth-180)}px;background:var(--yt-spec-raised-background);border-radius:10px;padding:6px 0;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:9999;min-width:170px`;
    const items = [
      { icon:'fa-check-square', text:'Seç', action:`enterGroupSelectMode('${msgId}','${gId}')` },
      ...(isMe ? [
        { icon:'fa-trash', text:'Benden Sil', action:`quickDeleteGroupMsg('${gId}','${msgId}','me')` },
        { icon:'fa-trash-alt', text:'Herkesten Sil', action:`quickDeleteGroupMsg('${gId}','${msgId}','all')` }
      ] : [
        { icon:'fa-trash', text:'Benden Sil', action:`quickDeleteGroupMsg('${gId}','${msgId}','me')` }
      ])
    ];
    menu.innerHTML = items.map(i => `<div onclick="${i.action};document.getElementById('groupMsgCtxMenu')?.remove()" style="padding:10px 16px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:10px" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background=''"><i class="fas ${i.icon}" style="width:16px;color:var(--yt-spec-text-secondary)"></i>${i.text}</div>`).join('');
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 50);
  };

  // Seçim moduna gir
  window.enterGroupSelectMode = function(msgId, gId) {
    selectMode = true;
    selectedMsgs.clear();
    selectedMsgs.add(msgId);
    container.querySelectorAll('.gmsg').forEach(el => {
      const chk = el.querySelector('.gmsg-chk');
      if (chk) chk.style.display = 'flex';
      if (el.dataset.id === msgId) {
        el.classList.add('gmsg-selected');
        el.style.background = 'rgba(255,0,51,0.08)';
        if (chk) { chk.style.background = 'var(--yt-spec-brand-background-solid)'; chk.innerHTML = '<i class="fas fa-check" style="font-size:10px;color:#fff;margin:auto;display:flex;align-items:center;justify-content:center;width:100%;height:100%"></i>'; }
      }
    });
    updateToolbar();
  };

  // Tek mesaj hızlı sil
  window.quickDeleteGroupMsg = async function(gId, msgId, type) {
    const ref = window.firebaseRef(window.firebaseDB, `group_chats/${gId}/messages/${msgId}`);
    if (type === 'all') {
      await window.firebaseUpdate(ref, { deletedForAll: true, text: null, imageUrl: null });
    } else {
      const snap = await window.firebaseGet ? window.firebaseGet(ref) : null;
      const msg = snap?.val() || {};
      const hidden = msg.hiddenFor || [];
      if (!hidden.includes(String(currentUser.id))) hidden.push(String(currentUser.id));
      await window.firebaseUpdate(ref, { hiddenFor: hidden });
    }
    showToast('Mesaj silindi', 'success');
  };

  // Uzun basma (mobil)
  let longPressTimer = null;
  window.startGroupMsgLongPress = function(event, el, msgId, gId, isMe) {
    longPressTimer = setTimeout(() => {
      const touch = event.touches[0];
      showGroupMsgMenu({ clientX: touch.clientX, clientY: touch.clientY }, msgId, gId, isMe);
    }, 500);
  };
  window.clearGroupMsgLongPress = function() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  };
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

function sendGroupPhoto(groupId) {
  document.getElementById('groupPhotoInput')?.click();
}

async function uploadGroupPhoto(groupId, input) {
  const file = input.files[0];
  if (!file || !window.firebaseDB) return;
  
  showToast('Fotoğraf yükleniyor...', 'info');
  try {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`${API_URL}/upload-chat-photo`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.url) throw new Error('Yükleme başarısız');
    
    await window.firebasePush(window.firebaseRef(window.firebaseDB, `group_chats/${groupId}/messages`), {
      senderId: currentUser.id,
      imageUrl: data.url,
      timestamp: Date.now()
    });
    input.value = '';
    showToast('Fotoğraf gönderildi', 'success');
  } catch(e) {
    showToast('Fotoğraf gönderilemedi: ' + e.message, 'error');
    input.value = '';
  }
}

function showGroupMembersPanel(groupId, canManage = false) {
  fetch(`${API_URL}/groups/${groupId}/members`).then(r => r.json()).then(async members => {
    const myMember = members.find(m => m.user_id === currentUser.id);
    const myRole = myMember?.role || 'member';

    let requestsHtml = '';
    if (canManage) {
      const requests = await fetch(`${API_URL}/groups/${groupId}/requests`).then(r => r.json()).catch(() => []);
      if (requests.length > 0) {
        requestsHtml = `
          <div style="margin-bottom:16px;padding:12px;background:rgba(255,0,51,0.08);border:1px solid rgba(255,0,51,0.2);border-radius:10px">
            <p style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--yt-spec-brand-background-solid)"><i class="fas fa-user-plus" style="margin-right:6px"></i>Katılma İstekleri (${requests.length})</p>
            ${requests.map(r => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--yt-spec-raised-background);border-radius:8px;margin-bottom:6px">
                <img src="${getProfilePhotoUrl(r.profile_photo)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover" />
                <div style="flex:1"><p style="font-size:13px;font-weight:500">${r.nickname}</p><p style="font-size:11px;color:var(--yt-spec-text-secondary)">@${r.username}</p></div>
                <button class="yt-btn" onclick="respondGroupRequest(${groupId},${r.id},'accepted');closeModal()" style="height:28px;padding:0 10px;font-size:12px">Kabul</button>
                <button class="yt-btn" onclick="respondGroupRequest(${groupId},${r.id},'rejected');closeModal()" style="height:28px;padding:0 10px;font-size:12px;background:rgba(255,255,255,0.08);color:var(--yt-spec-text-primary)">Red</button>
              </div>`).join('')}
          </div>`;
      }
    }

    showModal(`
      <h3 style="margin-bottom:16px">Üyeler (${members.length})</h3>
      ${requestsHtml}
      <div style="display:flex;flex-direction:column;gap:6px;max-height:350px;overflow-y:auto">
        ${members.map(m => {
          const roleIcon = m.role === 'owner' ? '<i class="fas fa-crown" style="color:#ffc800;font-size:11px;margin-left:4px"></i>' :
                           m.role === 'moderator' ? '<i class="fas fa-shield-alt" style="color:#3ea6ff;font-size:11px;margin-left:4px"></i>' : '';
          const canAct = canManage && m.user_id !== currentUser.id && m.role !== 'owner';
          return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;background:var(--yt-spec-raised-background)">
            <img src="${getProfilePhotoUrl(m.profile_photo)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" />
            <div style="flex:1"><div style="display:flex;align-items:center;gap:4px"><span style="font-size:13px;font-weight:500">${m.nickname}</span>${roleIcon}</div><span style="font-size:11px;color:var(--yt-spec-text-secondary)">@${m.username}</span></div>
            ${canAct ? `<button onclick="showMemberActions(${groupId},${m.user_id},'${m.nickname.replace(/'/g,"\\'")}','${m.role}','${myRole}');closeModal()" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;padding:4px 8px"><i class="fas fa-ellipsis-v"></i></button>` : ''}
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
  loadGroupsPage();
}

function showMemberActions(groupId, memberId, memberName, memberRole, myRole) {
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
      ${myRole === 'owner' ? `
      <button class="yt-btn" onclick="transferOwnership(${groupId},${memberId},'${memberName}');closeModal()" style="background:rgba(255,200,0,0.15);color:#ffc800;border:1px solid rgba(255,200,0,0.3)">
        <i class="fas fa-crown" style="margin-right:6px"></i>Yöneticilik Devret
      </button>` : ''}
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

async function showGroupSettings(groupId) {
  // Mevcut grup bilgilerini yükle
  const group = await fetch(`${API_URL}/groups/${groupId}?userId=${currentUser.id}`).then(r => r.json()).catch(() => null);
  if (!group) { showToast('Grup bilgileri alınamadı', 'error'); return; }

  showModal(`
    <h3 style="margin-bottom:16px">Grup Ayarları</h3>
    <div class="yt-form-group"><label class="yt-form-label">Grup Adı</label><input id="gsName" class="yt-input" placeholder="Grup adı" value="${(group.name || '').replace(/"/g,'&quot;')}" /></div>
    <div class="yt-form-group"><label class="yt-form-label">Açıklama</label><input id="gsDesc" class="yt-input" placeholder="Açıklama" value="${(group.description || '').replace(/"/g,'&quot;')}" /></div>
    <div class="yt-form-group">
      <label class="yt-checkbox-label"><input type="checkbox" id="gsPrivate" class="yt-checkbox" ${group.is_private ? 'checked' : ''} /><span>Özel Grup</span></label>
    </div>
    <div class="yt-form-group">
      <label class="yt-checkbox-label"><input type="checkbox" id="gsAllowMsg" class="yt-checkbox" ${group.allow_member_messages !== 0 ? 'checked' : ''} /><span>Üyeler mesaj yazabilir</span></label>
    </div>
    <div class="yt-form-group">
      <label class="yt-checkbox-label"><input type="checkbox" id="gsAllowPhoto" class="yt-checkbox" ${group.allow_member_photos !== 0 ? 'checked' : ''} /><span>Üyeler fotoğraf gönderebilir</span></label>
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
      currentUser.active_red_tick = false; // rozet seçilince kırmızı tik gider
      localStorage.setItem('Tea_user', JSON.stringify(currentUser));
      showToast('Rozet güncellendi', 'success');
      loadSettingsPage();
    }
  } catch(e) { showToast('Hata', 'error'); }
}

async function setRedVerifiedActive() {
  // Kırmızı tik seçilince rozet gider
  try {
    await fetch(`${API_URL}/user/${currentUser.id}/active-badge`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId: null })
    });
    currentUser.active_badge_id = null;
    currentUser.active_red_tick = true;
    localStorage.setItem('Tea_user', JSON.stringify(currentUser));
    showToast('Kırmızı tik aktif edildi', 'success');
    loadSettingsPage();
  } catch(e) { showToast('Hata', 'error'); }
}

// ==================== DUYURU SİSTEMİ ====================

async function loadActiveAnnouncements() {
  try {
    const r = await fetch(`${API_URL}/announcements/active`);
    const list = await r.json();
    if (!list.length) return;
    list.forEach(a => showAnnouncement(a));
  } catch(e) {}
}

function showAnnouncement(a) {
  // Aynı duyuru zaten gösteriliyorsa atla
  if (document.getElementById('ann_' + a.id)) return;

  const el = document.createElement('div');
  el.id = 'ann_' + a.id;
  el.style.cssText = `
    position:fixed; top:70px; left:50%; transform:translateX(-50%);
    background:linear-gradient(135deg,#ff0033,#cc0029);
    color:#fff; padding:12px 20px; border-radius:12px;
    font-size:14px; font-weight:500; z-index:9998;
    box-shadow:0 4px 20px rgba(255,0,51,0.4);
    max-width:90vw; min-width:280px; text-align:center;
    animation:slideDown 0.3s ease;
    display:flex; align-items:center; gap:12px;
  `;
  el.innerHTML = `
    <div style="flex:1">
      <p style="font-weight:700;margin-bottom:2px">${a.title}</p>
      <p style="font-size:13px;opacity:0.9">${a.content}</p>
    </div>
    <button onclick="document.getElementById('ann_${a.id}').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:14px;flex-shrink:0">×</button>
  `;
  document.body.appendChild(el);

  // Anlık duyuru 10 saniye sonra gitsin
  if (a.type === 'instant') {
    setTimeout(() => el.remove(), 10000);
  }
  // Süreli duyuru - kalan süre kadar
  else if (a.type === 'timed' && a.expires_at) {
    const remaining = new Date(a.expires_at) - new Date();
    if (remaining > 0) setTimeout(() => el.remove(), remaining);
    else el.remove();
  }
}

// CSS animasyonu ekle
const annStyle = document.createElement('style');
annStyle.textContent = '@keyframes slideDown{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}';
document.head.appendChild(annStyle);


// ==================== BUG/İSTEK SAYFASI ====================

async function loadBugReportsPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `<div class="yt-loading"><div class="yt-spinner"></div></div>`;

  try {
    const reports = await fetch(`${API_URL}/bug-reports`).then(r => r.json());

    pageContent.innerHTML = `
      <div class="bug-reports-page">
        <div class="bug-header">
          <h2><i class="fas fa-bug"></i> Bug & İstek Bildirimi</h2>
          <button class="yt-btn" onclick="showBugReportModal()">
            <i class="fas fa-plus"></i> Yeni Bildir
          </button>
        </div>

        <div class="bug-stats">
          <div class="bug-stat-card">
            <i class="fas fa-bug"></i>
            <div>
              <p class="stat-num">${reports.filter(r => r.type === 'bug').length}</p>
              <p class="stat-label">Bug</p>
            </div>
          </div>
          <div class="bug-stat-card">
            <i class="fas fa-lightbulb"></i>
            <div>
              <p class="stat-num">${reports.filter(r => r.type === 'feature').length}</p>
              <p class="stat-label">İstek</p>
            </div>
          </div>
          <div class="bug-stat-card">
            <i class="fas fa-check-circle"></i>
            <div>
              <p class="stat-num">${reports.filter(r => r.status === 'resolved').length}</p>
              <p class="stat-label">Çözüldü</p>
            </div>
          </div>
        </div>

        <div class="bug-list">
          ${reports.length === 0 ? '<p class="empty-state">Henüz bildirim yok</p>' : reports.map(r => `
            <div class="bug-card ${r.status}">
              <div class="bug-card-header">
                <img src="${getProfilePhotoUrl(r.profile_photo)}" class="bug-avatar" />
                <div class="bug-user-info">
                  <p class="bug-user-name">${r.nickname}</p>
                  <p class="bug-time">${timeAgo(r.created_at)}</p>
                </div>
                <span class="bug-type-badge ${r.type}">
                  <i class="fas fa-${r.type === 'bug' ? 'bug' : 'lightbulb'}"></i>
                  ${r.type === 'bug' ? 'Bug' : 'İstek'}
                </span>
                <span class="bug-status-badge ${r.status}">
                  ${r.status === 'open' ? 'Açık' : r.status === 'in_progress' ? 'İnceleniyor' : 'Çözüldü'}
                </span>
              </div>
              <div class="bug-card-body">
                <h3 class="bug-title">${r.title}</h3>
                <p class="bug-description">${r.description}</p>
                ${r.photo_url ? `<img src="${r.photo_url}" class="bug-photo" onclick="showImageModal('${r.photo_url}')" />` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch(e) {
    pageContent.innerHTML = '<p class="error-state">Yüklenemedi</p>';
  }
}

function showBugReportModal() {
  const modalContent = `
    <div class="bug-modal">
      <div class="yt-form-group">
        <label class="yt-form-label">Bildirim Tipi</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <label class="upload-type-btn active" id="bugTypeBtn_bug" onclick="switchBugType('bug')">
            <input type="radio" name="bugType" value="bug" checked style="display:none;" />
            <i class="fas fa-bug" style="font-size:24px; margin-bottom:8px; color:#ff4444;"></i>
            <span>Bug</span>
            <small>Hata bildirimi</small>
          </label>
          <label class="upload-type-btn" id="bugTypeBtn_feature" onclick="switchBugType('feature')">
            <input type="radio" name="bugType" value="feature" style="display:none;" />
            <i class="fas fa-lightbulb" style="font-size:24px; margin-bottom:8px; color:#ffa500;"></i>
            <span>İstek</span>
            <small>Özellik isteği</small>
          </label>
        </div>
      </div>

      <div class="yt-form-group">
        <label class="yt-form-label">Başlık</label>
        <input type="text" id="bugTitle" class="yt-input" placeholder="Kısa ve açıklayıcı bir başlık" />
      </div>

      <div class="yt-form-group">
        <label class="yt-form-label">Açıklama</label>
        <textarea id="bugDescription" class="yt-textarea" placeholder="Detaylı açıklama..." style="min-height:150px;"></textarea>
      </div>

      <div class="yt-form-group">
        <label class="yt-form-label">Ekran Görüntüsü (Opsiyonel)</label>
        <input type="file" id="bugPhoto" class="yt-input" accept="image/*" />
      </div>

      <div style="display:flex; gap:12px; margin-top:20px;">
        <button class="yt-btn" onclick="submitBugReport()">
          <i class="fas fa-paper-plane"></i> Gönder
        </button>
        <button class="yt-btn yt-btn-secondary" onclick="closeModal()">İptal</button>
      </div>
    </div>
  `;
  showModal(modalContent, 'Bug/İstek Bildirimi');
}

function switchBugType(type) {
  ['bug','feature'].forEach(t => {
    const btn = document.getElementById(`bugTypeBtn_${t}`);
    if (btn) btn.classList.toggle('active', t === type);
  });
}

async function submitBugReport() {
  const type = document.querySelector('input[name="bugType"]:checked')?.value || 'bug';
  const title = document.getElementById('bugTitle').value.trim();
  const description = document.getElementById('bugDescription').value.trim();
  const photoFile = document.getElementById('bugPhoto').files[0];

  if (!title || !description) {
    showToast('Başlık ve açıklama gerekli', 'error');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('userId', currentUser.id);
    formData.append('type', type);
    formData.append('title', title);
    formData.append('description', description);
    if (photoFile) formData.append('photo', photoFile);

    await fetch(`${API_URL}/bug-report`, { method: 'POST', body: formData });
    showToast('Bildiriminiz alındı!', 'success');
    closeModal();
    loadBugReportsPage();
  } catch(e) {
    showToast('Hata: ' + e.message, 'error');
  }
}

// ==================== YENİLİKLER SAYFASI ====================

async function loadAnnouncementsPage() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = `<div class="yt-loading"><div class="yt-spinner"></div></div>`;

  try {
    const announcements = await fetch(`${API_URL}/announcements`).then(r => r.json());

    pageContent.innerHTML = `
      <div class="announcements-page">
        <div class="announcements-header">
          <h2><i class="fas fa-bullhorn"></i> Yenilikler</h2>
          ${currentUser.id === 1 ? '<button class="yt-btn" onclick="showAnnouncementModal()"><i class="fas fa-plus"></i> Yeni Ekle</button>' : ''}
        </div>

        <div class="announcements-list">
          ${announcements.length === 0 ? '<p class="empty-state">Henüz yenilik yok</p>' : announcements.map(a => `
            <div class="announcement-card">
              <div class="announcement-header">
                <img src="logoteatube.png" class="announcement-avatar" />
                <div class="announcement-user-info">
                  <p class="announcement-user-name">TeaTube Admin</p>
                  <p class="announcement-time">${timeAgo(a.created_at)}</p>
                </div>
                ${currentUser.id === 1 ? `<button class="yt-btn yt-btn-secondary" onclick="deleteAnnouncement(${a.id})" style="margin-left:auto;"><i class="fas fa-trash"></i></button>` : ''}
              </div>
              <div class="announcement-body">
                <h3 class="announcement-title">${a.title}</h3>
                <p class="announcement-content">${a.content.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch(e) {
    pageContent.innerHTML = '<p class="error-state">Yüklenemedi</p>';
  }
}

function showAnnouncementModal() {
  const modalContent = `
    <div class="announcement-modal">
      <div class="yt-form-group">
        <label class="yt-form-label">Başlık</label>
        <input type="text" id="announcementTitle" class="yt-input" placeholder="Yenilik başlığı" />
      </div>

      <div class="yt-form-group">
        <label class="yt-form-label">İçerik</label>
        <textarea id="announcementContent" class="yt-textarea" placeholder="Yenilik detayları..." style="min-height:200px;"></textarea>
      </div>

      <div style="display:flex; gap:12px; margin-top:20px;">
        <button class="yt-btn" onclick="submitAnnouncement()">
          <i class="fas fa-bullhorn"></i> Yayınla
        </button>
        <button class="yt-btn yt-btn-secondary" onclick="closeModal()">İptal</button>
      </div>
    </div>
  `;
  showModal(modalContent, 'Yeni Yenilik');
}

async function submitAnnouncement() {
  const title = document.getElementById('announcementTitle').value.trim();
  const content = document.getElementById('announcementContent').value.trim();

  if (!title || !content) {
    showToast('Başlık ve içerik gerekli', 'error');
    return;
  }

  try {
    await fetch(`${API_URL}/announcement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    showToast('Yenilik yayınlandı!', 'success');
    closeModal();
    loadAnnouncementsPage();
  } catch(e) {
    showToast('Hata: ' + e.message, 'error');
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Bu yeniliği silmek istediğinize emin misiniz?')) return;
  try {
    await fetch(`${API_URL}/announcement/${id}`, { method: 'DELETE' });
    showToast('Yenilik silindi', 'success');
    loadAnnouncementsPage();
  } catch(e) {
    showToast('Hata: ' + e.message, 'error');
  }
}

function showImageModal(url) {
  const modalContent = `<img src="${url}" style="width:100%; border-radius:12px;" />`;
  showModal(modalContent, 'Görsel');
}


// ==================== ŞARKI DETAY SAYFASI ====================

async function showSongDetail(songId) {
  showPage('song-detail');
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:32px;"></i></div>';
  
  try {
    const res = await fetch(`${API_URL}/music/song/${songId}`);
    const song = await res.json();
    
    if (!song || song.error) {
      pageContent.innerHTML = '<div style="text-align:center;padding:40px;color:var(--yt-spec-text-secondary);">Şarkı bulunamadı</div>';
      return;
    }
    
    pageContent.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:20px;">
        <button onclick="showPage('ts-music')" style="background:none;border:none;color:var(--yt-spec-text-secondary);cursor:pointer;font-size:14px;margin-bottom:16px;display:flex;align-items:center;gap:6px;">
          <i class="fas fa-arrow-left"></i> Geri
        </button>
        
        <div style="display:flex;gap:24px;margin-bottom:32px;flex-wrap:wrap;">
          <img src="${song.cover_url}" style="width:200px;height:200px;border-radius:12px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.3);" onerror="this.src='logoteatube.png'" />
          
          <div style="flex:1;min-width:250px;">
            <h1 style="font-size:28px;font-weight:700;margin:0 0 8px;color:var(--yt-spec-text-primary);">${song.title}</h1>
            <p style="font-size:16px;color:var(--yt-spec-text-secondary);margin:0 0 16px;">
              <i class="fas fa-microphone" style="margin-right:6px;"></i>${song.artist_name}
            </p>
            
            ${song.genre ? `<p style="font-size:14px;color:var(--yt-spec-text-secondary);margin:0 0 8px;">
              <i class="fas fa-tag" style="margin-right:6px;"></i>Tür: ${song.genre}
            </p>` : ''}
            
            ${song.show_play_count ? `<p style="font-size:14px;color:var(--yt-spec-text-secondary);margin:0 0 16px;">
              <i class="fas fa-play" style="margin-right:6px;"></i>${song.play_count || 0} dinlenme
            </p>` : ''}
            
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <button onclick="playSong(${song.id})" class="yt-btn" style="background:#1db954;color:#000;font-weight:700;">
                <i class="fas fa-play" style="margin-right:6px;"></i>Çal
              </button>
              <button onclick="toggleSongLike(${song.id})" class="yt-btn" style="background:rgba(255,255,255,0.08);">
                <i class="fas fa-heart"></i>
              </button>
            </div>
          </div>
        </div>
        
        ${song.lyrics ? `
          <div style="background:var(--yt-spec-raised-background);padding:20px;border-radius:12px;margin-bottom:24px;">
            <h3 style="font-size:18px;font-weight:600;margin:0 0 16px;color:var(--yt-spec-text-primary);">
              <i class="fas fa-align-left" style="margin-right:8px;"></i>Şarkı Sözleri
            </h3>
            <div style="white-space:pre-wrap;color:var(--yt-spec-text-secondary);line-height:1.8;">
              ${song.lyrics}
            </div>
          </div>
        ` : ''}
        
        <div style="background:var(--yt-spec-raised-background);padding:20px;border-radius:12px;">
          <h3 style="font-size:18px;font-weight:600;margin:0 0 16px;color:var(--yt-spec-text-primary);">
            <i class="fas fa-info-circle" style="margin-right:8px;"></i>Detaylar
          </h3>
          <div style="display:grid;gap:12px;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="color:var(--yt-spec-text-secondary);">Sanatçı</span>
              <span style="color:var(--yt-spec-text-primary);font-weight:500;" onclick="showArtistProfile(${song.artist_id})" style="cursor:pointer;color:#1db954;">${song.artist_name}</span>
            </div>
            ${song.genre ? `
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="color:var(--yt-spec-text-secondary);">Tür</span>
                <span style="color:var(--yt-spec-text-primary);font-weight:500;">${song.genre}</span>
              </div>
            ` : ''}
            ${song.company_name ? `
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="color:var(--yt-spec-text-secondary);">Şirket</span>
                <span style="color:var(--yt-spec-text-primary);font-weight:500;">${song.company_name}</span>
              </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;padding:8px 0;">
              <span style="color:var(--yt-spec-text-secondary);">Yüklenme Tarihi</span>
              <span style="color:var(--yt-spec-text-primary);font-weight:500;">${new Date(song.created_at).toLocaleDateString('tr-TR')}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch(err) {
    console.error('Şarkı detayı yüklenemedi:', err);
    pageContent.innerHTML = '<div style="text-align:center;padding:40px;color:var(--yt-spec-text-secondary);">Şarkı yüklenemedi</div>';
  }
}

// Şarkı beğeni toggle
async function toggleSongLike(songId) {
  try {
    const res = await fetch(`${API_URL}/music/song/${songId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
    const data = await res.json();
    if (data.liked !== undefined) {
      showToast(data.liked ? 'Şarkı beğenildi' : 'Beğeni kaldırıldı');
    }
  } catch(err) {
    console.error('Beğeni hatası:', err);
  }
}

// Sanatçı profiline git
function showArtistProfile(artistId) {
  // Mevcut artist profil fonksiyonunu kullan
  showPage('artist-profile');
  loadArtistProfile(artistId);
}
