/**
 * services/duckduckgo.ts
 *
 * Uses DuckDuckGo HTML lite search to find retailers and product pages.
 * Results are combined with known Ghana shopping platforms.
 */

import type { Seller } from '@/types';
import { buildDuckDuckGoUrl, buildProductGoogleUrl, buildSellerGoogleUrl } from '@/utils/links';

export interface DdgResult {
  title: string;
  url: string;
  snippet: string;
}

const GHANA_RETAILERS = [
  { name: 'Jumia Ghana', site: 'jumia.com.gh', location: 'Online · Nationwide' },
  { name: 'Tonaton Ghana', site: 'tonaton.com', location: 'Online · Classifieds' },
  { name: 'Kikuu Ghana', site: 'kikuu.com', location: 'Online · Budget Import' },
  { name: 'CompuGhana', site: 'compughana.com', location: 'Online · Electronics' },
  { name: 'Franko Trading', site: 'frankotrading.com', location: 'Accra · Electronics' },
] as const;

const SHOP_DOMAINS = [
  'jumia', 'tonaton', 'kikuu', 'amazon', 'ebay', 'aliexpress', 'walmart',
  'target', 'compughana', 'frankotrading', 'melcom', 'shoprite', 'maxmart',
];

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

function parseHtmlResults(html: string): DdgResult[] {
  const results: DdgResult[] = [];
  const seen = new Set<string>();

  const blockRegex = /class="result__body"[\s\S]*?(?=class="result__body"|class="nav-link")/g;
  const blocks = html.match(blockRegex) ?? [];

  for (const block of blocks) {
    const linkMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;

    const url = decodeHtmlEntities(linkMatch[1].trim());
    const title = decodeHtmlEntities(linkMatch[2].replace(/<[^>]+>/g, '').trim());
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);

    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const snippet = snippetMatch
      ? decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, '').trim())
      : '';

    results.push({ title, url, snippet });
  }

  // Fallback: parse links directly if block parsing found nothing
  if (results.length === 0) {
    const linkRegex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]*)</g;
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(html)) !== null) {
      const url = decodeHtmlEntities(m[1].trim());
      const title = decodeHtmlEntities(m[2].trim());
      if (!url || !title || seen.has(url)) continue;
      seen.add(url);
      results.push({ title, url, snippet: '' });
    }
  }

  return results.slice(0, 12);
}

/** Query DuckDuckGo HTML lite search (no API key required). */
export async function searchWeb(query: string): Promise<DdgResult[]> {
  try {
    const resp = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; ScanIt/1.0)',
      },
      body: `q=${encodeURIComponent(query)}`,
    });
    if (!resp.ok) return [];
    return parseHtmlResults(await resp.text());
  } catch {
    return [];
  }
}

function isShoppingResult(result: DdgResult): boolean {
  const haystack = `${result.title} ${result.url} ${result.snippet}`.toLowerCase();
  return SHOP_DOMAINS.some(d => haystack.includes(d))
    || /\b(buy|shop|price|store|market|ghs|cedi)\b/i.test(haystack);
}

function retailerSearchUrl(site: string, productName: string): string {
  const q = encodeURIComponent(productName);
  if (site.includes('jumia')) return `https://www.jumia.com.gh/catalog/?q=${q}`;
  if (site.includes('tonaton')) return `https://tonaton.com/en_GH/search?q=${q}`;
  if (site.includes('kikuu')) return `https://www.kikuu.com/catalog/search/?q=${q}`;
  if (site.includes('compughana')) return `https://www.compughana.com/search?q=${q}`;
  return buildDuckDuckGoUrl(`${productName} site:${site}`);
}

function extractPriceFromText(text: string): number | undefined {
  const ghs = text.match(/(?:GHS|GH₵|₵)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (ghs) return parseFloat(ghs[1].replace(/,/g, ''));
  const plain = text.match(/\b([\d,]+(?:\.\d{1,2})?)\s*(?:GHS|cedis?)\b/i);
  if (plain) return parseFloat(plain[1].replace(/,/g, ''));
  return undefined;
}

export interface ProductSearchResult {
  sellers: Seller[];
  ddgResults: DdgResult[];
  googleSearchUrl: string;
  duckDuckGoSearchUrl: string;
  detectedPrice?: number;
  snippets: string[];
}

/**
 * Search DuckDuckGo for where to buy a product and build seller rows.
 * Each seller opens a Google Search page in the device browser.
 */
export async function searchProduct(
  productName: string,
  brand: string,
  category: string,
): Promise<ProductSearchResult> {
  const query = `${productName} ${brand !== 'Unknown' ? brand : ''} buy price Ghana ${category}`.trim();
  const ddgResults = await searchWeb(query);

  const snippets = ddgResults.map(r => r.snippet).filter(Boolean);
  let detectedPrice: number | undefined;
  for (const r of ddgResults) {
    detectedPrice = extractPriceFromText(`${r.title} ${r.snippet}`);
    if (detectedPrice) break;
  }

  const sellers: Seller[] = [];
  const seenNames = new Set<string>();

  // Known Ghana retailers — always included
  for (const retailer of GHANA_RETAILERS) {
    seenNames.add(retailer.name.toLowerCase());
    sellers.push({
      id: `ddg_${retailer.site}`,
      name: retailer.name,
      location: retailer.location,
      distance: 'N/A',
      phone: '',
      whatsapp: '',
      url: buildSellerGoogleUrl(productName, retailer.name),
      directUrl: retailerSearchUrl(retailer.site, productName),
      verified: true,
      rating: 0,
      reviewCount: 0,
      price: detectedPrice,
    });
  }

  // DuckDuckGo shopping-related results
  for (const result of ddgResults.filter(isShoppingResult)) {
    const name = result.title.slice(0, 60) || new URL(result.url).hostname;
    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    let host = '';
    try { host = new URL(result.url).hostname.replace('www.', ''); } catch { /* ignore */ }

    sellers.push({
      id: `ddg_${host || sellers.length}`,
      name: host ? host.charAt(0).toUpperCase() + host.slice(1) : name,
      location: result.url.includes('.gh') ? 'Online · Ghana' : 'Online',
      distance: 'N/A',
      phone: '',
      whatsapp: '',
      url: buildSellerGoogleUrl(productName, host || name),
      directUrl: result.url,
      verified: false,
      rating: 0,
      reviewCount: 0,
      price: extractPriceFromText(`${result.title} ${result.snippet}`),
    });
  }

  // Primary Google search for the product
  const googleSearchUrl = buildProductGoogleUrl(productName, brand);

  return {
    sellers,
    ddgResults,
    googleSearchUrl,
    duckDuckGoSearchUrl: buildDuckDuckGoUrl(query),
    detectedPrice,
    snippets,
  };
}
