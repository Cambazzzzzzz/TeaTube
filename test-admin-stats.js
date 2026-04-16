const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'teatube.db'));

console.log('🧪 Admin Stats Test');

const queries = [
  { name: 'totalUsers', query: 'SELECT COUNT(*) as cnt FROM users' },
  { name: 'suspendedUsers', query: 'SELECT COUNT(*) as cnt FROM users WHERE is_suspended = 1' },
  { name: 'totalVideos', query: 'SELECT COUNT(*) as cnt FROM videos' },
  { name: 'totalChannels', query: 'SELECT COUNT(*) as cnt FROM channels WHERE account_type = "channel"' },
  { name: 'totalPersonal', query: 'SELECT COUNT(*) as cnt FROM channels WHERE account_type = "personal"' },
  { name: 'totalSongs', query: 'SELECT COUNT(*) as cnt FROM songs' },
  { name: 'totalArtists', query: 'SELECT COUNT(*) as cnt FROM music_artists' },
  { name: 'pendingApplications', query: 'SELECT COUNT(*) as cnt FROM music_artist_applications WHERE status = "pending"' },
  { name: 'bannedIPs', query: "SELECT COUNT(*) as cnt FROM ip_blocks WHERE blocked_until > datetime('now')" }
];

queries.forEach(({ name, query }) => {
  try {
    const result = db.prepare(query).get().cnt;
    console.log(`✅ ${name}: ${result}`);
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
  }
});

db.close();