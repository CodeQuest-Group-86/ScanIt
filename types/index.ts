export type Role = 'consumer' | 'seller';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  scansCount: number;
  savedCount: number;
  totalSaved: number;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface Seller {
  id: string;
  name: string;
  location: string;
  distance: string;
  phone: string;
  whatsapp: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  origin: string;
  specs: Record<string, string>;
  verified: boolean;
  authenticity: AuthenticityStatus;
  sellers: Seller[];
  barcode?: string;
}

export type AuthenticityStatus = 'authentic' | 'suspicious' | 'counterfeit';

export interface ScanResult {
  id: string;
  product: Product;
  confidence: number;
  scannedAt: string;
  authenticityStatus: AuthenticityStatus;
  imageUri?: string;
}

export interface Recommendation {
  id: string;
  product: Product;
  seller: Seller;
  price: number;
  originalPrice: number;
  discountPercent: number;
  thumbnailColor: string;
}

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  dropPercent: number;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  timestamp: string;
  type: 'price_alert' | 'system' | 'new_seller';
}

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  listed: boolean;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
