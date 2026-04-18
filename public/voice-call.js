// ==================== SESLI SOHBET + 1-1 ARAMA - TeaTube ====================
// Socket.IO + WebRTC ile grup sesli oda sistemi + direkt arama

let voiceSocket = null;
let voiceStream = null;       // Kendi mikrofon stream'i
let voicePeers = {};          // { userId: RTCPeerConnection }
let voiceAudios = {};         // { userId: HTMLAudioElement }
let voiceRoomId = null;       // Aktif oda (groupId)
let voiceIsMuted = false;
let voiceMembers = {};        // { userId: { nickname, photo, isMuted } }

// 1-1 Arama değişkenleri
let directCallActive = false;
let directCallPeer = null;
let directCallStream = null;
let directCallAudio = null;
let directCallTargetId = null;

// Bildirim sesleri
let ringSound = null;
let callSound = null;

const VOICE_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

// ==================== BILDIRIM SESLERI ====================

function initNotificationSounds() {
  // Arama zil sesi (gelen arama)
  ringSound = new Audio('https://vocaroo.com/embed/1gJEC8z2mRY1');
  ringSound.loop = true;
  ringSound.volume = 0.7;
  
  // Arama sesi (arayan için)
  callSound = new Audio('https://vocaroo.com/embed/1d7VPIDMXCK0');
  callSound.loop = true;
  callSound.volume = 0.6;
}

function playRingSound() {
  if (ringSound) {
    ringSound.currentTime = 0;
    ringSound.play().catch(e => console.log('Ring ses çalamadı:', e));
  }
}

function playCallSound() {
  if (callSound) {
    callSound.currentTime = 0;
    callSound.play().catch(e => console.log('Call ses çalamadı:', e));
  }
}

function stopAllSounds() {
  if (ringSound) { ringSound.pause(); ringSound.currentTime = 0; }
  if (callSound) { callSound.pause(); callSound.currentTime = 0; }
}

// ==================== SOCKET BAGLANTISI ====================

