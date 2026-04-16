# DemlikChat API Dokümantasyonu

## Base URL
```
http://localhost:3000/api
```

## Authentication

### Register
**POST** `/register`

Yeni kullanıcı kaydı oluşturur.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "displayName": "string"
}
```

**Response:**
```json
{
  "success": true,
  "userId": 1
}
```

### Login
**POST** `/login`

Kullanıcı girişi yapar.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "favoriteFood": "string" // İki aşamalı doğrulama aktifse
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "string",
    "displayName": "string",
    "avatar": "string",
    "theme": "string"
  }
}
```

## User Management

### Get User Profile
**GET** `/user/:id`

Kullanıcı profilini getirir.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "string",
    "display_name": "string",
    "avatar": "string",
    "background": "string",
    "about": "string",
    "links": "[]"
  }
}
```

### Update User Profile
**POST** `/user/update`

Kullanıcı profilini günceller.

**Request Body:**
```json
{
  "userId": 1,
  "displayName": "string",
  "about": "string",
  "links": [],
  "background": "string",
  "avatar": "string"
}
```

### Change Password
**POST** `/user/change-password`

Kullanıcı şifresini değiştirir.

**Request Body:**
```json
{
  "userId": 1,
  "oldPassword": "string",
  "newPassword": "string"
}
```

### Two Factor Authentication
**POST** `/user/two-factor`

İki aşamalı doğrulamayı ayarlar.

**Request Body:**
```json
{
  "userId": 1,
  "enabled": true,
  "favoriteFood": "string"
}
```

### Change Theme
**POST** `/user/theme`

Kullanıcı temasını değiştirir.

**Request Body:**
```json
{
  "userId": 1,
  "theme": "midnight"
}
```

## Friends

### Get Friends
**GET** `/friends/:userId`

Kullanıcının arkadaşlarını getirir.

**Response:**
```json
{
  "success": true,
  "friends": [
    {
      "id": 2,
      "username": "string",
      "display_name": "string",
      "avatar": "string",
      "status": "accepted"
    }
  ]
}
```

### Add Friend
**POST** `/friends/add`

Arkadaşlık isteği gönderir.

**Request Body:**
```json
{
  "userId": 1,
  "friendUsername": "string"
}
```

### Accept Friend Request
**POST** `/friends/accept`

Arkadaşlık isteğini kabul eder.

**Request Body:**
```json
{
  "userId": 1,
  "friendId": 2
}
```

### Get Friend Requests
**GET** `/friends/requests/:userId`

Bekleyen arkadaşlık isteklerini getirir.

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": 2,
      "username": "string",
      "display_name": "string",
      "avatar": "string"
    }
  ]
}
```

## Blocking

### Block User
**POST** `/block`

Kullanıcıyı engeller.

**Request Body:**
```json
{
  "userId": 1,
  "blockedId": 2
}
```

### Unblock User
**POST** `/unblock`

Kullanıcının engelini kaldırır.

**Request Body:**
```json
{
  "userId": 1,
  "blockedId": 2
}
```

### Get Blocked Users
**GET** `/blocks/:userId`

Engellenen kullanıcıları getirir.

**Response:**
```json
{
  "success": true,
  "blocks": [
    {
      "id": 2,
      "username": "string",
      "display_name": "string",
      "avatar": "string"
    }
  ]
}
```

## Groups

### Create Group
**POST** `/groups/create`

Yeni grup oluşturur.

**Request Body:**
```json
{
  "userId": 1,
  "name": "string",
  "avatar": "string"
}
```

**Response:**
```json
{
  "success": true,
  "groupId": 1
}
```

### Get User Groups
**GET** `/groups/:userId`

Kullanıcının gruplarını getirir.

**Response:**
```json
{
  "success": true,
  "groups": [
    {
      "id": 1,
      "name": "string",
      "avatar": "string"
    }
  ]
}
```

## Messages

### Get Direct Messages
**GET** `/messages/:userId/:friendId`

İki kullanıcı arasındaki mesajları getirir.

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "from_user": 1,
      "to_user": 2,
      "content": "string",
      "type": "text",
      "file_path": null,
      "deleted_for": "[]",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Group Messages
**GET** `/messages/group/:groupId`

Grup mesajlarını getirir.

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "from_user": 1,
      "group_id": 1,
      "content": "string",
      "type": "text",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Delete Message
**POST** `/messages/delete`

Mesajı siler.

**Request Body:**
```json
{
  "messageId": 1,
  "userId": 1,
  "deleteFor": "me" // veya "everyone"
}
```

## File Upload

### Upload File
**POST** `/upload`

Dosya yükler.

**Request:**
- Content-Type: multipart/form-data
- Field name: file

**Response:**
```json
{
  "success": true,
  "path": "/uploads/filename.jpg"
}
```

## Socket.IO Events

### Client → Server

#### join
Kullanıcı odasına katıl.
```javascript
socket.emit('join', userId);
```

#### send_message
Mesaj gönder.
```javascript
socket.emit('send_message', {
  fromUser: 1,
  toUser: 2,
  groupId: null,
  content: "string",
  type: "text",
  filePath: null
});
```

#### join_group
Grup odasına katıl.
```javascript
socket.emit('join_group', groupId);
```

### Server → Client

#### new_message
Yeni mesaj geldi.
```javascript
socket.on('new_message', (message) => {
  // message object
});
```

## Error Responses

Tüm endpoint'ler hata durumunda şu formatta yanıt döner:

```json
{
  "success": false,
  "error": "Hata mesajı"
}
```

## HTTP Status Codes

- `200` - Başarılı
- `400` - Hatalı istek
- `401` - Yetkisiz
- `404` - Bulunamadı
- `500` - Sunucu hatası

## Rate Limiting

Şu anda rate limiting yok. Production'da eklenmelidir.

## CORS

Şu anda tüm origin'lere izin veriliyor. Production'da kısıtlanmalıdır.
