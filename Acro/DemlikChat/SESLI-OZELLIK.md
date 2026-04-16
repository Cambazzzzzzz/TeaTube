# 🔊 Ücretsiz Sesli Özellik - Teknik Detaylar

## 🎯 Kullanılacak Teknolojiler (Tamamen Ücretsiz)

### 1. WebRTC (Web Real-Time Communication)
- **Ücretsiz**: Evet, tarayıcı API'si
- **Peer-to-Peer**: Kullanıcılar direkt birbirine bağlanır
- **Ses + Video**: Her ikisi de desteklenir
- **Ekran Paylaşımı**: Desteklenir

### 2. Socket.io
- **Ücretsiz**: Evet, açık kaynak
- **Sinyal Sunucusu**: WebRTC bağlantısı kurmak için
- **Gerçek Zamanlı**: Anlık mesajlaşma

### 3. Simple-Peer (Opsiyonel)
- **Ücretsiz**: Evet, açık kaynak
- **WebRTC Wrapper**: WebRTC'yi kolaylaştırır
- **Küçük**: Sadece 6KB

## 🏗️ Mimari

```
Kullanıcı A                    Sunucu (Socket.io)                Kullanıcı B
    |                                |                                |
    |------ Ses kanalına katıl ----->|                                |
    |                                |<----- Ses kanalına katıl ------|
    |                                |                                |
    |<----- Sinyal (offer) ----------|------ Sinyal (offer) --------->|
    |                                |                                |
    |<----- Sinyal (answer) ---------|<----- Sinyal (answer) ---------|
    |                                |                                |
    |<============ Peer-to-Peer Ses Bağlantısı (WebRTC) ============>|
    |                                |                                |
```

## 📦 Kurulum

```bash
cd DemlikChat
npm install simple-peer
```

## 🔧 Temel Kod Yapısı

### 1. Mikrofon Erişimi
```javascript
async function getMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    return stream;
  } catch (err) {
    console.error('Mikrofon erişimi reddedildi:', err);
    return null;
  }
}
```

### 2. Ses Kanalına Katılma
```javascript
async function joinVoiceChannel(channelId) {
  // Mikrofon al
  const stream = await getMicrophone();
  if (!stream) return;
  
  // Socket.io ile sunucuya bildir
  socket.emit('join-voice', { channelId, userId });
  
  // Diğer kullanıcılarla bağlantı kur
  socket.on('user-joined-voice', (userId) => {
    createPeerConnection(userId, stream);
  });
}
```

### 3. Peer Bağlantısı
```javascript
function createPeerConnection(remoteUserId, localStream) {
  const peer = new SimplePeer({
    initiator: true,
    stream: localStream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Ücretsiz STUN
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });
  
  // Sinyal gönder
  peer.on('signal', (data) => {
    socket.emit('voice-signal', { to: remoteUserId, signal: data });
  });
  
  // Uzak ses akışı al
  peer.on('stream', (remoteStream) => {
    playRemoteAudio(remoteUserId, remoteStream);
  });
  
  peers[remoteUserId] = peer;
}
```

### 4. Ses Çalma
```javascript
function playRemoteAudio(userId, stream) {
  const audio = document.createElement('audio');
  audio.srcObject = stream;
  audio.autoplay = true;
  audio.id = `audio-${userId}`;
  document.body.appendChild(audio);
}
```

## 🎮 Kontroller

### Mute (Sessiz)
```javascript
function toggleMute() {
  const audioTrack = localStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
  isMuted = !audioTrack.enabled;
}
```

### Deafen (Sağır)
```javascript
function toggleDeafen() {
  Object.values(peers).forEach(peer => {
    const audio = document.getElementById(`audio-${peer.userId}`);
    if (audio) audio.muted = !audio.muted;
  });
  isDeafened = !isDeafened;
}
```

### Ses Kanalından Ayrıl
```javascript
function leaveVoiceChannel() {
  // Tüm peer bağlantılarını kapat
  Object.values(peers).forEach(peer => peer.destroy());
  peers = {};
  
  // Mikrofonu kapat
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  // Sunucuya bildir
  socket.emit('leave-voice');
}
```

## 🌐 STUN/TURN Sunucuları (Ücretsiz)

### STUN (Ücretsiz)
```javascript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];
```

### TURN (Ücretsiz Seçenekler)
1. **Kendi TURN Sunucunuz**: coturn (açık kaynak)
2. **Ücretsiz Servisler**: 
   - Xirsys (aylık 500MB ücretsiz)
   - Twilio STUN/TURN (deneme sürümü)

## 🎨 UI Göstergeleri

### Konuşan Kullanıcı
```javascript
peer.on('stream', (stream) => {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  
  // Ses seviyesini ölç
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  function checkVolume() {
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
    
    if (volume > 20) {
      // Kullanıcı konuşuyor
      showSpeakingIndicator(userId);
    }
    
    requestAnimationFrame(checkVolume);
  }
  checkVolume();
});
```

## 📊 Performans

### Çoklu Kullanıcı
- **2-4 kişi**: Sorunsuz (Mesh network)
- **5-10 kişi**: Orta (CPU kullanımı artar)
- **10+ kişi**: SFU sunucusu gerekir (mediasoup, janus)

### Bant Genişliği
- **Ses**: ~50-100 Kbps/kişi
- **Video**: ~500-1500 Kbps/kişi
- **Ekran Paylaşımı**: ~1000-3000 Kbps

## ✅ Avantajlar

1. **Tamamen Ücretsiz**: Hiçbir ücret yok
2. **Düşük Gecikme**: Peer-to-peer bağlantı
3. **Yüksek Kalite**: WebRTC otomatik optimize eder
4. **Güvenli**: Şifreli bağlantı (DTLS-SRTP)
5. **Tarayıcı Desteği**: Chrome, Firefox, Safari, Edge

## ⚠️ Sınırlamalar

1. **NAT Traversal**: Bazı ağlarda TURN gerekir
2. **Çoklu Kullanıcı**: 10+ kişi için SFU gerekir
3. **Mobil**: iOS Safari'de bazı kısıtlamalar var

## 🚀 Sonraki Adımlar

1. Discord UI'ını yap
2. Ses kanalları ekle
3. WebRTC entegrasyonu
4. Kontroller (mute, deafen)
5. Konuşan göstergesi
6. Test et!

---

**Sonuç**: Tamamen ücretsiz, profesyonel kalitede sesli sohbet sistemi!
