// DemlikChat - Extended Features
// Kapsamlı Discord özellikleri

// ==================== KANAL KATEGORİLERİ ====================

let channelCategories = [];

async function loadChannelCategories(serverId) {
  try {
    const res = await fetch(`${API_URL}/api/dc/categories/${serverId}`);
    const data = await res.json();
    
    if (data.success) {
      channelCategories = data.categories;
      renderChannelCategories();
    }
  } catch (err) {
    console.error('Load categories error:', err);
  }
}

function renderChannelCategories() {
  const channelList = document.querySelector('.channel-list');
  channelList.innerHTML = '';
  
  channelCategories.forEach(category => {
    const categoryEl = document.createElement('div');
    categoryEl.className = 'channel-category';
    categoryEl.innerHTML = `
      <div class="category-header" onclick="toggleCategory(${category.id})">
        <i class="fas fa-chevron-down category-arrow ${category.collapsed ? 'collapsed' : ''}"></i>
        <span>${category.name.toUpperCase()}</span>
        <button class="category-settings-btn" onclick="event.stopPropagation(); showCategorySettings(${category.id})">
          <i class="fas fa-cog"></i>
        </button>
      </div>
      <div class="category-channels ${category.collapsed ? 'collapsed' : ''}" id="category-${category.id}">
        ${renderCategoryChannels(category.channels)}
      </div>
    `;
    channelList.appendChild(categoryEl);
  });
}

function renderCategoryChannels(channels) {
  return channels.map(channel => `
    <div class="channel-item" data-channel="${channel.id}" data-type="${channel.type}">
      <i class="fas fa-${channel.type === 'voice' ? 'volume-up' : 'hashtag'}"></i>
      <span>${channel.name}</span>
      ${channel.type === 'voice' ? '<div class="voice-users"></div>' : ''}
    </div>
  `).join('');
}

function toggleCategory(categoryId) {
  const category = channelCategories.find(c => c.id === categoryId);
  if (category) {
    category.collapsed = !category.collapsed;
    renderChannelCategories();
  }
}

function showCategorySettings(categoryId) {
  showToast('Kategori ayarları yakında!', 'info');
}

// ==================== MENTION SİSTEMİ ====================

let mentionSuggestions = [];

function initMentionSystem() {
  const messageInput = document.getElementById('message-input');
  
  messageInput.addEventListener('input', (e) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && lastAtIndex === cursorPos - 1) {
      // @ yazıldı, mention önerileri göster
      showMentionSuggestions(cursorPos);
    } else if (lastAtIndex !== -1) {
      const searchTerm = textBeforeCursor.substring(lastAtIndex + 1);
      if (searchTerm.length > 0) {
        filterMentionSuggestions(searchTerm);
      }
    } else {
      hideMentionSuggestions();
    }
  });
}

async function showMentionSuggestions(cursorPos) {
  // Sunucu üyelerini getir
  const members = await loadMembers();
  
  const suggestionsBox = document.createElement('div');
  suggestionsBox.id = 'mention-suggestions';
  suggestionsBox.style.cssText = `
    position:absolute;
    bottom:60px;
    left:16px;
    right:16px;
    max-height:300px;
    background:var(--bg-tertiary);
    border-radius:8px;
    box-shadow:0 8px 16px rgba(0,0,0,0.24);
    overflow-y:auto;
    z-index:100;
  `;
  
  // @everyone ve @here ekle
  suggestionsBox.innerHTML = `
    <div class="mention-item" onclick="insertMention('@everyone')">
      <i class="fas fa-at" style="color:var(--brand);"></i>
      <span style="font-weight:600;">everyone</span>
      <span style="font-size:12px;color:var(--text-muted);margin-left:auto;">Herkesi bilgilendir</span>
    </div>
    <div class="mention-item" onclick="insertMention('@here')">
      <i class="fas fa-at" style="color:var(--green);"></i>
      <span style="font-weight:600;">here</span>
      <span style="font-size:12px;color:var(--text-muted);margin-left:auto;">Çevrimiçi olanları bilgilendir</span>
    </div>
    <div style="height:1px;background:var(--bg-modifier-accent);margin:4px 0;"></div>
  `;
  
  // Üyeleri ekle
  members.forEach(member => {
    const memberItem = document.createElement('div');
    memberItem.className = 'mention-item';
    memberItem.onclick = () => insertMention(`@${member.username}`);
    memberItem.innerHTML = `
      <div style="width:24px;height:24px;border-radius:50%;background:var(--brand);overflow:hidden;">
        ${member.avatar ? `<img src="${member.avatar}" style="width:100%;height:100%;object-fit:cover;">` : ''}
      </div>
      <span>${member.display_name || member.username}</span>
      <span style="font-size:12px;color:var(--text-muted);margin-left:auto;">@${member.username}</span>
    `;
    suggestionsBox.appendChild(memberItem);
  });
  
  document.querySelector('.message-input-container').appendChild(suggestionsBox);
}

