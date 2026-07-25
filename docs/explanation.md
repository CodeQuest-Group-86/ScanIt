# ScanIt — Complete Code Explanation

A full walkthrough of every file, every decision, and every pattern used in this project. Written to teach mobile app development concepts alongside the actual code.

---

## Table of Contents

1. [The Foundation Files](#1-the-foundation-files)
2. [The Theme System](#2-the-theme-system)
3. [TypeScript Types](#3-typescript-types)
4. [Services — The Mock API Layer](#4-services--the-mock-api-layer)
5. [Zustand Stores — State Management](#5-zustand-stores--state-management)
6. [Utility Functions](#6-utility-functions)
7. [The Components Library](#7-the-components-library)
8. [Navigation with Expo Router](#8-navigation-with-expo-router)
9. [The Onboarding Screen](#9-the-onboarding-screen)
10. [Auth Screens](#10-auth-screens)
11. [The Scanner Screen](#11-the-scanner-screen)
12. [The Scan Result Screen](#12-the-scan-result-screen)
13. [The Tab Navigator](#13-the-tab-navigator)
14. [The Home Screen](#14-the-home-screen)
15. [The Search Screen](#15-the-search-screen)
16. [The Profile Screen](#16-the-profile-screen)
17. [Supporting Screens Pattern](#17-supporting-screens-pattern)
18. [Key React Native Concepts Used Throughout](#18-key-react-native-concepts-used-throughout)
19. [The Architecture Philosophy](#19-the-architecture-philosophy)

---

## 1. The Foundation Files

### `package.json`

```json
{
  "main": "expo-router/entry",
  "dependencies": {
    "expo": "~54.0.33",
    "expo-router": "~6.0.23",
    "zustand": "^5.0.13",
    "expo-camera": "~17.0.10",
    "expo-secure-store": "~15.0.8",
    "@react-native-async-storage/async-storage": "2.2.0"
  }
}
```

**`"main": "expo-router/entry"`** is the single most important line in this file. In a standard React Native app, `main` points to your own `index.js`. Here we point it to Expo Router's entry point instead. This tells the JavaScript runtime: *"Don't look for my own entry file — hand control to Expo Router so it can read my `app/` folder and build the navigation automatically."* This one line is what makes file-based routing possible.

**Why `~` vs `^` on version numbers?**
- `~54.0.33` means "accept patch updates only" (54.0.33, 54.0.34, etc.). Expo uses this for SDK packages because breaking changes between minor versions are common in native code.
- `^5.0.13` means "accept minor updates too" (5.1.0, 5.2.0, etc.). Used for pure JavaScript libraries like Zustand where minor updates are generally safe.

**Why each specific package was chosen:**

- **`expo-camera`** — Native camera access. This cannot be done in pure JavaScript because accessing device hardware requires native (Swift/Kotlin) code. Expo wraps those native modules so we can call them from JavaScript.
- **`expo-secure-store`** — Stores data in the device's encrypted keychain (iOS) or Keystore (Android). Regular AsyncStorage is NOT encrypted — anyone who can read your device's file system can read it. Passwords and tokens must always go in SecureStore.
- **`@react-native-async-storage/async-storage`** — Unencrypted persistent key-value storage, like `localStorage` on the web. Fine for non-sensitive things like "has the user seen the onboarding?" or cached product lists.
- **`zustand`** — State management library. Explained in full in Part 5.
- **`react-native-reanimated`** — High-performance animations that run on the native thread. Explained in detail in Part 11.
- **`react-native-gesture-handler`** — Required by Reanimated. Also handles swipe and drag gestures at the native level rather than the JavaScript level, making them buttery-smooth.

---

### `app.json`

```json
{
  "expo": {
    "name": "ScanIt",
    "userInterfaceStyle": "light",
    "experiments": {
      "typedRoutes": false
    }
  }
}
```

This is Expo's configuration file — it is the equivalent of what `AndroidManifest.xml` and `Info.plist` are in fully native development. Every app setting that affects the build goes here.

**`"userInterfaceStyle": "light"`** locks the app to light mode. Without this, the app would automatically switch between light and dark based on the device's system setting. Since we built a custom cream and orange theme, dark mode would completely break the carefully designed UI.

**`"typedRoutes": false`** — Expo Router has an optional feature that generates TypeScript types for every route, so `router.push('/nonexistent-page')` would give a compile error. We disabled it because it makes route strings very strict and verbose during development. With it disabled, we use `as never` type assertions to bypass TypeScript checks on route strings.

**Permissions declarations:**
```json
"NSCameraUsageDescription": "ScanIt needs camera access to scan..."
```
Both Apple and Google require you to declare *why* your app needs each sensitive permission. The user sees this exact text in the operating system's permission dialog box. If you don't provide it, your app is rejected from the App Store or Play Store.

---

### `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

**`"strict": true`** turns on TypeScript's harshest checking mode. This enables several sub-rules:
- `noImplicitAny` — You cannot write `function foo(x)` without typing `x`. Must be `function foo(x: string)`.
- `strictNullChecks` — `user.name` is an error if `user` could be `null`. Forces you to write `user?.name` which safely returns `undefined` instead of crashing.
- `strictFunctionTypes` — Function argument types must match exactly, no silent widening.

Strict mode feels painful at first but it catches real runtime bugs before they happen. If `user` is possibly `null` and you call `user.name`, that is a crash in production. TypeScript in strict mode surfaces that as a compile-time error that you see before the app even runs.

**`"paths": { "@/*": ["./*"] }`** creates an import alias. Instead of writing:
```typescript
import Button from '../../../components/Button';
```
You write:
```typescript
import Button from '@/components/Button';
```
The `@` symbol maps to the project root. This makes every import readable regardless of how deeply nested the file is, and refactoring (moving files around) becomes much easier.

---

## 2. The Theme System

### `theme/index.ts`

```typescript
export const Colors = {
  primary: '#E76F2E',
  accent: '#2FA4D7',
  text: '#3E2C23',
  surface: '#F5E9D8',
  white: '#FFFFFF',
  nearBlack: '#1A1512',
  textSecondary: '#7A6050',
  border: '#E8D5C0',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
} as const;
```

**Why a centralized theme instead of hardcoding colors?**

Without this, you would scatter color strings throughout the entire codebase:
```typescript
// BAD — magic strings everywhere
<View style={{ backgroundColor: '#E76F2E' }}>
<Text style={{ color: '#E76F2E' }}>
<TouchableOpacity style={{ borderColor: '#E76F2E' }}>
```

When the client wants the primary color changed from orange to green, you would need to find and replace hundreds of occurrences, likely missing some and creating inconsistencies. With a theme file, you change one line and every component in the entire app updates.

**`as const`** is a TypeScript feature that turns the object into a deeply readonly constant with literal types. Without it, TypeScript infers `Colors.primary` as type `string`. With `as const`, TypeScript knows it's the specific literal type `'#E76F2E'`. This enables better autocomplete and prevents any accidental reassignment.

```typescript
export const Typography = {
  sizes: {
    xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 30, display: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
}
```

**Why hardcode pixel sizes instead of using `rem` like the web?**

React Native does not support CSS units like `rem` or `em`. Everything uses density-independent pixels — `dp` on Android and "points" on iOS. The operating system scales these automatically based on each device's screen density, so `fontSize: 17` displays at the same physical size on both a small iPhone SE and a large iPhone Pro Max.

**Why `'400' as const` for font weights instead of just `400`?**

React Native's `fontWeight` prop expects a string literal type like `'400'` or `'bold'` — not a number like `400`. The `as const` ensures TypeScript treats the value as the literal string `'400'` rather than the generic `string` type, which exactly matches what StyleSheet expects.

```typescript
export const Shadows = {
  sm: {
    shadowColor: '#3E2C23',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
```

**Why two separate shadow systems in one object?**

iOS uses `shadowColor`, `shadowOffset`, `shadowOpacity`, and `shadowRadius`. Android uses a completely different single property called `elevation` (a number that maps to Material Design's shadow depth system). You need both sets of properties to get shadows working on both platforms. By defining them together in the theme, spreading `...Shadows.md` onto any component gives it correct shadows on both iOS and Android automatically.

---

## 3. TypeScript Types

### `types/index.ts`

```typescript
export type Role = 'consumer' | 'seller';
```

This is a **union type**. `Role` can only ever be one of two exact string values. If you try to assign `role: 'admin'` anywhere in the codebase, TypeScript gives a compile error immediately. This prevents entire classes of bugs where an invalid role string could silently cause unexpected behavior.

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  scansCount: number;
  savedCount: number;
  totalSaved: number;
  createdAt: string;
}
```

**`interface` vs `type`** — Both work similarly in TypeScript. By convention, `interface` is used for object shapes (data structures), and `type` is used for unions, primitives, and computed types. This is a widely-followed convention, not a strict rule.

```typescript
export type AuthenticityStatus = 'authentic' | 'suspicious' | 'counterfeit';

export interface Product {
  authenticity: AuthenticityStatus;
}
```

**Why create a named type instead of writing the union inline everywhere?**

Multiple parts of the codebase reference this concept — the `Product` interface, the `ScanResult` interface, the `AuthenticityBadge` component, the scan store. If you want to add a fourth status like `'unverified'`, you change it in one place and TypeScript immediately tells you every single place in the app that needs to handle the new case. No searching, no missing anything.

```typescript
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
```

**Generics (`<T>`)** are one of TypeScript's most powerful features. `T` is a placeholder type that gets filled in when you use the interface. When you write `ApiResponse<User>`, TypeScript replaces every `T` with `User`, making `data` type `User`. This means:

```typescript
const res = await authService.login(...);
// TypeScript knows:
// res.success is boolean
// res.data.user is type User
// res.data.tokens is type AuthTokens
// res.data.ANYTHING_WRONG is a compile error
```

Without generics, you would need to write `ApiUserResponse`, `ApiProductResponse`, `ApiScanResponse`, etc. — one interface per response type — or use `any` which completely defeats the purpose of TypeScript.

---

## 4. Services — The Mock API Layer

### `services/auth.ts`

```typescript
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
```

**Why fake network delays?**

Real network requests take time — typically 200ms to 2000ms depending on connection quality. If your UI only works with instant data, you will never discover that your loading states are broken, your buttons don't disable during requests, or your error messages don't show. The 800ms delay on login forces you to build and actually test all of those states.

```typescript
export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    await delay(800);
    const user = MOCK_USERS.find(u => u.email === payload.email);
    if (!user || payload.password.length < 6) {
      return { success: false, message: 'Invalid email or password', data: null as never };
    }
    return { success: true, data: { user, tokens: makeTokens() } };
  },
```

**`null as never`** is a TypeScript workaround. When `success` is `false`, there is no real `data` to return, but the return type says `data: T`. The `as never` tells TypeScript: *"Trust me — the code that calls this function will always check `success` before touching `data`."* It is a deliberate escape hatch, not a careless mistake.

**Why return a result object with a `success` flag instead of throwing errors?**

There are two schools of thought:
1. **Throw errors** — wrap call sites in `try/catch`
2. **Return result objects** — check `if (!res.success)` at call sites

Result objects (used here) are more predictable in UI code. With `try/catch`, it is easy to forget the catch block and leave errors unhandled. With result objects, the `success` check is explicit and TypeScript can enforce it.

```typescript
function makeTokens(): AuthTokens {
  return {
    accessToken: `mock_access_${Date.now()}`,
    refreshToken: `mock_refresh_${Date.now()}`,
    expiresAt: Date.now() + 60 * 60 * 1000,  // 1 hour from now in milliseconds
  };
}
```

**JWT architecture explanation:**

In production, `accessToken` is a real JWT (JSON Web Token) — a base64-encoded string signed by the server that contains user info and an expiry timestamp. The client attaches it to every API request header as `Authorization: Bearer <token>`. When the token expires (after 1 hour here), the `refreshToken` is used to obtain a new access token without forcing the user to re-enter their password. We stub this entire pattern so the architecture is already correct when real tokens arrive.

**Why group functions as an object instead of exporting them individually?**

```typescript
// Grouped (used here)
export const authService = { login, signUp, logout };

// Individual exports (alternative)
export async function login(...) {}
export async function signUp(...) {}
```

Grouping makes it easy to mock the entire service in tests by replacing `authService` with a fake object. It also makes it obvious at the import site that all these functions belong to the same domain.

---

### `services/products.ts`

```typescript
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Tropical Juice 500ml',
    price: 3.40,
    currency: '₵',
    ...
  },
```

**Why export mock data from the service file?**

The scan service randomly picks a product from this array to simulate AI recognition. By exporting from the same file, both services share the same product database — simulating a real scenario where one unified product catalogue powers both the search API and the scan recognition API.

**Why `currency: '₵'` stored on the product itself instead of just in the display formatter?**

A real marketplace could have products listed in different currencies — some in Ghana Cedi, some in US Dollars. The currency is a property of the price, not of the app's display layer. Keeping it on the product data means the display layer just reads `product.currency` rather than making assumptions.

---

## 5. Zustand Stores — State Management

State management answers a fundamental question: *Where does the app's data live, and how does it flow between components?*

### Why Zustand instead of React's built-in `useState`?

`useState` keeps state inside a single component. If two different components need the same data, you have to "lift state up" to their nearest common parent, then pass it down through every component in between as props. This is called **prop drilling** and it looks like:

```typescript
<App user={user}>
  <Navigation user={user}>
    <TabBar user={user}>
      <ProfileTab user={user}>
        <ProfileScreen user={user} />  // finally gets it
```

For a small app this is manageable. For ScanIt, the `currentResult` from scanning is needed by:
- The scanner screen (to detect when to navigate away)
- The scan result screen (to display the result)
- The home screen (to show recent scans)
- The profile screen (to show scan count)

These components are on completely separate branches of the component tree with no natural common parent. Zustand creates a global store that any component can directly read from or write to — no prop drilling at all.

---

### `stores/auth.ts`

```typescript
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  // ...
}));
```

**`create<AuthState>`** — The generic tells Zustand the exact shape of the store. `set` is a function for updating state. `get` reads the current state from within actions (useful when an action needs to read current state before updating it).

**Why combine state AND actions in the same store definition?**

Alternative architectures separate data and actions into different objects. Keeping them together means each component only needs one import (`useAuthStore`) to both read data and trigger changes — cleaner component code with fewer imports.

```typescript
initialize: async () => {
  try {
    const [accessToken, userStr] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    if (accessToken && userStr) {
      const user = JSON.parse(userStr) as User;
      set({ user, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }
  } catch {
    set({ isInitialized: true });  // Even on failure, mark as initialized
  }
},
```

**`Promise.all` for parallel async operations:**

`await op1; await op2` runs sequentially — total time is 200ms + 200ms = 400ms. `await Promise.all([op1, op2])` runs them simultaneously — total time is just max(200ms, 200ms) = 200ms. Always parallelize independent async operations.

**Why store the full user object in SecureStore instead of just the token?**

To show the user's name and profile data immediately on app launch, before any network request has been made. Without this, every app open would show a blank or loading profile screen while waiting for the API to respond. Storing the user locally means the UI is populated instantly.

**The `isInitialized` flag:**

The app needs to know whether auth state has been loaded from storage before it can decide which screen to show. Without this flag, the app would briefly show the sign-in screen to logged-in users every single time they open the app — because `user` starts as `null` before the async storage read completes. The entry screen waits for `isInitialized: true` before routing anywhere.

```typescript
login: async (email, password) => {
  set({ isLoading: true, error: null });
  const res = await authService.login({ email, password });
  if (!res.success) {
    set({ isLoading: false, error: res.message ?? 'Login failed' });
    return false;
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
  set({ user, tokens, isLoading: false, error: null });
  return true;
},
```

**Why return `true` or `false` from the login action instead of `void`?**

The sign-in screen component needs to know whether to navigate to the home screen after the action completes. Returning a boolean makes the outcome explicit to the caller without requiring the caller to inspect store state after the fact.

---

### `stores/scan.ts`

```typescript
const MAX_SCANS_PER_SESSION = 3;

interface ScanState {
  sessionScans: number;   // in-memory only, resets on app restart
  canScan: boolean;
  history: ScanResult[];  // grows across sessions
}
```

**Session vs persistent scan count:**

`sessionScans` lives only in JavaScript memory — it is not saved to AsyncStorage or SecureStore. When the app is closed and reopened, it resets to 0. This is intentional — the "3 scans per session" feature encourages engagement without permanently restricting users. The `user.scansCount` on the User object is the lifetime persistent count shown on the profile screen.

```typescript
analyze: async (imageUri) => {
  set({ isAnalyzing: true, error: null, currentResult: null });
  const res = await scanService.analyzeImage(imageUri);
  const newCount = sessionScans + 1;
  set({
    currentResult: res.data,
    sessionScans: newCount,
    canScan: newCount < MAX_SCANS_PER_SESSION,
    history: [res.data, ...get().history],
  });
},
```

**Clearing `currentResult` before starting a new analysis** — `set({ currentResult: null })` at the start ensures the scan result screen never shows a stale previous result while the new analysis is still running.

**`[res.data, ...get().history]`** — Prepends the new scan to the history array, so the most recent scan always appears first. The spread operator `...` copies all existing history items after the new one.

---

### `stores/saved.ts`

```typescript
load: async () => {
  const raw = await AsyncStorage.getItem(SAVED_KEY);
  const products: Product[] = raw ? JSON.parse(raw) : [];
  set({ savedProducts: products, isLoaded: true });
},
```

**`raw ? JSON.parse(raw) : []`** — AsyncStorage returns `null` if the key has never been set (first launch). Passing `null` to `JSON.parse` would throw a runtime error. The ternary safely defaults to an empty array when no data exists yet.

**Why store full Product objects instead of just product IDs?**

If you stored only IDs, you would need to fetch the full product details from the API every time the user opens their Saved screen. By storing the complete object, the saved screen works entirely offline with no network required. The tradeoff is that if a product's price changes on the server, the cached version becomes stale. For this implementation, offline-first simplicity wins.

```typescript
isSaved: (productId) => get().savedProducts.some(p => p.id === productId),
```

**Why a function instead of a pre-computed value?** `isSaved` needs to be called with a specific `productId` at the point of rendering each product card. A pre-computed lookup works too — a `Set` of IDs would be O(1) instead of O(n). But for typical saved product counts (under 50), `Array.some` is fast enough and simpler to maintain.

---

## 6. Utility Functions

### `utils/format.ts`

```typescript
export function formatPrice(amount: number, currency = '₵'): string {
  return `${currency}${amount.toFixed(2)}`;
}
```

**`toFixed(2)` solves a real problem:**

JavaScript floating-point arithmetic is notoriously imprecise. `0.1 + 0.2` evaluates to `0.30000000000000004` in JavaScript. `toFixed(2)` rounds to exactly 2 decimal places AND converts to a string, ensuring prices always display as `₵3.40` rather than `₵3.4` or the infamous `₵3.400000000000001`.

```typescript
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
```

**Why build this from scratch instead of using a library like `moment.js` or `date-fns`?**

`moment.js` is 67KB minified. `date-fns` is tree-shakeable but still adds weight. This function is 8 lines and handles the exact use cases in this app. In mobile development, bundle size directly impacts how long it takes for the app to start — every byte counts. The rule is: only include dependencies that solve problems too complex to solve yourself in a reasonable amount of time.

```typescript
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}
```

**`w[0]?.toUpperCase() ?? ''`** — Two safety operators here:
- `?.` (optional chaining) — `w[0]` could be `undefined` if the word is an empty string. `?.` prevents calling `toUpperCase()` on `undefined`.
- `??` (nullish coalescing) — if the result is `null` or `undefined`, use `''` as the fallback. `||` would also catch empty strings, which we don't need here.

---

## 7. The Components Library

### `components/Button.tsx`

```typescript
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
```

**The variant pattern enforces design consistency.**

Instead of consumers passing raw style props like `backgroundColor="#E76F2E"`, they pick a semantic variant: `variant="primary"`. The component owns the visual implementation of what "primary" means. This means:
- Every primary button in the entire app looks identical
- Changing the primary button design is a one-file change
- Consumers can't accidentally create off-brand buttons

```typescript
const containerStyle = [
  styles.base,
  styles[variant],
  styles[`size_${size}`],
  fullWidth && styles.fullWidth,
  (disabled || loading) && styles.disabled,
  style,
];
```

**StyleSheet array merging** — React Native accepts an array of style objects. Styles later in the array override properties from earlier entries, like CSS specificity but simpler. The `style` prop is placed last, meaning callers can override any individual property without fighting the component's defaults.

**`fullWidth && styles.fullWidth`** — When `fullWidth` is `false`, this expression evaluates to the boolean `false`. React Native ignores `false` entries in style arrays, so it is a clean way to conditionally include a style.

```typescript
{loading ? (
  <ActivityIndicator color={...} size="small" />
) : (
  <Text style={labelStyle}>{label}</Text>
)}
```

**Loading state built directly into the button** — This pattern prevents a very common bug: users tapping a button multiple times while waiting for a response, triggering duplicate API calls. The button shows a spinner AND is `disabled={loading}`, blocking all additional taps. Every async action in the app uses this pattern.

---

### `components/Input.tsx`

```typescript
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}
```

**`extends TextInputProps`** — Our `Input` component wraps React Native's built-in `TextInput`. By extending `TextInputProps`, our component accepts all the same props as the native input (`keyboardType`, `autoComplete`, `onSubmitEditing`, `placeholder`, etc.) PLUS our custom additions. Consumers do not need to learn a new API — anything that works on React Native's `TextInput` works here.

**`keyof typeof Ionicons.glyphMap`** — `Ionicons.glyphMap` is an object where every key is a valid icon name string, like `'mail-outline'` or `'lock-closed-outline'`. `keyof typeof` gives us the union type of all those key names. So the `leftIcon` prop only accepts real, valid Ionicons names — a typo like `'mail_outline'` would be a TypeScript compile error.

```typescript
const [secureEntry, setSecureEntry] = useState(isPassword);
```

**Local state for password visibility toggle** — This state does not belong in any global Zustand store. It is a purely local UI concern — whether the password characters are visible or hidden in this specific input instance. `useState` is exactly right here. The general rule: use local `useState` for UI state that only one component cares about; use global stores (Zustand) for data shared across components.

---

### `components/ScanBracket.tsx`

```typescript
export default function ScanBracket({ size = 240, color = Colors.primary, thickness = 3, cornerLength = 32 }) {
  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {/* Four corners, each with only 2 of 4 borders visible */}
    </View>
  );
}
```

**`pointerEvents="none"`** — The bracket overlay is positioned on top of the live camera view. Without this prop, tapping the bracket would intercept touch events meant for the controls underneath it. `pointerEvents="none"` makes the entire overlay transparent to touch — it is visible on screen but completely invisible to the touch system.

**Why use `View` borders for the corners instead of SVG?**

React Native's SVG support requires an additional library (`react-native-svg`). Using `View` borders achieves the exact same visual result with zero extra dependencies. Each corner is just a square `View` with only 2 of its 4 borders given a width — the other 2 default to 0, making them invisible. This is a great example of solving a visual problem creatively with primitives rather than reaching for a library.

---

### `components/Badge.tsx`

```typescript
const AUTHENTICITY_CONFIG: Record<AuthenticityStatus, { label: string; color: string }> = {
  authentic: { label: '✓ Authentic', color: Colors.success },
  suspicious: { label: '⚠ Suspicious', color: Colors.warning },
  counterfeit: { label: '✗ Counterfeit', color: Colors.danger },
};
```

**`Record<AuthenticityStatus, ...>` provides exhaustiveness checking.**

This type means "an object that must have exactly one key for every possible value in `AuthenticityStatus`." If you later add `'unverified'` to the `AuthenticityStatus` union type and forget to add it here, TypeScript gives a compile error pointing directly at this object. You cannot accidentally forget a case. This is one of TypeScript's most practical features for maintaining correctness as code evolves.

---

## 8. Navigation with Expo Router

### How Expo Router Works

Expo Router uses your **file system as your navigation map**. The folder and file structure inside the `app/` directory directly defines every route in the application:

```
app/
  index.tsx             → route: "/"  (entry point)
  _layout.tsx           → wraps all routes in this folder
  (tabs)/
    _layout.tsx         → defines the tab bar
    explore.tsx         → route: "/explore" (tab: Home)
    scan.tsx            → route: "/scan"    (tab: Scanner)
  (auth)/
    _layout.tsx         → defines the auth stack
    sign-in.tsx         → route: "/sign-in"
  scan-result.tsx       → route: "/scan-result"
```

**Why parentheses in folder names like `(tabs)` and `(auth)`?**

The parentheses are Expo Router's syntax for "layout groups." They tell the router: *"This folder exists only to apply a shared layout — do not include the folder name in the URL."* So `app/(auth)/sign-in.tsx` produces the clean route `/sign-in` rather than `/auth/sign-in`. The `(auth)` folder groups the screens under a shared layout (`_layout.tsx`) without polluting the URL.

**`_layout.tsx` files — the navigator definition:**

Every folder can contain a `_layout.tsx` file. This file wraps all sibling screens in a navigator. The tabs `_layout.tsx` wraps screens in a `<Tabs>` navigator. The auth `_layout.tsx` wraps screens in a `<Stack>` (push/pop) navigator. Without a `_layout.tsx`, screens in that folder have no shared navigation chrome.

---

### `app/_layout.tsx` — The Root Layout

```typescript
export default function RootLayout() {
  const initialize = useAuthStore(s => s.initialize);
  const loadSaved = useSavedStore(s => s.load);

  useEffect(() => {
    initialize();
    loadSaved();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="scan-result"
          options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
```

**`GestureHandlerRootView` must be at the root** — `react-native-gesture-handler` requires its context provider to wrap the entire component tree. Forgetting this wrapper causes gestures (swipes, drags, long presses) to silently fail on Android. iOS is more forgiving, but Android requires it strictly. Always put it at the very root.

**`useAuthStore(s => s.initialize)` — the selector pattern:**

Compare these two approaches:
```typescript
// Without selector — subscribes to EVERYTHING
const store = useAuthStore();
const initialize = store.initialize;

// With selector — subscribes only to what we need
const initialize = useAuthStore(s => s.initialize);
```

With the selector pattern, this component only re-renders when `initialize` itself changes (which it never does — store actions are stable references). Without the selector, the component re-renders whenever ANY property in the auth store changes — including `isLoading`, `error`, `user`, etc. Selectors are a critical performance optimization in Zustand.

**`presentation: 'transparentModal'` for scan-result:**

This makes the scan-result screen appear as a translucent overlay on top of the camera screen — you can see through to the live camera behind it. The default `presentation: 'card'` would push the camera off-screen with a slide animation, destroying the visual context of seeing where you just scanned. Transparent modal preserves that context.

**`useEffect(() => {...}, [])`** — The empty array `[]` is the dependency array. It means "run this effect exactly once, when the component first mounts." This is how you perform initialization work in React. Without the array, the effect runs after every single render.

---

### `app/index.tsx` — Entry Point / Router Guard

```typescript
useEffect(() => {
  if (!isInitialized) return;

  const check = async () => {
    const onboardingDone = await AsyncStorage.getItem('scanit_onboarding_complete');
    if (!onboardingDone) {
      router.replace('/(onboarding)' as never);
    } else if (user) {
      router.replace('/(tabs)/explore' as never);
    } else {
      router.replace('/(auth)/sign-in' as never);
    }
  };
  check();
}, [isInitialized, user]);
```

**`router.replace` vs `router.push`:**
- `push` adds the new screen to the navigation stack — the user can press the back button to return.
- `replace` replaces the current screen entirely — no back button leads here.

After a user logs in, you never want them pressing back to return to the sign-in screen. `replace` ensures the back stack is clean after authentication transitions.

**The three-way routing logic** handles every possible app state:
1. Onboarding not completed → first-ever launch → show onboarding
2. Onboarding done AND user logged in → normal use → go to home
3. Onboarding done AND user NOT logged in → returning user who logged out → go to sign-in

This effect re-runs whenever `isInitialized` or `user` changes. This means when `logout()` is called and `user` becomes `null`, this effect automatically fires and redirects to sign-in — the navigation is reactive to auth state.

**`if (!isInitialized) return`** — Guards against routing before SecureStore has finished loading the stored session. Without this guard, the app would flash the sign-in screen for a fraction of a second before the stored session loads and redirects to the home screen.

---

## 9. The Onboarding Screen

### `app/(onboarding)/index.tsx`

```typescript
const handleViewableItemsChanged = useRef(({ viewableItems }) => {
  if (viewableItems[0]?.index !== null) {
    setActiveIndex(viewableItems[0].index);
  }
}).current;
```

**Why wrap this in `useRef`?**

`FlatList` has a strict requirement: the `onViewableItemsChanged` prop must be a stable reference — the same function reference across every render. If the function changes between renders, React Native internally warns and the scroll detection may break. Wrapping it in `useRef(...).current` creates the function object once on first render and keeps the same reference forever.

**`FlatList` with `horizontal` and `pagingEnabled`** is the standard React Native pattern for swipeable slide carousels. `pagingEnabled` makes the scroll snap to exact page boundaries — the slide locks perfectly in place rather than allowing partial scrolling between slides.

```typescript
const complete = async () => {
  await AsyncStorage.setItem('scanit_onboarding_complete', 'true');
  router.replace('/(auth)/sign-in' as never);
};
```

**Persisting the onboarding completion flag** — AsyncStorage persists data across app restarts but NOT across uninstalls. This is exactly what we want — if the user reinstalls the app, they see onboarding again. If they just close and reopen it, they go straight to sign-in.

---

## 10. Auth Screens

### `app/(auth)/sign-in.tsx`

```typescript
const validate = () => {
  const e: Record<string, string> = {};
  if (!email.trim()) e.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
  if (!password || password.length < 6) e.password = 'At least 6 characters';
  setErrors(e);
  return Object.keys(e).length === 0;
};
```

**Client-side validation runs before the network request.** It provides instant feedback without a round-trip to the server. The regex `/\S+@\S+\.\S+/` is a basic email pattern — non-whitespace characters, then `@`, then non-whitespace, then `.`, then non-whitespace. It is not fully RFC-5321 compliant but catches the vast majority of typos.

**Why store all field errors in a single object instead of separate `useState` variables?**

```typescript
// Single object (used here)
const [errors, setErrors] = useState<Record<string, string>>({});
setErrors({ email: 'required', password: 'too short' }); // One re-render

// Individual variables (alternative)
const [emailError, setEmailError] = useState('');
const [passwordError, setPasswordError] = useState('');
setEmailError('required'); // Re-render 1
setPasswordError('too short'); // Re-render 2
```

The single object approach updates all errors atomically in one `setState` call, causing exactly one re-render. Individual variables cause multiple renders — one per error — which can produce visual flickering.

**Displaying API errors vs field errors:**

```typescript
{error ? <View style={styles.errorBanner}><Text>{error}</Text></View> : null}
```

Field errors (from `validate()`) appear inline under the specific input they apply to. The API error (from the Zustand store) appears as a banner at the top — it is a general failure message like "Invalid email or password" that is not tied to any specific field.

---

## 11. The Scanner Screen

### `app/(tabs)/scan.tsx`

```typescript
import { CameraView, useCameraPermissions } from 'expo-camera';
```

**New expo-camera API (SDK 51+):** In older Expo versions, you would import `Camera` from `expo-camera`. Starting in SDK 51, Expo introduced `CameraView` as the new component alongside `useCameraPermissions` hook. The hook returns `[permission, requestPermission]` where `permission` is an object with properties like `.granted` (boolean) and `.canAskAgain` (whether you can show the permission dialog again).

```typescript
const scanLineAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, ... }),
    ])
  );
  loop.start();
  return () => loop.stop();  // Clean up when component unmounts
}, []);
```

**`useRef` for the animated value** — `new Animated.Value(0)` wrapped in `useRef(...).current` ensures the animated value object is created exactly once. If you used a regular variable or `useState`, it would be recreated on every re-render, resetting the animation back to 0.

**`useNativeDriver: true` — this is one of the most important performance decisions in the entire app.**

Without it, animation updates flow like this on every frame:
```
JS Thread → Bridge → Native Thread → Render
```
If the JS thread is busy doing anything else (rendering components, processing touch events, running JavaScript logic), the animation stutters. With `useNativeDriver: true`, after the initial setup the animation runs entirely on the native thread with no JavaScript involvement:
```
(Setup once via JS) → Native Thread runs animation every frame → Render
```
This is why the scan line stays silky-smooth even while the camera is processing.

**The constraint:** the native driver can only animate `transform` (translate, scale, rotate) and `opacity`. It cannot animate `width`, `height`, `backgroundColor`, or `padding`. This is why the scan line's animation uses `translateY` (a transform) rather than animating `top`.

```typescript
const scanLineTranslate = scanLineAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 200],
});
```

**`interpolate`** maps one value range to another. The animated value goes from 0 to 1 and back in a loop. `interpolate` translates that abstract 0-to-1 into the actual 0-to-200 pixel translation we see on screen. Keeping the raw value abstract (always 0 to 1) makes it easy to reuse the same animation for different visual ranges.

```typescript
useEffect(() => {
  if (currentResult) {
    router.push('/scan-result' as never);
  }
}, [currentResult]);
```

**Reactive navigation based on data** — We do not navigate to the result screen when the scan button is pressed. We navigate when the data arrives. The store handles the async work; this effect reacts to the outcome. This decouples the button press from the timing of the AI analysis.

**Permission denied handling:**

```typescript
if (!permission.granted) {
  return (
    <SafeAreaView style={styles.permissionContainer}>
      <Text>Camera Access Required</Text>
      <TouchableOpacity onPress={requestPermission}>Grant Access</TouchableOpacity>
    </SafeAreaView>
  );
}
```

Never crash or show a broken empty screen when permissions are denied. Always show a clear explanation and an action path forward. On iOS, after a user denies a permission once, `requestPermission` opens the Settings app because iOS does not allow re-prompting in-app. On Android, you can re-prompt up to twice before the system permanently blocks it.

---

## 12. The Scan Result Screen

### `app/scan-result.tsx`

```typescript
const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
const bgAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.parallel([
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 20,
      stiffness: 200,
      useNativeDriver: true,
    }),
    Animated.timing(bgAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
  ]).start();
}, []);
```

**`Animated.spring` vs `Animated.timing`:**

- **`timing`** interpolates a value over an exact, fixed duration using a mathematical easing curve. The result is deterministic and predictable.
- **`spring`** is a physics-based animation. You set the stiffness (how quickly it moves toward the target) and damping (how much it resists overshoot and bouncing). The duration is not fixed — it runs until the virtual spring settles at the target value. Springs feel more natural and "physical" to users because they mimic how real objects move.

The bottom sheet slides up with a spring so it feels like something physical snapping into place. The background darkens with timing because opacity fading does not benefit from physics — a linear or eased fade is exactly right.

**`Animated.parallel`** — Starts multiple animations at exactly the same time. `Animated.sequence` would run them one after another. `Animated.stagger` starts each one with a delay between them (useful for animating list items in one by one).

```typescript
const handleClose = () => {
  Animated.parallel([
    Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
    Animated.timing(bgAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
  ]).start(() => {
    clearResult();
    router.back();
  });
};
```

**Animate first, then navigate** — The callback function passed to `.start()` runs after the animation completes. We clear the store state and navigate back AFTER the close animation plays — not before. Without this, the screen would disappear instantly (React unmounting it), cutting the animation off mid-play.

---

## 13. The Tab Navigator

### `app/(tabs)/_layout.tsx`

```typescript
function ScanTabButton() {
  return (
    <TouchableOpacity
      style={styles.scanButton}
      onPress={() => router.push('/(tabs)/scan')}
      activeOpacity={0.85}>
      <View style={styles.scanButtonInner}>
        <Ionicons name="scan-outline" size={28} color={Colors.white} />
      </View>
    </TouchableOpacity>
  );
}
```

**Custom tab bar center button** — The elevated circular orange scan button is a very common mobile UX pattern sometimes called a "floating action button in the tab bar." Expo Router's `<Tabs>` component lets you replace any tab's button with a completely custom component by returning it from `tabBarIcon`. This gives full control over the appearance and interaction of the center tab.

```typescript
<Tabs.Screen
  name="scan"
  options={{
    title: '',
    tabBarIcon: () => <ScanTabButton />,
    tabBarStyle: { display: 'none' },
  }}
/>
```

**`tabBarStyle: { display: 'none' }` on the scan screen** — When the user navigates to the full-screen camera, the tab bar would be distracting and would cover camera controls. This option hides the tab bar only when the scan tab is the active route. All other tabs show the tab bar normally. This is done per-screen, not globally.

```typescript
tabBarStyle: {
  height: 60 + insets.bottom,
  paddingBottom: insets.bottom,
},
```

**`insets.bottom` from `useSafeAreaInsets()`** — On modern phones with a home indicator bar (iPhone X and later, most modern Android phones), the bottom of the screen is occupied by a system gesture navigation area. `safeAreaInsets.bottom` tells you the exact height of that area in points. Adding it to the tab bar height ensures the tab bar content is not hidden behind the system gesture area. Without this, tab labels would be cut off or invisible on notched devices.

---

## 14. The Home Screen

### `app/(tabs)/explore.tsx`

```typescript
useEffect(() => {
  loadPriceAlerts();
  loadNotifications();
}, []);
```

**Data loading on mount** — The empty dependency array `[]` means this runs once when the screen first renders. In production, you might add the user's ID to the dependency array so data automatically refreshes if a different user logs in on the same device.

```typescript
{history.length === 0 && savedProducts.length === 0 && (
  <View style={styles.emptySection}>
    <Text style={styles.emptyTitle}>Ready to scan?</Text>
    <Text style={styles.emptyBody}>Scan your first product...</Text>
    <Button label="Scan Now" onPress={() => router.push('/(tabs)/scan')} />
  </View>
)}
```

**Empty states are not optional** — A screen with no content is confusing and feels broken. The empty state serves three purposes:
1. Explains what this part of the app is for
2. Tells the user why there is nothing here yet
3. Provides a direct call-to-action for what to do next

Every data-driven screen in this app has an empty state.

```typescript
onPress={() => {
  useProductsStore.getState().selectProduct(scan.product);
  router.push('/product-detail' as never);
}}
```

**`useProductsStore.getState()` vs the hook** — Calling `getState()` directly lets you invoke store actions inside event handlers (callbacks, `onPress`, etc.) without subscribing to the store's reactive state. If you used the hook version (`const { selectProduct } = useProductsStore()`), you would capture a stale closure in callbacks. This direct call is safe for write-only operations where you do not need to read reactive state.

---

## 15. The Search Screen

### `app/(tabs)/search.tsx`

```typescript
const hasQuery = query.trim().length > 0;

return (
  <>
    {isLoading ? (
      <ActivityIndicator />
    ) : hasQuery && searchResults.length === 0 ? (
      <EmptyState title="No results found" />
    ) : hasQuery ? (
      <FlatList data={searchResults} ... />
    ) : (
      <RecentSearches />
    )}
  </>
);
```

**Four-state UI pattern** — This screen has four mutually exclusive states:
1. **Loading** — show a spinner
2. **Query with no results** — show "nothing found" empty state
3. **Query with results** — show the list
4. **No query** — show recent searches

Chained ternaries handle this cleanly. Each state is exclusive, and TypeScript ensures the logic is sound.

**`FlatList` vs `ScrollView + .map()`:**

```typescript
// FlatList — virtualized (efficient)
<FlatList data={products} renderItem={({ item }) => <ProductCard product={item} />} />

// ScrollView — renders everything at once (inefficient for large lists)
<ScrollView>
  {products.map(p => <ProductCard key={p.id} product={p} />)}
</ScrollView>
```

`FlatList` is virtualized — it only renders the items currently visible on screen, plus a small buffer above and below. For a list of 500 products, `ScrollView` renders all 500 components at once, using massive amounts of memory and causing slow initial render. `FlatList` renders approximately 20 at a time, recycling component instances as you scroll. Always use `FlatList` for any list of unknown or potentially large length.

---

## 16. The Profile Screen

### `app/(tabs)/profile.tsx`

```typescript
const sellerRows: RowItem[] = [
  { icon: 'cube-outline', label: 'Manage inventory', onPress: () => router.push('/seller-inventory' as never) },
  { icon: 'list-outline', label: 'My listings', onPress: () => {} },
];

{user.role === 'seller' && (
  <View style={styles.card}>
    {sellerRows.map((row, i) => <RowButton key={row.label} item={row} ... />)}
  </View>
)}
```

**Role-based UI rendering** — The same profile screen shows completely different content depending on `user.role`. Consumer users see scan history, saved products, and notifications. Seller users additionally see inventory management tools. This avoids the complexity of routing different user types to entirely different profile screens while keeping the code organized.

```typescript
const handleLogout = () => {
  Alert.alert('Sign Out', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Sign Out',
      style: 'destructive',
      onPress: async () => {
        await logout();
        router.replace('/(auth)/sign-in' as never);
      },
    },
  ]);
};
```

**Confirmation dialogs for destructive actions** — Never execute an irreversible action (logout, delete, clear data) without asking for confirmation. `Alert.alert` with `style: 'destructive'` renders the action button in red on iOS (following Apple's Human Interface Guidelines), visually communicating danger. On Android, both buttons appear the same color, but the position (cancel on left, action on right) follows Material Design conventions.

---

## 17. Supporting Screens Pattern

Every supporting screen — scan history, notifications, edit profile, settings, help, seller inventory — follows this consistent structure:

```typescript
// 1. SafeAreaView wraps everything, insets only the top
<SafeAreaView style={styles.safe} edges={['top']}>

  {/* 2. Header row: back button, title, optional right action */}
  <View style={styles.header}>
    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
      <Ionicons name="arrow-back" size={24} color={Colors.text} />
    </TouchableOpacity>
    <Text style={styles.title}>Screen Title</Text>
    <View style={{ width: 40 }} />  {/* invisible spacer */}
  </View>

  {/* 3. Content area */}
  <ScrollView>{/* ... */}</ScrollView>

</SafeAreaView>
```

**`edges={['top']}` on SafeAreaView** — By default, `SafeAreaView` applies padding on all four sides. `edges={['top']}` limits it to the top edge only. The bottom is handled by the tab bar insets, and left/right safe areas are not needed on the vast majority of phones.

**The invisible spacer `<View style={{ width: 40 }} />`** — The header has a 40px back button on the left. Without a matching element on the right, the title would be centered relative to the back button's edge rather than the full screen width. The invisible spacer on the right makes the title truly center-aligned on the screen.

---

## 18. Key React Native Concepts Used Throughout

**`StyleSheet.create({})`:**

```typescript
// Using StyleSheet.create (correct)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
});

// Inline styles (avoid for frequently-rendered components)
<View style={{ flex: 1, backgroundColor: Colors.surface }}>
```

`StyleSheet.create` does several things:
1. Validates style property names at app startup, not at runtime
2. Caches the style objects — the same JavaScript object is reused across renders
3. Sends style definitions to the native layer once, not on every render

Inline styles create a new JavaScript object on every single render. For a `FlatList` rendering 50 product cards, inline styles would create 50+ new objects on every scroll frame. Use `StyleSheet.create` for static styles; inline only for truly dynamic values like `{ width: progress * 100 }`.

**`SafeAreaView` — why it matters:**

Modern phones have notches (the camera cutout at the top), status bars, and home indicator bars at the bottom. These system UI elements physically overlap the screen. `SafeAreaView` from `react-native-safe-area-context` reads the actual inset values from the operating system and adds padding to ensure your content is never hidden behind them. Always use it as the outermost container on any full-screen view.

**`TouchableOpacity` vs `Pressable`:**

Both handle tap interactions. `TouchableOpacity` reduces the component's opacity when pressed, providing visual feedback — this is the classic iOS interaction pattern. `Pressable` is newer and more flexible, letting you apply any style changes based on press state. We use `TouchableOpacity` throughout because it covers the vast majority of use cases with minimal configuration.

**`flex: 1` — the most fundamental layout concept:**

React Native uses flexbox for all layout, but the defaults differ from CSS. The most important difference: by default in React Native, the flex direction is `column` (vertical), not `row`. `flex: 1` on a child tells it to take up all remaining space in its parent. When multiple siblings have `flex: 1`, they share the space equally. When one has `flex: 1` and another `flex: 2`, they split 1:2.

**`numberOfLines` on Text:**

```typescript
<Text numberOfLines={1}>{product.name}</Text>
```

React Native text wraps by default — long strings push everything below them down. `numberOfLines={1}` limits to one line and adds "..." at the end (via `ellipsizeMode="tail"`, which is the default). Always specify this for text inside cards and list items where layout breaking would be a problem.

**`activeOpacity` on TouchableOpacity:**

```typescript
<TouchableOpacity activeOpacity={0.75} onPress={handlePress}>
```

This controls how transparent the component becomes when pressed. The default is 0.2 (very transparent). Common values: 0.7-0.85 for subtle feedback, 0.5 for more obvious feedback. Setting it to 1.0 disables the visual feedback entirely.

---

## 19. The Architecture Philosophy

The entire project is built around **separation of concerns** — every layer of the app has a single, clear responsibility and does not know about the layers above it:

```
┌─────────────────────────────────────────────┐
│          UI Layer                           │
│   app/ screens + components/               │
│   Only responsible for: rendering UI       │
│   and reacting to user input               │
└──────────────────┬──────────────────────────┘
                   │ reads/writes
┌──────────────────▼──────────────────────────┐
│          State Layer                        │
│   stores/ (Zustand)                        │
│   Only responsible for: holding app data   │
│   and defining how it can change           │
└──────────────────┬──────────────────────────┘
                   │ calls
┌──────────────────▼──────────────────────────┐
│          Service Layer                      │
│   services/ (mock API)                     │
│   Only responsible for: fetching and       │
│   persisting data                          │
└──────────────────┬──────────────────────────┘
                   │ uses
┌──────────────────▼──────────────────────────┐
│          Contract Layer                     │
│   types/ + theme/ + utils/                 │
│   Shared types, design tokens, helpers     │
└─────────────────────────────────────────────┘
```

**Why this matters in practice:**

- **Replacing the mock API with a real one** requires changing only the `services/` files. Not a single component needs to change.
- **Redesigning a screen** requires changing only the screen file and perhaps a component. The state logic and data fetching are untouched.
- **Adding a new feature** (e.g., product reviews) means adding a type to `types/`, a service function to `services/`, a store action to an appropriate store, and a screen to `app/`. Each part is independent.
- **Testing** is straightforward because each layer can be tested in isolation — you can test a store action without rendering any components, and you can test a component with mock store data without hitting a real API.

This is the same architecture used in production mobile applications at scale. Understanding it here means you already understand the patterns used in professional React Native development.

---

*End of explanation. The codebase has approximately 3,500 lines of application code across 54 files, implementing a full production-quality mobile app architecture.*
