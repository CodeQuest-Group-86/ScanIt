# ScanIt - Complete Beginner's Guide

## What is ScanIt?

ScanIt is a mobile application that helps you identify products, compare prices, and verify authenticity using your phone's camera. It's designed for the Ghanaian market to help consumers make informed purchasing decisions.

### Key Features
- **Product Scanning**: Point your camera at any product to identify it
- **Price Comparison**: See prices from multiple sellers across Ghana
- **Authenticity Verification**: Check if products are genuine or counterfeit
- **Seller Information**: Find where to buy products with contact details
- **Price History**: Track price changes over time
- **AI-Powered**: Uses advanced AI to recognize products and gather information

## How It Works

### The Scanning Process
1. **Capture**: You take a photo of a product with your phone's camera
2. **AI Analysis**: The app uses Google's Gemini AI to identify what the product is
3. **Price Search**: It searches DuckDuckGo for prices from Ghanaian retailers
4. **Results Display**: You see product details, prices, and where to buy

### The Technology Behind It

#### Frontend (What You See)
- **React Native**: A framework that lets us build mobile apps for both iOS and Android using JavaScript
- **Expo**: A toolkit that makes React Native development easier
- **Expo Router**: Handles navigation between different screens in the app
- **Zustand**: Manages the app's state (like user login info, scan history, etc.)

#### Backend (The Brain)
- **Spring Boot**: A Java framework that handles server-side logic
- **Database**: Stores user accounts, products, and scan history
- **API**: Provides endpoints for the mobile app to communicate with

#### AI Services
- **Gemini Vision**: Google's AI that recognizes products from images
- **DuckDuckGo**: Search engine to find prices and sellers
- **Paystack**: Payment processing for premium subscriptions

## Project Structure

```
ScanIt/
├── app/                    # Mobile app screens
│   ├── (auth)/            # Authentication screens (sign-up, sign-in, etc.)
│   ├── (tabs)/            # Main app tabs (home, scan, saved, profile)
│   ├── scan-result.tsx    # Shows results after scanning
│   └── index.tsx          # App entry point
├── components/            # Reusable UI components
│   ├── Button.tsx        # Custom button with gradients
│   ├── Input.tsx         # Text input fields
│   ├── GlassCard.tsx     # Glass-morphism card design
│   └── PaymentModal.tsx   # Payment subscription modal
├── services/              # API communication
│   ├── auth.ts           # Authentication API calls
│   ├── scan.ts           # Scanning logic
│   ├── gemini.ts         # AI product recognition
│   ├── duckduckgo.ts     # Price/seller search
│   └── payment.ts        # Payment processing
├── stores/                # State management
│   ├── auth.ts           # User authentication state
│   ├── scan.ts           # Scanning state and history
│   └── saved.ts          # Saved products
├── backend/               # Java Spring Boot backend
│   └── src/main/java/    # Backend Java code
├── theme/                 # App colors and styling
│   └── index.ts          # Design tokens (colors, fonts, spacing)
└── utils/                 # Helper functions
    ├── api.ts            # HTTP client for API calls
    ├── format.ts         # Formatting utilities (prices, dates)
    └── links.ts          # URL builders for external services
```

## Getting Started

### Prerequisites
- **Node.js**: JavaScript runtime (version 18 or higher)
- **Java**: For the backend (version 17 or higher)
- **Expo Go**: Mobile app on your phone (download from App Store/Play Store)
- **Git**: For version control

### Installation Steps

#### 1. Install Dependencies
```bash
npm install
```
This downloads all the JavaScript libraries needed for the mobile app.

#### 2. Configure Environment
Create a file called `.env.local` in the project root:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1
EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

#### 3. Start the Backend
```bash
cd backend
docker-compose up -d
```
This starts the Java backend server using Docker.

#### 4. Start the Mobile App
```bash
npx expo start
```
This starts the Expo development server.

#### 5. Connect Your Phone
- Open Expo Go on your phone
- Scan the QR code shown in your terminal
- The app will load on your phone

## Understanding the Code

### React Components
The app is built using React components. Each component is a piece of UI that can be reused.

**Example - Button Component:**
```tsx
// components/Button.tsx
export default function Button({ label, onPress, variant = 'primary' }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}
```

