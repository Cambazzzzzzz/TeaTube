# Firebase Admin SDK Kurulumu

Admin panelinden mesajlaşma ve grup yönetimi özelliklerini kullanabilmek için Firebase Admin SDK'yı yapılandırmanız gerekiyor.

## Adımlar

### 1. Firebase Console'a Git
https://console.firebase.google.com/project/teatube-2f814/settings/serviceaccounts/adminsdk

### 2. Service Account Key Oluştur
1. "Service accounts" sekmesine tıklayın
2. "Generate new private key" butonuna tıklayın
3. İndirilen JSON dosyasını kaydedin

### 3. Yapılandırma Dosyasını Güncelle
İndirdiğiniz JSON dosyasının içeriğini `src/firebase-admin.js` dosyasındaki `serviceAccount` objesine kopyalayın:

```javascript
const serviceAccount = {
  "type": "service_account",
  "project_id": "teatube-2f814",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@teatube-2f814.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
};
```

### 4. Sunucuyu Yeniden Başlat
```bash
npm start
```

## Yeni Admin Endpoint'leri

### Mesajlaşma
- `GET /api/admin/firebase/conversations` - Tüm DM konuşmalarını listele
- `GET /api/admin/firebase/messages/:conversationId` - Konuşma mesajlarını getir
- `POST /api/admin/firebase/send-message` - Admin olarak mesaj gönder
- `DELETE /api/admin/firebase/message/:conversationId/:messageId` - Mesaj sil

### Grup Mesajları
- `GET /api/admin/firebase/group-messages/:groupId` - Grup mesajlarını listele
- `POST /api/admin/firebase/send-group-message` - Gruba mesaj gönder
- `DELETE /api/admin/firebase/group-message/:groupId/:messageId` - Grup mesajı sil

### Grup Yönetimi
- `PUT /api/admin/group/:groupId/name` - Grup adını değiştir
- `PUT /api/admin/group/:groupId/description` - Grup açıklamasını değiştir
- `DELETE /api/admin/group/:groupId/member/:userId` - Üyeyi çıkar
- `PUT /api/admin/group/:groupId/member/:userId/role` - Üye rolünü değiştir
- `DELETE /api/admin/group/:groupId` - Grubu sil

## Güvenlik Notları

⚠️ **ÖNEMLİ**: Service Account Key dosyasını asla Git'e commit etmeyin!

`.gitignore` dosyanıza ekleyin:
```
src/firebase-admin.js
*serviceAccountKey*.json
```

## Sorun Giderme

Eğer "Firebase Admin SDK yapılandırılmamış" hatası alıyorsanız:
1. `src/firebase-admin.js` dosyasındaki bilgilerin doğru olduğundan emin olun
2. Private key'in tam olarak kopyalandığından emin olun (başında ve sonunda `\n` olmalı)
3. Sunucuyu yeniden başlatın
