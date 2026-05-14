/**
 * TeaTube /admin paneli oturumu — imzalı token (bellek dışı, tüm Node worker'larda geçerli).
 * Ortam: TEATUBE_ADMIN_SESSION_SECRET (üretimde mutlaka ayarlayın)
 */
const crypto = require('crypto');

const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 gün

function sessionSecret() {
  return (
    process.env.TEATUBE_ADMIN_SESSION_SECRET ||
    'teatube-admin-dev-only-change-with-teatube-admin-session-secret'
  );
}

function createSessionToken(userId) {
  const payload = JSON.stringify({
    sub: Number(userId),
    iat: Date.now()
  });
  const body = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret()).update(body).digest('hex');
  return `${body}.${sig}`;
}

function parseSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(body).digest('hex');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data || typeof data.sub !== 'number' || !Number.isFinite(data.iat)) return null;
  if (Date.now() - data.iat > TTL_MS) return null;
  return { userId: String(data.sub) };
}

function parseBearer(authorizationHeader) {
  const raw = authorizationHeader || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function isValidToken(token) {
  return parseSessionToken(token) != null;
}

module.exports = {
  createSessionToken,
  parseSessionToken,
  parseBearer,
  isValidToken
};
