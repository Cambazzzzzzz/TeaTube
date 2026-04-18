// ==================== SESLI SOHBET + 1-1 ARAMA - TeaTube ====================
// Socket.IO + WebRTC ile grup sesli oda sistemi + direkt arama

let voiceSocket = null;
let voiceStream = null;       // Kendi mikrofon stream'i
let voicePeers = {};          // { userId: RTCPeerConnection }
let voiceAudios = {};         // { userId: HTMLAudioElement }
let voiceRoomId = null;       // Aktif oda (groupId)
let voiceIsMuted = false;
let voiceMembers = {};        // { userId: { nickname, photo, isMuted, isSpeaking } }

// 1-1 Arama değişkenleri
let directCallActive = false;
let directCallPeer = null;
let directCallStream = null;
let directCallAudio = null;
let directCallTargetId = null;

// Bildirim sesleri
let ringSound = null;
let callSound = null;

// Ses cihazları
let audioInputDevices = [];
let audioOutputDevices = [];
let selectedInputDevice = null;
let selectedOutputDevice = null;

// Konuşma algılama
let audioContext = null;
let analyser = null;
let speakingThreshold = -50; // dB
let speakingUsers = new Set();

// Ses efektleri
let voiceEffects = {
  robot: false,
  echo: false,
  reverb: false,
  pitch: false,
  distortion: false
};
let voiceEffectNodes = {};
let voiceEffectIntensities = {
  robot: 0.5,
  echo: 0.5,
  reverb: 0.5,
  pitch: 0,
  distortion: 0.5
};

const VOICE_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

// ==================== SES CİHAZI YÖNETİMİ ====================

async function loadAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    audioInputDevices = devices.filter(d => d.kind === 'audioinput');
    audioOutputDevices = devices.filter(d => d.kind === 'audiooutput');
    
    // Varsayılan cihazları seç
    if (!selectedInputDevice && audioInputDevices.length > 0) {
      selectedInputDevice = audioInputDevices[0].deviceId;
    }
    if (!selectedOutputDevice && audioOutputDevices.length > 0) {
      selectedOutputDevice = audioOutputDevices[0].deviceId;
    }
    
    console.log('Ses cihazları yüklendi:', { input: audioInputDevices.length, output: audioOutputDevices.length });
  } catch(e) {
    console.error('Ses cihazları yüklenemedi:', e);
  }
}

