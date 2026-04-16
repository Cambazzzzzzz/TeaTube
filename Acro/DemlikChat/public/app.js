// Global state
let currentUser = null;
let socket = null;
let currentChat = null;
let friends = [];
let groups = [];
let messages = [];

// API Base
const API = 'http://localhost:3001/api';

// Init
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initSocket();
});

// Auth
function initAuth() {
  const authTabs = document.querySelectorAll('.auth-tab');
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      authTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      document.getElementById(tab.dataset.tab + '-form').classList.add('active');
    });
  });

  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('register-btn').addEventListener('click', register);
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const favoriteFood = document.getElementById('login-favorite-food').value;

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, favoriteFood })
    });
    
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      document.body.className = `theme-${currentUser.theme || 'midnight'}`;
      showMainApp();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Giriş hatası: ' + err.message);
  }
}

async function register() {
  const username = document.getElementById('register-username').value;
  const displayName = document.getElementById('register-display-name').value;
  const password = document.getElementById('register-password').value;

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName })
    });
    
    const data = await res.json();
    if (data.success) {
      alert('Kayıt başarılı! Giriş yapabilirsiniz.');
      document.querySelector('[data-tab="login"]').click();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Kayıt hatası: ' + err.message);
  }
}

function showMainApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
  
  loadUserProfile();
  loadFriends();
  loadGroups();
  initMainApp();
  
  socket.emit('join', currentUser.id);
}

// Socket
function initSocket() {
  socket = io('http://localhost:3001');
  
  socket.on('new_message', (message) => {
    if (currentChat && 
        ((currentChat.type === 'friend' && (message.from_user === currentChat.id || message.to_user === currentChat.id)) ||
         (currentChat.type === 'group' && message.group_id === currentChat.id))) {
      messages.push(message);
      renderMessages();
    }
  });
}

// Main App
function initMainApp() {
  // Sidebar tabs
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(tab.dataset.tab + '-panel').classList.add('active');
    });
  });

  // Actions
  document.getElementById('add-friend-btn').addEventListener('click', showAddFriendModal);
  document.getElementById('friend-requests-btn').addEventListener('click', showFriendRequestsModal);
  document.getElementById('create-group-btn').addEventListener('click', showCreateGroupModal);
  document.getElementById('settings-btn').addEventListener('click', showSettingsModal);
  document.getElementById('logout-btn').addEventListener('click', logout);
  
  // Chat
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  document.getElementById('attach-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  
  document.getElementById('file-input').addEventListener('change', handleFileUpload);
  document.getElementById('view-profile-btn').addEventListener('click', showProfileModal);
  document.getElementById('block-user-btn').addEventListener('click', blockUser);
  
  // Modal
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
}

async function loadUserProfile() {
  document.getElementById('user-name').textContent = currentUser.displayName;
  document.getElementById('user-username').textContent = '@' + currentUser.username;
  
  if (currentUser.avatar) {
    document.getElementById('user-avatar').src = currentUser.avatar;
  }
}

async function loadFriends() {
  try {
    const res = await fetch(`${API}/friends/${currentUser.id}`);
    const data = await res.json();
    
    if (data.success) {
      friends = data.friends;
      renderFriends();
    }
    
    // Load requests
    const reqRes = await fetch(`${API}/friends/requests/${currentUser.id}`);
    const reqData = await reqRes.json();
    
    if (reqData.success) {
      document.getElementById('requests-badge').textContent = reqData.requests.length;
    }
  } catch (err) {
    console.error('Load friends error:', err);
  }
}

function renderFriends() {
  const container = document.getElementById('friends-list');
  
  if (friends.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-user-friends"></i><p>Henüz arkadaşın yok</p></div>';
    return;
  }
  
  container.innerHTML = friends.map(friend => `
    <div class="friend-item" data-id="${friend.id}" onclick="openChat('friend', ${friend.id})">
      <img src="${friend.avatar || 'https://ui-avatars.com/api/?name=' + friend.display_name}" class="friend-avatar">
      <div class="friend-info">
        <div class="friend-name">${friend.display_name}</div>
        <div class="friend-status">Çevrimiçi</div>
      </div>
    </div>
  `).join('');
}

async function loadGroups() {
  try {
    const res = await fetch(`${API}/groups/${currentUser.id}`);
    const data = await res.json();
    
    if (data.success) {
      groups = data.groups;
      renderGroups();
    }
  } catch (err) {
    console.error('Load groups error:', err);
  }
}

