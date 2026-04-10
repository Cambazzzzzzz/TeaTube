# TeaTube Kurulum Rehberi

## Hızlı Başlangıç

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Uygulamayı Başlatın

Windows için:
```bash
start.bat
```

veya manuel olarak:
```bash
npm start
```

### 3. Tarayıcıda Açın

Uygulama otomatik olarak `http://localhost:3456` adresinde açılacaktır.

## Detaylı Kurulum

### Gereksinimler

- **Node.js**: v16.0.0 veya üzeri
- **npm**: v7.0.0 veya üzeri
- **İşletim Sistemi**: Windows, macOS, Linux

### Adım Adım Kurulum

#### 1. Projeyi İndirin veya Klonlayın

```bash
git clone <repository-url>
cd TeaTube
```

#### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

Bu komut şu paketleri yükleyecektir:
- express
- better-sqlite3
- bcrypt
- multer
- cloudinary
- cors
- electron
- electron-builder

#### 3. Cloudinary Yapılandırması

Cloudinary bilgileri `src/cloudinary.js` dosyasında tanımlıdır:

```javascript
cloudinary.config({
  cloud_name: 'dahj5lxvv',
  api_key: '357814355274844',
  api_secret: '5xeYrf6y36YL58tlQZwlVO3-WtQ'
});
```

Kendi Cloudinary hesabınızı kullanmak isterseniz bu bilgileri değiştirin.

#### 4. Veritabanı

Veritabanı otomatik olarak `data/teatube.db` konumunda oluşturulacaktır. İlk çalıştırmada tüm tablolar otomatik oluşturulur.

#### 5. Uygulamayı Başlatın

**Electron Uygulaması:**
```bash
npm start
```

**Sadece Web Sunucusu:**
```bash
npm run dev
```

## Geliştirme Modu

Geliştirme modunda çalıştırmak için:

```bash
npm run dev
```

Bu komut nodemon ile sunucuyu başlatır ve dosya değişikliklerinde otomatik yeniden başlatır.

## Üretim Build

Electron uygulamasını derlemek için:

```bash
npm run build
```

Bu komut `dist/` klasöründe kurulum dosyası oluşturacaktır.

## Port Yapılandırması

Varsayılan port: `3456`

Port değiştirmek için `server.js` dosyasındaki `PORT` değişkenini düzenleyin:

```javascript
const PORT = 3456; // İstediğiniz port numarası
```

## Sorun Giderme

### Port Zaten Kullanımda

Eğer 3456 portu kullanımdaysa, farklı bir port kullanın veya çakışan uygulamayı kapatın.

```bash
# Windows'ta portu kullanan uygulamayı bulma
netstat -ano | findstr :3456

# Uygulamayı kapatma
taskkill /PID <PID> /F
```

### Veritabanı Hatası

Eğer veritabanı hatası alırsanız:

1. `data/` klasörünü silin
2. Uygulamayı yeniden başlatın
3. Veritabanı otomatik oluşturulacaktır

### Cloudinary Yükleme Hatası

Cloudinary bağlantı hatası alırsanız:

1. İnternet bağlantınızı kontrol edin
2. Cloudinary bilgilerinin doğru olduğundan emin olun
3. Cloudinary hesabınızın aktif olduğunu kontrol edin

### Node Modülleri Hatası

Eğer modül bulunamadı hatası alırsanız:

```bash
# node_modules klasörünü silin
rm -rf node_modules

# package-lock.json'u silin
rm package-lock.json

# Yeniden yükleyin
npm install
```

## Sistem Gereksinimleri

### Minimum
- **İşlemci**: 2 GHz Dual Core
- **RAM**: 4 GB
- **Disk**: 500 MB boş alan
- **İnternet**: Video yükleme için gerekli

### Önerilen
- **İşlemci**: 3 GHz Quad Core
- **RAM**: 8 GB
- **Disk**: 1 GB boş alan
- **İnternet**: Hızlı bağlantı

## Güvenlik Notları

1. **Şifreler**: Tüm şifreler bcrypt ile hashlenmiş olarak saklanır
2. **IP Koruması**: 3 yanlış giriş denemesinde 24 saat IP engeli
3. **KVKK**: Kullanıcı verileri KVKK uyumlu işlenir
4. **Cloudinary**: Tüm medya dosyaları güvenli şekilde Cloudinary'de saklanır

## İlk Kullanım

1. Uygulamayı başlatın
2. "Kayıt Ol" butonuna tıklayın
3. Kullanıcı bilgilerinizi girin
4. Kullanım sözleşmesini kabul edin
5. Kayıt olun ve giriş yapın
6. Kanal oluşturun
7. Video yüklemeye başlayın!

## Destek

Sorun yaşarsanız:
- GitHub Issues'da sorun bildirin
- Dokümantasyonu kontrol edin
- API.md dosyasına bakın

## Güncellemeler

Uygulamayı güncellemek için:

```bash
git pull
npm install
npm start
```

## Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.
