// DemlikChat - Discord Clone for TeaTube
// Tam fonksiyonel Discord benzeri chat uygulaması

const API_URL = window.location.origin;
let socket = null;
let currentUser = null;
let currentServer = 'home';
let currentChannel = 'general';
let currentChannelType = 'text';
let voiceConnection = null;
let localStream = null;
let peers = {};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  const savedUser = localStorage.getItem('dcUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showMainApp();
  }
  
  setupAuthListeners();
  setupAppListeners();
});

// ==================== AUTH ====================

function setupAuthListeners() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tabName}-form`).classList.add('active');
    });
  });
  
  // Login
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('login-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  
  // Register
  document.getElementById('register-btn').addEventListener('click', handleRegister);
  document.getElementById('register-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
}

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!username || !password) {
    showToast('Lütfen tüm alanları doldurun', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/dc/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('dcUser', JSON.stringify(currentUser));
      showToast('Giriş başarılı!', 'success');
      showMainApp();
    } else {
      showToast(data.error || 'Giriş başarısız', 'error');
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

async function handleRegister() {
  const username = document.getElementById('register-username').value.trim();
  const displayName = document.getElementById('register-display-name').value.trim();
  const password = document.getElementById('register-password').value;
  
  if (!username || !password) {
    showToast('Kullanıcı adı ve şifre gerekli', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/dc/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName: displayName || username })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
      // Switch to login tab
      document.querySelector('.auth-tab[data-tab="login"]').click();
      document.getElementById('login-username').value = username;
    } else {
      showToast(data.error || 'Kayıt başarısız', 'error');
    }
  } catch (err) {
    console.error('Register error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

function logout() {
  localStorage.removeItem('dcUser');
  currentUser = null;
  if (socket) socket.disconnect();
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('main-app').style.display = 'none';
  showToast('Çıkış yapıldı', 'info');
}

// ==================== MAIN APP ====================

function showMainApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  
  // Update user info
  document.getElementById('user-name').textContent = currentUser.displayName || currentUser.username;
  
  // Initialize Socket.IO
  initSocket();
  
  // Load initial data
  loadServers();
  loadChannels();
  loadMembers();
}

function setupAppListeners() {
  // Mobile menu toggle
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('channel-sidebar').classList.toggle('mobile-open');
  });
  
  // Members toggle
  document.getElementById('members-toggle-btn')?.addEventListener('click', () => {
    document.getElementById('members-sidebar').classList.toggle('mobile-open');
  });
  
  // Message input
  const messageInput = document.getElementById('message-input');
  messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Settings button
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    showSettingsModal();
  });
  
  // Add server button
  document.getElementById('add-server-btn')?.addEventListener('click', () => {
    showCreateServerModal();
  });
  
  // Channel items
  document.addEventListener('click', (e) => {
    const channelItem = e.target.closest('.channel-item');
    if (channelItem) {
      const channelId = channelItem.dataset.channel;
      const channelType = channelItem.dataset.type;
      switchChannel(channelId, channelType);
    }
  });
  
  // Voice controls
  document.getElementById('voice-disconnect-btn')?.addEventListener('click', disconnectVoice);
  document.getElementById('voice-mute-btn')?.addEventListener('click', toggleMute);
  document.getElementById('voice-deafen-btn')?.addEventListener('click', toggleDeafen);
}

// ==================== SOCKET.IO ====================

function initSocket() {
  socket = io(API_URL);
  
  socket.on('connect', () => {
    console.log('Socket connected');
    socket.emit('join', currentUser.id);
  });
  
  socket.on('new_message', (message) => {
    if (message.channel === currentChannel) {
      displayMessage(message);
    }
  });
  
  socket.on('user_joined_voice', (data) => {
    updateVoiceUsers(data.channel, data.users);
  });
  
  socket.on('user_left_voice', (data) => {
    updateVoiceUsers(data.channel, data.users);
  });
  
  socket.on('voice_signal', (data) => {
    handleVoiceSignal(data);
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
}

// ==================== SERVERS ====================

async function loadServers() {
  try {
    const res = await fetch(`${API_URL}/api/dc/servers/${currentUser.id}`);
    const data = await res.json();
    
    if (data.success) {
      renderServers(data.servers);
    }
  } catch (err) {
    console.error('Load servers error:', err);
  }
}

function renderServers(servers) {
  const serverList = document.querySelector('.server-list-scroll');
  const addServerBtn = document.getElementById('add-server-btn');
  
  // Remove existing server items (except home, separator, add, discover)
  const existingServers = serverList.querySelectorAll('.server-item:not(.add-server):not([data-server="home"])');
  existingServers.forEach(item => {
    if (!item.id) item.remove();
  });
  
  // Add servers before the separator
  const separator = serverList.querySelector('.server-separator');
  servers.forEach(server => {
    const serverItem = document.createElement('div');
    serverItem.className = 'server-item';
    serverItem.dataset.server = server.id;
    serverItem.title = server.name;
    serverItem.innerHTML = `
      <div class="server-icon">
        ${server.icon ? `<img src="${server.icon}" style="width:100%;height:100%;object-fit:cover;">` : server.name.charAt(0).toUpperCase()}
      </div>
    `;
    serverItem.addEventListener('click', () => switchServer(server.id));
    serverList.insertBefore(serverItem, separator);
  });
}

function switchServer(serverId) {
  currentServer = serverId;
  document.querySelectorAll('.server-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`.server-item[data-server="${serverId}"]`)?.classList.add('active');
  
  loadChannels();
  loadMembers();
}

async function showCreateServerModal() {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:8px;color:var(--header-primary);">Sunucu Oluştur</h2>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:24px;">Sunucun topluluğun için bir ev. Arkadaşlarınla takıl ve konuş.</p>
      
      <div class="form-group">
        <label>SUNUCU ADI</label>
        <input type="text" id="server-name-input" placeholder="Sunucu adı" style="width:100%;padding:10px;background:var(--bg-tertiary);border:1px solid rgba(0,0,0,0.3);border-radius:4px;color:var(--text-normal);font-size:16px;">
      </div>
      
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button onclick="closeModal()" style="flex:1;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">İptal</button>
        <button onclick="createServer()" style="flex:1;padding:12px;background:var(--brand);border:none;border-radius:4px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Oluştur</button>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

async function createServer() {
  const name = document.getElementById('server-name-input').value.trim();
  if (!name) {
    showToast('Sunucu adı gerekli', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/dc/servers/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, name })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Sunucu oluşturuldu!', 'success');
      closeModal();
      loadServers();
    } else {
      showToast(data.error || 'Sunucu oluşturulamadı', 'error');
    }
  } catch (err) {
    console.error('Create server error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

// ==================== CHANNELS ====================

async function loadChannels() {
  try {
    const res = await fetch(`${API_URL}/api/dc/channels/${currentServer}`);
    const data = await res.json();
    
    if (data.success) {
      renderChannels(data.channels);
    }
  } catch (err) {
    console.error('Load channels error:', err);
  }
}

function renderChannels(channels) {
  // For now, use default channels
  // In full implementation, this would render dynamic channels from database
}

function switchChannel(channelId, channelType) {
  currentChannel = channelId;
  currentChannelType = channelType;
  
  document.querySelectorAll('.channel-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`.channel-item[data-channel="${channelId}"]`)?.classList.add('active');
  
  document.getElementById('current-channel-name').textContent = channelId;
  
  if (channelType === 'voice') {
    connectVoice(channelId);
  } else {
    loadMessages();
  }
}

// ==================== MESSAGES ====================

async function loadMessages() {
  try {
    const res = await fetch(`${API_URL}/api/dc/messages/${currentServer}/${currentChannel}`);
    const data = await res.json();
    
    if (data.success) {
      const container = document.getElementById('messages-container');
      container.innerHTML = '';
      data.messages.forEach(msg => displayMessage(msg));
      container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    console.error('Load messages error:', err);
  }
}

function displayMessage(message) {
  const container = document.getElementById('messages-container');
  const messageEl = document.createElement('div');
  messageEl.className = 'message-item';
  messageEl.style.cssText = 'display:flex;gap:16px;padding:8px 16px;margin:2px 0;transition:background 0.1s;';
  messageEl.innerHTML = `
    <div style="width:40px;height:40px;border-radius:50%;background:var(--brand);flex-shrink:0;overflow:hidden;">
      ${message.avatar ? `<img src="${message.avatar}" style="width:100%;height:100%;object-fit:cover;">` : ''}
    </div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
        <span style="font-weight:600;color:var(--header-primary);font-size:16px;">${message.username}</span>
        <span style="font-size:12px;color:var(--text-muted);">${formatTime(message.created_at)}</span>
      </div>
      <div style="color:var(--text-normal);font-size:16px;line-height:1.375;word-wrap:break-word;">${escapeHtml(message.content)}</div>
    </div>
  `;
  
  messageEl.addEventListener('mouseenter', () => {
    messageEl.style.background = 'var(--background-modifier-hover)';
  });
  messageEl.addEventListener('mouseleave', () => {
    messageEl.style.background = 'transparent';
  });
  
  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  
  if (!content) return;
  
  const message = {
    userId: currentUser.id,
    username: currentUser.displayName || currentUser.username,
    avatar: currentUser.avatar,
    server: currentServer,
    channel: currentChannel,
    content,
    created_at: new Date().toISOString()
  };
  
  socket.emit('send_message', message);
  input.value = '';
}

// ==================== MEMBERS ====================

async function loadMembers() {
  try {
    const res = await fetch(`${API_URL}/api/dc/members/${currentServer}`);
    const data = await res.json();
    
    if (data.success) {
      renderMembers(data.members);
    }
  } catch (err) {
    console.error('Load members error:', err);
  }
}

function renderMembers(members) {
  const onlineMembers = document.getElementById('online-members');
  const offlineMembers = document.getElementById('offline-members');
  
  onlineMembers.innerHTML = '';
  offlineMembers.innerHTML = '';
  
  let onlineCount = 0;
  let offlineCount = 0;
  
  members.forEach(member => {
    const memberEl = document.createElement('div');
    memberEl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;margin:2px 0;border-radius:4px;cursor:pointer;transition:background 0.1s;';
    memberEl.innerHTML = `
      <div style="position:relative;width:32px;height:32px;border-radius:50%;background:var(--brand);overflow:hidden;">
        ${member.avatar ? `<img src="${member.avatar}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        <div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:${member.online ? 'var(--green)' : 'var(--text-muted)'};border:3px solid var(--bg-secondary);"></div>
      </div>
      <span style="font-size:14px;color:var(--interactive-normal);">${member.displayName || member.username}</span>
    `;
    
    memberEl.addEventListener('mouseenter', () => {
      memberEl.style.background = 'var(--background-modifier-hover)';
    });
    memberEl.addEventListener('mouseleave', () => {
      memberEl.style.background = 'transparent';
    });
    
    if (member.online) {
      onlineMembers.appendChild(memberEl);
      onlineCount++;
    } else {
      offlineMembers.appendChild(memberEl);
      offlineCount++;
    }
  });
  
  document.querySelector('#online-members').previousElementSibling.querySelector('.role-count').textContent = onlineCount;
  document.querySelector('#offline-members').previousElementSibling.querySelector('.role-count').textContent = offlineCount;
  document.getElementById('member-count').textContent = members.length;
}

