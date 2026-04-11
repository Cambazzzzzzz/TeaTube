-- Railway'deki tüm videoların is_ad değerini düzelt
-- Bu SQL'i Railway database'inde çalıştır

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
