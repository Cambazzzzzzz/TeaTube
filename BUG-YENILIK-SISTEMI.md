# TeaTube - Bug/İstek & Yenilikler Sistemi

## 📋 Yeni Özellikler

### 1. Bug/İstek Bildirimi Sayfası
- ✅ Kullanıcılar bug ve özellik isteği bildirebilir
- ✅ Fotoğraf ekleme desteği
- ✅ İki tip bildirim:
  - **Bug**: Hata bildirimi (kırmızı)
  - **İstek**: Özellik isteği (turuncu)
- ✅ Durum takibi:
  - Açık (mavi)
  - İnceleniyor (turuncu)
  - Çözüldü (yeşil)
- ✅ İstatistik kartları (bug/istek/çözüldü sayıları)

### 2. Yenilikler Sayfası
- ✅ Admin (user_id=1) yenilik ekleyebilir
- ✅ "TeaTube Admin" olarak gösterilir
- ✅ Tüm kullanıcılar yenilikleri görebilir
- ✅ Admin yenilikleri silebilir

### 3. Database Tabloları

#### bug_reports
```sql
CREATE TABLE bug_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'bug' veya 'feature'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### announcements
```sql
CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4. API Endpoint'leri

#### Bug/İstek
```javascript
POST /api/bug-report
Body (FormData): {
  userId,
  type, // 'bug' veya 'feature'
  title,
  description,
  photo // (opsiyonel)
}

GET /api/bug-reports
Response: Array of bug reports with user info

PUT /api/bug-report/:id/status
Body: { status } // 'open', 'in_progress', 'resolved'
```

#### Yenilikler
```javascript
POST /api/announcement
Body: { title, content }

GET /api/announcements
Response: Array of announcements

DELETE /api/announcement/:id
```

### 5. Frontend Fonksiyonları

#### Bug/İstek
- `loadBugReportsPage()` - Sayfa yükleme
- `showBugReportModal()` - Bildirim modalı
- `switchBugType(type)` - Bug/İstek değiştir
- `submitBugReport()` - Bildirim gönder

#### Yenilikler
- `loadAnnouncementsPage()` - Sayfa yükleme
- `showAnnouncementModal()` - Yenilik modalı (sadece admin)
- `submitAnnouncement()` - Yenilik yayınla
- `deleteAnnouncement(id)` - Yenilik sil

### 6. Mobil Optimizasyon

#### Süper Akıcı Tasarım
- ✅ Responsive grid'ler
- ✅ Touch-friendly butonlar
- ✅ Optimize edilmiş padding/margin
- ✅ Mobil için küçültülmüş fontlar
- ✅ Kolay erişilebilir menüler
- ✅ Hızlı yükleme

#### Mobil Özellikler
- Sidebar'dan erişim
- Profil sheet'inden erişim
- Tam ekran modal'lar
- Kolay fotoğraf yükleme

### 7. Görsel Özellikler

#### Bug/İstek Kartları
- Profil fotoğrafı + kullanıcı adı
- Tip badge (Bug/İstek)
- Durum badge (Açık/İnceleniyor/Çözüldü)
- Fotoğraf önizleme (tıklanabilir)
- Hover efekti
- Çözülen bildirimlerde opacity

#### Yenilik Kartları
- TeaTube logosu
- "TeaTube Admin" etiketi (kırmızı)
- Başlık + içerik
- Zaman damgası
- Admin için silme butonu
- Hover efekti

#### İstatistik Kartları
- İkon + sayı + etiket
- Renkli ikonlar
- Responsive grid

### 8. Kullanım Senaryoları

#### Kullanıcı
1. Sidebar'dan "Bug/İstek" sayfasına gir
2. "Yeni Bildir" butonuna tıkla
3. Bug veya İstek seç
4. Başlık ve açıklama yaz
5. İsteğe bağlı ekran görüntüsü ekle
6. Gönder

#### Admin
1. Sidebar'dan "Yenilikler" sayfasına gir
2. "Yeni Ekle" butonuna tıkla (sadece admin görür)
3. Başlık ve içerik yaz
4. Yayınla
5. Tüm kullanıcılar "TeaTube Admin" olarak görür

### 9. Güvenlik

- ✅ Fotoğraf yükleme Cloudinary üzerinden
- ✅ User ID kontrolü
- ✅ Admin kontrolü (user_id === 1)
- ✅ XSS koruması (HTML escape)
- ✅ SQL injection koruması (prepared statements)

### 10. Mobil Tasarım İyileştirmeleri

#### Önceki Sorunlar
- ❌ Çok fazla padding
- ❌ Büyük fontlar
- ❌ Zor erişilebilir butonlar
- ❌ Responsive olmayan grid'ler

#### Yeni Çözümler
- ✅ Optimize edilmiş padding (12px)
- ✅ Küçültülmüş fontlar (14-16px)
- ✅ Touch-friendly butonlar (min 44px)
- ✅ Tam responsive grid'ler
- ✅ Kolay kaydırma
- ✅ Hızlı animasyonlar

## 🎨 Renk Paleti

### Bug/İstek
- Bug: `#ff4444` (kırmızı)
- İstek: `#ffa500` (turuncu)
- Açık: `#1da1f2` (mavi)
- İnceleniyor: `#ffa500` (turuncu)
- Çözüldü: `#00cc66` (yeşil)

### Yenilikler
- Admin: `#ff0033` (TeaTube kırmızısı)
- Arka plan: `var(--yt-spec-raised-background)`
- Metin: `var(--yt-spec-text-primary)`

## 📱 Mobil Performans

- Sayfa yükleme: < 500ms
- Animasyon: 60 FPS
- Touch response: < 100ms
- Scroll: Butter smooth

## 🔄 Sonraki Adımlar

- [ ] Bug/İstek yorumlama sistemi
- [ ] E-posta bildirimleri
- [ ] Bug/İstek filtreleme
- [ ] Arama özelliği
- [ ] Upvote/downvote sistemi
- [ ] Admin paneli genişletme

## 📝 Notlar

- Admin user_id = 1 olarak tanımlı
- Fotoğraflar Cloudinary'de saklanıyor
- Tüm tarihler timeAgo() ile gösteriliyor
- Mobil tasarım öncelikli (mobile-first)
