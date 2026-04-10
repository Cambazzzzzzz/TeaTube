const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

cloudinary.config({
  cloud_name: 'dahj5lxvv',
  api_key: '357814355274844',
  api_secret: '5xeYrf6y36YL58tlQZwlVO3-WtQ'
});

// Upload signature oluştur (frontend direkt yükleme için)
function generateUploadSignature(folder, resourceType = 'video') {
  const timestamp = Math.round(Date.now() / 1000);
  // Cloudinary signature: parametreler alfabetik sırada + api_secret
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + '5xeYrf6y36YL58tlQZwlVO3-WtQ')
    .digest('hex');
  return { 
    timestamp, 
    signature, 
    folder, 
    api_key: '357814355274844', 
    cloud_name: 'dahj5lxvv',
    resource_type: resourceType
  };
}

// Video yükleme - dosya yolundan (stream ile, memory kullanmaz)
async function uploadVideoFromPath(filePath, filename) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'teatube/videos',
      public_id: `video_${Date.now()}`,
      chunk_size: 20000000, // 20MB chunks
      timeout: 1800000, // 30 dakika
      quality: 'auto:low', // Daha hızlı işleme için düşük kalite optimizasyonu
      eager_async: true,   // Async - hemen URL döner, işleme arka planda
      overwrite: false,
      invalidate: false
    }, (error, result) => {
      if (error) {
        console.error('Cloudinary video upload error:', error);
        reject(error);
      } else {
        console.log('Video uploaded:', result.secure_url);
        resolve(result.secure_url);
      }
    });
  });
}

// Video yükleme fonksiyonu (buffer - eski, küçük dosyalar için)
async function uploadVideo(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'teatube/videos',
        public_id: `video_${Date.now()}_${filename}`,
        chunk_size: 6000000, // 6MB chunks
        timeout: 900000, // 15 dakika timeout
        eager: [
          { streaming_profile: 'hd', format: 'mp4' }
        ],
        eager_async: true
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary video upload error:', error);
          reject(error);
        } else {
          console.log('Video uploaded successfully:', result.secure_url);
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// Banner (thumbnail) yükleme fonksiyonu
async function uploadBanner(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'teatube/banners',
        public_id: `banner_${Date.now()}_${filename}`,
        transformation: [
          { width: 1280, height: 720, crop: 'fill' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// Profil fotoğrafı yükleme fonksiyonu
async function uploadProfilePhoto(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'teatube/profiles',
        public_id: `profile_${Date.now()}_${filename}`,
        transformation: [
          { width: 200, height: 200, crop: 'fill', gravity: 'face' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// Kanal banner yükleme fonksiyonu
async function uploadChannelBanner(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'teatube/channel_banners',
        public_id: `channel_banner_${Date.now()}_${filename}`,
        transformation: [
          { width: 2560, height: 1440, crop: 'fill' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

module.exports = {
  uploadVideo,
  uploadVideoFromPath,
  uploadBanner,
  uploadProfilePhoto,
  uploadChannelBanner,
  generateUploadSignature
};
