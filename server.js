const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./src/database');
const routes = require('./src/routes');
const adminRoutes = require('./src/routes-admin');
const musicRoutes = require('./src/routes-music');
const groupRoutes = require('./src/routes-groups');
const migrateAdminPassword = require('./migrate-admin-password');

const app = express();
const PORT = process.env.PORT || 3456;

// Admin şifresini güncelle (sadece ilk başlatmada)
migrateAdminPassword().catch(err => console.error('Migration error:', err));

app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.static('public'));

// API route'larÄ±na UTF-8 charset ekle
app.use('/api', (req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return origJson(data);
  };
  next();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);
app.use('/api', adminRoutes);
app.use('/api', musicRoutes);
app.use('/api', groupRoutes);

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin paneli
app.get('/bcics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bcics.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadÄ±' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Sunucu hatasÄ±', message: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`
âââââââââââââââââââââââââââââââââââââââââ
â         TeaTube Server v1.0          â
â ââââââââââââââââââââââââââââââââââââââââ£
â  Port: ${PORT}                         â
â  URL: http://localhost:${PORT}        â
â  Status: â ÃalÄ±ÅÄ±yor                 â
âââââââââââââââââââââââââââââââââââââââââ
  `);
});

// Video yÃ¼kleme iÃ§in uzun timeout
server.timeout = 1800000; // 30 dakika
server.keepAliveTimeout = 1800000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alÄ±ndÄ±, sunucu kapatÄ±lÄ±yor...');
  server.close(() => {
    console.log('Sunucu kapatÄ±ldÄ±');
    process.exit(0);
  });
});

module.exports = app;
