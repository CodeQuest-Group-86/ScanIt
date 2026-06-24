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
  /** Price of this specific product at this seller's store */
  price?: number;
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

export type AIModelName =
  | 'HuggingFace Vision'
  | 'TensorFlow Lite'
  | 'MobileNet'
  | 'CLIP'
  | 'ResNet-50'
  | 'BERT';

export interface AIModelResult {
  model: AIModelName;
  confidence: number; // 0–100
  label: string;
}

export interface AIAnalysisResult {
  /** Primary product recognition (Vision API + TFLite + MobileNet) */
  recognition: AIModelResult;
  /** Visual similarity score for similar product matching (CLIP) */
  similarity: AIModelResult;
  /** Counterfeit probability — lower = more likely authentic (ResNet-50) */
  authenticity: AIModelResult;
  /** Semantic search embedding was used (BERT) */
  semantic: AIModelResult;
  /** Combined weighted confidence across all models */
  overallConfidence: number;
}

export interface ScanResult {
  id: string;
  product: Product;
  confidence: number;
  scannedAt: string;
  authenticityStatus: AuthenticityStatus;
  imageUri?: string;
  /** AI model breakdown — populated when AI pipeline is used */
  aiAnalysis?: AIAnalysisResult;
  /**
   * true when the backend was unreachable during scan.
   * Product data will be incomplete (no sellers or prices).
   */
  offlineMode?: boolean;
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

// ─── OTP ──────────────────────────────────────────────────────────────────────

export type OtpChannel = 'email' | 'sms';

export interface SendOtpPayload {
  /** E.164 phone (e.g. +233201234567) or email address */
  contact: string;
  channel: OtpChannel;
  /** 'signup' | 'reset-password' */
  purpose: 'signup' | 'reset-password';
}

export interface VerifyOtpPayload {
  contact: string;
  code: string;
  purpose: 'signup' | 'reset-password';
}

export interface ResetPasswordPayload {
  contact: string;
  /** Token returned by verifyOtp */
  resetToken: string;
  newPassword: string;
}
