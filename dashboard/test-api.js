// Quick test script for Hugging Face Spaces API integration
import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('Testing Hugging Face Spaces API integration...');

    const response = await fetch('http://localhost:3100/api/ide/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello, can you help me with TypeScript?',
      }),
    });

    const data = await response.json();
    console.log('API Response:', data);

    if (data.success && data.reply) {
      console.log('✅ Hugging Face Spaces integration is working!');
      console.log('Response preview:', data.reply.substring(0, 100) + '...');
    } else {
      console.log('❌ API returned success=false or no reply');
    }
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI();
