const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'teatube.db'));
db.pragma('journal_mode = WAL');
db.pragma('encoding = "UTF-8"');

// Kullanıcılar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    nickname TEXT NOT NULL,
    password TEXT NOT NULL,
    profile_photo TEXT DEFAULT '?',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_username_change DATETIME,
    username_change_count INTEGER DEFAULT 0,
    theme TEXT DEFAULT 'dark'
  )
`);

// Kanallar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    channel_name TEXT NOT NULL,
    channel_banner TEXT,
    about TEXT,
    channel_type TEXT,
    channel_tags TEXT,
    links TEXT,
    account_type TEXT DEFAULT 'channel',
    is_private_account INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Videolar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    banner_url TEXT NOT NULL,
    video_type TEXT NOT NULL,
    tags TEXT,
    comments_enabled INTEGER DEFAULT 1,
    likes_visible INTEGER DEFAULT 1,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
  )
`);

// Duration alanını ekle (eğer yoksa)
try {
  db.exec(`ALTER TABLE videos ADD COLUMN duration INTEGER DEFAULT 0`);
} catch(e) {
  // Alan zaten varsa hata vermez
}

// share_id alanını ekle (eğer yoksa)
try {
  // Önce kolonun var olup olmadığını kontrol et
  const columns = db.prepare("PRAGMA table_info(videos)").all();
  const hasShareId = columns.some(col => col.name === 'share_id');
  
  if (!hasShareId) {
    db.exec(`ALTER TABLE videos ADD COLUMN share_id TEXT UNIQUE`);
    console.log('✅ share_id kolonu eklendi');
  } else {
    console.log('✅ share_id kolonu zaten mevcut');
  }
} catch(e) {
  console.error('❌ share_id kolonu eklenirken hata:', e.message);
}

// Abonelikler tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    UNIQUE(user_id, channel_id)
  )
`);

// Favoriler tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE(user_id, video_id)
  )
`);

// Kaydedilenler tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS saved_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE(user_id, video_id)
  )
`);

// °zleme geçmişi tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    watch_duration INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
  )
`);

// Arama geçmişi tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    search_query TEXT NOT NULL,
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Yorumlar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_suspended INTEGER DEFAULT 0,
    suspended_by INTEGER,
    suspended_reason TEXT,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (suspended_by) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Yorumlar tablosuna eksik kolonları ekle
try {
  db.prepare('ALTER TABLE comments ADD COLUMN is_suspended INTEGER DEFAULT 0').run();
} catch(e) {}

try {
  db.prepare('ALTER TABLE comments ADD COLUMN suspended_by INTEGER').run();
} catch(e) {}

try {
  db.prepare('ALTER TABLE comments ADD COLUMN suspended_reason TEXT').run();
} catch(e) {}

// Beeniler tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS video_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    like_type INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(video_id, user_id)
  )
`);

// Bildirimler tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    related_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Destekçi kanallar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS supporter_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    supporter_channel_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (supporter_channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    UNIQUE(channel_id, supporter_channel_id)
  )
`);

// Giriş denemeleri tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    attempted_password TEXT NOT NULL,
    success INTEGER DEFAULT 0,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// IP engelleme tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS ip_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT UNIQUE NOT NULL,
    blocked_until DATETIME NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// reason kolonu yoksa ekle
try { db.prepare('ALTER TABLE ip_blocks ADD COLUMN reason TEXT').run(); } catch(e) {}

// Ayarlar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    search_history_enabled INTEGER DEFAULT 1,
    watch_history_enabled INTEGER DEFAULT 1,
    is_private INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// is_private kolonu ekle (eski kayıtlar için)
try {
  db.prepare('ALTER TABLE user_settings ADD COLUMN is_private INTEGER DEFAULT 0').run();
} catch(e) {}

// Takip istekleri tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS follow_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Algoritma verileri tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS algorithm_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_type TEXT NOT NULL,
    tag TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Arkadaşlık tabloları
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sender_id, receiver_id),
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
} catch(e) {}

// is_short kolonu ekle (yoksa)
try {
  db.prepare('ALTER TABLE videos ADD COLUMN is_short INTEGER DEFAULT 0').run();
} catch(e) {}