function insertMention(mention) {
  const input = document.getElementById('message-input');
  const text = input.value;
  const cursorPos = input.selectionStart;
  const lastAtIndex = text.lastIndexOf('@', cursorPos - 1);
  
  const newText = text.substring(0, lastAtIndex) + mention + ' ' + text.substring(cursorPos);
  input.value = newText;
  input.focus();
  
  hideMentionSuggestions();
}

function hideMentionSuggestions() {
  document.getElementById('mention-suggestions')?.remove();
}

// ==================== MESAJ TEPKİLERİ UI ====================

function showReactionPicker(messageId) {
  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.style.cssText = `
    position:absolute;
    background:var(--bg-tertiary);
    border-radius:8px;
    padding:8px;
    box-shadow:0 8px 16px rgba(0,0,0,0.24);
    z-index:100;
    display:grid;
    grid-template-columns:repeat(8, 1fr);
    gap:4px;
  `;
  
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉'];
  
  quickReactions.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.style.cssText = 'background:none;border:none;font-size:24px;cursor:pointer;padding:4px;border-radius:4px;transition:background 0.1s;';
    btn.onmouseover = () => btn.style.background = 'var(--background-modifier-hover)';
    btn.onmouseout = () => btn.style.background = 'none';
    btn.onclick = () => addReaction(messageId, emoji);
    picker.appendChild(btn);
  });
  
  return picker;
}

async function addReaction(messageId, emoji) {
  try {
    const res = await fetch(`${API_URL}/api/dc/reactions/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, userId: currentUser.id, emoji })
    });
    
    const data = await res.json();
    
    if (data.success) {
      socket.emit('reaction_added', { messageId, emoji, userId: currentUser.id });
      updateMessageReactions(messageId);
    }
  } catch (err) {
    console.error('Add reaction error:', err);
  }
}

async function updateMessageReactions(messageId) {
  try {
    const res = await fetch(`${API_URL}/api/dc/reactions/${messageId}`);
    const data = await res.json();
    
    if (data.success) {
      renderMessageReactions(messageId, data.reactions);
    }
  } catch (err) {
    console.error('Update reactions error:', err);
  }
}

function renderMessageReactions(messageId, reactions) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) return;
  
  let reactionsEl = messageEl.querySelector('.message-reactions');
  if (!reactionsEl) {
    reactionsEl = document.createElement('div');
    reactionsEl.className = 'message-reactions';
    reactionsEl.style.cssText = 'display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;';
    messageEl.appendChild(reactionsEl);
  }
  
  reactionsEl.innerHTML = '';
  
  // Emoji'lere göre grupla
  const grouped = {};
  reactions.forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r);
  });
  
  Object.entries(grouped).forEach(([emoji, users]) => {
    const reactionBtn = document.createElement('button');
    const hasReacted = users.some(u => u.user_id === currentUser.id);
    reactionBtn.style.cssText = `
      display:flex;
      align-items:center;
      gap:4px;
      padding:4px 8px;
      background:${hasReacted ? 'var(--brand-experiment-15a)' : 'var(--bg-secondary)'};
      border:1px solid ${hasReacted ? 'var(--brand)' : 'transparent'};
      border-radius:4px;
      cursor:pointer;
      font-size:14px;
      transition:all 0.1s;
    `;
    reactionBtn.innerHTML = `<span>${emoji}</span><span style="font-size:12px;color:var(--text-muted);">${users.length}</span>`;
    reactionBtn.onclick = () => hasReacted ? removeReaction(messageId, emoji) : addReaction(messageId, emoji);
    reactionsEl.appendChild(reactionBtn);
  });
}

async function removeReaction(messageId, emoji) {
  try {
    const res = await fetch(`${API_URL}/api/dc/reactions/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, userId: currentUser.id, emoji })
    });
    
    const data = await res.json();
    
    if (data.success) {
      socket.emit('reaction_removed', { messageId, emoji, userId: currentUser.id });
      updateMessageReactions(messageId);
    }
  } catch (err) {
    console.error('Remove reaction error:', err);
  }
}

// ==================== SABİTLENMİŞ MESAJLAR ====================