### State Management
We use Zustand to manage app state. This stores things like:
- User login information
- Scan history
- Saved products
- App settings

**Example - Auth Store:**
```tsx
// stores/auth.ts
export const useAuthStore = create((set) => ({
  user: null,
  login: async (email, password) => {
    // Login logic here
  },
  logout: () => {
    // Logout logic here
  },
}));
```

### API Communication
The app communicates with the backend using HTTP requests.

**Example - API Call:**
```tsx
// services/auth.ts
async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/sign-in`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}
```

## Key Concepts

### Authentication Flow
1. **Sign Up**: User creates account with email/phone
2. **OTP Verification**: System sends a code to verify contact
3. **Account Created**: User can now sign in
4. **JWT Token**: Server gives a token for subsequent requests

### Scanning Flow
1. **Camera Access**: App requests camera permission
2. **Image Capture**: User takes product photo
3. **AI Processing**: Gemini identifies the product
4. **Price Search**: DuckDuckGo finds sellers and prices
5. **Results Display**: User sees product information

### Payment Flow
1. **Plan Selection**: User chooses subscription plan
2. **Payment Initialization**: Paystack creates payment
3. **User Payment**: User completes payment in browser
4. **Verification**: App confirms payment success
5. **Premium Access**: User gets unlimited scans

## Design System

### Colors
The app uses a warm, earthy color palette:
- **Primary**: `#E8682A` (Orange) - Main actions, buttons
- **Accent**: `#1A9ED4` (Blue) - Secondary actions, links
- **Surface**: `#FAF0E4` (Cream) - Backgrounds
- **Text**: `#1E1410` (Dark brown) - Headings, body text

### Components
- **Glass Cards**: Semi-transparent cards with blur effect
- **Gradient Buttons**: Buttons with color gradients
- **Liquid Glass Background**: Animated background effects
- **Shadows**: Soft shadows for depth

## Common Tasks

### Adding a New Screen
1. Create a new file in `app/` directory
2. Export it as default
3. Add navigation in `_layout.tsx` if needed

### Modifying the Theme
Edit `theme/index.ts` to change colors, fonts, or spacing.

### Adding API Endpoints
1. Add endpoint in backend controller
2. Add service method in backend service
3. Add API call in frontend services
4. Update types if needed

### Testing Changes
1. Save your changes
2. Expo will automatically reload the app
3. Test on your phone or emulator

## Troubleshooting

### App Won't Load
- Check that Expo server is running
- Verify your phone and computer are on same WiFi
- Check `.env.local` API_URL is correct

### Backend Not Working
- Verify Docker is running: `docker-compose ps`
- Check backend logs: `docker-compose logs`
- Ensure port 8080 is not in use

### Scanning Not Working
- Verify Gemini API key is set
- Check camera permissions are granted
- Ensure backend is running

### Build Errors
- Run `npm install` to update dependencies
- Clear Expo cache: `npx expo start --clear`
- Check for TypeScript errors

## Development Tips

### Hot Reload
The app automatically reloads when you save changes. You don't need to restart the server.

### Debugging
- Use `console.log()` to debug
- Check Expo terminal for errors
- Use React DevTools for state inspection

### Code Organization
- Keep components small and focused
- Use descriptive names for functions and variables
- Add comments for complex logic
- Follow existing code style

## Next Steps

### Learning Resources
- **React Native**: https://reactnative.dev/docs/getting-started
- **Expo**: https://docs.expo.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Spring Boot**: https://spring.io/guides

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter issues:
1. Check the TODO.md for known issues
2. Review SETUP_GUIDE.md for configuration help
3. Check backend logs for errors
4. Verify all environment variables are set

## Summary

ScanIt is a sophisticated mobile application that combines:
- **Modern UI**: Beautiful glass-morphism design
- **AI Integration**: Product recognition using Gemini
- **Real-time Data**: Price comparison and seller information
- **Secure Authentication**: OTP-based verification
- **Payment Processing**: Paystack integration

The project uses industry-standard technologies and follows best practices for mobile app development. It's designed to be maintainable, scalable, and user-friendly.

For detailed setup instructions, see SETUP_GUIDE.md
For remaining tasks, see TODO.md