// ==================== VOICE CHAT ====================

async function connectVoice(channelId) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    socket.emit('join_voice', { userId: currentUser.id, channel: channelId });
    
    document.getElementById('voice-panel').style.display = 'block';
    document.getElementById('voice-channel-name').textContent = channelId;
    
    showToast('Sesli kanala bağlandı', 'success');
  } catch (err) {
    console.error('Voice connection error:', err);
    showToast('Mikrofon erişimi reddedildi', 'error');
  }
}

function disconnectVoice() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  Object.values(peers).forEach(peer => peer.destroy());
  peers = {};
  
  socket.emit('leave_voice', { userId: currentUser.id, channel: currentChannel });
  
  document.getElementById('voice-panel').style.display = 'none';
  showToast('Sesli kanaldan ayrıldı', 'info');
}

function toggleMute() {
  if (!localStream) return;
  
  const audioTrack = localStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
  
  const btn = document.getElementById('voice-mute-btn');
  btn.classList.toggle('active');
  btn.querySelector('i').className = audioTrack.enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
}

function toggleDeafen() {
  const btn = document.getElementById('voice-deafen-btn');
  btn.classList.toggle('active');
  
  Object.values(peers).forEach(peer => {
    if (peer.streams && peer.streams[0]) {
      peer.streams[0].getAudioTracks().forEach(track => {
        track.enabled = !btn.classList.contains('active');
      });
    }
  });
  
  btn.querySelector('i').className = btn.classList.contains('active') ? 'fas fa-volume-mute' : 'fas fa-headphones';
}

