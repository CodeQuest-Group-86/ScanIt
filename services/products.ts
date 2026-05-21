import type { ApiResponse, Product, Recommendation, Seller, Notification, PriceAlert, InventoryItem } from '@/types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const MOCK_SELLERS: Seller[] = [
  { id: 's1', name: 'Makola Market', location: 'Makola', distance: '0.8km', phone: '+233201234567', whatsapp: '+233201234567', verified: true, rating: 4.5, reviewCount: 234 },
  { id: 's2', name: 'Accra Mall Store', location: 'Accra Mall', distance: '2.1km', phone: '+233209876543', whatsapp: '+233209876543', verified: true, rating: 4.8, reviewCount: 512 },
  { id: 's3', name: 'Kaneshie Market', location: 'Kaneshie', distance: '3.5km', phone: '+233245678901', whatsapp: '+233245678901', verified: false, rating: 3.9, reviewCount: 89 },
  { id: 's4', name: 'Oxford Street Shop', location: 'Osu', distance: '4.2km', phone: '+233277654321', whatsapp: '+233277654321', verified: true, rating: 4.6, reviewCount: 178 },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Tropical Juice 500ml',
    brand: 'Tropical',
    category: 'Drinks',
    description: 'Fresh tropical fruit juice blend. No artificial preservatives.',
    imageUrl: 'https://via.placeholder.com/200x200/E76F2E/FFFFFF?text=Tropical',
    price: 3.40,
    currency: '₵',
    origin: 'Ghana',
    specs: { 'Volume': '500ml', 'Sugar': 'No added sugar', 'pH Level': '3.8', 'Min Order': '1 unit', 'Shelf Life': '12 months' },
    verified: true,
    authenticity: 'authentic',
    sellers: [MOCK_SELLERS[0], MOCK_SELLERS[1]],
  },
  {
    id: 'p2',
    name: 'Sunny Juice 500ml',
    brand: 'Sunny',
    category: 'Drinks',
    description: 'Refreshing citrus blend juice, great for daily nutrition.',
    imageUrl: 'https://via.placeholder.com/200x200/F1C40F/FFFFFF?text=Sunny',
    price: 2.80,
    currency: '₵',
    origin: 'Ghana',
    specs: { 'Volume': '500ml', 'Sugar': '12g per serving', 'pH Level': '3.5', 'Min Order': '1 unit', 'Shelf Life': '10 months' },
    verified: true,
    authenticity: 'authentic',
    sellers: [MOCK_SELLERS[0], MOCK_SELLERS[2]],
  },
  {
    id: 'p3',
    name: 'Cocoa Spread 350g',
    brand: 'GoldenChoco',
    category: 'Snacks',
    description: 'Premium Ghanaian cocoa spread made with locally sourced cocoa beans.',
    imageUrl: 'https://via.placeholder.com/200x200/6B3A2A/FFFFFF?text=Cocoa',
    price: 28.50,
    currency: '₵',
    origin: 'Ghana',
    specs: { 'Weight': '350g', 'Cocoa Content': '45%', 'Sugar': '18g per serving', 'Min Order': '1 unit', 'Shelf Life': '18 months' },
    verified: true,
    authenticity: 'authentic',
    sellers: [MOCK_SELLERS[1], MOCK_SELLERS[3]],
  },
  {
    id: 'p4',
    name: 'Coral Mineral Water 1.5L',
    brand: 'Coral',
    category: 'Drinks',
    description: 'Pure natural mineral water sourced from Ghanaian springs.',
    imageUrl: 'https://via.placeholder.com/200x200/2FA4D7/FFFFFF?text=Coral',
    price: 4.20,
    currency: '₵',
    origin: 'Ghana',
    specs: { 'Volume': '1.5L', 'Type': 'Still', 'pH Level': '7.2', 'Min Order': '6 units', 'TDS': '85mg/L' },
    verified: true,
    authenticity: 'authentic',
    sellers: [MOCK_SELLERS[0], MOCK_SELLERS[1], MOCK_SELLERS[2]],
  },
  {
    id: 'p5',
    name: 'Shea Butter Cream 250ml',
    brand: 'AfriGlow',
    category: 'Care',
    description: 'Pure organic shea butter body cream for smooth, moisturized skin.',
    imageUrl: 'https://via.placeholder.com/200x200/F5E9D8/3E2C23?text=AfriGlow',
    price: 35.00,
    currency: '₵',
    origin: 'Ghana',
    specs: { 'Volume': '250ml', 'Type': 'Body Cream', 'Ingredients': '100% Organic', 'Min Order': '1 unit', 'Shelf Life': '24 months' },
    verified: false,
    authenticity: 'suspicious',
    sellers: [MOCK_SELLERS[2], MOCK_SELLERS[3]],
  },
];

