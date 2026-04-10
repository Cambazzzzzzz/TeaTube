# TeaTube Hızlı Kullanım Kılavuzu

## İlk Kurulum

1. Bağımlılıkları yükleyin:
```bash
cd TeaTube
npm install
```

2. Uygulamayı başlatın:
```bash
npm start
```

## İlk Kullanım Adımları

### 1. Kayıt Olma
- Uygulama açıldığında "Kayıt Ol" linkine tıklayın
- Kullanıcı adı, takma ad ve şifre girin
- İsteğe bağlı: Profil fotoğrafı yükleyin
- KVKK sözleşmesini okuyup kabul edin
- "Kayıt Ol" butonuna tıklayın

### 2. Giriş Yapma
- Kullanıcı adı ve şifrenizi girin
- "Giriş Yap" butonuna tıklayın

⚠️ **Dikkat:** 3 kez yanlış şifre girerseniz IP adresiniz 24 saat yasaklanır!

### 3. Kanal Oluşturma
- İlk girişte otomatik olarak kanal oluşturma modalı açılır
- Kanal adınızı girin
- Kanal açma sözleşmesini okuyup kabul edin
- "Oluştur" butonuna tıklayın

### 4. Video Yükleme
- Sol menüden "Videolarım" seçeneğine tıklayın
- Video başlığı ve açıklama girin
- Etiketler ekleyin (virgülle ayırın)
- Video türünü seçin (90+ seçenek)
- Yorumları ve beğeni sayısını gösterme ayarlarını yapın
- Video dosyasını seçin
- Banner (thumbnail) resmini seçin
- "Video Yükle" butonuna tıklayın

⏳ Video Cloudinary'ye yüklenecek, bu biraz zaman alabilir.

### 5. Profil ve Kanal Ayarları
- Sol menüden "Profilim" seçeneğine tıklayın
- "Kanal Ayarları" butonuna tıklayın
- Kanal banner'ı, hakkımda metni, kanal türü ve etiketleri güncelleyin
- Sosyal medya bağlantılarınızı ekleyin
- "Kaydet" butonuna tıklayın

## Ana Özellikler

### Anasayfa
- **Abone Olduğun Kanallardan Yeni Videolar:** Henüz izlemediğiniz videolar
- **Popüler ve Yakın Zamanda Yüklenenler:** Algoritma tabanlı öneriler

### Video İzleme
- Video oynatıcı
- Beğen/Beğenme butonları
- Favorilere ekle
- Kaydet
- Abone ol/Abone olundu
- Yorum yapma ve okuma
- Yorum arama

### Abonelikler
- Abone olduğunuz tüm kanallar
- Kanal bilgileri ve abone sayıları

### Favoriler
- Favori olarak işaretlediğiniz videolar

### Kaydedilenler
- Daha sonra izlemek için kaydettiğiniz videolar

### Algoritmam
- İzlediğiniz video türleri
- İzlediğiniz etiketler
- Algoritmayı sıfırlama butonu

### Bildirimler
- Yeni aboneler
- Videolarınıza gelen yorumlar
- Videolarınıza gelen beğeniler
- Destekçi kanal istekleri ve yanıtları

### Geçmiş
- **İzleme Geçmişi:** İzlediğiniz videolar ve ne kadar izlediğiniz
- **Arama Geçmişi:** Yaptığınız aramalar
- Her ikisini de temizleme seçeneği

### Ayarlar
- **Tema:** Koyu, Açık, Mavi, Yeşil Orman, Mor Gece, Turuncu Gün Batımı, Pembe Rüya
- **Geçmiş Ayarları:** İzleme ve arama geçmişini kaydetme/kaydetmeme
- **Şifre Değiştir:** Eski şifre gerekli
- **Kullanıcı Adı Değiştir:** Haftada en fazla 2 kez
- **Takma Ad Değiştir:** Sınırsız
- **Giriş Denemeleri:** Hangi IP'lerden ne zaman giriş denendiğini görün

## Arama
- Üst bardaki arama kutusunu kullanın
- Video başlığı, açıklama veya etiketlere göre arama yapılır
- Arama geçmişiniz kaydedilir (ayarlardan kapatabilirsiniz)

## Klavye Kısayolları
- **Enter:** Arama yap
- **Esc:** Modal'ları kapat

## Sorun Giderme

### "Bir hata oluştu" Hatası
- Tarayıcı konsolunu açın (F12)
- Hata mesajını kontrol edin
- Server'ın çalıştığından emin olun

### Resimler Gözükmüyor
- Cloudinary bağlantısını kontrol edin
- İnternet bağlantınızı kontrol edin
- Tarayıcı önbelleğini temizleyin

### Video Yüklenmiyor
- Dosya boyutunu kontrol edin
- İnternet bağlantınızı kontrol edin
- Cloudinary limitlerini kontrol edin

### Kanal Oluşturamıyorum
- Sözleşmeyi kabul ettiğinizden emin olun
- Kanal adı girdiğinizden emin olun
- Zaten bir kanalınız olabilir

## API Endpoint'leri

Tüm API endpoint'leri için `TeaTube/API.md` dosyasına bakın.

## Destek

Sorun yaşıyorsanız:
1. `TeaTube/DEBUG.md` dosyasını okuyun
2. Tarayıcı konsolunu kontrol edin
3. Server loglarını kontrol edin
4. `TeaTube/DUZELTMELER.md` dosyasındaki bilinen sorunlara bakın
