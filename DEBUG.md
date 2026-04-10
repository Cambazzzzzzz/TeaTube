# 🐛 TeaTube Debug Rehberi

## Yaygın Hatalar ve Çözümleri

### 1. "Bir hata oluştu" Hatası

**Sebep:** SQLite datetime fonksiyonu hatası

**Çözüm:** ✅ Düzeltildi! `datetime("now")` → `CURRENT_TIMESTAMP`

**Kontrol:**
```bash
# Server loglarını kontrol et
# Terminal'de hata mesajı var mı?
```

### 2. Server Başlamıyor

**Kontrol:**
```bash
# Port 3000 kullanımda mı?
netstat -ano | findstr :3000

# Eğer kullanımdaysa:
taskkill /PID <PID> /F

# Sonra tekrar başlat
node server.js
```

### 3. "Cannot find module" Hatası

**Çözüm:**
```bash
cd TeaTube
rm -rf node_modules
npm install
```

### 4. Cloudinary Hatası

**Kontrol:**
- API bilgileri doğru mu?
- İnternet bağlantısı var mı?

**Geçici Çözüm:**
Cloudinary'yi devre dışı bırak (yerel dosya sistemi kullan):
```javascript
// src/routes.js içinde uploadVideo ve uploadImage çağrılarını
// yerel dosya yolu ile değiştir
```

### 5. Veritabanı Hatası

**Çözüm:**
```bash
# Veritabanını sıfırla
rm data/teatube.db
node server.js
```

### 6. Giriş Yapamıyorum

**Kontrol:**
1. Kullanıcı kayıtlı mı?
2. Şifre doğru mu?
3. IP ban'li değil misiniz? (3 hatalı deneme = 24 saat ban)

**IP Ban Kontrolü:**
```sql
sqlite3 data/teatube.db "SELECT * FROM ip_bans;"
```

**IP Ban Kaldırma:**
```sql
sqlite3 data/teatube.db "DELETE FROM ip_bans WHERE ip_address = 'YOUR_IP';"
```

### 7. Video Yüklenmiyor

**Kontrol:**
1. Cloudinary bağlantısı çalışıyor mu?
2. Dosya boyutu çok büyük mü?
3. Dosya formatı destekleniyor mu?

**Desteklenen Formatlar:**
- Video: MP4, AVI, MOV, MKV
- Resim: JPG, PNG, GIF, WEBP

### 8. Tema Değişmiyor

**Çözüm:**
```javascript
// Console'da çalıştır:
document.body.className = 'dark'; // veya light, blue, green, purple, orange, pink
localStorage.setItem('theme', 'dark');
```

### 9. Sayfa Boş Geliyor

**Kontrol:**
1. F12 > Console'da hata var mı?
2. Network sekmesinde API istekleri başarılı mı?
3. Server çalışıyor mu?

**Test:**
```bash
curl http://localhost:3000
curl http://localhost:3000/api/test
```

### 10. CORS Hatası

**Çözüm:**
Server'da CORS zaten aktif, ama eğer sorun devam ediyorsa:
```javascript
// server.js
app.use(cors({
  origin: '*',
  credentials: true
}));
```

## Debug Komutları

### Server Loglarını İzle
```bash
node server.js
# Veya
npm start
```

### Veritabanını Kontrol Et
```bash
sqlite3 data/teatube.db

# Kullanıcıları listele
SELECT * FROM users;

# Videoları listele
SELECT * FROM videos;

# IP ban'leri listele
SELECT * FROM ip_bans;

# Çıkış
.exit
```

### API Test
```bash
# Test sayfasını aç
http://localhost:3000/test.html

# Veya curl ile
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

### Console Debug
```javascript
// Tarayıcı console'unda:

// Mevcut kullanıcıyı göster
console.log(currentUser);

// API URL'i kontrol et
console.log(API_URL);

// Tema değiştir
document.body.className = 'pink';

// LocalStorage'ı temizle
localStorage.clear();
```

## Performans Sorunları

### Yavaş Yükleme

**Çözümler:**
1. Cloudinary CDN kullanın (zaten aktif)
2. Video kalitesini düşürün
3. Thumbnail boyutlarını optimize edin
4. Lazy loading kullanın

### Yüksek RAM Kullanımı

**Çözüm:**
```bash
# Node.js memory limit artır
node --max-old-space-size=4096 server.js
```

## Güvenlik Kontrolleri

### IP Ban Sistemi Test
```bash
# 3 kere yanlış şifre dene
# 4. denemede "24 saat sonra tekrar dene!" mesajı görmeli
```

### KVKK Kontrolü
```bash
# Kayıt olurken KVKK kabul etmeden kayıt olunamamalı
```

### Şifre Hashleme Kontrolü
```sql
sqlite3 data/teatube.db "SELECT password_hash FROM users LIMIT 1;"
# Şifre hashlenmiş olmalı (bcrypt)
```

## Yardım Alma

### 1. Server Loglarını Kaydet
```bash
node server.js > server.log 2>&1
```

### 2. Console Hatalarını Kopyala
F12 > Console > Sağ tık > Save as...

### 3. Veritabanı Durumunu Kontrol Et
```bash
sqlite3 data/teatube.db ".schema" > schema.txt
```

### 4. Sistem Bilgilerini Topla
```bash
node --version
npm --version
sqlite3 --version
```

## Acil Durum Çözümleri

### Tüm Verileri Sıfırla
```bash
rm -rf data/teatube.db
rm -rf data/uploads/*
node server.js
```

### Temiz Kurulum
```bash
rm -rf node_modules
rm package-lock.json
npm install
node server.js
```

### Factory Reset
```bash
cd ..
rm -rf TeaTube
# Projeyi yeniden kur
```

## İletişim

Sorun devam ediyorsa:
1. GitHub Issues'da arama yap
2. Yeni issue aç
3. Server loglarını ve console hatalarını ekle
4. Sistem bilgilerini paylaş

## Başarılı Kurulum Kontrolü

✅ Server çalışıyor: `http://localhost:3000`
✅ Veritabanı oluşturuldu: `data/teatube.db`
✅ Giriş ekranı görünüyor
✅ Kayıt olunabiliyor
✅ Giriş yapılabiliyor
✅ Tema değiştirilebiliyor

Hepsi tamam ise kurulum başarılı! 🎉