// Metinler tablosu (Twitter benzeri metin paylaşımları)
db.exec(`
  CREATE TABLE IF NOT EXISTS texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    share_id TEXT UNIQUE,
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    comments_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Metin beğenileri tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS text_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(text_id, user_id)
  )
`);

// Metin yorumları tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS text_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// text_content kolonu ekle (metin içerikler için)
try {
  db.prepare('ALTER TABLE videos ADD COLUMN text_content TEXT').run();
} catch(e) {}

// text_type kolonu ekle (teaweet veya plain)
try {
  db.prepare('ALTER TABLE videos ADD COLUMN text_type TEXT DEFAULT "plain"').run();
} catch(e) {}

// Bug/°stek tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS bug_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Yenilikler tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// is_hidden kolonu ekle (yoksa)
try {
  db.prepare('ALTER TABLE videos ADD COLUMN is_hidden INTEGER DEFAULT 0').run();
} catch(e) {}

// is_ad kolonu ekle (yoksa)
try {
  db.prepare('ALTER TABLE videos ADD COLUMN is_ad INTEGER DEFAULT 0').run();
  console.log('â is_ad kolonu eklendi');
} catch(e) {
  // Kolon zaten var
}

// Eski videoların is_ad deerini düzelt (migration) - HER BAşLANGIşTA ÖALIş
try {
  const nullCount = db.prepare('SELECT COUNT(*) as cnt FROM videos WHERE is_ad IS NULL').get();
  if (nullCount.cnt > 0) {
    const result = db.prepare('UPDATE videos SET is_ad = 0 WHERE is_ad IS NULL').run();
    console.log(`â ${result.changes} video güncellendi (is_ad NULL â 0)`);
  }
  
  // Tüm videoları kontrol et ve 1 olanları 0 yap (sadece ilk çalıştırmada)
  const adCount = db.prepare('SELECT COUNT(*) as cnt FROM videos WHERE is_ad = 1').get();
  if (adCount.cnt > 0) {
    console.log(`â ï¸  ${adCount.cnt} video is_ad=1 olarak işaretli, kontrol ediliyor...`);
    // Sadece ads tablosunda olmayan videoları 0 yap
    const result = db.prepare(`
      UPDATE videos SET is_ad = 0 
      WHERE is_ad = 1 AND id NOT IN (SELECT video_id FROM ads)
    `).run();
    if (result.changes > 0) {
      console.log(`â ${result.changes} video düzeltildi (is_ad 1 â 0, ads tablosunda yok)`);
    }
  }
} catch(e) {
  console.error('Migration hatası:', e);
}

// account_type ve is_private_account kolonları ekle (yoksa)
try {
  db.prepare('ALTER TABLE channels ADD COLUMN account_type TEXT DEFAULT "channel"').run();
} catch(e) {}

try {
  db.prepare('ALTER TABLE channels ADD COLUMN is_private_account INTEGER DEFAULT 0').run();
} catch(e) {}

// Yorum beeni tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS comment_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    like_type INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id),
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Yorum yanıtları için parent_id ekle (yoksa)
try {
  db.prepare('ALTER TABLE comments ADD COLUMN parent_id INTEGER DEFAULT NULL').run();
} catch(e) {} // Zaten varsa hata verir, ignore

// Engelleme tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS user_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER NOT NULL,
    blocked_id INTEGER NOT NULL,
    blocked_ip TEXT,
    blocked_device TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Yorum sabitleme ve askıya alma için kolonlar ekle
try {
  db.prepare('ALTER TABLE comments ADD COLUMN is_pinned INTEGER DEFAULT 0').run();
} catch(e) {}

try {
  db.prepare('ALTER TABLE comments ADD COLUMN is_hidden INTEGER DEFAULT 0').run();
} catch(e) {}

try {
  db.prepare('ALTER TABLE comments ADD COLUMN liked_by_owner INTEGER DEFAULT 0').run();
} catch(e) {}

