# Railway Restart ve Database Fix

## SORUN
Railway'deki tüm videolarda AD badge görünüyor çünkü eski videolar `is_ad = 1` olarak işaretli.

## ÇÖZÜM

### Otomatik Çözüm (Önerilen)
GitHub'a push yaptık, Railway otomatik deploy edecek. Sunucu başlarken migration kodu çalışacak ve tüm videoları düzeltecek.

**Railway'de yapman gerekenler:**
1. Railway dashboard'a git: https://railway.app
2. TeaTube projesini aç
3. **Deployments** sekmesine git
4. En son deployment'ı bekle (GitHub push sonrası otomatik başlar)
5. Deployment tamamlanınca **Restart** butonuna tıkla
6. Sunucu yeniden başlarken migration kodu çalışacak

### Manuel Çözüm (Eğer otomatik çalışmazsa)
Railway'de terminal YOK ama database'e SQL çalıştırabilirsin:

1. Railway dashboard → TeaTube projesi
2. **Database** servisini aç
3. **Data** sekmesine git
4. **Query** butonuna tıkla
5. `fix_railway_ads_v2.sql` dosyasındaki SQL'i yapıştır:

\`\`\`sql
-- 1. NULL olanları 0 yap
UPDATE videos SET is_ad = 0 WHERE is_ad IS NULL;

-- 2. is_ad=1 olan ama ads tablosunda olmayan videoları 0 yap
UPDATE videos SET is_ad = 0 
WHERE is_ad = 1 AND id NOT IN (SELECT video_id FROM ads);

-- 3. Kontrol et
SELECT 
  COUNT(*) as total_videos,
  SUM(CASE WHEN is_ad = 1 THEN 1 ELSE 0 END) as ad_videos,
  SUM(CASE WHEN is_ad = 0 THEN 1 ELSE 0 END) as normal_videos,
  SUM(CASE WHEN is_ad IS NULL THEN 1 ELSE 0 END) as null_videos
FROM videos;
\`\`\`

6. **Run** butonuna tıkla
7. Sonuçları kontrol et: `ad_videos` 0 olmalı (veya sadece gerçek reklamlar)

## YAPILAN DEĞİŞİKLİKLER

### 1. Mobil Menü Düzeltmesi
- `showMobileUploadMenu()` fonksiyonu yeniden yazıldı
- `onclick` yerine `addEventListener` kullanıldı
- Event propagation düzgün yönetiliyor
- Reals ve Fotoğraf butonları artık çalışıyor

### 2. Reklam Sistemi Düzeltmesi
- Reklam checkbox'ı default KAPALI
- BCİCS kodu olmadan reklam yüklenemez
- Kod doğrulama video yüklenmeden ÖNCE yapılıyor
- Progress overlay düzgün kapanıyor
- Sadece checkbox işaretli VE geçerli kod girilirse `is_ad = 1`

### 3. Database Migration Güçlendirildi
- Sunucu her başladığında migration çalışıyor
- `is_ad = NULL` → `0`
- `is_ad = 1` ama `ads` tablosunda yok → `0`
- Konsola log yazıyor, kaç video düzeltildiğini gösteriyor

## KONTROL

Railway'de site açıldıktan sonra:
1. Ana sayfaya git
2. Eski videolarda AD badge OLMAMALI
3. Sadece BCİCS koduyla yüklenen videolarda AD badge olmalı
4. Mobil menüden Reals/Fotoğraf yükleme çalışmalı

## NOTLAR
- Railway otomatik deploy yapıyor, GitHub push sonrası 2-3 dakika bekle
- Migration kodu her sunucu başlangıcında çalışır, zararsız
- Eğer hala sorun varsa manuel SQL çalıştır