function handleVoiceSignal(data) {
  // WebRTC signaling for voice chat
  // Full implementation would use simple-peer library
  console.log('Voice signal received:', data);
}

function updateVoiceUsers(channel, users) {
  const voiceUsersEl = document.getElementById(`voice-users-${channel}`);
  if (voiceUsersEl) {
    voiceUsersEl.textContent = users.length > 0 ? users.length : '';
  }
}

// ==================== SETTINGS ====================

function showSettingsModal() {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:24px;color:var(--header-primary);">Ayarlar</h2>
      
      <div style="margin-bottom:24px;">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--header-secondary);">Kullanıcı Bilgileri</h3>
        <p style="font-size:14px;color:var(--text-muted);margin-bottom:8px;">Kullanıcı Adı: ${currentUser.username}</p>
        <p style="font-size:14px;color:var(--text-muted);">Görünen Ad: ${currentUser.displayName || currentUser.username}</p>
      </div>
      
      <div style="margin-bottom:24px;">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--header-secondary);">Tema</h3>
        <p style="font-size:14px;color:var(--text-muted);">Koyu tema aktif</p>
      </div>
      
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button onclick="closeModal()" style="flex:1;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">Kapat</button>
        <button onclick="logout()" style="flex:1;padding:12px;background:var(--red);border:none;border-radius:4px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Çıkış Yap</button>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

