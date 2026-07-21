// Environment variable checker for debugging
console.log('=== Environment Variables Check ===');
console.log('EXPO_PUBLIC_GEMINI_API_KEY:', process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'SET ✓' : 'NOT SET ✗');
console.log('EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY:', process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ? 'SET ✓' : 'NOT SET ✗');
console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL ? 'SET ✓' : 'NOT SET ✗');
console.log('====================================');