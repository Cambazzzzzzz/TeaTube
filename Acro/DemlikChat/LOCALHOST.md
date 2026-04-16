# 🌐 DemlikChat - Localhost'tan Açma Rehberi

## Hızlı Başlangıç

### 1. Bağımlılıkları Yükle (İlk Kez)
```bash
cd DemlikChat
npm install
```

### 2. Sunucuyu Başlat
```bash
npm run dev
```

### 3. Tarayıcıdan Aç
Tarayıcını aç ve şu adrese git:
```
http://localhost:3000
```

## 🎉 Hazır!

Artık DemlikChat'i tarayıcıdan kullanabilirsin!

## 📱 Mobil Cihazdan Erişim

Aynı ağdaki mobil cihazdan erişmek için:

1. Bilgisayarının IP adresini öğren:
```bash
ipconfig
```

2. Mobil cihazdan şu adrese git:
```
http://[BILGISAYAR-IP]:3000
```

Örnek: `http://192.168.1.100:3000`

## 🔧 Port Değiştirme

Port 3000 kullanımdaysa, `server.js` dosyasının sonundaki PORT değişkenini değiştir:

```javascript
const PORT = process.env.PORT || 3001; // 3001 veya başka bir port
```

## 🚀 Özellikler

Tarayıcı versiyonunda tüm özellikler çalışır:
- ✅ Kayıt olma ve giriş yapma
- ✅ Arkadaş ekleme
- ✅ Mesajlaşma
- ✅ Fotoğraf gönderme
- ✅ Grup oluşturma
- ✅ Profil görüntüleme
- ✅ Ayarlar
- ✅ Tema değiştirme
- ✅ Responsive tasarım

## 💡 İpuçları

### Birden Fazla Kullanıcı Test Etmek İçin
1. Normal pencerede bir kullanıcı ile giriş yap
2. Gizli pencere (Incognito/Private) aç
3. İkinci kullanıcı ile giriş yap
4. İki pencere arasında mesajlaş!

### Farklı Tarayıcılarda Test
- Chrome
- Firefox
- Edge
- Safari
- Opera

### Mobil Test
- Chrome Mobile
- Safari Mobile
- Samsung Internet

## 🛑 Sunucuyu Durdurma

Terminal'de `Ctrl + C` tuşlarına bas.

## 🔄 Sunucuyu Yeniden Başlatma

```bash
npm run dev
```

## 📊 Sunucu Logları

Sunucu çalışırken terminal'de şunları göreceksin:
```
Server running on port 3000
User connected: [socket-id]
User disconnected: [socket-id]
```

## 🐛 Sorun Giderme

### Port kullanımda hatası
```bash
# Windows'ta port 3000'i kullanan işlemi bul
netstat -ano | findstr :3000

# İşlemi sonlandır (PID numarasını kullan)
taskkill /PID [PID] /F
```

### Sunucu başlamıyor
- Node.js yüklü mü kontrol et: `node --version`
- npm yüklü mü kontrol et: `npm --version`
- Bağımlılıkları tekrar yükle: `npm install`

### Tarayıcıda açılmıyor
- Sunucu çalışıyor mu kontrol et
- Doğru URL'yi kullandığından emin ol: `http://localhost:3000`
- Başka bir tarayıcı dene

### Socket bağlantısı kurulamıyor
- Tarayıcı konsolunu aç (F12)
- Hata mesajlarını kontrol et
- Sunucuyu yeniden başlat

## 🌟 Production'a Alma

Production için:
1. VPS kirala
2. Domain al
3. SSL sertifikası kur
4. Nginx reverse proxy kur
5. PM2 ile sunucuyu çalıştır

Detaylar için `TEST.md` dosyasındaki "Production Hazırlığı" bölümünü oku.

## 📞 Destek

Sorun yaşarsan:
- `KURULUM.md` dosyasını oku
- `TEST.md` dosyasını oku
- Konsol loglarını kontrol et
- Sunucu loglarını kontrol et