// ==================== UTILITIES ====================

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    background: var(--bg-tertiary);
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 8px 16px rgba(0,0,0,0.24);
    min-width: 300px;
    color: var(--text-normal);
    font-size: 14px;
    animation: slideIn 0.3s;
  `;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  const color = type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--brand)';
  
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:24px;height:24px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">${icon}</div>
      <span>${message}</span>
    </div>
  `;
  
  document.getElementById('toast-container').appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'şimdi';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} dakika önce`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
  
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal when clicking overlay
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});


// ==================== ÖZEL MESAJLAR (DM) ====================

let dmUsers = [];
let currentDM = null;

async function loadDMs() {
  try {
    const res = await fetch(`${API_URL}/api/dc/dms/${currentUser.id}`);
    const data = await res.json();
    
    if (data.success) {
      dmUsers = data.dms;
      renderDMList();
    }
  } catch (err) {
    console.error('Load DMs error:', err);
  }
}

function renderDMList() {
  // DM listesini sol sidebar'a ekle
  const channelList = document.querySelector('.channel-list');
  
  // DM kategorisi ekle
  let dmCategory = document.querySelector('.dm-category');
  if (!dmCategory) {
    dmCategory = document.createElement('div');
    dmCategory.className = 'channel-category dm-category';
    dmCategory.innerHTML = `
      <div class="category-header">
        <i class="fas fa-chevron-down"></i>
        <span>ÖZEL MESAJLAR</span>
      </div>
      <div class="category-channels dm-channels"></div>
    `;
    channelList.insertBefore(dmCategory, channelList.firstChild);
  }
  
  const dmChannels = dmCategory.querySelector('.dm-channels');
  dmChannels.innerHTML = '';
  
  dmUsers.forEach(dm => {
    const dmItem = document.createElement('div');
    dmItem.className = 'channel-item dm-item';
    dmItem.dataset.dmUser = dm.user_id;
    dmItem.innerHTML = `
      <div style="width:32px;height:32px;border-radius:50%;background:var(--brand);overflow:hidden;flex-shrink:0;">
        ${dm.avatar ? `<img src="${dm.avatar}" style="width:100%;height:100%;object-fit:cover;">` : ''}
      </div>
      <span>${dm.display_name || dm.username}</span>
      ${dm.unread_count > 0 ? `<span class="unread-badge">${dm.unread_count}</span>` : ''}
    `;
    dmItem.addEventListener('click', () => openDM(dm.user_id, dm.display_name || dm.username, dm.avatar));
    dmChannels.appendChild(dmItem);
  });
}

async function openDM(userId, displayName, avatar) {
  currentDM = { userId, displayName, avatar };
  currentChannelType = 'dm';
  
  // UI güncelle
  document.querySelectorAll('.channel-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`.dm-item[data-dm-user="${userId}"]`)?.classList.add('active');
  
  document.getElementById('current-channel-name').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:24px;height:24px;border-radius:50%;background:var(--brand);overflow:hidden;">
        ${avatar ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">` : ''}
      </div>
      <span>${displayName}</span>
    </div>
  `;
  
  // Mesajları yükle
  await loadDMMessages(userId);
}

async function loadDMMessages(userId) {
  try {
    const res = await fetch(`${API_URL}/api/dc/dm-messages/${currentUser.id}/${userId}`);
    const data = await res.json();
    
    if (data.success) {
      const container = document.getElementById('messages-container');
      container.innerHTML = '';
      data.messages.forEach(msg => displayMessage(msg));
      container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    console.error('Load DM messages error:', err);
  }
}

// ==================== ARKADAŞ SİSTEMİ ====================

let friends = [];
let friendRequests = [];

async function loadFriends() {
  try {
    const res = await fetch(`${API_URL}/api/dc/friends/${currentUser.id}`);
    const data = await res.json();
    
    if (data.success) {
      friends = data.friends;
      friendRequests = data.requests;
      renderFriendsList();
    }
  } catch (err) {
    console.error('Load friends error:', err);
  }
}

function showFriendsModal() {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;max-height:80vh;overflow-y:auto;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:24px;color:var(--header-primary);">Arkadaşlar</h2>
      
      <!-- Arkadaş Ekle -->
      <div style="margin-bottom:24px;padding:16px;background:var(--bg-secondary);border-radius:8px;">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--header-secondary);">ARKADAŞ EKLE</h3>
        <div style="display:flex;gap:8px;">
          <input type="text" id="friend-username-input" placeholder="Kullanıcı adı" style="flex:1;padding:10px;background:var(--bg-tertiary);border:1px solid rgba(0,0,0,0.3);border-radius:4px;color:var(--text-normal);font-size:14px;">
          <button onclick="sendFriendRequest()" style="padding:10px 20px;background:var(--brand);border:none;border-radius:4px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Gönder</button>
        </div>
      </div>
      
      <!-- Bekleyen İstekler -->
      ${friendRequests.length > 0 ? `
        <div style="margin-bottom:24px;">
          <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--header-secondary);">BEKLEYEN İSTEKLER — ${friendRequests.length}</h3>
          <div id="friend-requests-list"></div>
        </div>
      ` : ''}
      
      <!-- Arkadaşlar -->
      <div>
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--header-secondary);">TÜM ARKADAŞLAR — ${friends.length}</h3>
        <div id="friends-list"></div>
      </div>
      
      <div style="margin-top:24px;">
        <button onclick="closeModal()" style="width:100%;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">Kapat</button>
      </div>
    </div>
  `;
  
  // Render friend requests
  if (friendRequests.length > 0) {
    const requestsList = document.getElementById('friend-requests-list');
    friendRequests.forEach(req => {
      const reqEl = document.createElement('div');
      reqEl.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:8px;';
      reqEl.innerHTML = `
        <div style="width:40px;height:40px;border-radius:50%;background:var(--brand);overflow:hidden;">
          ${req.avatar ? `<img src="${req.avatar}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        </div>
        <div style="flex:1;">
          <div style="font-weight:600;color:var(--header-primary);">${req.display_name || req.username}</div>
          <div style="font-size:12px;color:var(--text-muted);">@${req.username}</div>
        </div>
        <button onclick="acceptFriendRequest(${req.id})" style="padding:8px 16px;background:var(--green);border:none;border-radius:4px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Kabul Et</button>
        <button onclick="rejectFriendRequest(${req.id})" style="padding:8px 16px;background:var(--red);border:none;border-radius:4px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Reddet</button>
      `;
      requestsList.appendChild(reqEl);
    });
  }
  
  // Render friends
  const friendsList = document.getElementById('friends-list');
  friends.forEach(friend => {
    const friendEl = document.createElement('div');
    friendEl.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:8px;';
    friendEl.innerHTML = `
      <div style="position:relative;width:40px;height:40px;border-radius:50%;background:var(--brand);overflow:hidden;">
        ${friend.avatar ? `<img src="${friend.avatar}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        <div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:${friend.online ? 'var(--green)' : 'var(--text-muted)'};border:3px solid var(--bg-tertiary);"></div>
      </div>
      <div style="flex:1;">
        <div style="font-weight:600;color:var(--header-primary);">${friend.display_name || friend.username}</div>
        <div style="font-size:12px;color:var(--text-muted);">${friend.online ? 'Çevrimiçi' : 'Çevrimdışı'}</div>
      </div>
      <button onclick="openDM(${friend.user_id}, '${friend.display_name || friend.username}', '${friend.avatar || ''}'); closeModal();" style="padding:8px 16px;background:var(--brand);border:none;border-radius:4px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Mesaj Gönder</button>
      <button onclick="removeFriend(${friend.user_id})" style="padding:8px 16px;background:var(--red);border:none;border-radius:4px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Kaldır</button>
    `;
    friendsList.appendChild(friendEl);
  });
  
  document.getElementById('modal-overlay').classList.add('active');
}

async function sendFriendRequest() {
  const username = document.getElementById('friend-username-input').value.trim();
  if (!username) {
    showToast('Kullanıcı adı gerekli', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/dc/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, targetUsername: username })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Arkadaşlık isteği gönderildi!', 'success');
      document.getElementById('friend-username-input').value = '';
    } else {
      showToast(data.error || 'İstek gönderilemedi', 'error');
    }
  } catch (err) {
    console.error('Send friend request error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

async function acceptFriendRequest(requestId) {
  try {
    const res = await fetch(`${API_URL}/api/dc/friends/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Arkadaşlık kabul edildi!', 'success');
      loadFriends();
      closeModal();
      setTimeout(() => showFriendsModal(), 300);
    } else {
      showToast(data.error || 'Kabul edilemedi', 'error');
    }
  } catch (err) {
    console.error('Accept friend request error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

async function rejectFriendRequest(requestId) {
  try {
    const res = await fetch(`${API_URL}/api/dc/friends/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Arkadaşlık reddedildi', 'info');
      loadFriends();
      closeModal();
      setTimeout(() => showFriendsModal(), 300);
    } else {
      showToast(data.error || 'Reddedilemedi', 'error');
    }
  } catch (err) {
    console.error('Reject friend request error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

async function removeFriend(friendId) {
  if (!confirm('Bu arkadaşı kaldırmak istediğinden emin misin?')) return;
  
  try {
    const res = await fetch(`${API_URL}/api/dc/friends/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, friendId })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Arkadaş kaldırıldı', 'info');
      loadFriends();
      closeModal();
      setTimeout(() => showFriendsModal(), 300);
    } else {
      showToast(data.error || 'Kaldırılamadı', 'error');
    }
  } catch (err) {
    console.error('Remove friend error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

// ==================== MESAJ DÜZENLEME/SİLME ====================

let editingMessageId = null;

function showMessageActions(messageId, messageContent, isOwner) {
  const actionsMenu = document.createElement('div');
  actionsMenu.className = 'message-actions-menu';
  actionsMenu.style.cssText = `
    position:absolute;
    background:var(--bg-tertiary);
    border-radius:8px;
    padding:8px;
    box-shadow:0 8px 16px rgba(0,0,0,0.24);
    z-index:100;
  `;
  
  if (isOwner) {
    actionsMenu.innerHTML = `
      <button onclick="editMessage(${messageId}, '${messageContent.replace(/'/g, "\\'")}'); this.parentElement.remove();" style="display:block;width:100%;padding:8px 12px;background:none;border:none;color:var(--text-normal);text-align:left;cursor:pointer;border-radius:4px;font-size:14px;" onmouseover="this.style.background='var(--background-modifier-hover)'" onmouseout="this.style.background='none'">
        <i class="fas fa-edit"></i> Düzenle
      </button>
      <button onclick="deleteMessage(${messageId}); this.parentElement.remove();" style="display:block;width:100%;padding:8px 12px;background:none;border:none;color:var(--red);text-align:left;cursor:pointer;border-radius:4px;font-size:14px;" onmouseover="this.style.background='var(--background-modifier-hover)'" onmouseout="this.style.background='none'">
        <i class="fas fa-trash"></i> Sil
      </button>
    `;
  } else {
    actionsMenu.innerHTML = `
      <button onclick="reportMessage(${messageId}); this.parentElement.remove();" style="display:block;width:100%;padding:8px 12px;background:none;border:none;color:var(--red);text-align:left;cursor:pointer;border-radius:4px;font-size:14px;" onmouseover="this.style.background='var(--background-modifier-hover)'" onmouseout="this.style.background='none'">
        <i class="fas fa-flag"></i> Bildir
      </button>
    `;
  }
  
  return actionsMenu;
}

function editMessage(messageId, currentContent) {
  editingMessageId = messageId;
  const input = document.getElementById('message-input');
  input.value = currentContent;
  input.focus();
  
  // Düzenleme modunu göster
  const editBanner = document.createElement('div');
  editBanner.id = 'edit-banner';
  editBanner.style.cssText = 'padding:8px 16px;background:var(--bg-accent);display:flex;align-items:center;justify-content:space-between;';
  editBanner.innerHTML = `
    <span style="font-size:14px;color:var(--text-muted);">Mesajı düzenliyorsun</span>
    <button onclick="cancelEdit()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;">İptal</button>
  `;
  
  const inputContainer = document.querySelector('.message-input-container');
  inputContainer.parentElement.insertBefore(editBanner, inputContainer);
}

function cancelEdit() {
  editingMessageId = null;
  document.getElementById('message-input').value = '';
  document.getElementById('edit-banner')?.remove();
}

async function deleteMessage(messageId) {
  if (!confirm('Bu mesajı silmek istediğinden emin misin?')) return;
  
  try {
    const res = await fetch(`${API_URL}/api/dc/messages/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, userId: currentUser.id })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Mesaj silindi', 'success');
      socket.emit('message_deleted', { messageId, server: currentServer, channel: currentChannel });
    } else {
      showToast(data.error || 'Silinemedi', 'error');
    }
  } catch (err) {
    console.error('Delete message error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

// ==================== DOSYA/RESİM YÜKLEME ====================

function showFileUploadModal() {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:24px;color:var(--header-primary);">Dosya Yükle</h2>
      
      <div style="border:2px dashed var(--text-muted);border-radius:8px;padding:40px;text-align:center;margin-bottom:24px;cursor:pointer;" onclick="document.getElementById('file-input').click()">
        <i class="fas fa-cloud-upload-alt" style="font-size:48px;color:var(--text-muted);margin-bottom:16px;"></i>
        <p style="color:var(--text-muted);">Dosya seçmek için tıkla</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Maksimum 10MB</p>
      </div>
      
      <input type="file" id="file-input" style="display:none;" accept="image/*,video/*,.pdf,.doc,.docx" onchange="handleFileSelect(event)">
      
      <div id="file-preview" style="display:none;margin-bottom:24px;"></div>
      
      <div style="display:flex;gap:12px;">
        <button onclick="closeModal()" style="flex:1;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">İptal</button>
        <button id="upload-btn" onclick="uploadFile()" disabled style="flex:1;padding:12px;background:var(--brand);border:none;border-radius:4px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;opacity:0.5;">Gönder</button>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

let selectedFile = null;

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 10 * 1024 * 1024) {
    showToast('Dosya çok büyük (max 10MB)', 'error');
    return;
  }
  
  selectedFile = file;
  
  const preview = document.getElementById('file-preview');
  preview.style.display = 'block';
  
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:200px;border-radius:8px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = `
      <div style="padding:16px;background:var(--bg-secondary);border-radius:8px;display:flex;align-items:center;gap:12px;">
        <i class="fas fa-file" style="font-size:32px;color:var(--brand);"></i>
        <div>
          <div style="font-weight:600;">${file.name}</div>
          <div style="font-size:12px;color:var(--text-muted);">${(file.size / 1024).toFixed(2)} KB</div>
        </div>
      </div>
    `;
  }
  
  document.getElementById('upload-btn').disabled = false;
  document.getElementById('upload-btn').style.opacity = '1';
}

async function uploadFile() {
  if (!selectedFile) return;
  
  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('userId', currentUser.id);
  formData.append('server', currentServer);
  formData.append('channel', currentChannel);
  
  try {
    showToast('Dosya yükleniyor...', 'info');
    
    const res = await fetch(`${API_URL}/api/dc/upload`, {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Dosya gönderildi!', 'success');
      closeModal();
      
      // Dosya mesajı gönder
      const message = {
        userId: currentUser.id,
        username: currentUser.displayName || currentUser.username,
        avatar: currentUser.avatar,
        server: currentServer,
        channel: currentChannel,
        content: '',
        fileUrl: data.fileUrl,
        fileType: selectedFile.type,
        fileName: selectedFile.name,
        created_at: new Date().toISOString()
      };
      
      socket.emit('send_message', message);
      selectedFile = null;
    } else {
      showToast(data.error || 'Yükleme başarısız', 'error');
    }
  } catch (err) {
    console.error('Upload error:', err);
    showToast('Yükleme hatası', 'error');
  }
}

// ==================== EMOJI PICKER ====================

const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'];

function showEmojiPicker() {
  const picker = document.createElement('div');
  picker.id = 'emoji-picker';
  picker.style.cssText = `
    position:absolute;
    bottom:80px;
    right:16px;
    width:320px;
    height:400px;
    background:var(--bg-tertiary);
    border-radius:8px;
    box-shadow:0 8px 16px rgba(0,0,0,0.24);
    padding:16px;
    overflow-y:auto;
    z-index:100;
    display:grid;
    grid-template-columns:repeat(8, 1fr);
    gap:8px;
    align-content:start;
  `;
  
  emojis.forEach(emoji => {
    const emojiBtn = document.createElement('button');
    emojiBtn.textContent = emoji;
    emojiBtn.style.cssText = 'background:none;border:none;font-size:24px;cursor:pointer;padding:4px;border-radius:4px;transition:background 0.1s;';
    emojiBtn.onmouseover = () => emojiBtn.style.background = 'var(--background-modifier-hover)';
    emojiBtn.onmouseout = () => emojiBtn.style.background = 'none';
    emojiBtn.onclick = () => {
      const input = document.getElementById('message-input');
      input.value += emoji;
      input.focus();
      picker.remove();
    };
    picker.appendChild(emojiBtn);
  });
  
  document.body.appendChild(picker);
  
  // Dışarı tıklanınca kapat
  setTimeout(() => {
    document.addEventListener('click', function closeEmojiPicker(e) {
      if (!picker.contains(e.target) && e.target.id !== 'emoji-btn') {
        picker.remove();
        document.removeEventListener('click', closeEmojiPicker);
      }
    });
  }, 100);
}

// Emoji butonuna event listener ekle
document.getElementById('emoji-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const existingPicker = document.getElementById('emoji-picker');
  if (existingPicker) {
    existingPicker.remove();
  } else {
    showEmojiPicker();
  }
});

// Dosya yükleme butonuna event listener ekle
document.getElementById('attach-btn')?.addEventListener('click', showFileUploadModal);

// Arkadaşlar butonunu header'a ekle
const friendsBtn = document.createElement('button');
friendsBtn.className = 'header-btn';
friendsBtn.title = 'Arkadaşlar';
friendsBtn.innerHTML = '<i class="fas fa-user-friends"></i>';
friendsBtn.onclick = () => {
  loadFriends();
  setTimeout(showFriendsModal, 300);
};
document.querySelector('.chat-header-right')?.insertBefore(friendsBtn, document.querySelector('.chat-header-right').firstChild);

// DM'leri ve arkadaşları yükle
if (currentUser) {
  loadDMs();
  loadFriends();
}
