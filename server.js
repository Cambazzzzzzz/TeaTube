const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const db = require('./src/database');
const routes = require('./src/routes');
const adminRoutes = require('./src/routes-admin');
const musicRoutes = require('./src/routes-music');
const groupRoutes = require('./src/routes-groups');
const textPostRoutes = require('./src/routes-textposts');
const migrateAdminPassword = require('./migrate-admin-password');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3456;

// Admin �ifresini g�ncelle (sadece ilk ba�latmada)
migrateAdminPassword().catch(err => console.error('Migration error:', err));

app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.static('public'));


// API route'larına UTF-8 charset ekle
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
app.use('/api', textPostRoutes);

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



// Admin giri� sayfas�
app.get('/administans', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'administans.html'));
});

// Admin paneli
app.get('/bcics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bcics.html'));
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

server.listen(PORT, () => {
  console.log(`
�??�?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��??
�??         TeaTube Server v1.0          �??
�?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?�
�??  Port: ${PORT}                         �??
�??  URL: http://localhost:${PORT}        �??
�??  Status: �?? �?alı�?ıyor                 �??
�??�?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?�
  `);
});

// Optimized timeouts for Railway
server.timeout = 120000; // 2 dakika
server.keepAliveTimeout = 65000; // 65 saniye
server.headersTimeout = 66000; // 66 saniye

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

module.exports = app;

