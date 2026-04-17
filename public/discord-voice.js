// DemlikChat - WebRTC Voice Chat
// Tam çalışan sesli sohbet sistemi

// ==================== VOICE CHAT MANAGER ====================

class VoiceManager {
  constructor() {
    this.localStream = null;
    this.peers = new Map(); // userId -> SimplePeer instance
    this.currentVoiceChannel = null;
    this.isMuted = false;
    this.isDeafened = false;
    this.audioContext = null;
    this.audioElements = new Map(); // userId -> audio element
    
    // WebRTC configuration
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };
  }

  // ==================== VOICE CHANNEL JOIN ====================
  
  async joinVoiceChannel(channelId) {
    try {
      console.log('🎤 Joining voice channel:', channelId);
      
      // Get microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      console.log('✅ Microphone access granted');
      
      this.currentVoiceChannel = channelId;
      
      // Show voice panel
      this.showVoicePanel(channelId);
      
      // Notify server
      socket.emit('join_voice', {
        userId: currentUser.id,
        username: currentUser.displayName || currentUser.username,
        serverId: currentServer,
        channelId: channelId
      });
      
      showToast('Sesli kanala bağlandı! 🎤', 'success');
      
      return true;
    } catch (err) {
      console.error('❌ Voice join error:', err);
      
      if (err.name === 'NotAllowedError') {
        showToast('Mikrofon izni reddedildi', 'error');
      } else if (err.name === 'NotFoundError') {
        showToast('Mikrofon bulunamadı', 'error');
      } else {
        showToast('Sesli kanala bağlanılamadı', 'error');
      }
      
      return false;
    }
  }

  // ==================== PEER CONNECTION ====================
  
  createPeer(userId, username, initiator = false) {
    console.log(`🔗 Creating peer connection with ${username} (initiator: ${initiator})`);
    
    const peer = new SimplePeer({
      initiator: initiator,
      stream: this.localStream,
      config: this.config,
      trickle: true
    });
    
    // Peer events
    peer.on('signal', (signal) => {
      console.log('📡 Sending signal to', username);
      socket.emit('voice_signal', {
        to: userId,
        from: currentUser.id,
        signal: signal,
        channelId: this.currentVoiceChannel
      });
    });
    
    peer.on('stream', (remoteStream) => {
      console.log('🔊 Received stream from', username);
      this.handleRemoteStream(userId, username, remoteStream);
    });
    
    peer.on('error', (err) => {
      console.error('❌ Peer error with', username, err);
      this.removePeer(userId);
    });
    
    peer.on('close', () => {
      console.log('🔌 Peer connection closed with', username);
      this.removePeer(userId);
    });
    
    this.peers.set(userId, { peer, username });
    
    return peer;
  }

  // ==================== REMOTE STREAM HANDLING ====================
  
  handleRemoteStream(userId, username, stream) {
    // Create audio element for remote stream
    let audio = this.audioElements.get(userId);
    
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.volume = this.isDeafened ? 0 : 1;
      document.body.appendChild(audio);
      this.audioElements.set(userId, audio);
    }
    
    audio.srcObject = stream;
    
    // Add user to voice users list
    this.addVoiceUser(userId, username);
    
    // Show speaking indicator
    this.setupSpeakingIndicator(userId, stream);
  }

  // ==================== SPEAKING INDICATOR ====================
  
  setupSpeakingIndicator(userId, stream) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkAudio = () => {
      if (!this.peers.has(userId)) return;
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      const userEl = document.querySelector(`[data-voice-user="${userId}"]`);
      if (userEl) {
        if (average > 30) {
          userEl.classList.add('speaking');
        } else {
          userEl.classList.remove('speaking');
        }
      }
      
      requestAnimationFrame(checkAudio);
    };
    
    checkAudio();
  }

  // ==================== VOICE USERS UI ====================
  
  addVoiceUser(userId, username) {
    const voiceUsersList = document.getElementById('voice-users-list');
    if (!voiceUsersList) return;
    
    // Check if already exists
    if (document.querySelector(`[data-voice-user="${userId}"]`)) return;
    
    const userEl = document.createElement('div');
    userEl.className = 'voice-user-item';
    userEl.dataset.voiceUser = userId;
    userEl.innerHTML = `
      <div class="voice-user-avatar">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--brand);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;">
          ${username.charAt(0).toUpperCase()}
        </div>
        <div class="speaking-indicator"></div>
      </div>
      <span class="voice-user-name">${username}</span>
      <i class="fas fa-microphone voice-user-icon"></i>
    `;
    
    voiceUsersList.appendChild(userEl);
  }

  removeVoiceUser(userId) {
    const userEl = document.querySelector(`[data-voice-user="${userId}"]`);
    if (userEl) userEl.remove();
  }

  // ==================== VOICE CONTROLS ====================
  
  toggleMute() {
    if (!this.localStream) return;
    
    this.isMuted = !this.isMuted;
    
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });
    
    const muteBtn = document.getElementById('voice-mute-btn');
    if (muteBtn) {
      muteBtn.classList.toggle('active', this.isMuted);
      muteBtn.querySelector('i').className = this.isMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
    }
    
    // Notify others
    socket.emit('voice_mute_status', {
      userId: currentUser.id,
      channelId: this.currentVoiceChannel,
      muted: this.isMuted
    });
    
    showToast(this.isMuted ? 'Mikrofon kapatıldı' : 'Mikrofon açıldı', 'info');
  }

  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    
    // Mute all remote audio
    this.audioElements.forEach(audio => {
      audio.volume = this.isDeafened ? 0 : 1;
    });
    
    // Also mute local mic when deafened
    if (this.isDeafened && !this.isMuted) {
      this.toggleMute();
    }
    
    const deafenBtn = document.getElementById('voice-deafen-btn');
    if (deafenBtn) {
      deafenBtn.classList.toggle('active', this.isDeafened);
      deafenBtn.querySelector('i').className = this.isDeafened ? 'fas fa-volume-mute' : 'fas fa-headphones';
    }
    
    showToast(this.isDeafened ? 'Kulaklık kapatıldı' : 'Kulaklık açıldı', 'info');
  }

  // ==================== DISCONNECT ====================
  
  disconnect() {
    console.log('🔌 Disconnecting from voice channel');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close all peer connections
    this.peers.forEach(({ peer, username }) => {
      console.log('Closing peer connection with', username);
      peer.destroy();
    });
    this.peers.clear();
    
    // Remove all audio elements
    this.audioElements.forEach(audio => {
      audio.srcObject = null;
      audio.remove();
    });
    this.audioElements.clear();
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Notify server
    if (this.currentVoiceChannel) {
      socket.emit('leave_voice', {
        userId: currentUser.id,
        channelId: this.currentVoiceChannel
      });
    }
    
    // Hide voice panel
    this.hideVoicePanel();
    
    this.currentVoiceChannel = null;
    this.isMuted = false;
    this.isDeafened = false;
    
    showToast('Sesli kanaldan ayrıldı', 'info');
  }

  // ==================== PEER MANAGEMENT ====================
  
  removePeer(userId) {
    const peerData = this.peers.get(userId);
    if (peerData) {
      peerData.peer.destroy();
      this.peers.delete(userId);
    }
    
    const audio = this.audioElements.get(userId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.audioElements.delete(userId);
    }
    
    this.removeVoiceUser(userId);
  }

  // ==================== VOICE PANEL UI ====================
  
  showVoicePanel(channelId) {
    const panel = document.getElementById('voice-panel');
    if (!panel) return;
    
    panel.style.display = 'block';
    
    const channelName = document.getElementById('voice-channel-name');
    if (channelName) {
      channelName.textContent = channelId;
    }
    
    // Create voice users list if not exists
    let voiceUsersList = document.getElementById('voice-users-list');
    if (!voiceUsersList) {
      voiceUsersList = document.createElement('div');
      voiceUsersList.id = 'voice-users-list';
      voiceUsersList.style.cssText = 'padding:8px;max-height:200px;overflow-y:auto;';
      panel.querySelector('.voice-panel-content').insertBefore(
        voiceUsersList, 
        panel.querySelector('.voice-controls')
      );
    }
    
    // Add self to voice users
    this.addVoiceUser(currentUser.id, currentUser.displayName || currentUser.username);
  }

  hideVoicePanel() {
    const panel = document.getElementById('voice-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    
    const voiceUsersList = document.getElementById('voice-users-list');
    if (voiceUsersList) {
      voiceUsersList.innerHTML = '';
    }
  }

  // ==================== SIGNAL HANDLING ====================
  
  handleSignal(data) {
    const { from, signal, username } = data;
    
    console.log('📡 Received signal from', username);
    
    let peerData = this.peers.get(from);
    
    if (!peerData) {
      // Create new peer (not initiator)
      const peer = this.createPeer(from, username, false);
      peerData = this.peers.get(from);
    }
    
    if (peerData) {
      peerData.peer.signal(signal);
    }
  }

  // ==================== USER JOINED/LEFT ====================
  
  handleUserJoined(data) {
    const { userId, username } = data;
    
    if (userId === currentUser.id) return;
    
    console.log('👤 User joined voice:', username);
    
    // Create peer connection (we are initiator)
    this.createPeer(userId, username, true);
    
    showToast(`${username} sesli kanala katıldı`, 'info');
  }

  handleUserLeft(data) {
    const { userId, username } = data;
    
    console.log('👋 User left voice:', username);
    
    this.removePeer(userId);
    
    showToast(`${username} sesli kanaldan ayrıldı`, 'info');
  }
}

