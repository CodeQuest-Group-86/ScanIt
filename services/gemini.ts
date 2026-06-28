/**
 * services/gemini.ts
 *
 * Google Gemini Vision — identifies products from captured images.
 * Text-only Gemini call extracts price/specs from DuckDuckGo snippets.
 *
 * Set EXPO_PUBLIC_GEMINI_API_KEY in .env.local
 * Get a free key at: https://aistudio.google.com/app/apikey
 */

import * as FileSystem from 'expo-file-system';
import type { AuthenticityStatus } from '@/types';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeminiProductInfo {
  name: string;
  brand: string;
  category: string;
  description: string;
}

export interface GeminiResearch {
  specs: Record<string, string>;
  priceMin: number;
  priceMax: number;
  priceTypical: number;
  authenticity: AuthenticityStatus;
}

const IDENTIFY_PROMPT =
  'You are a product identification AI. Look at this image carefully and identify what product or item is shown.\n\n' +
  'IMPORTANT: Be generous — identify ANY physical object: consumer goods, food, drinks, electronics, clothing, ' +
  'household items, tools, stationery, cosmetics, medicine, etc. Even if the brand is unclear, identify the item type.\n\n' +
  'Respond with ONLY this JSON (no markdown, no explanation):\n' +
  '{"name":"<specific product name>","brand":"<brand or Unknown>","category":"<Electronics|Clothing|Food|Drinks|Personal Care|Home|Stationery|Health|Tools|General>","description":"<2-3 sentences>"}\n\n' +
  'Only return empty name if the image is blank, a person only, or totally unrecognisable.\n' +
  'If no clear product: {"name":"","brand":"","category":"General","description":""}';

async function readImageBase64(uri: string): Promise<string | null> {
  try {
    if (uri.startsWith('file://') || uri.startsWith('content://')) {
      return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    }
    const r = await fetch(uri);
    const blob = await r.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? null);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function extractJson(text: string): string {
  let t = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.substring(start, end + 1);
  return t;
}

async function callGemini(body: object): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  try {
    const resp = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const parts = json?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;
    for (const part of parts) {
      if (!part.thought) {
        const t = (part.text ?? '').trim();
        if (t) return t;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Identify a product from an image using Gemini Vision. */
export async function identifyProduct(imageUri: string, mimeType = 'image/jpeg'): Promise<GeminiProductInfo | null> {
  const b64 = await readImageBase64(imageUri);
  if (!b64) return null;

  const text = await callGemini({
    contents: [{
      parts: [
        { text: IDENTIFY_PROMPT },
        { inline_data: { mime_type: mimeType, data: b64 } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  if (!text) return null;

  try {
    const parsed = JSON.parse(extractJson(text));
    const name = (parsed.name ?? '').trim();
    if (!name) return null;
    return {
      name,
      brand: (parsed.brand ?? 'Unknown').trim(),
      category: (parsed.category ?? 'General').trim(),
      description: (parsed.description ?? '').trim(),
    };
  } catch {
    return null;
  }
}

/** Extract price range and specs from DuckDuckGo search snippets via Gemini. */
export async function researchFromSnippets(
  info: GeminiProductInfo,
  snippets: string[],
): Promise<GeminiResearch | null> {
  if (!GEMINI_KEY || snippets.length === 0) return null;

  const prompt =
    `Product: "${info.name}" by "${info.brand}" (${info.category}).\n` +
    `Search snippets from DuckDuckGo:\n${snippets.slice(0, 8).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
    'Based on these snippets and your knowledge of Ghana retail prices (GHS), respond with ONLY this JSON:\n' +
    '{"specs":{"<key>":"<value>"},"priceGhsMin":<number>,"priceGhsMax":<number>,"priceGhsTypical":<number>,"authenticity":"authentic|suspicious|counterfeit"}\n' +
    'Include 4-8 specs. Use 0 for prices if unknown.';

  const text = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  if (!text) return null;

  try {
    const parsed = JSON.parse(extractJson(text));
    const auth = parsed.authenticity ?? 'authentic';
    return {
      specs: parsed.specs ?? {},
      priceMin: Number(parsed.priceGhsMin) || 0,
      priceMax: Number(parsed.priceGhsMax) || 0,
      priceTypical: Number(parsed.priceGhsTypical) || 0,
      authenticity: ['authentic', 'suspicious', 'counterfeit'].includes(auth) ? auth : 'authentic',
    };
  } catch {
    return null;
  }
}

export function isGeminiConfigured(): boolean {
  return GEMINI_KEY.length > 0;
}