function renderGroups() {
  const container = document.getElementById('groups-list');
  
  if (groups.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Henüz grubun yok</p></div>';
    return;
  }
  
  container.innerHTML = groups.map(group => `
    <div class="group-item" data-id="${group.id}" onclick="openChat('group', ${group.id})">
      <img src="${group.avatar || 'https://ui-avatars.com/api/?name=' + group.name}" class="group-avatar">
      <div class="group-info">
        <div class="group-name">${group.name}</div>
      </div>
    </div>
  `).join('');
}

// Chat
async function openChat(type, id) {
  currentChat = { type, id };
  
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('chat-area').style.display = 'flex';
  
  // Update active state
  document.querySelectorAll('.friend-item, .group-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-id="${id}"]`).classList.add('active');
  
  // Load chat info
  if (type === 'friend') {
    const friend = friends.find(f => f.id === id);
    document.getElementById('chat-name').textContent = friend.display_name;
    document.getElementById('chat-avatar').src = friend.avatar || 'https://ui-avatars.com/api/?name=' + friend.display_name;
    document.getElementById('chat-status').textContent = 'Çevrimiçi';
    
    // Load messages
    const res = await fetch(`${API}/messages/${currentUser.id}/${id}`);
    const data = await res.json();
    
    if (data.success) {
      messages = data.messages.filter(m => {
        const deletedFor = JSON.parse(m.deleted_for || '[]');
        return !deletedFor.includes(currentUser.id);
      });
      renderMessages();
    }
  } else {
    const group = groups.find(g => g.id === id);
    document.getElementById('chat-name').textContent = group.name;
    document.getElementById('chat-avatar').src = group.avatar || 'https://ui-avatars.com/api/?name=' + group.name;
    document.getElementById('chat-status').textContent = 'Grup';
    
    socket.emit('join_group', id);
    
    // Load messages
    const res = await fetch(`${API}/messages/group/${id}`);
    const data = await res.json();
    
    if (data.success) {
      messages = data.messages.filter(m => {
        const deletedFor = JSON.parse(m.deleted_for || '[]');
        return !deletedFor.includes(currentUser.id);
      });
      renderMessages();
    }
  }
}

function renderMessages() {
  const container = document.getElementById('messages-container');
  
  container.innerHTML = messages.map(msg => {
    const isOwn = msg.from_user === currentUser.id;
    const time = new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div class="message ${isOwn ? 'own' : ''}" data-id="${msg.id}">
        ${!isOwn ? `<img src="https://ui-avatars.com/api/?name=User" class="message-avatar">` : ''}
        <div class="message-content">
          <div class="message-bubble">
            ${msg.type === 'image' ? `<img src="${msg.file_path}" class="message-image">` : msg.content}
          </div>
          <div class="message-time">${time}</div>
          <div class="message-actions">
            <button class="msg-action-btn" onclick="deleteMessage(${msg.id}, 'me')">Benden Sil</button>
            ${isOwn ? `<button class="msg-action-btn" onclick="deleteMessage(${msg.id}, 'everyone')">Herkesten Sil</button>` : ''}
          </div>
        </div>
        ${isOwn ? `<img src="${currentUser.avatar || 'https://ui-avatars.com/api/?name=' + currentUser.displayName}" class="message-avatar">` : ''}
      </div>
    `;
  }).join('');
  
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  
  if (!content || !currentChat) return;
  
  const messageData = {
    fromUser: currentUser.id,
    toUser: currentChat.type === 'friend' ? currentChat.id : null,
    groupId: currentChat.type === 'group' ? currentChat.id : null,
    content,
    type: 'text'
  };
  
  socket.emit('send_message', messageData);
  input.value = '';
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const res = await fetch(`${API}/upload`, {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    
    if (data.success) {
      const messageData = {
        fromUser: currentUser.id,
        toUser: currentChat.type === 'friend' ? currentChat.id : null,
        groupId: currentChat.type === 'group' ? currentChat.id : null,
        content: '',
        type: 'image',
        filePath: data.path
      };
      
      socket.emit('send_message', messageData);
    }
  } catch (err) {
    alert('Dosya yükleme hatası: ' + err.message);
  }
  
  e.target.value = '';
}

async function deleteMessage(messageId, deleteFor) {
  try {
    await fetch(`${API}/messages/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId,
        userId: currentUser.id,
        deleteFor
      })
    });
    
    if (deleteFor === 'everyone') {
      messages = messages.filter(m => m.id !== messageId);
    } else {
      messages = messages.filter(m => m.id !== messageId);
    }
    
    renderMessages();
  } catch (err) {
    alert('Mesaj silme hatası: ' + err.message);
  }
}

