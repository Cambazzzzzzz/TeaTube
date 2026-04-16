# 🎮 DemlikChat - Discord Klonu Planı

## 🎯 Hedef
DemlikChat'i Discord'un tam klonu haline getirmek.

## 📋 Özellikler Listesi

### Faz 1: Temel Discord UI (2-3 saat)
- [ ] Sol sidebar: Sunucu listesi (DC logosu ile)
- [ ] Orta sidebar: Kanal listesi
- [ ] Ana alan: Mesaj alanı
- [ ] Sağ sidebar: Üye listesi
- [ ] Discord renk şeması (#2C2F33, #23272A, #7289DA)
- [ ] Discord fontları ve ikonları

### Faz 2: Sunucu Sistemi (1-2 saat)
- [ ] Sunucu oluşturma
- [ ] Sunucu ayarları
- [ ] Sunucu simgesi
- [ ] Sunucu davetleri
- [ ] Sunucu üyeleri

### Faz 3: Kanal Sistemi (1-2 saat)
- [ ] Metin kanalları
- [ ] Ses kanalları
- [ ] Kanal kategorileri
- [ ] Kanal izinleri
- [ ] Kanal oluşturma/silme

### Faz 4: Rol Sistemi (1 saat)
- [ ] Rol oluşturma
- [ ] Rol renkleri
- [ ] Rol yetkileri
- [ ] Rol atama

### Faz 5: Sesli Sohbet (3-4 saat) ⭐ EN ZOR
- [ ] WebRTC kurulumu
- [ ] Mikrofon erişimi
- [ ] Ses akışı (peer-to-peer)
- [ ] Ses kontrolü (mute, deafen)
- [ ] Konuşan göstergesi
- [ ] Ses kalitesi ayarları

### Faz 6: Ekstra Özellikler (2-3 saat)
- [ ] Emoji picker
- [ ] Dosya yükleme
- [ ] Ekran paylaşımı
- [ ] Video görüşme
- [ ] Durum mesajları
- [ ] Kullanıcı profilleri

## 🔊 Sesli Özellik Nasıl Eklenir?

### Gerekli Teknolojiler:
1. **WebRTC** - Peer-to-peer ses/video iletişimi
2. **Socket.io** - Sinyal sunucusu (bağlantı kurulumu)
3. **MediaStream API** - Mikrofon/kamera erişimi
4. **PeerJS** (opsiyonel) - WebRTC'yi kolaylaştırır

### Kurulum:
```bash
npm install simple-peer socket.io-client
```

### Temel Akış:
1. Kullanıcı ses kanalına katılır
2. Mikrofon izni alınır
3. Socket.io ile diğer kullanıcılara sinyal gönderilir
4. WebRTC ile peer-to-peer bağlantı kurulur
5. Ses akışı başlar

### Örnek Kod Yapısı:
```javascript
// Mikrofon erişimi
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    // Ses akışı alındı
    localStream = stream;
    
    // WebRTC peer oluştur
    const peer = new SimplePeer({
      initiator: true,
      stream: stream
    });
    
    // Sinyal gönder
    peer.on('signal', data => {
      socket.emit('voice-signal', data);
    });
    
    // Uzak ses akışı al
    peer.on('stream', remoteStream => {
      audioElement.srcObject = remoteStream;
    });
  });
```

## ⚠️ Zorluklar

1. **WebRTC Karmaşık** - NAT traversal, STUN/TURN sunucuları
2. **Ses Kalitesi** - Echo cancellation, noise suppression
3. **Çoklu Kullanıcı** - Mesh network (herkes herkese) veya SFU (sunucu üzerinden)
4. **Mobil Uyumluluk** - iOS/Android izinleri farklı

## 🚀 Başlangıç Stratejisi

### Seçenek 1: Hızlı Prototip (4-5 saat)
- Discord UI'ı kopyala
- Temel mesajlaşma
- Basit ses özelliği (2 kişi)

### Seçenek 2: Tam Özellikli (10-15 saat)
- Tüm Discord özellikleri
- Çoklu kullanıcı ses
- Ekran paylaşımı
- Video görüşme

### Seçenek 3: Aşamalı (Her gün biraz)
- Bugün: UI
- Yarın: Sunucular
- Sonraki gün: Sesli özellik

## 💡 Önerim

**Önce UI'ı Discord gibi yapalım (2-3 saat), sonra sesli özelliği ekleriz (3-4 saat).**

Bu şekilde:
1. Görsel olarak Discord gibi olur
2. Temel özellikler çalışır
3. Sesli özellik ayrı bir modül olarak eklenebilir

## 📝 Sonraki Adım

Hangi yaklaşımı tercih edersiniz?
1. **Hızlı**: Sadece UI + basit ses (4-5 saat)
2. **Orta**: UI + sunucular + ses (8-10 saat)
3. **Tam**: Tüm özellikler (15+ saat)

Ben şimdi UI'ı Discord gibi yapmaya başlayabilirim!
