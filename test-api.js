// TeaTube API Test Script
const API_URL = 'http://localhost:3000/api';

async function testRegister() {
  console.log('🧪 Kayıt testi başlıyor...');
  
  const formData = new FormData();
  formData.append('username', 'testuser' + Date.now());
  formData.append('display_name', 'Test User');
  formData.append('password', '123456');
  formData.append('kvkk_accepted', '1');

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Kayıt başarılı!', data);
      return data.userId;
    } else {
      console.log('❌ Kayıt hatası:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ İstek hatası:', error.message);
    return null;
  }
}

async function testLogin(username) {
  console.log('🧪 Giriş testi başlıyor...');
  
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        password: '123456'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Giriş başarılı!', data);
      return data.user;
    } else {
      console.log('❌ Giriş hatası:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ İstek hatası:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 TeaTube API Testleri Başlıyor...\n');
  
  // Test 1: Kayıt
  const username = 'testuser' + Date.now();
  const userId = await testRegister();
  
  if (!userId) {
    console.log('❌ Testler durdu - Kayıt başarısız');
    return;
  }
  
  console.log('\n');
  
  // Test 2: Giriş
  const user = await testLogin(username);
  
  if (!user) {
    console.log('❌ Testler durdu - Giriş başarısız');
    return;
  }
  
  console.log('\n✅ Tüm testler başarılı!');
}

// Node.js ortamında çalıştır
if (typeof window === 'undefined') {
  const fetch = require('node-fetch');
  const FormData = require('form-data');
  runTests();
}