// ==================== GLOBAL VOICE MANAGER ====================

const voiceManager = new VoiceManager();

// ==================== SOCKET EVENT HANDLERS ====================

if (typeof socket !== 'undefined') {
  // Voice signal
  socket.on('voice_signal', (data) => {
    voiceManager.handleSignal(data);
  });
  
  // User joined voice
  socket.on('user_joined_voice', (data) => {
    voiceManager.handleUserJoined(data);
  });
  
  // User left voice
  socket.on('user_left_voice', (data) => {
    voiceManager.handleUserLeft(data);
  });
  
  // Existing users in voice channel
  socket.on('voice_users', (data) => {
    console.log('👥 Existing voice users:', data.users);
    
    data.users.forEach(user => {
      if (user.userId !== currentUser.id) {
        voiceManager.handleUserJoined(user);
      }
    });
  });
}

// ==================== VOICE CHANNEL CLICK HANDLER ====================

// Override switchChannel for voice channels
const originalSwitchChannel = window.switchChannel;
window.switchChannel = function(channelId, channelType) {
  if (channelType === 'voice') {
    // Join voice channel
    voiceManager.joinVoiceChannel(channelId);
  } else {
    // Call original function for text channels
    if (originalSwitchChannel) {
      originalSwitchChannel(channelId, channelType);
    }
  }
};

// ==================== VOICE CONTROL BUTTONS ====================

document.getElementById('voice-disconnect-btn')?.addEventListener('click', () => {
  voiceManager.disconnect();
});

document.getElementById('voice-mute-btn')?.addEventListener('click', () => {
  voiceManager.toggleMute();
});

document.getElementById('voice-deafen-btn')?.addEventListener('click', () => {
  voiceManager.toggleDeafen();
});

// User panel mute/deafen buttons
document.getElementById('mute-btn')?.addEventListener('click', () => {
  if (voiceManager.currentVoiceChannel) {
    voiceManager.toggleMute();
  }
});

document.getElementById('deafen-btn')?.addEventListener('click', () => {
  if (voiceManager.currentVoiceChannel) {
    voiceManager.toggleDeafen();
  }
});

// ==================== CLEANUP ON PAGE UNLOAD ====================

window.addEventListener('beforeunload', () => {
  if (voiceManager.currentVoiceChannel) {
    voiceManager.disconnect();
  }
});

console.log('✅ DemlikChat Voice System loaded');