// Mevcut yorumlar için NULL deerleri düzelt
try {
  db.prepare('UPDATE comments SET is_pinned = 0 WHERE is_pinned IS NULL').run();
  db.prepare('UPDATE comments SET is_hidden = 0 WHERE is_hidden IS NULL').run();
  db.prepare('UPDATE comments SET liked_by_owner = 0 WHERE liked_by_owner IS NULL').run();
} catch(e) {}

console.log('TeaTube veritabanı hazır!');

// Video görüntülenme takip tablosu (bot koruması)
db.exec(`
  CREATE TABLE IF NOT EXISTS video_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Eski kayıtları temizle (7 günden eski)
try {
  db.prepare("DELETE FROM video_views WHERE viewed_at < datetime('now', '-7 days')").run();
} catch(e) {}

// Reklam kodları tablosu (tek kullanımlık BC°CS kodları)
db.exec(`
  CREATE TABLE IF NOT EXISTS ad_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    used INTEGER DEFAULT 0,
    used_by INTEGER,
    used_at DATETIME,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Reklamlar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    ad_title TEXT NOT NULL,
    ad_description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
  )
`);

// BC°CS kodlarını ekle (yoksa)
const adCodes = [
  'BC°CS-7f9K2mP4nL','BC°CS-qR8tV5xY1z','BC°CS-3M6bN9pQ7r','BC°CS-W1vC4sD2gH','BC°CS-kL0jH8fG6d',
  'BC°CS-pQ2wE4rT7y','BC°CS-9nB5mV3cXz','BC°CS-aS6dF1gH9j','BC°CS-kL2mN4bP7v','BC°CS-1rT5yU8iO0',
  'BC°CS-pL3kJ6hG9f','BC°CS-qA4sW7eR1t','BC°CS-zX2cV5bN8m','BC°CS-9oI6uY3tR1','BC°CS-pP0oL8kI5j',
  'BC°CS-uY2tR5eE8w','BC°CS-mN7bV4cX1z','BC°CS-8hG5fD2sA9','BC°CS-kL1pQ4wE7r','BC°CS-0xZ3cV6bN9',
  'BC°CS-mJ7hG4fD1s','BC°CS-9oI2uY5tR8','BC°CS-eE1wW4qQ7a','BC°CS-sS2dD5fF8g','BC°CS-hH1jJ4kK7l',
  'BC°CS-zZ2xX5cC8v','BC°CS-bB1nN4mM7p','BC°CS-qQ3wW6eE9r','BC°CS-tT2yY5uU8i','BC°CS-oO1pP4aA7s',
  'BC°CS-dD2fF5gG8h','BC°CS-jJ1kK4lL7z','BC°CS-xX2cC5vV8b','BC°CS-nN1mM4pP7q','BC°CS-wW2eE5rR8t',
  'BC°CS-yY1uU4iI7o','BC°CS-aA2sS5dD8f','BC°CS-gG1hH4jJ7k','BC°CS-lL2zZ5xX8c','BC°CS-vV1bB4nN7m',
  'BC°CS-pP2qQ5wW8e','BC°CS-rR1tT4yY7u','BC°CS-iI2oO5pP8a','BC°CS-sS1dD4fF7g','BC°CS-hH2jJ5kK8l',
  'BC°CS-zZ1xX4cC7v','BC°CS-bB2nN5mM8p','BC°CS-qQ1wW4eE7r','BC°CS-tT3yY6uU9i','BC°CS-oO2pP5aA8s',
  'BC°CS-dD1fF4gG7h','BC°CS-jJ2kK5lL8z','BC°CS-xX1cC4vV7b','BC°CS-nN2mM5pP8q','BC°CS-wW1eE4rR7t',
  'BC°CS-yY2uU5iI8o','BC°CS-aA1sS4dD7f','BC°CS-gG2hH5jJ8k','BC°CS-lL1zZ4xX7c','BC°CS-vV2bB5nN8m',
  'BC°CS-pP1qQ4wW7e','BC°CS-rR2tT5yY8u','BC°CS-iI1oO4pP7a','BC°CS-sS3dD6fF9g','BC°CS-hH3jJ6kK9l',
  'BC°CS-zZ3xX6cC9v','BC°CS-bB3nN6mM9p','BC°CS-qQ2wW5eE8r','BC°CS-tT1yY4uU7i','BC°CS-oO3pP6aA9s',
  'BC°CS-dD3fF6gG9h','BC°CS-xX3cC6vV9b','BC°CS-nN3mM6pP9q','BC°CS-yY3uU6iI9o','BC°CS-aA3sS6dD9f',
  'BC°CS-lL3zZ6xX9c','BC°CS-vV3bB6nN9m','BC°CS-rR3tT6yY9u','BC°CS-iI3oO6pP9a','BC°CS-hH3jJ6kK9l',
  'BC°CS-gG1hH4jJ7k','BC°CS-lL1zZ4xX7c','BC°CS-vV2bB5nN8m','BC°CS-pP1qQ4wW7e','BC°CS-rR1tT4yY7u',
  'BC°CS-iI2oO5pP8a','BC°CS-sS1dD4fF7g','BC°CS-zZ2xX5cC8v','BC°CS-bB1nN4mM7p','BC°CS-qQ3wW6eE9r',
  'BC°CS-tT2yY5uU8i','BC°CS-oO1pP4aA7s','BC°CS-dD3fF6gG9h','BC°CS-jJ2kK5lL8z','BC°CS-xX1cC4vV7b',
  'BC°CS-nN3mM6pP9q','BC°CS-wW2eE5rR8t','BC°CS-yY1uU4iI7o','BC°CS-aA3sS6dD9f','BC°CS-gG2hH5jJ8k'
];

const insertCode = db.prepare('INSERT OR IGNORE INTO ad_codes (code) VALUES (?)');
const insertMany = db.transaction((codes) => { for (const c of codes) insertCode.run(c); });
insertMany(adCodes);

// ==================== ADMIN S°STEM° ====================

// Admin hesabı tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Kullanıcı yasakları tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS user_bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ban_type TEXT NOT NULL,
    reason TEXT,
    banned_by INTEGER,
    banned_until DATETIME,
    is_permanent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Kullanıcı askıya alma (hesap suspend)
try { db.prepare('ALTER TABLE users ADD COLUMN is_suspended INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN suspend_reason TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN last_ip TEXT').run(); } catch(e) {}

// Video askıya alma
try { db.prepare('ALTER TABLE videos ADD COLUMN suspended_by_admin INTEGER DEFAULT 0').run(); } catch(e) {}

// Admin hesabını oluştur (yoksa)
const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('AdminTeaS');
if (!adminExists) {
  const bcrypt = require('bcrypt');
  const hashedPw = bcrypt.hashSync('bcicsadmin4128_', 4);
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('AdminTeaS', hashedPw);
  console.log('â Admin hesabı oluşturuldu: AdminTeaS');
}

// ==================== TS MUSIC ====================

// Artist başvuruları
db.exec(`
  CREATE TABLE IF NOT EXISTS music_artist_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    artist_name TEXT NOT NULL,
    artist_alias TEXT,
    real_name TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Artistler
