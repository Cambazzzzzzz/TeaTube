# DemlikChat Kurulum Rehberi

## Hızlı Başlangıç

### 1. Bağımlılıkları Yükle
```bash
cd DemlikChat
npm install
```

### 2. Geliştirme Modunda Çalıştır

Terminal 1 - Sunucu:
```bash
npm run dev
```

Terminal 2 - Electron:
```bash
npm start
```

## Production Build

### Windows için .exe oluşturma:
```bash
npm run build
```

Build edilen dosyalar `dist/` klasöründe olacak.

## Veritabanı

Uygulama ilk çalıştırıldığında otomatik olarak `data/chat.db` dosyası oluşturulur.

## Port Ayarları

Varsayılan port: 3000

Değiştirmek için `server.js` dosyasındaki `PORT` değişkenini düzenleyin.

## Sorun Giderme

### Sunucu başlamıyor
- Port 3000'in kullanımda olmadığından emin olun
- Node.js versiyonunun 16+ olduğunu kontrol edin

### Socket bağlantısı kurulamıyor
- Sunucunun çalıştığından emin olun
- Firewall ayarlarını kontrol edin

### Dosya yüklenemiyor
- `data/uploads` klasörünün yazma izinlerine sahip olduğundan emin olun

## Önerilen Sistem Gereksinimleri

- RAM: 4GB+
- Disk: 500MB+
- İşletim Sistemi: Windows 10/11, macOS 10.14+, Linux

## Güvenlik Notları

- Production'da mutlaka HTTPS kullanın
- Güçlü şifreler kullanın
- Düzenli yedekleme yapın
- Veritabanı dosyasını güvenli tutun
