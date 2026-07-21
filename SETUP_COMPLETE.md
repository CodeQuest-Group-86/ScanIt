# ScanIt Mobile App - Complete Setup Guide

This guide will help you set up and run the ScanIt mobile app with all integrations fully functional.

## ✅ Completed Configurations

### 1. Environment Variables
All API keys and configurations have been set up:

- **Gemini API Key**: Configured for product scanning
- **Paystack Keys**: Live public and secret keys configured for payments
- **Scan Limit**: Set to 3 free lifetime scans before payment required
- **Payment Integration**: Direct Paystack API integration implemented

### 2. Payment System
- ✅ Paystack live keys integrated
- ✅ 3 free lifetime scans limit implemented
- ✅ Payment modal integrated with paywall
- ✅ Premium status management after payment
- ✅ Direct Paystack API calls (no backend dependency)

### 3. Scan System
- ✅ Changed from daily to lifetime scan limits
- ✅ Gemini Vision API integration for product recognition
- ✅ DuckDuckGo integration for seller search
- ✅ Offline fallback with local Gemini processing
- ✅ Barcode scanning support

### 4. TypeScript Errors Fixed
- ✅ Added `phoneNumber` to User interface
- ✅ Added `phoneNumber` to SignUpPayload
- ✅ Fixed scan-history.tsx loadHistory call
- ✅ Fixed PaywallModal typography

## 🚀 Quick Start

### Option 1: Development with Backend

1. **Start the Backend:**
```bash
cd C:/Users/user/Desktop/ScanIt
docker compose up -d
```

2. **Configure Environment:**
Copy `.env.production` to `.env.local` and adjust API URL if needed:
```bash
cp .env.production .env.local
```

3. **Start the Mobile App:**
```bash
npx expo start --clear
```

4. **Scan the QR Code:**
Use Expo Go app on your phone to scan the QR code

### Option 2: Development without Backend (Local AI Only)

1. **Configure Environment:**
Create `.env.local` with:
```env
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
EXPO_PUBLIC_GEMINI_API_KEY=AQ.Ab8RN6KLWu9ZHZhjQD-E-iT5hMfuUxSE01m49U1fDoFm9qF3vg
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_74e29f7885f02e0c92e44b0e981dd26fea044376
EXPO_PUBLIC_PAYSTACK_SECRET_KEY=sk_live_3a4c203545a2e21f973b67f86eea4b3a5062e74a
```

2. **Start the App:**
```bash
npx expo start --clear
```

The app will use local Gemini AI processing if backend is unavailable.

## 🔧 Configuration Details

### Environment Variables

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1  # Android emulator
# EXPO_PUBLIC_API_URL=http://192.168.1.XXX:8080/api/v1  # Physical device

# Gemini AI API Key
EXPO_PUBLIC_GEMINI_API_KEY=AQ.Ab8RN6KLWu9ZHZhjQD-E-iT5hMfuUxSE01m49U1fDoFm9qF3vg

# Paystack Configuration
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_74e29f7885f02e0c92e44b0e981dd26fea044376
EXPO_PUBLIC_PAYSTACK_SECRET_KEY=sk_live_3a4c203545a2e21f973b67f86eea4b3a5062e74a
```

### Scan Limit System

- **Free Users**: 3 lifetime scans total
- **Premium Users**: Unlimited scans
- **Tracking**: Stored in AsyncStorage as total scan count
- **Upgrade**: Payment via Paystack when limit reached

## 📱 App Features

### Authentication
- Sign up with email and password
- Sign in with existing credentials
- OTP verification (via email/SMS)
- Password reset flow
- Mock authentication when backend unavailable

### Scanning
- Camera-based product scanning
- Gallery image scanning
- Barcode scanning
- AI product recognition (Gemini Vision)
- Seller discovery (DuckDuckGo)
- Price comparison
- Authenticity detection

### Payment
- Paystack integration
- Monthly and yearly plans
- Secure payment processing
- Premium status activation
- Unlimited scans after payment

### User Features
- Scan history
- Saved products
- Product recommendations
- Seller inventory (for sellers)
- Profile management

## 🧪 Testing

### Test Authentication Flow
1. Open app and click "Sign Up"
2. Enter name, email, password
3. Select role (consumer/seller)
4. Verify OTP (if backend available)
5. Sign in with credentials

### Test Scan Functionality
1. Grant camera permissions
2. Point camera at a product
3. Tap shutter button or wait for barcode detection
4. View product results
5. Check scan count increments

### Test Payment Flow
1. Use all 3 free scans
2. Paywall modal should appear
3. Click "Upgrade to Premium"
4. Select payment plan
5. Complete Paystack payment
6. Verify premium status activated

## 🔍 Troubleshooting

### Backend Connection Issues
- Check Docker is running: `docker ps`
- Verify backend health: `curl http://localhost:8080/api/v1/actuator/health`
- Check API URL in `.env.local`

### Gemini API Issues
- Verify API key is correct
- Check Gemini API quota
- Enable Gemini API in Google Cloud Console

### Paystack Issues
- Verify keys are correct
- Check Paystack dashboard for transaction logs
- Ensure keys are for correct environment (live/test)

### Scan Issues
- Check camera permissions
- Verify Gemini API key is set
- Test with different products
- Check network connectivity

## 📋 Production Deployment

### Backend Deployment
1. Push code to GitHub
2. Deploy to Render/Railway
3. Configure production database
4. Set environment variables
5. Update mobile app API URL

### Mobile App Build
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

### Update Production Environment
```env
EXPO_PUBLIC_API_URL=https://your-production-backend.com/api/v1
```

## 🔐 Security Notes

⚠️ **Important Security Considerations:**

1. **API Keys**: Your live Paystack keys are in `.env.example` - for production:
   - Remove actual keys from `.env.example`
   - Keep only in `.env.local` (gitignored)
   - Use environment variables in deployment platform

2. **Gemini Key**: Currently in `.env.example` - same security measures apply

3. **Backend**: Ensure JWT_SECRET is changed in production
4. **Database**: Use strong passwords in production
5. **Rate Limiting**: Implement for production API

## 📞 Support

For issues or questions:
- Check TODO.md for known issues
- Review docs/IMPLEMENTATION.md for technical details
- Check docs/TODO.md for production checklist

## ✨ Summary

Your ScanIt mobile app is now fully functional with:
- ✅ Complete Paystack payment integration
- ✅ 3 free lifetime scans with premium upgrade
- ✅ Gemini AI product recognition
- ✅ Full authentication system
- ✅ Backend and offline support
- ✅ All TypeScript errors fixed
- ✅ Environment configuration complete

The app is ready for development and testing!