function showAudioDeviceSettings() {
  const modal = document.createElement('div');
  modal.id = 'audioDeviceModal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 10001; background: rgba(0,0,0,0.8);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  `;
  
  modal.innerHTML = `
    <div style="background: #1a1a2e; border-radius: 16px; padding: 24px; width: 100%; max-width: 400px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #fff;">Ses Cihazları</h3>
        <button onclick="document.getElementById('audioDeviceModal').remove();" style="background: none; border: none; color: #aaa; font-size: 20px; cursor: pointer;">×</button>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; color: #aaa; font-size: 13px; margin-bottom: 6px;">Mikrofon</label>
        <select id="inputDeviceSelect" onchange="changeInputDevice(this.value)" style="width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 10px; color: #fff; font-size: 14px;">
          ${audioInputDevices.map(d => `<option value="${d.deviceId}" ${d.deviceId === selectedInputDevice ? 'selected' : ''}>${d.label || 'Mikrofon ' + (audioInputDevices.indexOf(d) + 1)}</option>`).join('')}
        </select>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; color: #aaa; font-size: 13px; margin-bottom: 6px;">Hoparlör</label>
        <select id="outputDeviceSelect" onchange="changeOutputDevice(this.value)" style="width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 10px; color: #fff; font-size: 14px;">
          ${audioOutputDevices.map(d => `<option value="${d.deviceId}" ${d.deviceId === selectedOutputDevice ? 'selected' : ''}>${d.label || 'Hoparlör ' + (audioOutputDevices.indexOf(d) + 1)}</option>`).join('')}
        </select>
      </div>
      
      <button onclick="testAudioDevices()" style="width: 100%; background: #1db954; border: none; color: #fff; padding: 12px; border-radius: 8px; font-size: 14px; cursor: pointer; margin-bottom: 8px;">
        <i class="fas fa-volume-up"></i> Test Et
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function changeInputDevice(deviceId) {
  selectedInputDevice = deviceId;
  
  // Aktif stream varsa yeniden başlat
  if (voiceStream || directCallStream) {
    try {
      const constraints = { 
        audio: { deviceId: { exact: deviceId } },
        video: false 
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Eski stream'i durdur
      if (voiceStream) {
        voiceStream.getTracks().forEach(t => t.stop());
        voiceStream = newStream;
      }
      if (directCallStream) {
        directCallStream.getTracks().forEach(t => t.stop());
        directCallStream = newStream;
      }
      
      // Peer bağlantılarını güncelle
      Object.values(voicePeers).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) {
          sender.replaceTrack(newStream.getAudioTracks()[0]);
        }
      });
      
      if (directCallPeer) {
        const sender = directCallPeer.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) {
          sender.replaceTrack(newStream.getAudioTracks()[0]);
        }
      }
      
      showVoiceToast('Mikrofon değiştirildi');
    } catch(e) {
      console.error('Mikrofon değiştirilemedi:', e);
      showVoiceToast('Mikrofon değiştirilemedi!');
    }
  }
}

async function changeOutputDevice(deviceId) {
  selectedOutputDevice = deviceId;
  
  // Tüm audio elementlerinin çıkış cihazını değiştir
  try {
    Object.values(voiceAudios).forEach(audio => {
      if (audio.setSinkId) {
        audio.setSinkId(deviceId).catch(e => console.log('setSinkId hatası:', e));
      }
    });
    
    if (directCallAudio && directCallAudio.setSinkId) {
      directCallAudio.setSinkId(deviceId).catch(e => console.log('setSinkId hatası:', e));
    }
    
    showVoiceToast('Hoparlör değiştirildi');
  } catch(e) {
    console.error('Hoparlör değiştirilemedi:', e);
  }
}

function testAudioDevices() {
  // Test sesi çal
  const testAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
  testAudio.volume = 0.3;
  
  if (selectedOutputDevice && testAudio.setSinkId) {
    testAudio.setSinkId(selectedOutputDevice).then(() => {
      testAudio.play();
      showVoiceToast('Test sesi çalınıyor...');
    }).catch(e => {
      testAudio.play();
      showVoiceToast('Test sesi çalınıyor (varsayılan cihaz)...');
    });
  } else {
    testAudio.play();
    showVoiceToast('Test sesi çalınıyor...');
  }
}

// ==================== SES EFEKTLERİ ====================

function showVoiceEffectsPanel() {
  const modal = document.createElement('div');
  modal.id = 'voiceEffectsModal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 10002; background: rgba(0,0,0,0.8);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  `;
  
  modal.innerHTML = `
    <div style="background: #1a1a2e; border-radius: 16px; padding: 24px; width: 100%; max-width: 450px; max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #fff;">Ses Efektleri</h3>
        <button onclick="document.getElementById('voiceEffectsModal').remove();" style="background: none; border: none; color: #aaa; font-size: 20px; cursor: pointer;">×</button>
      </div>
      
      ${createEffectControl('robot', 'Robot', 'fa-robot')}
      ${createEffectControl('echo', 'Yankı', 'fa-water')}
      ${createEffectControl('reverb', 'Reverb', 'fa-broadcast-tower')}
      ${createEffectControl('pitch', 'Pitch', 'fa-sliders-h')}
      ${createEffectControl('distortion', 'Distortion', 'fa-wave-square')}
      
      <button onclick="clearAllEffects()" style="width: 100%; background: rgba(255,0,0,0.15); border: 1px solid rgba(255,0,0,0.3); color: #ff4444; padding: 12px; border-radius: 8px; cursor: pointer; margin-top: 16px;">
        <i class="fas fa-times"></i> Tüm Efektleri Kaldır
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function createEffectControl(effectName, label, icon) {
  const isActive = voiceEffects[effectName];
  const intensity = voiceEffectIntensities[effectName];
  
  return `
    <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 10px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fas ${icon}" style="color: ${isActive ? '#1db954' : '#666'}; font-size: 18px;"></i>
          <span style="color: #fff; font-size: 15px; font-weight: 500;">${label}</span>
        </div>
        <label style="position: relative; display: inline-block; width: 44px; height: 24px;">
          <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleVoiceEffect('${effectName}', this.checked)" style="opacity: 0; width: 0; height: 0;">
          <span style="position: absolute; cursor: pointer; inset: 0; background: ${isActive ? '#1db954' : '#666'}; border-radius: 24px; transition: 0.3s;"></span>
          <span style="position: absolute; content: ''; height: 18px; width: 18px; left: ${isActive ? '23px' : '3px'}; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s;"></span>
        </label>
      </div>
      ${effectName !== 'pitch' ? `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="color: #aaa; font-size: 12px; width: 60px;">Yoğunluk</span>
          <input type="range" min="0" max="100" value="${intensity * 100}" oninput="updateEffectIntensity('${effectName}', this.value / 100)" style="flex: 1; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); outline: none; -webkit-appearance: none;">
          <span style="color: #1db954; font-size: 12px; width: 35px; text-align: right;">${Math.round(intensity * 100)}%</span>
        </div>
      ` : `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="color: #aaa; font-size: 12px; width: 60px;">Pitch</span>
          <input type="range" min="-12" max="12" value="${intensity}" oninput="updateEffectIntensity('${effectName}', parseFloat(this.value))" style="flex: 1; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); outline: none; -webkit-appearance: none;">
          <span style="color: #1db954; font-size: 12px; width: 35px; text-align: right;">${intensity > 0 ? '+' : ''}${intensity}</span>
        </div>
      `}
    </div>
  `;
}

function toggleVoiceEffect(effectName, enabled) {
  voiceEffects[effectName] = enabled;
  
  if (enabled) {
    applyVoiceEffect(effectName);
  } else {
    removeVoiceEffect(effectName);
  }
  
  showVoiceToast(enabled ? `${effectName} efekti aktif` : `${effectName} efekti kapatıldı`);
  
  // Modal'ı güncelle
  const modal = document.getElementById('voiceEffectsModal');
  if (modal) {
    modal.remove();
    showVoiceEffectsPanel();
  }
}

function updateEffectIntensity(effectName, value) {
  voiceEffectIntensities[effectName] = value;
  
  if (voiceEffects[effectName]) {
    applyVoiceEffect(effectName);
  }
  
  // Değeri güncelle
  const modal = document.getElementById('voiceEffectsModal');
  if (modal) {
    const valueSpan = modal.querySelector(`input[oninput*="${effectName}"]`)?.parentElement?.querySelector('span:last-child');
    if (valueSpan) {
      if (effectName === 'pitch') {
        valueSpan.textContent = `${value > 0 ? '+' : ''}${value}`;
      } else {
        valueSpan.textContent = `${Math.round(value * 100)}%`;
      }
    }
  }
}

function applyVoiceEffect(effectName) {
  if (!audioContext || !voiceStream) return;
  
  try {
    const source = audioContext.createMediaStreamSource(voiceStream);
    let effectNode;
    
    switch(effectName) {
      case 'robot':
        effectNode = audioContext.createBiquadFilter();
        effectNode.type = 'lowpass';
        effectNode.frequency.value = 1000 * (1 - voiceEffectIntensities.robot * 0.8);
        break;
        
      case 'echo':
        effectNode = audioContext.createDelay();
        effectNode.delayTime.value = 0.3 * voiceEffectIntensities.echo;
        const feedback = audioContext.createGain();
        feedback.gain.value = 0.5 * voiceEffectIntensities.echo;
        effectNode.connect(feedback);
        feedback.connect(effectNode);
        break;
        
      case 'reverb':
        effectNode = audioContext.createConvolver();
        // Basit reverb buffer oluştur
        const reverbTime = 2 * voiceEffectIntensities.reverb;
        const sampleRate = audioContext.sampleRate;
        const length = sampleRate * reverbTime;
        const impulse = audioContext.createBuffer(2, length, sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const channelData = impulse.getChannelData(channel);
          for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
          }
        }
        effectNode.buffer = impulse;
        break;
        
      case 'pitch':
        // Pitch shifting basit bir şekilde (playback rate ile)
        // Not: Gerçek pitch shifting daha karmaşık
        effectNode = audioContext.createGain();
        effectNode.gain.value = 1.0;
        break;
        
      case 'distortion':
        effectNode = audioContext.createWaveShaper();
        const amount = voiceEffectIntensities.distortion * 100;
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
        }
        effectNode.curve = curve;
        effectNode.oversample = '4x';
        break;
    }
    
    if (effectNode) {
      voiceEffectNodes[effectName] = effectNode;
      source.connect(effectNode);
      effectNode.connect(audioContext.destination);
    }
  } catch(e) {
    console.error('Efekt uygulanamadı:', effectName, e);
  }
}

function removeVoiceEffect(effectName) {
  if (voiceEffectNodes[effectName]) {
    try {
      voiceEffectNodes[effectName].disconnect();
      delete voiceEffectNodes[effectName];
    } catch(e) {
      console.error('Efekt kaldırılamadı:', effectName, e);
    }
  }
}

function clearAllEffects() {
  Object.keys(voiceEffects).forEach(effectName => {
    voiceEffects[effectName] = false;
    removeVoiceEffect(effectName);
  });
  
  showVoiceToast('Tüm efektler kaldırıldı');
  
  const modal = document.getElementById('voiceEffectsModal');
  if (modal) {
    modal.remove();
    showVoiceEffectsPanel();
  }
}

// ==================== KONUŞMA ALGILAMA ====================

function initSpeakingDetection(stream) {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function detectSpeaking() {
      if (!analyser) return;
      
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const decibels = 20 * Math.log10(average / 255);
      
      const isSpeaking = decibels > speakingThreshold;
      const wasAlreadySpeaking = speakingUsers.has(currentUser.id);
      
      if (isSpeaking && !wasAlreadySpeaking) {
        speakingUsers.add(currentUser.id);
        if (voiceMembers[currentUser.id]) {
          voiceMembers[currentUser.id].isSpeaking = true;
        }
        updateVoiceUI();
        
        // Diğer kullanıcılara bildir
        if (voiceSocket && voiceRoomId) {
          voiceSocket.emit('voice:speaking-changed', {
            groupId: voiceRoomId,
            userId: currentUser.id,
            isSpeaking: true
          });
        }
      } else if (!isSpeaking && wasAlreadySpeaking) {
        speakingUsers.delete(currentUser.id);
        if (voiceMembers[currentUser.id]) {
          voiceMembers[currentUser.id].isSpeaking = false;
        }
        updateVoiceUI();
        
        // Diğer kullanıcılara bildir
        if (voiceSocket && voiceRoomId) {
          voiceSocket.emit('voice:speaking-changed', {
            groupId: voiceRoomId,
            userId: currentUser.id,
            isSpeaking: false
          });
        }
      }
      
      requestAnimationFrame(detectSpeaking);
    }
    
    detectSpeaking();
  } catch(e) {
    console.error('Konuşma algılama başlatılamadı:', e);
  }
}

function initNotificationSounds() {
  // Arama zil sesi (gelen arama) - Direkt ses dosyası
  ringSound = new Audio();
  ringSound.src = 'https://media.vocaroo.com/mp3/1gJEC8z2mRY1';
  ringSound.loop = true;
  ringSound.volume = 0.7;
  ringSound.load();
  
  // Arama sesi (arayan için) - Direkt ses dosyası
  callSound = new Audio();
  callSound.src = 'https://media.vocaroo.com/mp3/1d7VPIDMXCK0';
  callSound.loop = true;
  callSound.volume = 0.6;
  callSound.load();
  
  console.log('Bildirim sesleri yüklendi');
}

function playRingSound() {
  if (ringSound) {
    ringSound.currentTime = 0;
    ringSound.play().then(() => {
      console.log('Ring sesi çalıyor');
    }).catch(e => {
      console.log('Ring ses çalamadı:', e);
      // Kullanıcı etkileşimi gerekebilir
      document.addEventListener('click', () => {
        ringSound.play().catch(console.error);
      }, { once: true });
    });
  }
}

function playCallSound() {
  if (callSound) {
    callSound.currentTime = 0;
    callSound.play().then(() => {
      console.log('Call sesi çalıyor');
    }).catch(e => {
      console.log('Call ses çalamadı:', e);
      document.addEventListener('click', () => {
        callSound.play().catch(console.error);
      }, { once: true });
    });
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
    loadAudioDevices(); // Ses cihazlarını yükle
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

  // Konuşma durumu değişti
  voiceSocket.on('voice:speaking-changed', (data) => {
    if (voiceMembers[data.userId]) {
      voiceMembers[data.userId].isSpeaking = data.isSpeaking;
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
    // Mikrofon izni al (seçili cihazla)
    const constraints = { 
      audio: selectedInputDevice ? { deviceId: { exact: selectedInputDevice } } : true,
      video: false 
    };
    directCallStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Konuşma algılamayı başlat
    initSpeakingDetection(directCallStream);
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
    console.log('Direkt arama ses geldi', e.streams);
    if (!directCallAudio) {
      directCallAudio = new Audio();
      directCallAudio.autoplay = true;
    }
    directCallAudio.srcObject = e.streams[0];
    directCallAudio.volume = 1.0;
    
    // Seçili çıkış cihazını kullan
    if (selectedOutputDevice && directCallAudio.setSinkId) {
      directCallAudio.setSinkId(selectedOutputDevice).catch(e => console.log('setSinkId hatası:', e));
    }
    
    // Manuel play (bazı tarayıcılarda gerekli)
    directCallAudio.play().catch(e => {
      console.log('Audio play hatası:', e);
      // Kullanıcı etkileşimi gerekebilir
      document.addEventListener('click', () => {
        directCallAudio.play().catch(console.error);
      }, { once: true });
    });
  };

  // Offer oluştur ve gönder
  try {
    const offer = await directCallPeer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    await directCallPeer.setLocalDescription(offer);
    
    console.log('Offer oluşturuldu:', offer);

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
    // Mikrofon izni al (seçili cihazla)
    const constraints = { 
      audio: selectedInputDevice ? { deviceId: { exact: selectedInputDevice } } : true,
      video: false 
    };
    directCallStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Konuşma algılamayı başlat
    initSpeakingDetection(directCallStream);
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
    console.log('Kabul edilen arama ses geldi', e.streams);
    if (!directCallAudio) {
      directCallAudio = new Audio();
      directCallAudio.autoplay = true;
    }
    directCallAudio.srcObject = e.streams[0];
    directCallAudio.volume = 1.0;
    
    // Seçili çıkış cihazını kullan
    if (selectedOutputDevice && directCallAudio.setSinkId) {
      directCallAudio.setSinkId(selectedOutputDevice).catch(e => console.log('setSinkId hatası:', e));
    }
    
    // Manuel play
    directCallAudio.play().catch(e => {
      console.log('Audio play hatası:', e);
      document.addEventListener('click', () => {
        directCallAudio.play().catch(console.error);
      }, { once: true });
    });
  };

  try {
    // Remote description ayarla
    await directCallPeer.setRemoteDescription(new RTCSessionDescription(callerData.offer));
    console.log('Remote description ayarlandı');

    // Answer oluştur
    const answer = await directCallPeer.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    await directCallPeer.setLocalDescription(answer);
    console.log('Answer oluşturuldu:', answer);

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

  // Audio context temizle
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(e => console.log('AudioContext kapatma hatası:', e));
    audioContext = null;
    analyser = null;
  }

  directCallActive = false;
  directCallTargetId = null;
  speakingUsers.clear();

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
      <div style="margin-bottom: 20px; position: relative;">
        <div class="incoming-ring-animation" style="position: absolute; inset: -12px; border-radius: 50%; border: 3px solid #1db954; opacity: 0; animation: ringPulse 2s ease-out infinite;"></div>
        <div class="incoming-ring-animation" style="position: absolute; inset: -12px; border-radius: 50%; border: 3px solid #1db954; opacity: 0; animation: ringPulse 2s ease-out infinite 1s;"></div>
        <img src="${photoUrl}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #1db954;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(callerData.callerName)}&background=ff0033&color=fff&size=128'" />
      </div>
      <h2 style="font-size: 24px; margin-bottom: 8px;">${callerData.callerName}</h2>
      <p style="font-size: 16px; color: #1db954; margin-bottom: 40px; animation: blink 1.5s infinite;">Gelen Arama...</p>
      <div style="display: flex; gap: 40px; justify-content: center;">
        <button onclick="rejectDirectCall()" style="
          width: 70px; height: 70px; border-radius: 50%; border: none;
          background: #ff4444; color: #fff; font-size: 24px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          <i class="fas fa-phone-slash"></i>
        </button>
        <button onclick="acceptDirectCall(${JSON.stringify(callerData).replace(/"/g, '&quot;')})" style="
          width: 70px; height: 70px; border-radius: 50%; border: none;
          background: #1db954; color: #fff; font-size: 24px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          <i class="fas fa-phone"></i>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(ui);
  
  // Animasyon stilleri ekle
  if (!document.getElementById('incomingCallAnimationStyle')) {
    const style = document.createElement('style');
    style.id = 'incomingCallAnimationStyle';
    style.textContent = `
      @keyframes ringPulse {
        0% { 
          transform: scale(1); 
          opacity: 0.8; 
        }
        100% { 
          transform: scale(1.5); 
          opacity: 0; 
        }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }
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
      <div style="margin-bottom: 20px; position: relative;">
        <img src="${photoUrl}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #1db954;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=ff0033&color=fff&size=128'" />
        <div class="calling-animation" style="position: absolute; inset: -8px; border-radius: 50%; border: 2px solid transparent; border-top: 2px solid #1db954; animation: spin 1s linear infinite;"></div>
      </div>
      <h2 style="font-size: 24px; margin-bottom: 8px;">${targetName}</h2>
      <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 40px;">
        <span style="font-size: 16px; color: #aaa;">Aranıyor</span>
        <div class="waiting-dots">
          <span style="animation: waitingDot 1.4s infinite; animation-delay: 0s;">.</span>
          <span style="animation: waitingDot 1.4s infinite; animation-delay: 0.2s;">.</span>
          <span style="animation: waitingDot 1.4s infinite; animation-delay: 0.4s;">.</span>
        </div>
      </div>
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
  
  // Animasyon stilleri ekle
  if (!document.getElementById('callingAnimationStyle')) {
    const style = document.createElement('style');
    style.id = 'callingAnimationStyle';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes waitingDot {
        0%, 60%, 100% { opacity: 0.3; }
        30% { opacity: 1; }
      }
      .waiting-dots span {
        font-size: 20px;
        color: #1db954;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }
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
    min-width: 240px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;

  ui.innerHTML = `
    <div style="width: 8px; height: 8px; background: #1db954; border-radius: 50%; animation: voicePulse 1.5s infinite;"></div>
    <span style="flex: 1; font-size: 14px; color: #fff;">Arama Aktif</span>
    <button onclick="showVoiceEffectsPanel()" title="Ses Efektleri" style="
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: rgba(255,255,255,0.1); color: #fff; font-size: 12px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    ">
      <i class="fas fa-magic"></i>
    </button>
    <button onclick="showAudioDeviceSettings()" title="Ses Ayarları" style="
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: rgba(255,255,255,0.1); color: #fff; font-size: 12px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    ">
      <i class="fas fa-cog"></i>
    </button>
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
    // Mikrofon izni al (seçili cihazla)
    const constraints = { 
      audio: selectedInputDevice ? { deviceId: { exact: selectedInputDevice } } : true,
      video: false 
    };
    voiceStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Konuşma algılamayı başlat
    initSpeakingDetection(voiceStream);
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
    isSpeaking: false,
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

  // Audio context temizle
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(e => console.log('AudioContext kapatma hatası:', e));
    audioContext = null;
    analyser = null;
  }

  voiceRoomId = null;
  voiceMembers = {};
  voicePeers = {};
  voiceAudios = {};
  speakingUsers.clear();

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
    console.log('Ses track geldi:', targetUserId, e.streams);
    let audio = voiceAudios[targetUserId];
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      audio.volume = 1.0;
      voiceAudios[targetUserId] = audio;
      
      // Seçili çıkış cihazını kullan
      if (selectedOutputDevice && audio.setSinkId) {
        audio.setSinkId(selectedOutputDevice).catch(e => console.log('setSinkId hatası:', e));
      }
    }
    audio.srcObject = e.streams[0];
    
    // Manuel play
    audio.play().catch(e => {
      console.log('Audio play hatası:', e);
      document.addEventListener('click', () => {
        audio.play().catch(console.error);
      }, { once: true });
    });
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
        <button onclick="showVoiceEffectsPanel()" title="Ses Efektleri"
          style="width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.15);color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-magic"></i>
        </button>
        <button onclick="showAudioDeviceSettings()" title="Ses Cihazları"
          style="width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.15);color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-cog"></i>
        </button>
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
      .voice-member-card.speaking { 
        box-shadow: 0 0 0 3px #1db954; 
        transform: scale(1.05);
      }
      .speaking-indicator {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 3px solid transparent;
        border-top: 3px solid #1db954;
        animation: speakingPulse 1s ease-in-out infinite;
      }
      @keyframes speakingPulse {
        0%, 100% { 
          transform: scale(1); 
          opacity: 1; 
        }
        50% { 
          transform: scale(1.1); 
          opacity: 0.7; 
        }
      }
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
    const isSpeaking = m.isSpeaking || false;
    
    return `
      <div class="voice-member-card ${isSpeaking ? 'speaking' : ''}" style="
        display:flex;flex-direction:column;align-items:center;gap:6px;
        background:rgba(255,255,255,0.06);border-radius:12px;padding:10px 14px;
        min-width:72px;position:relative;
        ${m.isMuted ? 'opacity:0.7;' : ''}
      ">
        <div style="position:relative;">
          <img src="${photoUrl}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid ${m.isMuted ? '#ff4444' : (isSpeaking ? '#1db954' : '#666')};" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.nickname)}&background=ff0033&color=fff&size=64'" />
          ${isSpeaking ? '<div class="speaking-indicator"></div>' : ''}
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