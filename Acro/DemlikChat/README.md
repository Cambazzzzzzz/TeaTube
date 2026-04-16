# DemlikChat

Modern ve mükemmel tasarımlı mesajlaşma uygulaması.

## Özellikler

### 🎨 Tasarım
- Morumsu dark tema (DemlikSearch'ten alınan 9 farklı tema)
- Modern ve kullanıcı dostu arayüz
- Responsive tasarım (bilgisayar ve telefon uyumlu)

### 💬 Mesajlaşma
- Gerçek zamanlı mesajlaşma
- Fotoğraf gönderme (+ butonu ile)
- Mesaj silme (sadece benden sil / herkesten sil)
- Grup sohbetleri

### 👥 Arkadaşlar
- Arkadaş ekleme (kullanıcı adı ile)
- Arkadaşlık istekleri
- Arkadaş listesi
- Kullanıcı profilleri (isim, avatar, arka plan, hakkımda, bağlantılar)

### 👨‍👩‍👧‍👦 Gruplar
- Grup oluşturma
- Grup sohbetleri
- Grup üyeleri yönetimi

### ⚙️ Ayarlar
- Şifre değiştirme
- İki aşamalı doğrulama (en sevdiğin yemek ile)
- Tema seçimi (9 farklı tema)
- Engellenen kullanıcılar listesi
- Engel kaldırma

### 🔒 Güvenlik
- Şifreli giriş (bcrypt)
- İki aşamalı doğrulama
- Kullanıcı engelleme

## Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- npm

### Adımlar

1. Bağımlılıkları yükle:
```bash
cd DemlikChat
npm install
```

2. Sunucuyu başlat:
```bash
npm run dev
```

3. Electron uygulamasını başlat (başka bir terminalde):
```bash
npm start
```

## Kullanım

### İlk Kullanım
1. Uygulamayı aç
2. "Kayıt Ol" sekmesine tıkla
3. Kullanıcı adı, görünen ad ve şifre gir
4. Kayıt ol butonuna tıkla
5. "Giriş Yap" sekmesine geç
6. Kullanıcı adı ve şifre ile giriş yap

### Arkadaş Ekleme
1. Sol panelde "Arkadaş Ekle" butonuna tıkla
2. Eklemek istediğin kişinin kullanıcı adını gir
3. Karşı taraf "İstekler" butonundan isteği kabul etsin

### Mesajlaşma
1. Sol panelden bir arkadaş seç
2. Mesaj kutusuna mesajını yaz
3. Enter veya gönder butonuna tıkla
4. Fotoğraf göndermek için + butonuna tıkla

### Grup Oluşturma
1. Sol panelde "Gruplar" sekmesine geç
2. "Grup Oluştur" butonuna tıkla
3. Grup adını gir

### Ayarlar
1. Sağ alttaki "Ayarlar" butonuna tıkla
2. Şifre değiştir, iki aşamalı doğrulama ayarla
3. Tema seç
4. Engellenen kullanıcıları yönet

## Tam Kapasite Çalışması İçin

### Sunucu Tarafı
- Sunucu sürekli çalışmalı (production için PM2 kullanabilirsiniz)
- Port 3000 açık olmalı
- SQLite veritabanı yazma izinlerine sahip olmalı

### İstemci Tarafı
- İnternet bağlantısı olmalı
- Socket.IO bağlantısı kurulmalı
- Dosya yükleme için yeterli disk alanı

### Production Deployment
1. Sunucuyu bir VPS'e deploy edin
2. Domain ve SSL sertifikası ekleyin
3. Nginx reverse proxy kullanın
4. PM2 ile sunucuyu yönetin
5. Electron uygulamasını build edin:
```bash
npm run build
```

### Mobil Uyum
- Responsive tasarım sayesinde mobil tarayıcılarda çalışır
- Mobil uygulama için React Native veya Capacitor kullanabilirsiniz
- API endpoint'leri hazır

## Teknolojiler

- **Backend**: Node.js, Express, Socket.IO, SQLite, bcrypt
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Desktop**: Electron
- **Gerçek Zamanlı**: Socket.IO

## Lisans

MIT
