// DemlikChat - Voice Effects System
// Konuşurken ses efektleri

// ==================== VOICE EFFECTS MANAGER ====================

class VoiceEffectsManager {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.destinationNode = null;
    this.effectNodes = [];
    this.currentEffect = 'none';
    this.originalStream = null;
    this.processedStream = null;
    
    // Available effects
    this.effects = {
      none: { name: 'Normal', icon: '🎤', description: 'Efekt yok' },
      robot: { name: 'Robot', icon: '🤖', description: 'Robotik ses' },
      ghost: { name: 'Hayalet', icon: '👻', description: 'Ürkütücü yankı' },
      radio: { name: 'Radyo', icon: '🎙️', description: 'Radyo efekti' },
      chipmunk: { name: 'Sincap', icon: '🐿️', description: 'Yüksek ses' },
      monster: { name: 'Canavar', icon: '👹', description: 'Derin ses' },
      underwater: { name: 'Su Altı', icon: '🌊', description: 'Su altı efekti' },
      telephone: { name: 'Telefon', icon: '📞', description: 'Telefon sesi' },
      reverb: { name: 'Yankı', icon: '🎵', description: 'Yankı efekti' },
      megaphone: { name: 'Megafon', icon: '🔊', description: 'Megafon sesi' },
      chorus: { name: 'Koro', icon: '🎭', description: 'Koro efekti' }
    };
  }

  // ==================== INITIALIZE ====================
  
  async initialize(stream) {
    this.originalStream = stream;
    
    // Create audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create source from stream
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    
    // Create destination
    this.destinationNode = this.audioContext.createMediaStreamDestination();
    
    // Initially connect directly (no effect)
    this.sourceNode.connect(this.destinationNode);
    
    this.processedStream = this.destinationNode.stream;
    
    console.log('✅ Voice effects initialized');
    
    return this.processedStream;
  }

  // ==================== APPLY EFFECT ====================
  
  applyEffect(effectName) {
    if (!this.audioContext || !this.sourceNode) {
      console.error('Audio context not initialized');
      return;
    }
    
    // Disconnect all existing nodes
    this.clearEffects();
    
    this.currentEffect = effectName;
    
    // Apply the selected effect
    switch (effectName) {
      case 'none':
        this.sourceNode.connect(this.destinationNode);
        break;
      case 'robot':
        this.applyRobotEffect();
        break;
      case 'ghost':
        this.applyGhostEffect();
        break;
      case 'radio':
        this.applyRadioEffect();
        break;
      case 'chipmunk':
        this.applyChipmunkEffect();
        break;
      case 'monster':
        this.applyMonsterEffect();
        break;
      case 'underwater':
        this.applyUnderwaterEffect();
        break;
      case 'telephone':
        this.applyTelephoneEffect();
        break;
      case 'reverb':
        this.applyReverbEffect();
        break;
      case 'megaphone':
        this.applyMegaphoneEffect();
        break;
      case 'chorus':
        this.applyChorusEffect();
        break;
      default:
        this.sourceNode.connect(this.destinationNode);
    }
    
    console.log(`🎵 Applied effect: ${effectName}`);
  }

  // ==================== CLEAR EFFECTS ====================
  
  clearEffects() {
    // Disconnect source
    try {
      this.sourceNode.disconnect();
    } catch (e) {}
    
    // Disconnect and clear all effect nodes
    this.effectNodes.forEach(node => {
      try {
        node.disconnect();
      } catch (e) {}
    });
    
    this.effectNodes = [];
  }

  // ==================== ROBOT EFFECT ====================
  
  applyRobotEffect() {
    // Bitcrusher effect using wave shaper
    const waveShaper = this.audioContext.createWaveShaper();
    waveShaper.curve = this.makeDistortionCurve(50);
    waveShaper.oversample = '4x';
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.5;
    
    this.sourceNode.connect(waveShaper);
    waveShaper.connect(filter);
    filter.connect(this.destinationNode);
    
    this.effectNodes.push(waveShaper, filter);
  }

  // ==================== GHOST EFFECT ====================
  
  applyGhostEffect() {
    // Delay + reverb for spooky effect
    const delay = this.audioContext.createDelay();
    delay.delayTime.value = 0.3;
    
    const feedback = this.audioContext.createGain();
    feedback.gain.value = 0.6;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    
    const wetGain = this.audioContext.createGain();
    wetGain.gain.value = 0.7;
    
    const dryGain = this.audioContext.createGain();
    dryGain.gain.value = 0.3;
    
    // Dry path
    this.sourceNode.connect(dryGain);
    dryGain.connect(this.destinationNode);
    
    // Wet path
    this.sourceNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(filter);
    filter.connect(wetGain);
    wetGain.connect(this.destinationNode);
    
    this.effectNodes.push(delay, feedback, filter, wetGain, dryGain);
  }

  // ==================== RADIO EFFECT ====================
  
  applyRadioEffect() {
    // Bandpass filter + distortion
    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 500;
    
    const lowpass = this.audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3000;
    
    const distortion = this.audioContext.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(20);
    
    const gain = this.audioContext.createGain();
    gain.gain.value = 1.5;
    
    this.sourceNode.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.destinationNode);
    
    this.effectNodes.push(highpass, lowpass, distortion, gain);
  }

  // ==================== CHIPMUNK EFFECT ====================
  
  applyChipmunkEffect() {
    // High pitch using playback rate (simulated with filter)
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highshelf';
    filter.frequency.value = 2000;
    filter.gain.value = 10;
    
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 12;
    
    this.sourceNode.connect(filter);
    filter.connect(compressor);
    compressor.connect(this.destinationNode);
    
    this.effectNodes.push(filter, compressor);
  }

  // ==================== MONSTER EFFECT ====================
  
  applyMonsterEffect() {
    // Low pitch + distortion
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowshelf';
    filter.frequency.value = 500;
    filter.gain.value = 15;
    
    const distortion = this.audioContext.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(100);
    
    const gain = this.audioContext.createGain();
    gain.gain.value = 1.2;
    
    this.sourceNode.connect(filter);
    filter.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.destinationNode);
    
    this.effectNodes.push(filter, distortion, gain);
  }

  // ==================== UNDERWATER EFFECT ====================
  
  applyUnderwaterEffect() {
    // Lowpass filter + chorus
    const lowpass = this.audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 800;
    lowpass.Q.value = 5;
    
    const delay1 = this.audioContext.createDelay();
    delay1.delayTime.value = 0.02;
    
    const delay2 = this.audioContext.createDelay();
    delay2.delayTime.value = 0.03;
    
    const wetGain = this.audioContext.createGain();
    wetGain.gain.value = 0.5;
    
    this.sourceNode.connect(lowpass);
    lowpass.connect(delay1);
    lowpass.connect(delay2);
    delay1.connect(wetGain);
    delay2.connect(wetGain);
    wetGain.connect(this.destinationNode);
    
    this.effectNodes.push(lowpass, delay1, delay2, wetGain);
  }

  // ==================== TELEPHONE EFFECT ====================
  
  applyTelephoneEffect() {
    // Narrow bandpass
    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 800;
    
    const lowpass = this.audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3000;
    
    const distortion = this.audioContext.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(30);
    
    this.sourceNode.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(distortion);
    distortion.connect(this.destinationNode);
    
    this.effectNodes.push(highpass, lowpass, distortion);
  }

  // ==================== REVERB EFFECT ====================
  
  applyReverbEffect() {
    // Simple reverb using multiple delays
    const delays = [];
    const gains = [];
    
    const delayTimes = [0.037, 0.041, 0.043, 0.047, 0.053];
    const gainValues = [0.8, 0.7, 0.6, 0.5, 0.4];
    
    const dryGain = this.audioContext.createGain();
    dryGain.gain.value = 0.4;
    
    const wetGain = this.audioContext.createGain();
    wetGain.gain.value = 0.6;
    
    // Dry signal
    this.sourceNode.connect(dryGain);
    dryGain.connect(this.destinationNode);
    
    // Wet signal (reverb)
    delayTimes.forEach((time, i) => {
      const delay = this.audioContext.createDelay();
      delay.delayTime.value = time;
      
      const gain = this.audioContext.createGain();
      gain.gain.value = gainValues[i];
      
      this.sourceNode.connect(delay);
      delay.connect(gain);
      gain.connect(wetGain);
      
      delays.push(delay);
      gains.push(gain);
    });
    
    wetGain.connect(this.destinationNode);
    
    this.effectNodes.push(dryGain, wetGain, ...delays, ...gains);
  }

  // ==================== MEGAPHONE EFFECT ====================
  
  applyMegaphoneEffect() {
    // Heavy distortion + bandpass
    const distortion = this.audioContext.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(200);
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 2;
    
    const gain = this.audioContext.createGain();
    gain.gain.value = 2;
    
    this.sourceNode.connect(distortion);
    distortion.connect(filter);
    filter.connect(gain);
    gain.connect(this.destinationNode);
    
    this.effectNodes.push(distortion, filter, gain);
  }

  // ==================== CHORUS EFFECT ====================
  
  applyChorusEffect() {
    // Multiple delayed copies with slight pitch variation
    const delay1 = this.audioContext.createDelay();
    delay1.delayTime.value = 0.015;
    
    const delay2 = this.audioContext.createDelay();
    delay2.delayTime.value = 0.025;
    
    const delay3 = this.audioContext.createDelay();
    delay3.delayTime.value = 0.035;
    
    const gain1 = this.audioContext.createGain();
    gain1.gain.value = 0.3;
    
    const gain2 = this.audioContext.createGain();
    gain2.gain.value = 0.3;
    
    const gain3 = this.audioContext.createGain();
    gain3.gain.value = 0.3;
    
    const dryGain = this.audioContext.createGain();
    dryGain.gain.value = 0.5;
    
    // Dry
    this.sourceNode.connect(dryGain);
    dryGain.connect(this.destinationNode);
    
    // Wet
    this.sourceNode.connect(delay1);
    this.sourceNode.connect(delay2);
    this.sourceNode.connect(delay3);
    
    delay1.connect(gain1);
    delay2.connect(gain2);
    delay3.connect(gain3);
    
    gain1.connect(this.destinationNode);
    gain2.connect(this.destinationNode);
    gain3.connect(this.destinationNode);
    
    this.effectNodes.push(delay1, delay2, delay3, gain1, gain2, gain3, dryGain);
  }

  // ==================== HELPER: DISTORTION CURVE ====================
  
  makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    
    return curve;
  }

  // ==================== GET PROCESSED STREAM ====================
  
  getProcessedStream() {
    return this.processedStream;
  }

  // ==================== CLEANUP ====================
  
  cleanup() {
    this.clearEffects();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.sourceNode = null;
    this.destinationNode = null;
    this.originalStream = null;
    this.processedStream = null;
  }
}

