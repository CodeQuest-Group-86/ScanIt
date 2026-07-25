# ScanIt

ScanIt is a mobile application that helps users identify products and find useful information about them.

Users can scan a product using a barcode or camera image, and the app provides:

- Product name and details
- Available sellers and locations
- Product prices
- AI-based product recognition
- Authenticity status estimation
- Scan history and saved products

The app uses a mobile frontend that communicates with a Spring Boot backend. The backend manages business logic, authentication, product information, sellers, and database operations.

---

# Technologies Used

## Frontend

- **React Native** — Mobile application framework
- **Expo** — Development framework for React Native
- **Expo Router** — File-based navigation
- **TypeScript** — Programming language
- **Zustand** — State management
- **TensorFlow Lite** — On-device AI model support

## Backend

- **Java**
- **Spring Boot** — Backend framework
- **Spring Security** — Authentication and authorization
- **Spring Data JPA** — Database interaction
- **Hibernate** — ORM framework
- **JWT** — User authentication tokens
- **Maven** — Dependency management and build tool

## Database

- **H2 Database** — Development database
- **PostgreSQL** — Production database

## AI Services

- HuggingFace AI models
- TensorFlow Lite MobileNet model

---

# Project Structure Overview

```
ScanIt/
│
├── app/                  # React Native application screens
│   ├── (auth)/           # Login and registration screens
│   ├── (tabs)/           # Main app tabs
│   └── scan-result.tsx   # Scan result display
│
├── components/           # Reusable UI components
│
├── services/             # API communication and AI services
│   ├── ai.ts             # AI model integration
│   ├── scan.ts           # Scan workflow
│   └── auth.ts           # Authentication requests
│
├── stores/               # Zustand application state
│
├── types/                # TypeScript interfaces
│
├── assets/               # Images and AI models
│
├── backend/              # Spring Boot backend
│   └── src/main/java/
│       └── com/scanit/backend/
│           ├── controller/    # API endpoints
│           ├── service/       # Business logic
│           ├── entity/        # Database models
│           ├── repository/    # Database queries
│           ├── security/      # JWT security
│           └── dto/           # API data objects
│
└── package.json
```

---

# Installing Dependencies

## Frontend

Navigate to the project root:

```bash
cd ScanIt
```

Install dependencies:

```bash
npm install
```

## Backend

Navigate to the backend folder:

```bash
cd backend
```

Install Maven dependencies:

```bash
mvn install
```

---

# Running the Application

## Start Backend

From the backend folder:

```bash
mvn spring-boot:run
```

The backend starts on:

```
http://localhost:8080
```

The backend handles:

- Authentication
- Product searches
- Scan processing
- Seller information
- Database operations

---

## Start Frontend

From the project root:

```bash
npx expo start
```

Then:

- Open Expo Go on a mobile device
- Scan the QR code
- Or run using an Android emulator

---

# Environment Variables

Create a `.env.local` file in the project root.

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080/api/v1
EXPO_PUBLIC_HF_TOKEN=your_huggingface_token
```

## Variables

### EXPO_PUBLIC_API_URL

The address of the Spring Boot backend.

Example:

For Android emulator:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1
```

For a physical device:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8080/api/v1
```

### EXPO_PUBLIC_HF_TOKEN

HuggingFace API token used for AI image recognition models.

---

# API Overview

The backend provides REST API endpoints.

## Authentication

### Register User

```
POST /auth/sign-up
```

Creates a new user account.

---

### Login

```
POST /auth/sign-in
```

Authenticates a user and returns JWT tokens.

---

### Refresh Token

```
POST /auth/refresh-token
```

Generates a new access token.

---

## Products

### Get Products

```
GET /products/**
```

Search and retrieve product information.

---

## Sellers

### Get Sellers

```
GET /sellers/**
```

Retrieve seller information.

---

## Scanning

### Analyze Product Image

```
POST /scans/analyze
```

Processes a product image and returns matching product information.

---

### Barcode Lookup

```
GET /scans/barcode/{code}
```

Finds a product using its barcode.

---

### Scan History

```
GET /scans/history
```

Returns previous scans for the authenticated user.

---

## User

### User Profile

```
GET /users/me
```

Gets the current user's profile.

---

# Database Setup

## Development

The project uses H2 database during development.

Advantages:

- No database installation required
- Automatically created when the backend starts
- Suitable for testing

Database configuration:

```
application-dev.yml
```

---

## Production

Production uses PostgreSQL.

Required configuration:

- PostgreSQL database
- DATABASE_URL environment variable
- Production Spring profile enabled

The backend uses Hibernate to manage database tables.

Main database entities:

- Users
- Products
- Sellers
- Inventory Items
- Scan Results
- Notifications
- Saved Products
- Price Alerts

---

# Development Notes

- The frontend communicates with the backend through REST APIs.
- The mobile app does not directly access the database.
- Authentication uses JWT tokens.
- AI models assist with product recognition, while the backend database provides product details and seller information.
