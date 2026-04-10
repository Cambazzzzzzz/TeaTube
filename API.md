# TeaTube API Dokümantasyonu

Base URL: `http://localhost:3456/api`

## Kullanıcı İşlemleri

### Kayıt
```
POST /register
Content-Type: multipart/form-data

Body:
- username: string (required)
- nickname: string (required)
- password: string (required)
- agreed: boolean (required)
- profile_photo: file (optional)

Response:
{
  "success": true,
  "userId": number
}
```

### Giriş
```
POST /login
Content-Type: application/json

Body:
{
  "username": string,
  "password": string
}

Response:
{
  "success": true,
  "user": {
    "id": number,
    "username": string,
    "nickname": string,
    "profile_photo": string,
    "theme": string
  }
}
```

### Kullanıcı Bilgilerini Getir
```
GET /user/:userId

Response:
{
  "id": number,
  "username": string,
  "nickname": string,
  "profile_photo": string,
  "created_at": string,
  "theme": string
}
```

### Kullanıcı Adını Değiştir
```
PUT /user/:userId/username
Content-Type: application/json

Body:
{
  "newUsername": string
}

Response:
{
  "success": true,
  "remainingChanges": number
}
```

### Takma Adı Değiştir
```
PUT /user/:userId/nickname
Content-Type: application/json

Body:
{
  "newNickname": string
}
```

### Şifre Değiştir
```
PUT /user/:userId/password
Content-Type: application/json

Body:
{
  "oldPassword": string,
  "newPassword": string
}
```

### Tema Değiştir
```
PUT /user/:userId/theme
Content-Type: application/json

Body:
{
  "theme": string
}
```

## Kanal İşlemleri

### Kanal Oluştur
```
POST /channel
Content-Type: multipart/form-data

Body:
- userId: number (required)
- channelName: string (required)
- about: string (optional)
- channelType: string (optional)
- channelTags: string (optional)
- links: string (optional)
- agreed: boolean (required)
- channel_banner: file (optional)
```

### Kanal Bilgilerini Getir
```
GET /channel/:channelId

Response:
{
  "id": number,
  "user_id": number,
  "channel_name": string,
  "channel_banner": string,
  "about": string,
  "channel_type": string,
  "channel_tags": string,
  "links": string,
  "subscriber_count": number,
  "video_count": number
}
```

### Kullanıcının Kanalını Getir
```
GET /channel/user/:userId
```

### Kanal Güncelle
```
PUT /channel/:channelId
Content-Type: multipart/form-data

Body:
- channelName: string
- about: string
- channelType: string
- channelTags: string
- links: string
- channel_banner: file (optional)
```

## Video İşlemleri

### Video Yükle
```
POST /video
Content-Type: multipart/form-data

Body:
- channelId: number (required)
- title: string (required)
- description: string (optional)
- videoType: string (required)
- tags: string (optional)
- video: file (required)
- banner: file (required)
- commentsEnabled: number (0 or 1)
- likesVisible: number (0 or 1)
```

### Video Listesi
```
GET /videos?page=1&limit=20

Response: Array of videos
```

### Popüler Videolar
```
GET /videos/popular?page=1&limit=20
```

### Yakın Zamanda Yüklenenler
```
GET /videos/recent?page=1&limit=20
```

### Abonelik Videoları
```
GET /videos/subscriptions/:userId?page=1&limit=20
```

### Video Detayı
```
GET /video/:videoId
```

### Kanal Videoları
```
GET /videos/channel/:channelId?page=1&limit=20
```

### Video Ara
```
GET /search?q=query&userId=1&page=1&limit=20
```

### Önerilen Videolar
```
GET /videos/recommended/:userId?page=1&limit=20
```

## Abonelik İşlemleri

### Abone Ol
```
POST /subscribe
Content-Type: application/json

Body:
{
  "userId": number,
  "channelId": number
}
```

### Abonelikten Çık
```
DELETE /subscribe
Content-Type: application/json

Body:
{
  "userId": number,
  "channelId": number
}
```

### Abonelikleri Getir
```
GET /subscriptions/:userId
```

### Abonelik Durumunu Kontrol Et
```
GET /is-subscribed/:userId/:channelId

Response:
{
  "subscribed": boolean
}
```

## Favori İşlemleri

### Favorilere Ekle
```
POST /favorite
Content-Type: application/json

Body:
{
  "userId": number,
  "videoId": number
}
```

### Favorilerden Çıkar
```
DELETE /favorite
Content-Type: application/json

Body:
{
  "userId": number,
  "videoId": number
}
```

### Favorileri Getir
```
GET /favorites/:userId
```

## Kaydetme İşlemleri

### Kaydet
```
POST /saved
Content-Type: application/json

Body:
{
  "userId": number,
  "videoId": number
}
```

### Kaydı Sil
```
DELETE /saved
Content-Type: application/json

Body:
{
  "userId": number,
  "videoId": number
}
```

### Kaydedilenleri Getir
```
GET /saved/:userId
```

## Yorum İşlemleri

### Yorum Ekle
```
POST /comment
Content-Type: application/json

Body:
{
  "videoId": number,
  "userId": number,
  "commentText": string
}
```

### Yorumları Getir
```
GET /comments/:videoId
```

### Yorum Sil
```
DELETE /comment/:commentId
```

## Beğeni İşlemleri

### Beğen/Beğenme
```
POST /like
Content-Type: application/json

Body:
{
  "videoId": number,
  "userId": number,
  "likeType": number (1 for like, -1 for dislike)
}
```

### Beğeni Durumunu Kontrol Et
```
GET /like-status/:videoId/:userId

Response:
{
  "likeType": number (0, 1, or -1)
}
```

## Geçmiş İşlemleri

### İzleme Geçmişine Ekle
```
POST /watch-history
Content-Type: application/json

Body:
{
  "userId": number,
  "videoId": number,
  "watchDuration": number,
  "totalDuration": number
}
```

### İzleme Geçmişini Getir
```
GET /watch-history/:userId
```

### İzleme Geçmişini Temizle
```
DELETE /watch-history/:userId
```

### Arama Geçmişini Getir
```
GET /search-history/:userId
```

### Arama Geçmişini Temizle
```
DELETE /search-history/:userId
```

## Bildirim İşlemleri

### Bildirimleri Getir
```
GET /notifications/:userId
```

### Bildirimi Okundu İşaretle
```
PUT /notification/:notificationId/read
```

## Algoritma İşlemleri

### Algoritma Verilerini Getir
```
GET /algorithm/:userId
```

### Algoritmayı Sıfırla
```
DELETE /algorithm/:userId
```

## Ayarlar

### Ayarları Getir
```
GET /settings/:userId
```

### Ayarları Güncelle
```
PUT /settings/:userId
Content-Type: application/json

Body:
{
  "search_history_enabled": number (0 or 1),
  "watch_history_enabled": number (0 or 1)
}
```

## Diğer

### Video Türlerini Getir
```
GET /video-types

Response: Array of video type strings
```

### Giriş Denemelerini Getir
```
GET /login-attempts/:userId
```