db.exec(`
  CREATE TABLE IF NOT EXISTS music_artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    artist_name TEXT NOT NULL,
    artist_alias TEXT,
    bio TEXT,
    cover_photo TEXT,
    is_verified INTEGER DEFAULT 0,
    is_suspended INTEGER DEFAULT 0,
    show_play_count INTEGER DEFAULT 1,
    monthly_plays INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Aylık dinlenme alanını ekle (eğer yoksa)
try {
  db.exec(`ALTER TABLE music_artists ADD COLUMN monthly_plays INTEGER DEFAULT 0`);
} catch(e) {
  // Alan zaten varsa hata vermez
}

// şarkılar
db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    genre TEXT,
    lyrics TEXT,
    audio_url TEXT NOT NULL,
    cover_url TEXT NOT NULL,
    play_count INTEGER DEFAULT 0,
    is_suspended INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES music_artists(id) ON DELETE CASCADE
  )
`);

// Playlistler
db.exec(`
  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    cover_url TEXT,
    is_public INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Playlist şarkıları
db.exec(`
  CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, song_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  )
`);

// şarkı beenileri
db.exec(`
  CREATE TABLE IF NOT EXISTS song_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, song_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  )
`);

console.log('â TS Music tabloları hazır!');

// real_name kolonu ekle (eski kayıtlar için)
try { db.prepare('ALTER TABLE music_artist_applications ADD COLUMN real_name TEXT').run(); } catch(e) {}

// ==================== GRUPLAR ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    photo TEXT,
    is_private INTEGER DEFAULT 0,
    owner_id INTEGER NOT NULL,
    allow_members_write INTEGER DEFAULT 1,
    allow_members_photo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    permissions TEXT DEFAULT '{}',
    is_muted INTEGER DEFAULT 0,
    muted_until DATETIME,
    is_banned INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS group_join_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

console.log('â Grup tabloları hazır!');

// Grup tabloları migration (eski DB için)
try { db.prepare('ALTER TABLE groups ADD COLUMN allow_member_messages INTEGER DEFAULT 1').run(); } catch(e) {}
try { db.prepare('ALTER TABLE groups ADD COLUMN allow_member_photos INTEGER DEFAULT 1').run(); } catch(e) {}
try { db.prepare('ALTER TABLE groups ADD COLUMN is_private INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN permissions TEXT DEFAULT "{}"').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN is_muted INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN muted_until DATETIME').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN is_banned INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN banned_until DATETIME').run(); } catch(e) {}

// photo_url kolonu yoksa ekle, photo kolonunu photo_url'ye kopyala
try {
  const cols = db.prepare("PRAGMA table_info(groups)").all().map(c => c.name);
  if (!cols.includes('photo_url')) {
    db.prepare('ALTER TABLE groups ADD COLUMN photo_url TEXT').run();
    // Eski photo verisini photo_url'ye kopyala
    if (cols.includes('photo')) {
      db.prepare('UPDATE groups SET photo_url = photo WHERE photo IS NOT NULL').run();
    }
  }
  if (!cols.includes('description')) db.prepare('ALTER TABLE groups ADD COLUMN description TEXT').run();
} catch(e) {}

// ==================== ROZET S°STEM° ====================

// Rozetler tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT DEFAULT '#ffffff',
    name_color TEXT DEFAULT '#ffffff',
    description TEXT,
    is_system INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Kullanıcı rozetleri
db.exec(`
  CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
  )