// Modals
function showAddFriendModal() {
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <div class="modal-header">
      <span>Arkadaş Ekle</span>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <input type="text" id="friend-username-input" class="modal-input" placeholder="Kullanıcı adı">
      <button class="modal-btn" onclick="addFriend()">Ekle</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

async function addFriend() {
  const username = document.getElementById('friend-username-input').value;
  
  try {
    const res = await fetch(`${API}/friends/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, friendUsername: username })
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert('Arkadaşlık isteği gönderildi!');
      closeModal();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

async function showFriendRequestsModal() {
  try {
    const res = await fetch(`${API}/friends/requests/${currentUser.id}`);
    const data = await res.json();
    
    if (data.success) {
      const modal = document.getElementById('modal-content');
      modal.innerHTML = `
        <div class="modal-header">
          <span>Arkadaşlık İstekleri</span>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          ${data.requests.length === 0 ? '<p style="text-align:center;color:var(--text3)">İstek yok</p>' : 
            data.requests.map(req => `
              <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg3);border-radius:10px;">
                <img src="${req.avatar || 'https://ui-avatars.com/api/?name=' + req.display_name}" style="width:40px;height:40px;border-radius:50%;">
                <div style="flex:1;">
                  <div style="font-weight:600;">${req.display_name}</div>
                  <div style="font-size:12px;color:var(--text3);">@${req.username}</div>
                </div>
                <button class="modal-btn" style="width:auto;padding:8px 16px;" onclick="acceptFriend(${req.id})">Kabul Et</button>
              </div>
            `).join('')
          }
        </div>
      `;
      document.getElementById('modal-overlay').classList.add('open');
    }
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

async function acceptFriend(friendId) {
  try {
    await fetch(`${API}/friends/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, friendId })
    });
    
    loadFriends();
    closeModal();
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