// ==================== GLOBAL EFFECTS MANAGER ====================

let voiceEffectsManager = null;

// ==================== UI FUNCTIONS ====================

function showVoiceEffectsModal() {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;max-height:80vh;overflow-y:auto;width:600px;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:8px;color:var(--header-primary);">Ses Efektleri 🎵</h2>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:24px;">Konuşurken sesine efekt ekle!</p>
      
      <div id="effects-grid" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;margin-bottom:24px;">
        ${Object.entries(voiceEffectsManager.effects).map(([key, effect]) => `
          <button onclick="selectVoiceEffect('${key}')" class="effect-btn ${voiceEffectsManager.currentEffect === key ? 'active' : ''}" data-effect="${key}" style="padding:16px;background:${voiceEffectsManager.currentEffect === key ? 'var(--brand)' : 'var(--bg-secondary)'};border:2px solid ${voiceEffectsManager.currentEffect === key ? 'var(--brand)' : 'transparent'};border-radius:8px;cursor:pointer;transition:all 0.2s;text-align:left;" onmouseover="if(this.dataset.effect !== '${voiceEffectsManager.currentEffect}') this.style.background='var(--background-modifier-hover)'" onmouseout="if(this.dataset.effect !== '${voiceEffectsManager.currentEffect}') this.style.background='var(--bg-secondary)'">
            <div style="font-size:32px;margin-bottom:8px;">${effect.icon}</div>
            <div style="font-weight:600;color:var(--header-primary);margin-bottom:4px;">${effect.name}</div>
            <div style="font-size:12px;color:var(--text-muted);">${effect.description}</div>
          </button>
        `).join('')}
      </div>
      
      <div style="padding:12px;background:var(--bg-secondary);border-radius:8px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <i class="fas fa-info-circle" style="color:var(--brand);"></i>
          <span style="font-weight:600;color:var(--header-primary);">İpucu</span>
        </div>
        <p style="font-size:13px;color:var(--text-muted);line-height:1.5;">Ses efektleri sadece senin sesini değiştirir. Diğer kullanıcılar senin sesini seçtiğin efektle duyar!</p>
      </div>
      
      <div style="display:flex;gap:12px;">
        <button onclick="closeModal()" style="flex:1;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">Kapat</button>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

function selectVoiceEffect(effectKey) {
  if (!voiceEffectsManager) return;
  
  voiceEffectsManager.applyEffect(effectKey);
  
  // Update UI
  document.querySelectorAll('.effect-btn').forEach(btn => {
    const isActive = btn.dataset.effect === effectKey;
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? 'var(--brand)' : 'var(--bg-secondary)';
    btn.style.borderColor = isActive ? 'var(--brand)' : 'transparent';
  });
  
  const effectName = voiceEffectsManager.effects[effectKey].name;
  showToast(`Ses efekti: ${effectName} ${voiceEffectsManager.effects[effectKey].icon}`, 'success');
}

// ==================== INTEGRATE WITH VOICE MANAGER ====================

// Override VoiceManager's joinVoiceChannel to add effects
if (typeof voiceManager !== 'undefined') {
  const originalJoinVoiceChannel = voiceManager.joinVoiceChannel.bind(voiceManager);
  
  voiceManager.joinVoiceChannel = async function(channelId) {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      // Initialize effects manager
      voiceEffectsManager = new VoiceEffectsManager();
      const processedStream = await voiceEffectsManager.initialize(stream);
      
      // Use processed stream instead of original
      this.localStream = processedStream;
      this.currentVoiceChannel = channelId;
      
      // Show voice panel
      this.showVoicePanel(channelId);
      
      // Add effects button to voice panel
      addEffectsButton();
      
      // Notify server
      socket.emit('join_voice', {
        userId: currentUser.id,
        username: currentUser.displayName || currentUser.username,
        serverId: currentServer,
        channelId: channelId
      });
      
      showToast('Sesli kanala bağlandı! 🎤 Ses efektleri aktif!', 'success');
      
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
  };
  
  // Override disconnect to cleanup effects
  const originalDisconnect = voiceManager.disconnect.bind(voiceManager);
  
  voiceManager.disconnect = function() {
    if (voiceEffectsManager) {
      voiceEffectsManager.cleanup();
      voiceEffectsManager = null;
    }
    
    originalDisconnect();
  };
}

// ==================== ADD EFFECTS BUTTON ====================

function addEffectsButton() {
  // Check if button already exists
  if (document.getElementById('voice-effects-btn')) return;
  
  const voiceControls = document.querySelector('.voice-controls');
  if (!voiceControls) return;
  
  const effectsBtn = document.createElement('button');
  effectsBtn.id = 'voice-effects-btn';
  effectsBtn.className = 'voice-control-btn';
  effectsBtn.title = 'Ses Efektleri';
  effectsBtn.innerHTML = '<i class="fas fa-magic"></i>';
  effectsBtn.onclick = showVoiceEffectsModal;
  
  // Add before disconnect button
  const disconnectBtn = document.getElementById('voice-disconnect-btn');
  voiceControls.insertBefore(effectsBtn, disconnectBtn);
}

console.log('✅ Voice Effects System loaded');
