# TeaTube - Video Paylaşım Platformu

TeaTube, kullanıcıların video yükleyip paylaşabildiği, kanal oluşturabildiği ve içerik keşfedebildiği kapsamlı bir video platformudur.

## Özellikler

### Kullanıcı Sistemi
- Kayıt ve giriş sistemi
- Profil fotoğrafı yükleme
- Kullanıcı adı değiştirme (haftada 2 kere)
- Takma ad değiştirme (sınırsız)
- Şifre değiştirme
- IP bazlı güvenlik (3 yanlış denemede 24 saat engel)
- Giriş denemeleri takibi

### Kanal Sistemi
- Kanal oluşturma ve düzenleme
- Kanal banner yükleme
- Kanal açıklaması ve bağlantılar
- Kanal türü ve etiketleri
- Destekçi kanal sistemi

### Video Sistemi
- Video yükleme (Cloudinary entegrasyonu)
- Video banner (thumbnail) yükleme
- 100+ video türü desteği
- Video etiketleri
- Yorum sistemi (açılıp kapatılabilir)
- Beğeni/Beğenmeme sistemi
- Görüntülenme sayacı
- Tam ekran video oynatıcı

### Sosyal Özellikler
- Abonelik sistemi
- Favoriler
- Kaydedilenler
- Yorum yapma ve yanıtlama
- Bildirim sistemi
- Destekçi kanal önerileri

### Keşif ve Algoritma
- Anasayfa önerileri
- Popüler videolar
- Yakın zamanda yüklenenler
- Abonelik videoları
- Kişiselleştirilmiş algoritma
- Arama sistemi
- İzleme geçmişi bazlı öneriler

### Geçmiş Sistemi
- İzleme geçmişi (video süresi takibi)
- Arama geçmişi
- Geçmiş açma/kapama
- Geçmiş temizleme

### Tema Sistemi
- Koyu Tema (varsayılan)
- Neon Mor
- Derin Mavi
- Bordo
- Kırmızı
- Açık Tema

### Güvenlik ve Gizlilik
- KVKK uyumlu veri işleme
- Şifre hashleme (bcrypt)
- IP adresi takibi
- Kullanım sözleşmeleri
- Veri saklama politikaları

## Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- npm

### Adımlar

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Uygulamayı başlatın:
```bash
npm start
```

veya

```bash
start.bat
```

3. Tarayıcınızda `http://localhost:3456` adresine gidin

## Teknolojiler

### Backend
- Express.js
- better-sqlite3
- bcrypt
- Cloudinary
- multer

### Frontend
- Vanilla JavaScript
- CSS3 (CSS Variables ile tema sistemi)
- Font Awesome

### Desktop
- Electron

## Cloudinary Yapılandırması

Uygulama Cloudinary kullanarak video ve görselleri depolar. Yapılandırma `src/cloudinary.js` dosyasında bulunur.

## Veritabanı Yapısı

Uygulama SQLite veritabanı kullanır. Tablolar:
- users (kullanıcılar)
- channels (kanallar)
- videos (videolar)
- subscriptions (abonelikler)
- favorites (favoriler)
- saved_videos (kaydedilenler)
- watch_history (izleme geçmişi)
- search_history (arama geçmişi)
- comments (yorumlar)
- video_likes (beğeniler)
- notifications (bildirimler)
- supporter_channels (destekçi kanallar)
- login_attempts (giriş denemeleri)
- ip_blocks (IP engelleri)
- user_settings (kullanıcı ayarları)
- algorithm_data (algoritma verileri)

## API Endpoints

Detaylı API dokümantasyonu için `API.md` dosyasına bakın.

## Lisans

MIT

## Geliştirici

TeaTube - 2024