`);

// Aktif rozet (profilde gösterilen)
try { db.prepare('ALTER TABLE users ADD COLUMN active_badge_id INTEGER DEFAULT NULL').run(); } catch(e) {}

// Demlikçi rozetini oluştur (sistem rozeti)
const demlikBadge = db.prepare("SELECT id FROM badges WHERE name = 'Demlikçi'").get();
if (!demlikBadge) {
  db.prepare("INSERT INTO badges (name, icon, color, name_color, description, is_system) VALUES (?, ?, ?, ?, ?, 1)")
    .run('Demlikçi', 'fa-mug-hot', '#ffffff', '#ffffff', 'TeaTube üyesi');
  console.log('â Demlikçi rozeti oluşturuldu');
}

// Tüm kullanıcılara Demlikçi rozetini ver (yoksa)
try {
  const demlikId = db.prepare("SELECT id FROM badges WHERE name = 'Demlikçi'").get()?.id;
  if (demlikId) {
    const users = db.prepare('SELECT id FROM users').all();
    const insertBadge = db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)');
    const tx = db.transaction(() => { for (const u of users) insertBadge.run(u.id, demlikId); });
    tx();
  }
} catch(e) {}

console.log('â Rozet sistemi hazır!');

// ==================== DUYURU S°STEM° ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'permanent',
    duration_seconds INTEGER,
    expires_at DATETIME,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('â Duyuru tablosu hazır!');

// Engelleme tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS user_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER NOT NULL,
    blocked_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id)
  )
`);

// °lgilenmiyorum tablosu (etiket bazlı)
db.exec(`
  CREATE TABLE IF NOT EXISTS user_tag_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    preference INTEGER DEFAULT -1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tag)
  )
`);

// Videos tablosuna is_suspended kolonu ekle (yoksa)
try {
  db.exec('ALTER TABLE videos ADD COLUMN is_suspended INTEGER DEFAULT 0');
} catch(e) { /* Zaten var */ }

