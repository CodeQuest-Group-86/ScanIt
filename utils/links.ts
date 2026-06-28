/** Build a Google Search URL that opens in the device browser. */
export function buildGoogleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/** Google search for a specific product (primary "find this product" link). */
export function buildProductGoogleUrl(productName: string, brand?: string): string {
  const q = brand && brand !== 'Unknown'
    ? `${productName} ${brand} buy price Ghana`
    : `${productName} buy price Ghana`;
  return buildGoogleSearchUrl(q);
}

/** Google search scoped to a retailer + product. */
export function buildSellerGoogleUrl(productName: string, sellerName: string): string {
  return buildGoogleSearchUrl(`${productName} ${sellerName} buy Ghana`);
}

/** DuckDuckGo web search URL (opens in browser). */
export function buildDuckDuckGoUrl(query: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
}
