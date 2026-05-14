const db = require('./database');

const KEYS = {
  VIDEO_WATCHING: 'video_watching',
  POSTING: 'posting'
};

function isEnabled(key) {
  const row = db.prepare('SELECT value FROM site_feature_flags WHERE key = ?').get(key);
  return row ? Number(row.value) === 1 : true;
}

function setEnabled(key, enabled) {
  db.prepare('INSERT OR REPLACE INTO site_feature_flags (key, value) VALUES (?, ?)').run(
    key,
    enabled ? 1 : 0
  );
}

function getPublicSnapshot() {
  return {
    videoWatching: isEnabled(KEYS.VIDEO_WATCHING),
    posting: isEnabled(KEYS.POSTING)
  };
}

module.exports = { KEYS, isEnabled, setEnabled, getPublicSnapshot };