// ==================== KULLANIM KOŞULLARI ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS terms_of_service (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (updated_by) REFERENCES admins(id)
  )
`);

// Varsayılan kullanım koşullarını ekle
const existingTerms = db.prepare('SELECT id FROM terms_of_service').get();
if (!existingTerms) {
  db.prepare('INSERT INTO terms_of_service (content, version) VALUES (?, ?)').run(
    'TeaTube Kullanım Koşulları\n\nBu platformu kullanarak aşağıdaki koşulları kabul etmiş olursunuz:\n\n1. Uygunsuz içerik paylaşmayacaksınız\n2. Diğer kullanıcılara saygılı olacaksınız\n3. Telif haklarına uyacaksınız\n\nBu koşullar adminler tarafından güncellenebilir.',
    1
  );
}

console.log('✓ Kullanım koşulları tablosu hazır!');

// ==================== SİSTEM LOGLARI ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    ip_address TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`);

console.log('✓ Sistem logları tablosu hazır!');

// ==================== ADMIN ŞİFRE ====================

// Admin şifre tablosu (basit)
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_password (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    password TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Varsayılan şifreyi ekle (bcics4128-316-4128)
const bcrypt = require('bcrypt');
const existingAdminPw = db.prepare('SELECT id FROM admin_password WHERE id = 1').get();
if (!existingAdminPw) {
  const hashedPw = bcrypt.hashSync('bcics4128-316-4128', 10);
  db.prepare('INSERT INTO admin_password (id, password) VALUES (1, ?)').run(hashedPw);
  console.log('✓ Admin şifresi oluşturuldu');
}

console.log('✓ Admin şifre tablosu hazır!');

// ==================== HİSSE SİSTEMİ ====================

// Hisse senetleri tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    current_price REAL DEFAULT 100.0,
    change_percent REAL DEFAULT 0.0,
    volume INTEGER DEFAULT 0,
    market_cap REAL DEFAULT 0.0,
    description TEXT,
    logo_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Kullanıcı hisse portföyleri
db.exec(`
  CREATE TABLE IF NOT EXISTS user_portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    shares_owned REAL DEFAULT 0.0,
    average_price REAL DEFAULT 0.0,
    total_invested REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stock_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
  )
`);

// Hisse işlem geçmişi
db.exec(`
  CREATE TABLE IF NOT EXISTS stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell')),
    shares REAL NOT NULL,
    price_per_share REAL NOT NULL,
    total_amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
  )
`);

// Kullanıcı bakiyeleri (hisse alım-satımı için)
try {
  db.prepare('ALTER TABLE users ADD COLUMN balance REAL DEFAULT 10000.0').run();
  console.log('✓ Kullanıcılara balance kolonu eklendi');
} catch(e) {
  // Kolon zaten var
}

// Varsayılan hisse senetlerini ekle
const defaultStocks = [
  { symbol: 'TEATUBE', name: 'TeaTube Inc.', current_price: 150.0, description: 'Video paylaşım platformu', logo_url: '/logoteatube.png' },
  { symbol: 'TECHNO', name: 'Techno Corp', current_price: 85.5, description: 'Teknoloji şirketi', logo_url: null },
  { symbol: 'GAMING', name: 'Gaming Studios', current_price: 42.3, description: 'Oyun geliştirme şirketi', logo_url: null },
  { symbol: 'SOCIAL', name: 'Social Media Co', current_price: 78.9, description: 'Sosyal medya platformu', logo_url: null },
  { symbol: 'CRYPTO', name: 'Crypto Exchange', current_price: 125.7, description: 'Kripto para borsası', logo_url: null },
  { symbol: 'ECOM', name: 'E-Commerce Ltd', current_price: 95.2, description: 'E-ticaret platformu', logo_url: null },
  { symbol: 'STREAM', name: 'Streaming Plus', current_price: 67.8, description: 'Video streaming servisi', logo_url: null },
  { symbol: 'MOBILE', name: 'Mobile Apps Inc', current_price: 33.4, description: 'Mobil uygulama geliştirici', logo_url: null },
  { symbol: 'CLOUD', name: 'Cloud Services', current_price: 189.6, description: 'Bulut hizmetleri sağlayıcısı', logo_url: null },
  { symbol: 'AI', name: 'AI Solutions', current_price: 234.1, description: 'Yapay zeka çözümleri', logo_url: null }
];

const insertStock = db.prepare(`
  INSERT OR IGNORE INTO stocks (symbol, name, current_price, description, logo_url) 
  VALUES (?, ?, ?, ?, ?)
`);

const stockTransaction = db.transaction((stocks) => {
  for (const stock of stocks) {
    insertStock.run(stock.symbol, stock.name, stock.current_price, stock.description, stock.logo_url);
  }
});

stockTransaction(defaultStocks);

// Mevcut kullanıcılara başlangıç bakiyesi ver (sadece balance NULL olanlar)
try {
  const result = db.prepare('UPDATE users SET balance = 10000.0 WHERE balance IS NULL').run();
  if (result.changes > 0) {
    console.log(`✓ ${result.changes} kullanıcıya başlangıç bakiyesi verildi`);
  }
} catch(e) {
  console.error('Bakiye güncelleme hatası:', e);
}

console.log('✓ Hisse sistemi hazır!');

module.exports = db;

// ==================== şARKI YAZ S°STEM° ====================

// Yazılan şarkılar (lyrics + beat)
db.exec(`
  CREATE TABLE IF NOT EXISTS song_writings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    lyrics TEXT NOT NULL,
    beat_url TEXT,
    beat_name TEXT,
    genre TEXT,
    status TEXT DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES music_artists(id) ON DELETE CASCADE
  )
`);

// şarkı yazısı puanlamaları (beat ve lyrics ayrı)
db.exec(`
  CREATE TABLE IF NOT EXISTS song_writing_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    writing_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    beat_rating INTEGER CHECK(beat_rating BETWEEN 1 AND 5),
    lyrics_rating INTEGER CHECK(lyrics_rating BETWEEN 1 AND 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(writing_id, user_id),
    FOREIGN KEY (writing_id) REFERENCES song_writings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// şarkı yazısı yorumları
db.exec(`
  CREATE TABLE IF NOT EXISTS song_writing_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    writing_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (writing_id) REFERENCES song_writings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

console.log('â şarkı Yaz tabloları hazır!');

// Artist başvurularına örnek şarkı URL kolonu ekle
try { db.prepare('ALTER TABLE music_artist_applications ADD COLUMN sample_audio_url TEXT').run(); } catch(e) {}

// Kırmızı tik (red verified) kolonu ekle
try { db.prepare('ALTER TABLE users ADD COLUMN is_red_verified INTEGER DEFAULT 0').run(); } catch(e) {}

// Admin bypass şifresi tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);
// Varsayılan bypass şifresini ekle (yoksa)
try {
  db.prepare("INSERT OR IGNORE INTO admin_settings (key, value) VALUES ('bypass_password', 'administratorBC°CS41283164128')").run();
} catch(e) {}

// song_writings tablosuna allow_rating kolonu ekle
try { db.prepare('ALTER TABLE song_writings ADD COLUMN allow_rating INTEGER DEFAULT 1').run(); } catch(e) {}

// songs tablosuna company_name kolonu ekle
try { db.prepare('ALTER TABLE songs ADD COLUMN company_name TEXT').run(); } catch(e) {}

// Doğum tarihi kolonu ekle (yoksa)
try { db.prepare('ALTER TABLE users ADD COLUMN birth_date TEXT').run(); } catch(e) {}

// Yaş sınırı ayarlarını ekle (varsayılan 15)
try {
  db.prepare("INSERT OR IGNORE INTO admin_settings (key, value) VALUES ('min_age', '15')").run();
  db.prepare("INSERT OR IGNORE INTO admin_settings (key, value) VALUES ('min_age_warning', 'Bu platformu kullanmak için 15 yaş ve üstü olmanız gerekir.')").run();
} catch(e) {}

// Demlikçi rozeti encoding düzeltmesi - isim güncelle
try {
  db.prepare("UPDATE badges SET name = 'Demlikçi', description = 'TeaTube üyesi' WHERE is_system = 1 AND (name LIKE '%Demlik%' OR name LIKE '%DemlikÖ%')").run();
} catch(e) {}

// Admin şifresini güncelle (bcics4128.316! olarak)
try {
  const bcrypt = require('bcrypt');
  const newHash = bcrypt.hashSync('bcics4128.316!', 4);
  db.prepare("UPDATE admins SET password = ? WHERE username = 'AdminTeaS'").run(newHash);
} catch(e) {}



// ==================== INSTAGRAM TARZI YORUM SİSTEMİ ====================

// Instagram tarzı yorum sistemi için yeni kolonlar
try {
  db.prepare('ALTER TABLE comments ADD COLUMN is_edited INTEGER DEFAULT 0').run();
  console.log('✓ is_edited kolonu eklendi');
} catch(e) {}

try {
  db.prepare('ALTER TABLE comments ADD COLUMN edited_at DATETIME').run();
  console.log('✓ edited_at kolonu eklendi');
} catch(e) {}

try {
  db.prepare('ALTER TABLE comments ADD COLUMN mention_users TEXT').run(); // JSON array of mentioned user IDs
  console.log('✓ mention_users kolonu eklendi');
} catch(e) {}

try {
  db.prepare('ALTER TABLE comments ADD COLUMN reply_to_user_id INTEGER').run(); // Hangi kullanıcıya yanıt
  console.log('✓ reply_to_user_id kolonu eklendi');
} catch(e) {}

// Mevcut yorumlar için NULL değerleri düzelt
try {
  db.prepare('UPDATE comments SET is_edited = 0 WHERE is_edited IS NULL').run();
} catch(e) {}

console.log('✓ Instagram tarzı yorum sistemi hazır!');

// ==================== ADMİN YETKİ SİSTEMİ ====================

// Kullanıcı rolleri tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'yetkili', 'moderator', 'admin')),
    granted_by INTEGER,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Kullanıcı mute sistemi
db.exec(`
  CREATE TABLE IF NOT EXISTS user_mutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    muted_by INTEGER NOT NULL,
    reason TEXT,
    muted_until DATETIME,
    is_permanent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (muted_by) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Kullanıcı ban sistemi
db.exec(`
  CREATE TABLE IF NOT EXISTS user_bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    banned_by INTEGER NOT NULL,
    reason TEXT,
    banned_until DATETIME,
    is_permanent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Bildiri sistemi
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL,
    reported_content_type TEXT NOT NULL CHECK(reported_content_type IN ('video', 'comment', 'message', 'user', 'group')),
    reported_content_id INTEGER NOT NULL,
    reported_user_id INTEGER,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Kullanıcı aktivite logları
db.exec(`
  CREATE TABLE IF NOT EXISTS user_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Admin aksiyonları logları
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    target_user_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    reason TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Kullanıcılara yeni kolonlar ekle
try { db.prepare('ALTER TABLE users ADD COLUMN last_login_at DATETIME').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN last_ip TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN is_muted INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE users ADD COLUMN password_hash TEXT').run(); } catch(e) {}

// Videolara yeni kolonlar ekle
try { db.prepare('ALTER TABLE videos ADD COLUMN admin_notes TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE videos ADD COLUMN suspended_reason TEXT').run(); } catch(e) {}

// Şarkılara yeni kolonlar ekle
try { db.prepare('ALTER TABLE songs ADD COLUMN admin_notes TEXT').run(); } catch(e) {}
try { db.prepare('ALTER TABLE songs ADD COLUMN suspended_reason TEXT').run(); } catch(e) {}

// Gruplara yeni kolonlar ekle
try { db.prepare('ALTER TABLE groups ADD COLUMN admin_notes TEXT').run(); } catch(e) {}

// Yorumlara yeni kolonlar ekle
try { db.prepare('ALTER TABLE comments ADD COLUMN is_suspended INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE comments ADD COLUMN suspended_by INTEGER').run(); } catch(e) {}
try { db.prepare('ALTER TABLE comments ADD COLUMN suspended_reason TEXT').run(); } catch(e) {}

console.log('✓ Admin yetki sistemi hazır!');

// ==================== MESAJLAR ====================

// Mesajlar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

console.log('✓ Mesaj sistemi hazır!');