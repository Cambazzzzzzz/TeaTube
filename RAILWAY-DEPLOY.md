# TeaTube Railway Deployment

## Hızlı Deployment

1. **Railway'e Git**: https://railway.app
2. **GitHub'dan Deploy Et**: "Deploy from GitHub" seç
3. **TeaTube Repository'sini Seç**
4. **Environment Variables Ayarla**:
   ```
   NODE_ENV=production
   PORT=3000
   ```

## Deployment Dosyaları

- `nixpacks.toml` - Build configuration
- `Procfile` - Start command
- `railway.json` - Railway settings (opsiyonel)

## Sorun Giderme

### Canvas Loading Slowly Hatası
✅ **Çözüldü**: Canvas fingerprinting optimize edildi
- Try-catch blokları eklendi
- Fallback mekanizması eklendi
- Performance optimizasyonları yapıldı

### Timeout Sorunları
✅ **Çözüldü**: Server timeout'ları Railway için optimize edildi
- 2 dakika timeout
- 65 saniye keepAlive
- 66 saniye headers timeout

### Firebase Yavaş Yükleme
✅ **Çözüldü**: Firebase async yükleme
- Dynamic import kullanımı
- Error handling eklendi
- Non-blocking yükleme

## Test

Deployment sonrası test et:
```bash
curl https://your-app.railway.app/
```

## Logs

Railway dashboard'dan logs kontrol et:
```bash
railway logs
```