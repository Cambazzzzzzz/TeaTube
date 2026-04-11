const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'teatube.db'));
db.pragma('journal_mode = WAL');

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
  )
`);

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

// İzleme geçmişi tablosu
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

// Arama geçmişi tablosu
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
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Beğeniler tablosu
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

// Giriş denemeleri tablosu
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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

// Arkadaşlık tabloları
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

// is_hidden kolonu ekle (yoksa)
try {
  db.prepare('ALTER TABLE videos ADD COLUMN is_hidden INTEGER DEFAULT 0').run();
} catch(e) {}

// is_ad kolonu ekle (yoksa)
try {
  db.prepare('ALTER TABLE videos ADD COLUMN is_ad INTEGER DEFAULT 0').run();
  console.log('✅ is_ad kolonu eklendi');
} catch(e) {
  // Kolon zaten var
}

// Eski videoların is_ad değerini düzelt (migration) - HER BAŞLANGIŞTA ÇALIŞ
try {
  const nullCount = db.prepare('SELECT COUNT(*) as cnt FROM videos WHERE is_ad IS NULL').get();
  if (nullCount.cnt > 0) {
    const result = db.prepare('UPDATE videos SET is_ad = 0 WHERE is_ad IS NULL').run();
    console.log(`✅ ${result.changes} video güncellendi (is_ad NULL → 0)`);
  }
  
  // Tüm videoları kontrol et ve 1 olanları 0 yap (sadece ilk çalıştırmada)
  const adCount = db.prepare('SELECT COUNT(*) as cnt FROM videos WHERE is_ad = 1').get();
  if (adCount.cnt > 0) {
    console.log(`⚠️  ${adCount.cnt} video is_ad=1 olarak işaretli, kontrol ediliyor...`);
    // Sadece ads tablosunda olmayan videoları 0 yap
    const result = db.prepare(`
      UPDATE videos SET is_ad = 0 
      WHERE is_ad = 1 AND id NOT IN (SELECT video_id FROM ads)
    `).run();
    if (result.changes > 0) {
      console.log(`✅ ${result.changes} video düzeltildi (is_ad 1 → 0, ads tablosunda yok)`);
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

// Yorum beğeni tablosu
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

// Reklam kodları tablosu (tek kullanımlık BCİCS kodları)
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

// BCİCS kodlarını ekle (yoksa)
const adCodes = [
  'BCİCS-7f9K2mP4nL','BCİCS-qR8tV5xY1z','BCİCS-3M6bN9pQ7r','BCİCS-W1vC4sD2gH','BCİCS-kL0jH8fG6d',
  'BCİCS-pQ2wE4rT7y','BCİCS-9nB5mV3cXz','BCİCS-aS6dF1gH9j','BCİCS-kL2mN4bP7v','BCİCS-1rT5yU8iO0',
  'BCİCS-pL3kJ6hG9f','BCİCS-qA4sW7eR1t','BCİCS-zX2cV5bN8m','BCİCS-9oI6uY3tR1','BCİCS-pP0oL8kI5j',
  'BCİCS-uY2tR5eE8w','BCİCS-mN7bV4cX1z','BCİCS-8hG5fD2sA9','BCİCS-kL1pQ4wE7r','BCİCS-0xZ3cV6bN9',
  'BCİCS-mJ7hG4fD1s','BCİCS-9oI2uY5tR8','BCİCS-eE1wW4qQ7a','BCİCS-sS2dD5fF8g','BCİCS-hH1jJ4kK7l',
  'BCİCS-zZ2xX5cC8v','BCİCS-bB1nN4mM7p','BCİCS-qQ3wW6eE9r','BCİCS-tT2yY5uU8i','BCİCS-oO1pP4aA7s',
  'BCİCS-dD2fF5gG8h','BCİCS-jJ1kK4lL7z','BCİCS-xX2cC5vV8b','BCİCS-nN1mM4pP7q','BCİCS-wW2eE5rR8t',
  'BCİCS-yY1uU4iI7o','BCİCS-aA2sS5dD8f','BCİCS-gG1hH4jJ7k','BCİCS-lL2zZ5xX8c','BCİCS-vV1bB4nN7m',
  'BCİCS-pP2qQ5wW8e','BCİCS-rR1tT4yY7u','BCİCS-iI2oO5pP8a','BCİCS-sS1dD4fF7g','BCİCS-hH2jJ5kK8l',
  'BCİCS-zZ1xX4cC7v','BCİCS-bB2nN5mM8p','BCİCS-qQ1wW4eE7r','BCİCS-tT3yY6uU9i','BCİCS-oO2pP5aA8s',
  'BCİCS-dD1fF4gG7h','BCİCS-jJ2kK5lL8z','BCİCS-xX1cC4vV7b','BCİCS-nN2mM5pP8q','BCİCS-wW1eE4rR7t',
  'BCİCS-yY2uU5iI8o','BCİCS-aA1sS4dD7f','BCİCS-gG2hH5jJ8k','BCİCS-lL1zZ4xX7c','BCİCS-vV2bB5nN8m',
  'BCİCS-pP1qQ4wW7e','BCİCS-rR2tT5yY8u','BCİCS-iI1oO4pP7a','BCİCS-sS3dD6fF9g','BCİCS-hH3jJ6kK9l',
  'BCİCS-zZ3xX6cC9v','BCİCS-bB3nN6mM9p','BCİCS-qQ2wW5eE8r','BCİCS-tT1yY4uU7i','BCİCS-oO3pP6aA9s',
  'BCİCS-dD3fF6gG9h','BCİCS-xX3cC6vV9b','BCİCS-nN3mM6pP9q','BCİCS-yY3uU6iI9o','BCİCS-aA3sS6dD9f',
  'BCİCS-lL3zZ6xX9c','BCİCS-vV3bB6nN9m','BCİCS-rR3tT6yY9u','BCİCS-iI3oO6pP9a','BCİCS-hH3jJ6kK9l',
  'BCİCS-gG1hH4jJ7k','BCİCS-lL1zZ4xX7c','BCİCS-vV2bB5nN8m','BCİCS-pP1qQ4wW7e','BCİCS-rR1tT4yY7u',
  'BCİCS-iI2oO5pP8a','BCİCS-sS1dD4fF7g','BCİCS-zZ2xX5cC8v','BCİCS-bB1nN4mM7p','BCİCS-qQ3wW6eE9r',
  'BCİCS-tT2yY5uU8i','BCİCS-oO1pP4aA7s','BCİCS-dD3fF6gG9h','BCİCS-jJ2kK5lL8z','BCİCS-xX1cC4vV7b',
  'BCİCS-nN3mM6pP9q','BCİCS-wW2eE5rR8t','BCİCS-yY1uU4iI7o','BCİCS-aA3sS6dD9f','BCİCS-gG2hH5jJ8k'
];

const insertCode = db.prepare('INSERT OR IGNORE INTO ad_codes (code) VALUES (?)');
const insertMany = db.transaction((codes) => { for (const c of codes) insertCode.run(c); });
insertMany(adCodes);

// ==================== ADMIN SİSTEMİ ====================

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

// Video askıya alma
try { db.prepare('ALTER TABLE videos ADD COLUMN suspended_by_admin INTEGER DEFAULT 0').run(); } catch(e) {}

// Admin hesabını oluştur (yoksa)
const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('AdminTeaS');
if (!adminExists) {
  const bcrypt = require('bcrypt');
  const hashedPw = bcrypt.hashSync('bcicsadmin4128_', 4);
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('AdminTeaS', hashedPw);
  console.log('✅ Admin hesabı oluşturuldu: AdminTeaS');
}

// ==================== TS MUSIC ====================

// Artist başvuruları
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Şarkılar
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

// Playlist şarkıları
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

// Şarkı beğenileri
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

console.log('✅ TS Music tabloları hazır!');

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

console.log('✅ Grup tabloları hazır!');

// Grup tabloları migration (eski DB için)
try { db.prepare('ALTER TABLE groups ADD COLUMN allow_member_messages INTEGER DEFAULT 1').run(); } catch(e) {}
try { db.prepare('ALTER TABLE groups ADD COLUMN allow_member_photos INTEGER DEFAULT 1').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN permissions TEXT DEFAULT "{}"').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN is_muted INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN muted_until DATETIME').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN is_banned INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare('ALTER TABLE group_members ADD COLUMN banned_until DATETIME').run(); } catch(e) {}

module.exports = db;