export const MOCK_RECOMMENDATIONS: Recommendation[] = [
  { id: 'r1', product: MOCK_PRODUCTS[1], seller: MOCK_SELLERS[0], price: 2.80, originalPrice: 3.40, discountPercent: 18, thumbnailColor: '#F1C40F' },
  { id: 'r2', product: MOCK_PRODUCTS[3], seller: MOCK_SELLERS[2], price: 3.50, originalPrice: 4.20, discountPercent: 17, thumbnailColor: '#2FA4D7' },
  { id: 'r3', product: MOCK_PRODUCTS[2], seller: MOCK_SELLERS[1], price: 25.00, originalPrice: 28.50, discountPercent: 12, thumbnailColor: '#6B3A2A' },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Price Drop Alert', body: 'Tropical Juice 500ml is now ₵2.90 at Makola Market', read: false, timestamp: new Date(Date.now() - 1800000).toISOString(), type: 'price_alert' },
  { id: 'n2', title: 'New Seller Nearby', body: 'A verified seller just listed Cocoa Spread near you', read: false, timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'new_seller' },
  { id: 'n3', title: 'Welcome to ScanIt!', body: 'Start scanning products to compare prices and verify authenticity', read: true, timestamp: new Date(Date.now() - 86400000).toISOString(), type: 'system' },
];

const MOCK_PRICE_ALERTS: PriceAlert[] = [
  { id: 'pa1', productId: 'p1', productName: 'Tropical Juice 500ml', oldPrice: 3.40, newPrice: 2.90, dropPercent: 15, timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'pa2', productId: 'p3', productName: 'Cocoa Spread 350g', oldPrice: 28.50, newPrice: 24.00, dropPercent: 16, timestamp: new Date(Date.now() - 3600000).toISOString() },
];

const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'i1', name: 'Tropical Juice 500ml', price: 3.40, stock: 240, category: 'Drinks', imageUrl: '', listed: true },
  { id: 'i2', name: 'Cocoa Spread 350g', price: 28.50, stock: 56, category: 'Snacks', imageUrl: '', listed: true },
  { id: 'i3', name: 'Coral Water 1.5L', price: 4.20, stock: 18, category: 'Drinks', imageUrl: '', listed: false },
];

export const productService = {
  async getProducts(query?: string, category?: string): Promise<ApiResponse<Product[]>> {
    await delay(600);
    let results = [...MOCK_PRODUCTS];
    if (query) results = results.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.brand.toLowerCase().includes(query.toLowerCase()));
    if (category && category !== 'All') results = results.filter(p => p.category === category);
    return { success: true, data: results };
  },

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    await delay(400);
    const product = MOCK_PRODUCTS.find(p => p.id === id);
    if (!product) return { success: false, message: 'Product not found', data: null as never };
    return { success: true, data: product };
  },

  async getRecommendations(productId: string): Promise<ApiResponse<Recommendation[]>> {
    await delay(700);
    return { success: true, data: MOCK_RECOMMENDATIONS };
  },

  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    await delay(400);
    return { success: true, data: MOCK_NOTIFICATIONS };
  },

  async getPriceAlerts(): Promise<ApiResponse<PriceAlert[]>> {
    await delay(400);
    return { success: true, data: MOCK_PRICE_ALERTS };
  },

  async getInventory(): Promise<ApiResponse<InventoryItem[]>> {
    await delay(500);
    return { success: true, data: MOCK_INVENTORY };
  },
};
