# Admin Panel Yenilikler - Yapılacaklar Listesi

## ✅ TAMAMLANAN
1. TS Music → TeaSocial Music olarak değiştirildi
2. "Created by İsmail Demircan" imzaları kaldırıldı
3. DemlikChat tamamen silindi

## 🔧 YAPILMASI GEREKENLER

### 1. Kullanım Koşulları Yönetimi
- [ ] Admin panelinden kullanım koşulları düzenlenebilir olmalı
- [ ] Veritabanına `terms_of_service` tablosu ekle
- [ ] Admin paneline "Kullanım Koşulları" bölümü ekle
- [ ] Kullanıcılar her güncellemede tekrar onaylamalı

### 2. Video Yönetimi (Eksik Özellikler)
- [ ] Video başlığını değiştirme
- [ ] Video açıklamasını değiştirme  
- [ ] Görüntüleme sayısını değiştirme
- [ ] Beğeni sayısını değiştirme
- [ ] Video etiketlerini (tags) değiştirme
- [ ] Reals etiketlerini değiştirme

### 3. Kullanıcı Yönetimi (Eksik Özellikler)
- [ ] Kullanıcı şifresini değiştirme ✅ (MEVCUT)
- [ ] Kullanıcı adını değiştirme ✅ (MEVCUT)
- [ ] Profil bilgilerini değiştirme
- [ ] Profil fotoğrafını değiştirme

### 4. Şarkı Yönetimi (Eksik Özellikler)
- [ ] Şarkı dinlenme sayısını değiştirme
- [ ] Şarkıları silme ✅ (MEVCUT)
- [ ] Şarkıları askıya alma ✅ (MEVCUT)
- [ ] Şarkı başlığını değiştirme
- [ ] Şarkı türünü değiştirme

### 5. Şarkı Detay Sayfası
- [ ] Şarkı adına tıklayınca şarkının detay sayfasına gitsin
- [ ] Detay sayfasında şarkı bilgileri gösterilsin
- [ ] Detay sayfasında yorumlar gösterilsin
- [ ] Detay sayfasında beğeniler gösterilsin

### 6. Admin Dashboard Özellikleri
- [ ] Toplam kullanıcı sayısı (aktif/pasif)
- [ ] Anlık aktif kullanıcı sayısı
- [ ] Günlük/haftalık/aylık büyüme grafikleri
- [ ] Toplam izlenen video süresi
- [ ] Toplam gönderilen mesaj sayısı
- [ ] En popüler içerikler
- [ ] Sunucu durumu (CPU, RAM, trafik)
- [ ] Hata logları
- [ ] Yeni kayıt olan kullanıcılar listesi

### 7. İçerik Moderasyonu
- [ ] Yorum moderasyonu
- [ ] Küfür/spam filtreleri
- [ ] Otomatik moderasyon kuralları
- [ ] Şikayet sistemi

### 8. Bildirim Sistemi
- [ ] Toplu bildirim gönderme
- [ ] Segment bazlı bildirim
- [ ] Bildirim geçmişi

### 9. Reklam Yönetimi
- [ ] Reklam kodları yönetimi ✅ (MEVCUT)
- [ ] Sponsorlu içerik ekleme
- [ ] Reklam performans raporları

### 10. Güvenlik
- [ ] 2FA (iki faktörlü doğrulama)
- [ ] Yetki seviyeleri
- [ ] Admin giriş logları

## 📝 NOTLAR

### Mevcut Admin Özellikleri:
- ✅ Kullanıcı askıya alma/aktif etme
- ✅ Kullanıcı şifre değiştirme
- ✅ Kullanıcı adı değiştirme
- ✅ Video askıya alma/silme
- ✅ Şarkı askıya alma/silme
- ✅ Artist başvuru onaylama/reddetme
- ✅ IP banlama
- ✅ Kırmızı tik verme

### Eksik Özellikler (Öncelikli):
1. **Video düzenleme** (başlık, açıklama, görüntüleme, beğeni, etiketler)
2. **Şarkı düzenleme** (dinlenme sayısı, başlık, tür)
3. **Kullanım koşulları yönetimi**
4. **Reals etiket yönetimi**
5. **Şarkı detay sayfası**

## 🚀 HIZLI BAŞLANGIÇ

### 1. Kullanım Koşulları Tablosu Ekle:
```sql
CREATE TABLE IF NOT EXISTS terms_of_service (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES admins(id)
);
```

### 2. Video Düzenleme API'si Ekle:
```javascript
// routes-admin.js
router.put('/admin/video/:videoId/edit', (req, res) => {
  const { title, description, views, likes, tags } = req.body;
  db.prepare('UPDATE videos SET title=?, description=?, views=?, likes=?, tags=? WHERE id=?')
    .run(title, description, views, likes, tags, req.params.videoId);
  res.json({ success: true });
});
```

### 3. Şarkı Düzenleme API'si Ekle:
```javascript
// routes-admin.js
router.put('/admin/music/song/:songId/edit', (req, res) => {
  const { title, genre, play_count } = req.body;
  db.prepare('UPDATE songs SET title=?, genre=?, play_count=? WHERE id=?')
    .run(title, genre, play_count, req.params.songId);
  res.json({ success: true });
});
```

## ⚠️ ÖNEMLİ
Bu değişiklikler çok kapsamlı ve her biri ayrı bir geliştirme gerektiriyor. 
Öncelik sırasına göre yapılması önerilir.
