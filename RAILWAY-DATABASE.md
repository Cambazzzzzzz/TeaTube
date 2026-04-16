# Railway Database Durumu

## ✅ Lokal Veritabanı Güvenli

Tüm kullanıcılar duruyorlar:
- Salako
- adamsınadam  
- oshi
- Turist Hasan
- testuser

## 🚨 Railway'de Veritabanı Kalıcılığı

Railway'de SQLite kullanıyorsan **MUTLAKA VOLUME EKLE**!

### Volume Olmadan:
- Her deploy'da veritabanı sıfırlanır
- Kullanıcılar kaybolur
- Videolar kaybolur

### Volume Eklemek İçin:

1. **Railway Dashboard'a Git**
2. **Project'i Seç**
3. **"Variables" sekmesine git**
4. **"Add Volume" butonuna tıkla**
5. **Mount Path**: `/app/data`
6. **Redeploy**

### Alternatif: PostgreSQL Kullan

Railway'de ücretsiz PostgreSQL:
```bash
railway add postgresql
```

Sonra `src/database.js`'i PostgreSQL için güncelle.

## 📋 Veritabanı Backup

Lokal veritabanını yedekle:
```bash
cp data/teatube.db data/teatube-backup-$(date +%Y%m%d).db
```

## 🔄 Railway'e Veritabanı Yükle

1. Volume ekle
2. Railway CLI ile bağlan:
```bash
railway run bash
```

3. Veritabanını yükle:
```bash
# Lokal'den Railway'e
scp data/teatube.db railway:/app/data/
```

## ⚠️ ÖNEMLİ

Railway'de SQLite + Volume kullanıyorsan:
- Volume mount path: `/app/data`
- Database path: `./data/teatube.db`
- Her deploy'da volume korunur
