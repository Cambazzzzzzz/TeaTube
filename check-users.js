const Database = require('better-sqlite3');
const db = new Database('./data/teatube.db');

console.log('Kullanıcılar:');
const users = db.prepare('SELECT id, username, nickname FROM users LIMIT 10').all();
console.log(users);

console.log('\nToplam kullanıcı sayısı:');
const count = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log(count);

db.close();