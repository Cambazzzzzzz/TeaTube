/**
 * TeaTube /admin paneli oturum tokenları (bellek içi).
 * routes-teatube-admin ve routes-super-admin tarafından paylaşılır.
 */
const validTokens = new Set();

function addToken(token) {
  if (token) validTokens.add(token);
}

function isValidToken(token) {
  return Boolean(token && validTokens.has(token));
}

module.exports = { addToken, isValidToken };
