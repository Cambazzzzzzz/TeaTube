const fetch = require('node-fetch');

async function testAdminLogin() {
  try {
    console.log('🧪 Admin login test başlatılıyor...');
    
    const response = await fetch('http://localhost:3456/api/admin/login-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'bcics31622.4128' })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (response.ok && data.success) {
      console.log('✅ Admin login başarılı!');
      console.log('Admin:', data.admin.username);
    } else {
      console.log('❌ Admin login başarısız:', data.error);
    }
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
  }
}

testAdminLogin();