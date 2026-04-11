const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./src/database');
const routes = require('./src/routes');
const adminRoutes = require('./src/routes-admin');
const musicRoutes = require('./src/routes-music');

const app = express();
const PORT = process.env.PORT || 3456;

app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.static('public'));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);
app.use('/api', adminRoutes);
app.use('/api', musicRoutes);

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Sunucu hatası', message: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║         TeaTube Server v1.0          ║
╠═══════════════════════════════════════╣
║  Port: ${PORT}                         ║
║  URL: http://localhost:${PORT}        ║
║  Status: ✓ Çalışıyor                 ║
╚═══════════════════════════════════════╝
  `);
});

// Video yükleme için uzun timeout
server.timeout = 1800000; // 30 dakika
server.keepAliveTimeout = 1800000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

module.exports = app;
