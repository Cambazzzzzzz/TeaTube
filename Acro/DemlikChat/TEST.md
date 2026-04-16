# DemlikChat Test Rehberi

## Tam Kapasite Çalışması İçin Yapılması Gerekenler

### 1. Bağımlılıkları Yükle
```bash
cd DemlikChat
npm install
```

Yüklenecek paketler:
- express (web sunucusu)
- socket.io (gerçek zamanlı iletişim)
- socket.io-client (istemci tarafı)
- better-sqlite3 (veritabanı)
- bcrypt (şifreleme)
- multer (dosya yükleme)
- electron (masaüstü uygulama)

### 2. Sunucuyu Başlat

Terminal 1:
```bash
npm run dev
```

Bu komut:
- Express sunucusunu başlatır (port 3000)
- Socket.IO sunucusunu başlatır
- Veritabanını oluşturur (data/chat.db)
- API endpoint'lerini aktif eder

### 3. Electron Uygulamasını Başlat

Terminal 2:
```bash
npm start
```

Bu komut:
- Electron penceresini açar
- Sunucuya bağlanır
- Uygulamayı kullanıma hazır hale getirir

## Test Senaryoları

### Senaryo 1: Kullanıcı Kaydı ve Girişi
1. Uygulamayı aç
2. "Kayıt Ol" sekmesine tıkla
3. Kullanıcı adı: `test1`
4. Görünen ad: `Test Kullanıcı 1`
5. Şifre: `test123`
6. Kayıt ol
7. Giriş yap sekmesine geç
8. Giriş yap

### Senaryo 2: İkinci Kullanıcı Oluştur
1. Başka bir tarayıcı/pencere aç: `http://localhost:3000`
2. Kayıt ol:
   - Kullanıcı adı: `test2`
   - Görünen ad: `Test Kullanıcı 2`
   - Şifre: `test123`
3. Giriş yap

### Senaryo 3: Arkadaş Ekleme
1. Test1 kullanıcısı ile:
   - "Arkadaş Ekle" butonuna tıkla
   - Kullanıcı adı: `test2`
   - Ekle
2. Test2 kullanıcısı ile:
   - "İstekler" butonuna tıkla
   - Test1'in isteğini kabul et

### Senaryo 4: Mesajlaşma
1. Test1 ile test2'yi seç
2. Mesaj yaz: "Merhaba!"
3. Enter'a bas
4. Test2'de mesajın geldiğini gör
5. Test2'den cevap yaz

### Senaryo 5: Fotoğraf Gönderme
1. Mesajlaşma ekranında + butonuna tıkla
2. Bir fotoğraf seç
3. Fotoğrafın gönderildiğini gör

### Senaryo 6: Mesaj Silme
1. Bir mesaja hover yap
2. "Benden Sil" veya "Herkesten Sil" butonuna tıkla
3. Mesajın silindiğini gör

### Senaryo 7: Grup Oluşturma
1. "Gruplar" sekmesine geç
2. "Grup Oluştur" butonuna tıkla
3. Grup adı: "Test Grubu"
4. Oluştur
5. Grup sohbetini aç

### Senaryo 8: Profil Görüntüleme
1. Bir arkadaşla sohbet aç
2. Üstteki profil simgesine tıkla
3. Profil bilgilerini gör

### Senaryo 9: Kullanıcı Engelleme
1. Bir arkadaşla sohbet aç
2. Engelle butonuna tıkla
3. Onay ver
4. Arkadaşın listeden kalkacak

### Senaryo 10: Ayarlar
1. Sağ alttaki "Ayarlar" butonuna tıkla
2. Şifre değiştir
3. İki aşamalı doğrulama ayarla
4. Tema değiştir
5. Engellileri gör

### Senaryo 11: İki Aşamalı Doğrulama
1. Ayarlar → İki Aşamalı Doğrulama
2. En sevdiğin yemek: "Pizza"
3. Etkinleştir
4. Çıkış yap
5. Giriş yaparken yemek sorulacak

## Kontrol Listesi

### Sunucu Tarafı
- [ ] Port 3000 açık mı?
- [ ] Veritabanı oluşturuldu mu? (data/chat.db)
- [ ] Socket.IO çalışıyor mu?
- [ ] API endpoint'leri yanıt veriyor mu?

### İstemci Tarafı
- [ ] Electron penceresi açıldı mı?
- [ ] Socket bağlantısı kuruldu mu?
- [ ] Temalar çalışıyor mu?
- [ ] Dosya yükleme çalışıyor mu?

### Özellikler
- [ ] Kayıt olma çalışıyor mu?
- [ ] Giriş yapma çalışıyor mu?
- [ ] Arkadaş ekleme çalışıyor mu?
- [ ] Mesajlaşma çalışıyor mu?
- [ ] Fotoğraf gönderme çalışıyor mu?
- [ ] Mesaj silme çalışıyor mu?
- [ ] Grup oluşturma çalışıyor mu?
- [ ] Profil görüntüleme çalışıyor mu?
- [ ] Engelleme çalışıyor mu?
- [ ] Ayarlar çalışıyor mu?
- [ ] Tema değiştirme çalışıyor mu?
- [ ] İki aşamalı doğrulama çalışıyor mu?

## Sorun Giderme

### Sunucu başlamıyor
```bash
# Port kullanımda mı kontrol et
netstat -ano | findstr :3000

# Eğer kullanımdaysa, işlemi sonlandır veya başka port kullan
```

### Socket bağlantısı kurulamıyor
- Sunucunun çalıştığından emin ol
- Tarayıcı konsolunu kontrol et (F12)
- Firewall ayarlarını kontrol et

### Veritabanı hatası
```bash
# Veritabanını sil ve yeniden oluştur
rm data/chat.db
npm run dev
```

### Dosya yüklenemiyor
```bash
# Uploads klasörünün var olduğundan emin ol
mkdir -p data/uploads
```

## Production Hazırlığı

### 1. Build Al
```bash
npm run build
```

### 2. Sunucuyu Deploy Et
- VPS kirala (DigitalOcean, AWS, vb.)
- Node.js yükle
- PM2 ile sunucuyu çalıştır
- Nginx reverse proxy kur
- SSL sertifikası ekle

### 3. Domain Ayarla
- Domain satın al
- DNS ayarlarını yap
- SSL sertifikası kur (Let's Encrypt)

### 4. Güvenlik
- Firewall kur
- Düzenli yedekleme yap
- Güçlü şifreler kullan
- Rate limiting ekle

## Performans Testleri

### Yük Testi
- 100 kullanıcı ile test et
- 1000 mesaj gönder
- Yanıt sürelerini ölç

### Bellek Kullanımı
- Task Manager'dan kontrol et
- Bellek sızıntısı var mı?

### Veritabanı Performansı
- Büyük veri setleri ile test et
- Sorgu sürelerini ölç

## Başarı Kriterleri

✅ Tüm özellikler çalışıyor
✅ Gerçek zamanlı mesajlaşma sorunsuz
✅ Dosya yükleme çalışıyor
✅ Temalar düzgün görünüyor
✅ Responsive tasarım çalışıyor
✅ Güvenlik özellikleri aktif
✅ Performans kabul edilebilir

## Sonuç

Tüm testler başarılı ise, DemlikChat tam kapasite çalışıyor demektir! 🎉