function showCreateGroupModal() {
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <div class="modal-header">
      <span>Grup Oluştur</span>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <input type="text" id="group-name-input" class="modal-input" placeholder="Grup adı">
      <button class="modal-btn" onclick="createGroup()">Oluştur</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

async function createGroup() {
  const name = document.getElementById('group-name-input').value;
  
  try {
    const res = await fetch(`${API}/groups/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, name })
    });
    
    const data = await res.json();
    
    if (data.success) {
      loadGroups();
      closeModal();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

async function showProfileModal() {
  if (!currentChat || currentChat.type !== 'friend') return;
  
  try {
    const res = await fetch(`${API}/user/${currentChat.id}`);
    const data = await res.json();
    
    if (data.success) {
      const user = data.user;
      const links = JSON.parse(user.links || '[]');
      
      const modal = document.getElementById('modal-content');
      modal.innerHTML = `
        <div class="modal-header">
          <span>Profil</span>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="profile-view-bg" style="background:${user.background || 'linear-gradient(135deg,var(--acc),var(--acc2))'}"></div>
          <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.display_name}" class="profile-view-avatar">
          <div class="profile-view-name">${user.display_name}</div>
          <div class="profile-view-username">@${user.username}</div>
          
          ${user.about ? `
            <div class="profile-view-about">
              <div class="profile-view-about-title">Hakkımda</div>
              <div class="profile-view-about-text">${user.about}</div>
            </div>
          ` : ''}
          
          ${links.length > 0 ? `
            <div class="profile-view-about">
              <div class="profile-view-about-title">Bağlantılar</div>
              <div class="profile-view-links">
                ${links.map(link => `
                  <a href="${link.url}" target="_blank" class="profile-link">
                    <i class="fas fa-link"></i>
                    ${link.title}
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
      document.getElementById('modal-overlay').classList.add('open');
    }
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

async function blockUser() {
  if (!currentChat || currentChat.type !== 'friend') return;
  
  if (!confirm('Bu kullanıcıyı engellemek istediğinize emin misiniz?')) return;
  
  try {
    await fetch(`${API}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, blockedId: currentChat.id })
    });
    
    alert('Kullanıcı engellendi');
    loadFriends();
    document.getElementById('welcome-screen').style.display = 'flex';
    document.getElementById('chat-area').style.display = 'none';
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

async function showSettingsModal() {
  // Load blocks
  const blocksRes = await fetch(`${API}/blocks/${currentUser.id}`);
  const blocksData = await blocksRes.json();
  
  const themes = [
    { name: 'midnight', color: '#7c6aff' },
    { name: 'slate', color: '#768390' },
    { name: 'ocean', color: '#00d4ff' },
    { name: 'neon', color: '#00ff41' },
    { name: 'rose', color: '#ff6b8a' },
    { name: 'amber', color: '#ffb300' },
    { name: 'cyberpunk', color: '#ff00ff' },
    { name: 'forest', color: '#4ade80' },
    { name: 'light', color: '#555570' }
  ];
  
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <div class="modal-header">
      <span>Ayarlar</span>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      
      <div class="settings-section">
        <div class="settings-title">Güvenlik</div>
        <div class="settings-row">
          <div class="settings-label">Şifre Değiştir</div>
          <button class="modal-btn" style="width:auto;padding:8px 16px;" onclick="showChangePasswordModal()">Değiştir</button>
        </div>
        <div class="settings-row">
          <div class="settings-label">İki Aşamalı Doğrulama</div>
          <button class="modal-btn" style="width:auto;padding:8px 16px;" onclick="showTwoFactorModal()">Ayarla</button>
        </div>
      </div>
      
      <div class="settings-section">
        <div class="settings-title">Tema</div>
        <div class="theme-grid">
          ${themes.map(theme => `
            <div class="theme-card ${currentUser.theme === theme.name ? 'active' : ''}" onclick="changeTheme('${theme.name}')">
              <div class="theme-preview" style="background:${theme.color}"></div>
              <div class="theme-name">${theme.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="settings-section">
        <div class="settings-title">Engellenenler</div>
        ${blocksData.blocks.length === 0 ? '<p style="text-align:center;color:var(--text3);padding:20px;">Engellenmiş kullanıcı yok</p>' :
          blocksData.blocks.map(block => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg3);border-radius:10px;margin-bottom:8px;">
              <img src="${block.avatar || 'https://ui-avatars.com/api/?name=' + block.display_name}" style="width:40px;height:40px;border-radius:50%;">
              <div style="flex:1;">
                <div style="font-weight:600;">${block.display_name}</div>
                <div style="font-size:12px;color:var(--text3);">@${block.username}</div>
              </div>
              <button class="modal-btn-secondary modal-btn" style="width:auto;padding:8px 16px;" onclick="unblockUser(${block.id})">Engeli Kaldır</button>
            </div>
          `).join('')
        }
      </div>
      
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

function showChangePasswordModal() {
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <div class="modal-header">
      <span>Şifre Değiştir</span>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <input type="password" id="old-password" class="modal-input" placeholder="Eski şifre">
      <input type="password" id="new-password" class="modal-input" placeholder="Yeni şifre">
      <button class="modal-btn" onclick="changePassword()">Değiştir</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

async function changePassword() {
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  
  try {
    const res = await fetch(`${API}/user/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, oldPassword, newPassword })
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert('Şifre değiştirildi!');
      closeModal();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

function showTwoFactorModal() {
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <div class="modal-header">
      <span>İki Aşamalı Doğrulama</span>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <p style="color:var(--text2);margin-bottom:16px;">En sevdiğin yemeği gir. Giriş yaparken bu bilgi sorulacak.</p>
      <input type="text" id="favorite-food" class="modal-input" placeholder="En sevdiğin yemek">
      <button class="modal-btn" onclick="enableTwoFactor()">Etkinleştir</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

async function enableTwoFactor() {
  const favoriteFood = document.getElementById('favorite-food').value;
  
  try {
    await fetch(`${API}/user/two-factor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, enabled: true, favoriteFood })
    });
    
    alert('İki aşamalı doğrulama etkinleştirildi!');
    closeModal();
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

async function changeTheme(theme) {
  document.body.className = `theme-${theme}`;
  currentUser.theme = theme;
  
  try {
    await fetch(`${API}/user/theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, theme })
    });
  } catch (err) {
    console.error('Theme change error:', err);
  }
  
  showSettingsModal();
}

async function unblockUser(blockedId) {
  try {
    await fetch(`${API}/unblock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, blockedId })
    });
    
    showSettingsModal();
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function logout() {
  currentUser = null;
  currentChat = null;
  friends = [];
  groups = [];
  messages = [];
  
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  
  if (socket) {
    socket.disconnect();
    initSocket();
  }
}