let pinnedMessages = [];

async function loadPinnedMessages(serverId, channelId) {
  try {
    const res = await fetch(`${API_URL}/api/dc/pinned/${serverId}/${channelId}`);
    const data = await res.json();
    
    if (data.success) {
      pinnedMessages = data.messages;
      updatePinnedIndicator();
    }
  } catch (err) {
    console.error('Load pinned messages error:', err);
  }
}

function updatePinnedIndicator() {
  const pinnedBtn = document.querySelector('.header-btn[title="Sabitle"]');
  if (pinnedBtn) {
    if (pinnedMessages.length > 0) {
      pinnedBtn.innerHTML = `<i class="fas fa-thumbtack"></i><span class="badge">${pinnedMessages.length}</span>`;
    } else {
      pinnedBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    }
  }
}

function showPinnedMessages() {
  if (pinnedMessages.length === 0) {
    showToast('Sabitlenmiş mesaj yok', 'info');
    return;
  }
  
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;max-height:80vh;overflow-y:auto;width:600px;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:24px;color:var(--header-primary);">Sabitlenmiş Mesajlar</h2>
      
      <div id="pinned-messages-list">
        ${pinnedMessages.map(msg => `
          <div class="pinned-message-item" style="padding:16px;background:var(--bg-secondary);border-radius:8px;margin-bottom:12px;">
            <div style="display:flex;align-items:start;gap:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--brand);overflow:hidden;flex-shrink:0;">
                ${msg.avatar ? `<img src="${msg.avatar}" style="width:100%;height:100%;object-fit:cover;">` : ''}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
                  <span style="font-weight:600;color:var(--header-primary);">${msg.username}</span>
                  <span style="font-size:12px;color:var(--text-muted);">${formatTime(msg.created_at)}</span>
                </div>
                <div style="color:var(--text-normal);word-wrap:break-word;">${escapeHtml(msg.content)}</div>
              </div>
              <button onclick="unpinMessage(${msg.id})" style="padding:8px;background:var(--red);border:none;border-radius:4px;color:#fff;cursor:pointer;">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div style="margin-top:24px;">
        <button onclick="closeModal()" style="width:100%;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">Kapat</button>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

async function pinMessage(messageId) {
  try {
    const res = await fetch(`${API_URL}/api/dc/messages/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, serverId: currentServer, channelId: currentChannel })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Mesaj sabitlendi', 'success');
      loadPinnedMessages(currentServer, currentChannel);
    }
  } catch (err) {
    console.error('Pin message error:', err);
  }
}

async function unpinMessage(messageId) {
  try {
    const res = await fetch(`${API_URL}/api/dc/messages/unpin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Mesaj sabitleme kaldırıldı', 'info');
      loadPinnedMessages(currentServer, currentChannel);
      closeModal();
      setTimeout(showPinnedMessages, 300);
    }
  } catch (err) {
    console.error('Unpin message error:', err);
  }
}

// ==================== MESAJ ARAMA ====================

function showSearchModal() {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;max-height:80vh;overflow-y:auto;width:600px;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:24px;color:var(--header-primary);">Mesaj Ara</h2>
      
      <div style="margin-bottom:24px;">
        <input type="text" id="search-input" placeholder="Mesajlarda ara..." style="width:100%;padding:12px;background:var(--bg-tertiary);border:1px solid rgba(0,0,0,0.3);border-radius:4px;color:var(--text-normal);font-size:16px;">
      </div>
      
      <div id="search-results" style="min-height:200px;">
        <p style="text-align:center;color:var(--text-muted);padding:40px 0;">Aramak için bir şeyler yaz</p>
      </div>
      
      <div style="margin-top:24px;">
        <button onclick="closeModal()" style="width:100%;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">Kapat</button>
      </div>
    </div>
  `;
  
  document.getElementById('modal-overlay').classList.add('active');
  
  // Arama input'una event listener ekle
  let searchTimeout;
  document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchMessages(e.target.value);
    }, 500);
  });
}

async function searchMessages(query) {
  if (!query || query.length < 2) {
    document.getElementById('search-results').innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px 0;">En az 2 karakter gir</p>';
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/dc/search?serverId=${currentServer}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    if (data.success) {
      renderSearchResults(data.results);
    }
  } catch (err) {
    console.error('Search error:', err);
  }
}