function initVoiceSocket() {
  if (voiceSocket && voiceSocket.connected) return;

  const socketUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3456'
    : window.location.origin;

  voiceSocket = io(socketUrl, { transports: ['websocket', 'polling'] });

  voiceSocket.on('connect', () => {
    console.log('Voice socket bağlandı:', voiceSocket.id);
    if (currentUser) voiceSocket.emit('register', currentUser.id);
    initNotificationSounds();
  });

  voiceSocket.on('disconnect', () => {
    console.log('Voice socket bağlantısı kesildi');
  });

  // ==================== 1-1 ARAMA EVENTLERI ====================

  // Gelen arama
  voiceSocket.on('call:incoming', (data) => {
    console.log('Gelen arama:', data);
    showIncomingCallUI(data);
    playRingSound();
  });

  // Arama kabul edildi
  voiceSocket.on('call:accepted', async (data) => {
    console.log('Arama kabul edildi');
    stopAllSounds();
    if (directCallPeer) {
      await directCallPeer.setRemoteDescription(new RTCSessionDescription(data.answer));
      showActiveCallUI();
    }
  });

  // Arama reddedildi
  voiceSocket.on('call:rejected', (data) => {
    console.log('Arama reddedildi:', data.reason);
    stopAllSounds();
    endDirectCall();
    showVoiceToast('Arama reddedildi');
  });

  // Arama sonlandı
  voiceSocket.on('call:ended', () => {
    console.log('Arama sonlandı');
    stopAllSounds();
    endDirectCall();
    showVoiceToast('Arama sonlandı');
  });

  // Arama yapılamadı
  voiceSocket.on('call:unavailable', (data) => {
    console.log('Kullanıcı çevrimdışı:', data.receiverId);
    stopAllSounds();
    endDirectCall();
    showVoiceToast('Kullanıcı çevrimdışı');
  });

  // ICE candidate (1-1)
  voiceSocket.on('call:ice', async (data) => {
    if (directCallPeer && data.candidate) {
      try { await directCallPeer.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch(e) {}
    }
  });

  // ==================== GRUP SESLI ODA EVENTLERI ====================

  // Odadaki mevcut üyeler (katılınca gelir)
  voiceSocket.on('voice:room-members', async (members) => {
    console.log('Odadaki mevcut üyeler:', members);
    for (const member of members) {
      if (String(member.userId) === String(currentUser.id)) continue;
      voiceMembers[member.userId] = member;
      updateVoiceUI();
      // Her mevcut üyeye offer gönder
      await createVoiceOffer(member.userId);
    }
  });

  // Yeni biri katıldı
  voiceSocket.on('voice:user-joined', (member) => {
    console.log('Yeni üye katıldı:', member);
    if (String(member.userId) === String(currentUser.id)) return;
    voiceMembers[member.userId] = member;
    updateVoiceUI();
    showVoiceToast(`${member.nickname} odaya katıldı`);
  });

  // Biri ayrıldı
  voiceSocket.on('voice:user-left', (data) => {
    console.log('Üye ayrıldı:', data.userId);
    closePeerConnection(data.userId);
    delete voiceMembers[data.userId];
    updateVoiceUI();
    const m = voiceMembers[data.userId];
    showVoiceToast(`${m ? m.nickname : 'Biri'} odadan ayrıldı`);
  });

  // WebRTC offer geldi (grup)
  voiceSocket.on('voice:offer', async (data) => {
    console.log('Offer geldi:', data.fromUserId);
    await handleVoiceOffer(data.fromUserId, data.offer);
  });

  // WebRTC answer geldi (grup)
  voiceSocket.on('voice:answer', async (data) => {
    console.log('Answer geldi:', data.fromUserId);
    const pc = voicePeers[data.fromUserId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  });

  // ICE candidate geldi (grup)
  voiceSocket.on('voice:ice', async (data) => {
    const pc = voicePeers[data.fromUserId];
    if (pc && data.candidate) {
      try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch(e) {}
    }
  });

  // Mikrofon durumu değişti
  voiceSocket.on('voice:mute-changed', (data) => {
    if (voiceMembers[data.userId]) {
      voiceMembers[data.userId].isMuted = data.isMuted;
      updateVoiceUI();
    }
  });
}

// ==================== 1-1 DIREKT ARAMA ====================

async function startDirectCall(targetUserId, targetName, targetPhoto) {
  if (directCallActive || voiceRoomId) {
    showVoiceToast('Zaten bir arama aktif!');
    return;
  }

  try {
    // Mikrofon izni al
    directCallStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch(e) {
    showVoiceToast('Mikrofon erişimi reddedildi!');
    return;
  }

  directCallActive = true;
  directCallTargetId = targetUserId;
  initVoiceSocket();

  // WebRTC bağlantısı oluştur
  directCallPeer = new RTCPeerConnection({ iceServers: VOICE_ICE_SERVERS });

  // Ses track'ini ekle
  directCallStream.getTracks().forEach(track => {
    directCallPeer.addTrack(track, directCallStream);
  });

  // ICE candidate
  directCallPeer.onicecandidate = (e) => {
    if (e.candidate) {
      voiceSocket.emit('call:ice', {
        targetId: targetUserId,
        candidate: e.candidate
      });
    }
  };

  // Karşı tarafın sesi
  directCallPeer.ontrack = (e) => {
    console.log('Direkt arama ses geldi');
    directCallAudio = new Audio();
    directCallAudio.srcObject = e.streams[0];
    directCallAudio.autoplay = true;
  };

  // Offer oluştur ve gönder
  try {
    const offer = await directCallPeer.createOffer();
    await directCallPeer.setLocalDescription(offer);

    voiceSocket.emit('call:start', {
      callerId: currentUser.id,
      callerName: currentUser.nickname || currentUser.username,
      callerPhoto: currentUser.profile_photo || '',
      receiverId: targetUserId,
      offer: directCallPeer.localDescription
    });

    showOutgoingCallUI(targetName, targetPhoto);
    playCallSound();

  } catch(e) {
    console.error('Arama başlatılamadı:', e);
    endDirectCall();
    showVoiceToast('Arama başlatılamadı!');
  }
}

async function acceptDirectCall(callerData) {
  try {
    // Mikrofon izni al
    directCallStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch(e) {
    rejectDirectCall('Mikrofon erişimi reddedildi');
    return;
  }

  directCallActive = true;
  directCallTargetId = callerData.callerId;

  // WebRTC bağlantısı oluştur
  directCallPeer = new RTCPeerConnection({ iceServers: VOICE_ICE_SERVERS });

  // Ses track'ini ekle
  directCallStream.getTracks().forEach(track => {
    directCallPeer.addTrack(track, directCallStream);
  });

  // ICE candidate
  directCallPeer.onicecandidate = (e) => {
    if (e.candidate) {
      voiceSocket.emit('call:ice', {
        targetId: callerData.callerId,
        candidate: e.candidate
      });
    }
  };

  // Karşı tarafın sesi
  directCallPeer.ontrack = (e) => {
    console.log('Kabul edilen arama ses geldi');
    directCallAudio = new Audio();
    directCallAudio.srcObject = e.streams[0];
    directCallAudio.autoplay = true;
  };

  try {
    // Remote description ayarla
    await directCallPeer.setRemoteDescription(new RTCSessionDescription(callerData.offer));

    // Answer oluştur
    const answer = await directCallPeer.createAnswer();
    await directCallPeer.setLocalDescription(answer);

    // Answer gönder
    voiceSocket.emit('call:accept', {
      callerId: callerData.callerId,
      answer: directCallPeer.localDescription
    });

    stopAllSounds();
    hideIncomingCallUI();
    showActiveCallUI();

  } catch(e) {
    console.error('Arama kabul edilemedi:', e);
    rejectDirectCall('Teknik hata');
  }
}

function rejectDirectCall(reason = 'Reddedildi') {
  if (directCallTargetId) {
    voiceSocket.emit('call:reject', {
      callerId: directCallTargetId,
      reason: reason
    });
  }
  stopAllSounds();
  hideIncomingCallUI();
  endDirectCall();
}

function endDirectCall() {
  if (directCallTargetId) {
    voiceSocket.emit('call:end', { targetId: directCallTargetId });
  }

  // Bağlantıları temizle
  if (directCallPeer) {
    directCallPeer.close();
    directCallPeer = null;
  }

  if (directCallStream) {
    directCallStream.getTracks().forEach(t => t.stop());
    directCallStream = null;
  }

  if (directCallAudio) {
    directCallAudio.srcObject = null;
    directCallAudio = null;
  }

  directCallActive = false;
  directCallTargetId = null;

  stopAllSounds();
  hideIncomingCallUI();
  hideOutgoingCallUI();
  hideActiveCallUI();
}

// ==================== 1-1 ARAMA UI ====================

function showIncomingCallUI(callerData) {
  hideAllCallUIs();
  
  const ui = document.createElement('div');
  ui.id = 'incomingCallUI';
  ui.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0,0,0,0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
  `;

  const photoUrl = callerData.callerPhoto && callerData.callerPhoto !== '?' 
    ? callerData.callerPhoto 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(callerData.callerName)}&background=ff0033&color=fff&size=128`;

  ui.innerHTML = `
    <div style="text-align: center;">
      <div style="margin-bottom: 20px;">
        <img src="${photoUrl}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #1db954;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(callerData.callerName)}&background=ff0033&color=fff&size=128'" />
      </div>
      <h2 style="font-size: 24px; margin-bottom: 8px;">${callerData.callerName}</h2>
      <p style="font-size: 16px; color: #aaa; margin-bottom: 40px;">Gelen Arama...</p>
      <div style="display: flex; gap: 40px; justify-content: center;">
        <button onclick="rejectDirectCall()" style="
          width: 70px; height: 70px; border-radius: 50%; border: none;
          background: #ff4444; color: #fff; font-size: 24px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        ">
          <i class="fas fa-phone-slash"></i>
        </button>
        <button onclick="acceptDirectCall(${JSON.stringify(callerData).replace(/"/g, '&quot;')})" style="
          width: 70px; height: 70px; border-radius: 50%; border: none;
          background: #1db954; color: #fff; font-size: 24px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        ">
          <i class="fas fa-phone"></i>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(ui);
}

function showOutgoingCallUI(targetName, targetPhoto) {
  hideAllCallUIs();
  
  const ui = document.createElement('div');
  ui.id = 'outgoingCallUI';
  ui.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0,0,0,0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
  `;

  const photoUrl = targetPhoto && targetPhoto !== '?' 
    ? targetPhoto 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=ff0033&color=fff&size=128`;

  ui.innerHTML = `
    <div style="text-align: center;">
      <div style="margin-bottom: 20px;">
        <img src="${photoUrl}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #1db954;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=ff0033&color=fff&size=128'" />
      </div>
      <h2 style="font-size: 24px; margin-bottom: 8px;">${targetName}</h2>
      <p style="font-size: 16px; color: #aaa; margin-bottom: 40px;">Aranıyor...</p>
      <button onclick="endDirectCall()" style="
        width: 70px; height: 70px; border-radius: 50%; border: none;
        background: #ff4444; color: #fff; font-size: 24px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      ">
        <i class="fas fa-phone-slash"></i>
      </button>
    </div>
  `;

  document.body.appendChild(ui);
}

function showActiveCallUI() {
  hideAllCallUIs();
  
  const ui = document.createElement('div');
  ui.id = 'activeCallUI';
  ui.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background: #1a1a2e;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 200px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;

  ui.innerHTML = `
    <div style="width: 8px; height: 8px; background: #1db954; border-radius: 50%; animation: voicePulse 1.5s infinite;"></div>
    <span style="flex: 1; font-size: 14px; color: #fff;">Arama Aktif</span>
    <button onclick="endDirectCall()" style="
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: #ff4444; color: #fff; font-size: 12px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    ">
      <i class="fas fa-phone-slash"></i>
    </button>
  `;

  document.body.appendChild(ui);
}

function hideIncomingCallUI() {
  const ui = document.getElementById('incomingCallUI');
  if (ui) ui.remove();
}

function hideOutgoingCallUI() {
  const ui = document.getElementById('outgoingCallUI');
  if (ui) ui.remove();
}

function hideActiveCallUI() {
  const ui = document.getElementById('activeCallUI');
  if (ui) ui.remove();
}

function hideAllCallUIs() {
  hideIncomingCallUI();
  hideOutgoingCallUI();
  hideActiveCallUI();
}

// ==================== GRUP SESLI ODA ====================

async function joinVoiceRoom(groupId, groupName) {
  if (voiceRoomId) {
    if (String(voiceRoomId) === String(groupId)) return; // Zaten bu odadasın
    await leaveVoiceRoom(); // Başka odadaysa çık
  }

  if (directCallActive) {
    showVoiceToast('Önce aramayı sonlandırın!');
    return;
  }

  try {
    // Mikrofon izni al
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch(e) {
    showVoiceToast('Mikrofon erişimi reddedildi!');
    return;
  }

  voiceRoomId = groupId;
  voiceMembers = {};
  voicePeers = {};
  voiceAudios = {};
  voiceIsMuted = false;

  initVoiceSocket();

  // Odaya katıl
  voiceSocket.emit('voice:join', {
    groupId,
    userId: currentUser.id,
    nickname: currentUser.nickname || currentUser.username,
    photo: currentUser.profile_photo || ''
  });

  // Kendini üyelere ekle
  voiceMembers[currentUser.id] = {
    userId: String(currentUser.id),
    nickname: currentUser.nickname || currentUser.username,
    photo: currentUser.profile_photo || '',
    isMuted: false,
    isSelf: true
  };

  showVoicePanel(groupName);
  updateVoiceUI();
}

async function leaveVoiceRoom() {
  if (!voiceRoomId) return;

  voiceSocket.emit('voice:leave', { groupId: voiceRoomId, userId: currentUser.id });

  // Tüm peer bağlantılarını kapat
  Object.keys(voicePeers).forEach(uid => closePeerConnection(uid));

  // Mikrofonu kapat
  if (voiceStream) {
    voiceStream.getTracks().forEach(t => t.stop());
    voiceStream = null;
  }

  voiceRoomId = null;
  voiceMembers = {};
  voicePeers = {};
  voiceAudios = {};

  hideVoicePanel();
}

// ==================== WEBRTC (GRUP) ====================

function createPeerConnection(targetUserId) {
  if (voicePeers[targetUserId]) return voicePeers[targetUserId];

  const pc = new RTCPeerConnection({ iceServers: VOICE_ICE_SERVERS });
  voicePeers[targetUserId] = pc;

  // Kendi ses track'ini ekle
  if (voiceStream) {
    voiceStream.getTracks().forEach(track => pc.addTrack(track, voiceStream));
  }

  // ICE candidate
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      voiceSocket.emit('voice:ice', {
        targetUserId,
        fromUserId: currentUser.id,
        candidate: e.candidate
      });
    }
  };

  // Karşı tarafın sesi geldi
  pc.ontrack = (e) => {
    console.log('Ses track geldi:', targetUserId);
    let audio = voiceAudios[targetUserId];
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      voiceAudios[targetUserId] = audio;
    }
    audio.srcObject = e.streams[0];
  };

  pc.onconnectionstatechange = () => {
    console.log(`Peer ${targetUserId} durumu:`, pc.connectionState);
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      closePeerConnection(targetUserId);
    }
  };

  return pc;
}

async function createVoiceOffer(targetUserId) {
  const pc = createPeerConnection(targetUserId);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    voiceSocket.emit('voice:offer', {
      targetUserId,
      fromUserId: currentUser.id,
      offer: pc.localDescription
    });
  } catch(e) {
    console.error('Offer oluşturulamadı:', e);
  }
}

async function handleVoiceOffer(fromUserId, offer) {
  const pc = createPeerConnection(fromUserId);
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    voiceSocket.emit('voice:answer', {
      targetUserId: fromUserId,
      fromUserId: currentUser.id,
      answer: pc.localDescription
    });
  } catch(e) {
    console.error('Answer oluşturulamadı:', e);
  }
}

function closePeerConnection(userId) {
  if (voicePeers[userId]) {
    voicePeers[userId].close();
    delete voicePeers[userId];
  }
  if (voiceAudios[userId]) {
    voiceAudios[userId].srcObject = null;
    delete voiceAudios[userId];
  }
}

// ==================== MIKROFON TOGGLE ====================

function toggleVoiceMute() {
  if (!voiceStream) return;
  voiceIsMuted = !voiceIsMuted;
  voiceStream.getAudioTracks().forEach(t => { t.enabled = !voiceIsMuted; });

  if (voiceMembers[currentUser.id]) voiceMembers[currentUser.id].isMuted = voiceIsMuted;

  voiceSocket.emit('voice:mute-toggle', {
    groupId: voiceRoomId,
    userId: currentUser.id,
    isMuted: voiceIsMuted
  });

  updateVoiceUI();

  const btn = document.getElementById('voiceMuteBtn');
  if (btn) {
    btn.innerHTML = voiceIsMuted
      ? '<i class="fas fa-microphone-slash"></i>'
      : '<i class="fas fa-microphone"></i>';
    btn.style.background = voiceIsMuted ? '#ff4444' : 'rgba(255,255,255,0.15)';
    btn.title = voiceIsMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat';
  }
}

// ==================== UI ====================

function showVoicePanel(groupName) {
  let panel = document.getElementById('voicePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'voicePanel';
    document.body.appendChild(panel);
  }

  panel.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a2e;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px;
    padding: 16px 20px;
    z-index: 9000;
    min-width: 320px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    backdrop-filter: blur(12px);
  `;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:8px;height:8px;background:#1db954;border-radius:50%;animation:voicePulse 1.5s infinite;"></div>
        <span style="font-size:13px;color:#aaa;">Sesli Sohbet</span>
        <span style="font-size:14px;font-weight:700;color:#fff;" id="voicePanelGroupName">${groupName || 'Grup'}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="voiceMuteBtn" onclick="toggleVoiceMute()" title="Mikrofonu Kapat"
          style="width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.15);color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-microphone"></i>
        </button>
        <button onclick="leaveVoiceRoom()" title="Odadan Ayrıl"
          style="width:36px;height:36px;border-radius:50%;border:none;background:#ff4444;color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-phone-slash"></i>
        </button>
      </div>
    </div>
    <div id="voiceMembersList" style="display:flex;flex-wrap:wrap;gap:10px;"></div>
  `;

  // Pulse animasyonu
  if (!document.getElementById('voicePulseStyle')) {
    const style = document.createElement('style');
    style.id = 'voicePulseStyle';
    style.textContent = `
      @keyframes voicePulse {
        0%,100% { opacity:1; transform:scale(1); }
        50% { opacity:0.5; transform:scale(1.3); }
      }
      .voice-member-card { transition: all 0.2s; }
      .voice-member-card.speaking { box-shadow: 0 0 0 2px #1db954; }
    `;
    document.head.appendChild(style);
  }
}

function hideVoicePanel() {
  const panel = document.getElementById('voicePanel');
  if (panel) panel.remove();
}

function updateVoiceUI() {
  const list = document.getElementById('voiceMembersList');
  if (!list) return;

  const members = Object.values(voiceMembers);
  if (members.length === 0) {
    list.innerHTML = '<p style="color:#666;font-size:13px;">Henüz kimse yok...</p>';
    return;
  }

  list.innerHTML = members.map(m => {
    const isSelf = String(m.userId) === String(currentUser.id);
    const photoUrl = m.photo && m.photo !== '?' ? m.photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nickname)}&background=ff0033&color=fff&size=64`;
    return `
      <div class="voice-member-card" style="
        display:flex;flex-direction:column;align-items:center;gap:6px;
        background:rgba(255,255,255,0.06);border-radius:12px;padding:10px 14px;
        min-width:72px;position:relative;
        ${m.isMuted ? 'opacity:0.7;' : ''}
      ">
        <div style="position:relative;">
          <img src="${photoUrl}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid ${m.isMuted ? '#ff4444' : '#1db954'};" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.nickname)}&background=ff0033&color=fff&size=64'" />
          ${m.isMuted ? '<div style="position:absolute;bottom:-2px;right:-2px;background:#ff4444;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:8px;"><i class="fas fa-microphone-slash" style="color:#fff;"></i></div>' : ''}
        </div>
        <span style="font-size:11px;color:#ddd;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">
          ${isSelf ? 'Sen' : m.nickname}
        </span>
      </div>
    `;
  }).join('');
}

function showVoiceToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:160px;left:50%;transform:translateX(-50%);
    background:#1db954;color:#fff;padding:8px 18px;border-radius:20px;
    font-size:13px;font-weight:600;z-index:9999;pointer-events:none;
    animation:fadeInOut 2.5s forwards;
  `;
  t.textContent = msg;
  if (!document.getElementById('voiceFadeStyle')) {
    const s = document.createElement('style');
    s.id = 'voiceFadeStyle';
    s.textContent = '@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(10px)}15%{opacity:1;transform:translateX(-50%) translateY(0)}80%{opacity:1}100%{opacity:0}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}