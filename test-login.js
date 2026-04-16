const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing login with testuser...');
    
    const response = await fetch('http://localhost:3456/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: 'test123' })
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();