function renderSearchResults(results) {
  const container = document.getElementById('search-results');
  
  if (results.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px 0;">Sonuç bulunamadı</p>';
    return;
  }
  
  container.innerHTML = results.map(msg => `
    <div class="search-result-item" style="padding:12px;background:var(--bg-secondary);border-radius:8px;margin-bottom:8px;cursor:pointer;" onclick="jumpToMessage('${msg.channel_id}', ${msg.id})">
      <div style="display:flex;align-items:start;gap:12px;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--brand);overflow:hidden;flex-shrink:0;">
          ${msg.avatar ? `<img src="${msg.avatar}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
            <span style="font-weight:600;color:var(--header-primary);">${msg.username}</span>
            <span style="font-size:12px;color:var(--text-muted);">#${msg.channel_id}</span>
            <span style="font-size:12px;color:var(--text-muted);">${formatTime(msg.created_at)}</span>
          </div>
          <div style="color:var(--text-normal);word-wrap:break-word;">${escapeHtml(msg.content)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function jumpToMessage(channelId, messageId) {
  switchChannel(channelId, 'text');
  closeModal();
  
  setTimeout(() => {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageEl.style.background = 'var(--brand-experiment-15a)';
      setTimeout(() => {
        messageEl.style.background = 'transparent';
      }, 2000);
    }
  }, 500);
}

// ==================== KULLANICI DURUMU ====================

const userStatuses = {
  online: { icon: '🟢', text: 'Çevrimiçi', color: 'var(--green)' },
  idle: { icon: '🟡', text: 'Boşta', color: 'var(--yellow)' },
  dnd: { icon: '🔴', text: 'Rahatsız Etmeyin', color: 'var(--red)' },
  invisible: { icon: '⚫', text: 'Görünmez', color: 'var(--text-muted)' }
};

function showStatusModal() {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:24px;color:var(--header-primary);">Durumunu Ayarla</h2>
      
      <div style="margin-bottom:24px;">
        ${Object.entries(userStatuses).map(([key, status]) => `
          <button onclick="setUserStatus('${key}')" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px;background:var(--bg-secondary);border:none;border-radius:8px;margin-bottom:8px;cursor:pointer;transition:background 0.1s;" onmouseover="this.style.background='var(--background-modifier-hover)'" onmouseout="this.style.background='var(--bg-secondary)'">
            <span style="font-size:20px;">${status.icon}</span>
            <span style="font-weight:600;color:var(--header-primary);">${status.text}</span>
          </button>
        `).join('')}
      </div>
      
      <div style="margin-bottom:24px;">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--header-secondary);text-transform:uppercase;margin-bottom:8px;">ÖZEL DURUM MESAJI</label>
        <input type="text" id="custom-status-input" placeholder="Bugün nasılsın?" style="width:100%;padding:10px;background:var(--bg-tertiary);border:1px solid rgba(0,0,0,0.3);border-radius:4px;color:var(--text-normal);font-size:14px;">
      </div>
      
      <div style="display:flex;gap:12px;">
        <button onclick="closeModal()" style="flex:1;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">İptal</button>
        <button onclick="saveCustomStatus()" style="flex:1;padding:12px;background:var(--brand);border:none;border-radius:4px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Kaydet</button>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

async function setUserStatus(status) {
  try {
    const res = await fetch(`${API_URL}/api/dc/status/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, status })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast(`Durum: ${userStatuses[status].text}`, 'success');
      document.getElementById('user-status').textContent = userStatuses[status].text;
      closeModal();
    }
  } catch (err) {
    console.error('Set status error:', err);
  }
}

async function saveCustomStatus() {
  const customStatus = document.getElementById('custom-status-input').value.trim();
  
  try {
    const res = await fetch(`${API_URL}/api/dc/status/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, customStatus })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Özel durum kaydedildi', 'success');
      closeModal();
    }
  } catch (err) {
    console.error('Save custom status error:', err);
  }
}

// ==================== INIT ====================

// Initialize extended features
if (typeof currentUser !== 'undefined' && currentUser) {
  initMentionSystem();
  
  // Pinned messages button
  document.querySelector('.header-btn[title="Sabitle"]')?.addEventListener('click', showPinnedMessages);
  
  // Search button
  document.getElementById('mobile-search-btn')?.addEventListener('click', showSearchModal);
  
  // Status button (user panel'e ekle)
  const statusBtn = document.createElement('button');
  statusBtn.className = 'user-control-btn';
  statusBtn.title = 'Durum';
  statusBtn.innerHTML = '<i class="fas fa-circle"></i>';
  statusBtn.onclick = showStatusModal;
  document.querySelector('.user-controls')?.insertBefore(statusBtn, document.getElementById('settings-btn'));
}

console.log('✓ DemlikChat extended features loaded');
