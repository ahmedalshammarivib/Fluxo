# Fluxo Browser — Full Code Audit Bug Report
**Date:** 2026-02-20  
**Files Reviewed:** `app/(tabs)/index.tsx`, `hooks/useWebView.ts`, `store/browserStore.ts`, `components/TabWebView.tsx`, repository root structure  
**Total Bugs Found:** 24  

---

## Priority Legend
- 🚨 **BLOCKER** — App will not build or run
- 🔴 **CRITICAL** — Crash, security vulnerability, or broken core feature
- 🟠 **HIGH** — Performance degradation or unexpected behavior
- 🟡 **MEDIUM** — Standards violation, deprecated API, or minor bug

---

## 🚨 BLOCKER

---

### BUG-24 — `utils/` directory does not exist in the repository

The entire `utils/` folder is **MISSING** from the repository.

The following files are imported across the codebase but do not exist in the repo:
- `@/utils/webViewScriptManager`
- `@/utils/adBlockManager`
- `@/utils/urlValidator`
- `@/utils/downloadManager`
- `@/utils/imageManager`
- `@/utils/performanceHelpers`
- `@/utils/logger`
- `@/utils/storage`
- `@/utils/searchIndex`
- `@/utils/responsive`
- `@/utils/nightModeManager`
- `@/utils/appearanceManager`
- `@/utils/autofillManager`
- `@/utils/userAgent`
- `@/utils/webViewPerformanceMonitor`

These are not optional — they are **CORE dependencies**. Every file reviewed imports from `@/utils/*`. A fresh clone + `npx expo start` will fail immediately with `MODULE_NOT_FOUND` errors.

**LIKELY CAUSE:** `utils/` was never committed — either added to `.gitignore` by mistake or `git add utils/` was never run.

**FIX:**
```bash
git add utils/
git commit -m "feat: add utils directory (was missing from repo)"
git push origin main
```
Verify on GitHub that `utils/` appears in the root alongside `store/`, `hooks/`, etc.

> ⚠️ After fixing BUG-24, a follow-up review of `utils/` files is required — especially `webViewScriptManager.ts`, `adBlockManager.ts`, and `urlValidator.ts`.

---

## 🔴 CRITICAL

---

### BUG-01 — Privacy Tabs missing `onFindMatches` prop

**FILE:** `app/(tabs)/index.tsx`

Normal tabs correctly pass `onFindMatches={setFindMatches}`, but Privacy Tabs do not. "Find in Page" will never update the match counter (stays at 0/0) in Incognito Mode.

**FIX:** Add `onFindMatches={setFindMatches}` to the Privacy Tabs render block, identical to how it is passed in Normal Tabs.

---

### BUG-02 — Infinite re-render loop in `handleNavigationStateChange`

**FILE:** `hooks/useWebView.ts`

The callback is wrapped in `debounce()` but its dependency array includes `webViewState.isLoading`, `webViewState.canGoBack`, `webViewState.canGoForward`, and `webViewState.currentUrl`. Every navigation event updates those values → rebuilds the callback → creates a new debounce timer → cancels the previous one.

**Result:** The handler may **never fire** during fast navigation. History is not recorded, `canGoBack/canGoForward` stay stale.

**FIX:** Remove all `webViewState.*` values from the dependency array. Use a functional updater inside `setWebViewState()`:

```ts
const handleNavigationStateChange = useCallback(
  debounce((navState: WebViewNavigation) => {
    const { url, loading, canGoBack, canGoForward } = navState;

    if (url && url !== 'about:blank' && isActive) {
      updateCurrentDomain(url);
    }

    setWebViewState(prev => {
      const changed =
        loading !== prev.isLoading ||
        canGoBack !== prev.canGoBack ||
        canGoForward !== prev.canGoForward ||
        url !== prev.currentUrl;
      if (!changed) return prev;
      return { ...prev, isLoading: loading, canGoBack, canGoForward, currentUrl: url };
    });

    if (!loading && url !== 'about:blank') {
      perfMonitor.endPageLoad();
      addToHistory({ url, title: navState.title || url });
      const activeTab = getActiveTab();
      if (activeTab) {
        if (isIncognito) {
          updatePrivacyTabUrl(activeTab.id, url);
          if (navState.title) updatePrivacyTabTitle(activeTab.id, navState.title);
        } else {
          updateTabUrl(activeTab.id, url);
          if (navState.title) updateTabTitle(activeTab.id, navState.title);
        }
      }
    }
  }, 300),
  [isActive, updateCurrentDomain, addToHistory, getActiveTab, isIncognito,
   updateTabUrl, updatePrivacyTabUrl, updateTabTitle, updatePrivacyTabTitle, perfMonitor]
);
```

---

### BUG-03 — Night Mode CSS injected twice on every URL change

**FILE:** `app/(tabs)/index.tsx`

The Night Mode `useEffect` has `currentUrl` in its dependency array. The `WebViewScriptManager` preload script already injects Night Mode CSS on every page load. This effect fires **again** for every URL change → double injection → CSS conflicts + unnecessary JS overhead.

**FIX:** Split into two separate effects:

```ts
// Effect 1: Only fires when the user toggles night mode
useEffect(() => {
  if (!webViewRef.current || isHomePage || !currentUrl) return;
  if (nightMode) {
    webViewRef.current.injectJavaScript(nightModeManager.getNightModeCSS(currentUrl));
  } else {
    webViewRef.current.injectJavaScript(nightModeManager.getRemoveNightModeCSS());
  }
}, [nightMode, incognitoMode]); // no currentUrl

// Effect 2: Update manager config on URL change — no injection
useEffect(() => {
  nightModeManager.updateConfig({ enabled: nightMode, url: currentUrl, isIncognito: incognitoMode });
}, [currentUrl, nightMode, incognitoMode]);
```

---

### BUG-11 — `searchContextMenuVisible` missing from BackHandler deps

**FILE:** `app/(tabs)/index.tsx`

`searchContextMenuVisible` is used inside the BackHandler callback but is NOT in the dependency array. Stale closure bug: when the search context menu is open and the user presses back on Android, the handler reads a stale `false` value and falls through to `goBack()` instead of closing the menu.

**FIX:** Add `searchContextMenuVisible` to the BackHandler `useEffect` dependency array.

---

### BUG-15 — `updatePrivacyTabScreenshot` has no size limit check

**FILE:** `store/browserStore.ts`

`updateTabScreenshot` enforces a size limit (300KB iOS / 5MB Android). `updatePrivacyTabScreenshot` has no such check — a 10MB screenshot is stored in memory with no limit, causing memory pressure on iOS.

**FIX:**

```ts
updatePrivacyTabScreenshot: (tabId: string, screenshot: string) => {
  const MAX_SIZE = Platform.OS === 'ios' ? 300 * 1024 : 5 * 1024 * 1024;
  if (screenshot && screenshot.length > MAX_SIZE) {
    logger.warn('Privacy tab screenshot too large, skipping', { tabId, length: screenshot.length });
    return;
  }
  const { privacyTabs } = get();
  const newTabs = privacyTabs.map(tab =>
    tab.id === tabId ? { ...tab, screenshot } : tab
  );
  set({ privacyTabs: newTabs });
},
```

---

### BUG-16 — `updateTabUrl` and `updateTabTitle` write to AsyncStorage on every call

**FILE:** `store/browserStore.ts`

Both functions call `get().saveTabs()` immediately after every update. During a single page load, `updateTabUrl` fires once and `updateTabTitle` fires multiple times as the page `<title>` updates. Combined with redirects, this causes **10–30 AsyncStorage writes per page load**, causing frame drops and UI jank.

**FIX:** Add a module-level debounce:

```ts
let saveTabsTimer: ReturnType<typeof setTimeout> | null = null;

const debouncedSaveTabs = () => {
  if (saveTabsTimer) clearTimeout(saveTabsTimer);
  saveTabsTimer = setTimeout(() => { get().saveTabs(); }, 1000);
};

updateTabUrl: (tabId, url) => {
  set({ tabs: get().tabs.map(t => t.id === tabId ? { ...t, url } : t) });
  debouncedSaveTabs();
},

updateTabTitle: (tabId, title) => {
  set({ tabs: get().tabs.map(t => t.id === tabId ? { ...t, title } : t) });
  debouncedSaveTabs();
},
```

---

### BUG-20 — JavaScript injection via string interpolation — URL injection attack

**FILE:** `components/TabWebView.tsx`

```ts
webViewRef.current?.injectJavaScript(`window.location.href = "${url}"`);
```

Direct string interpolation with no escaping. A malicious URL containing `"` or inline JS executes arbitrary JavaScript inside the WebView.

**Example attack URL:**
```
https://example.com/"; alert(document.cookie); //
```

**FIX:** Use `JSON.stringify` to safely encode the URL:

```ts
const safeUrl = JSON.stringify(url);
webViewRef.current?.injectJavaScript(`window.location.href = ${safeUrl};`);
```

---

## 🟠 HIGH

---

### BUG-04 — All tabs kept alive in memory simultaneously

**FILE:** `app/(tabs)/index.tsx`

Every tab is fully mounted as a live WebView instance at all times. With 5+ tabs open, memory usage becomes extreme. On iOS, this triggers WKWebView process termination.

**FIX:** Only mount the active tab and its 1 nearest neighbour:

```ts
const MAX_DISTANCE_FROM_ACTIVE = 1;

{tabs.map((tab, index) => {
  const isActive = !incognitoMode && tab.id === activeTabId;
  const activeIndex = tabs.findIndex(t => t.id === activeTabId);
  const distance = Math.abs(index - activeIndex);
  const shouldMount = isActive || distance <= MAX_DISTANCE_FROM_ACTIVE;

  if (!shouldMount) return <View key={tab.id} style={{ width: 0, height: 0 }} />;
  return <TabWebView key={tab.id} tab={tab} isActive={isActive} ... />;
})}
```
Apply the same pattern to `privacyTabs`.

---

### BUG-05 — Race condition in URL params loading

**FILE:** `app/(tabs)/index.tsx`

```ts
setTimeout(() => {
  navigation.loadUrl(urlToLoad); // 100ms is arbitrary
}, 100);
```

On slow devices, the WebView may not be ready after 100ms. The URL is silently lost with no retry.

**FIX:** Use a ref to store the pending URL and load it once the WebView is confirmed ready:

```ts
const pendingParamUrl = useRef<string | null>(null);

useEffect(() => {
  if (params?.url) {
    pendingParamUrl.current = params.url as string;
    setUrl(params.url as string);
    setIsHomePage(false);
    router.setParams({ url: undefined });
  }
}, [params]);

useEffect(() => {
  if (!isHomePage && pendingParamUrl.current) {
    navigation.loadUrl(pendingParamUrl.current);
    pendingParamUrl.current = null;
  }
}, [isHomePage]);
```

---

### BUG-06 — Incognito cookie clearing breaks redirects and logins

**FILE:** `app/(tabs)/index.tsx`

A `useEffect` clears all cookies and localStorage on **every URL change**, including internal redirects. This breaks login flows, OAuth, SSO, and any multi-step redirect chain in Incognito Mode.

**FIX:** Remove the cookie-clearing `useEffect` entirely. Use native WebView props instead:

```tsx
<TabWebView
  incognito={isIncognito}
  thirdPartyCookiesEnabled={false}
  domStorageEnabled={false}
/>
```

---

### BUG-12 — `handleTabStateChange` triggers screenshot on every state change

**FILE:** `app/(tabs)/index.tsx`

```ts
const handleTabStateChange = useCallback((tabId: string, state: WebViewState) => {
  if (tabId === getActiveTabId()) setWebViewState(state);
  handleTabLoadEnd(tabId); // called on EVERY state change
}, [...]);
```

`handleTabLoadEnd` schedules a screenshot with an 800ms debounce. Because it fires on every navigation event (start, progress updates, redirects), the timer resets repeatedly and never fires on pages with live connections (WebSocket, polling).

**FIX:** Only call `handleTabLoadEnd` when loading is actually finished:

```ts
const handleTabStateChange = useCallback((tabId: string, state: WebViewState) => {
  if (tabId === getActiveTabId()) setWebViewState(state);
  if (!state.isLoading && state.progress >= 100) {
    handleTabLoadEnd(tabId);
  }
}, [getActiveTabId, handleTabLoadEnd]);
```

---

### BUG-13 — `activeTab` stale closure in URL sync effect

**FILE:** `app/(tabs)/index.tsx`

`activeTab` is resolved once during render and captured by the closure. If the store updates between renders, the effect reads a stale tab object.

**FIX:** Read the active tab directly from the store inside the effect:

```ts
useEffect(() => {
  const currentActiveTab = getActiveTab();
  if (currentActiveTab && !isHomePage && currentActiveTab.url !== url) {
    setUrl(currentActiveTab.url);
  }
}, [activeTabId, activePrivacyTabId, incognitoMode, isHomePage]);
```

---

### BUG-17 — `isSameDomain` treats all ccSLD sites as the same domain

**FILE:** `store/browserStore.ts`

```ts
const base1 = parts1.slice(-2).join('.'); // "co.uk"
const base2 = parts2.slice(-2).join('.'); // "co.uk"
return base1 === base2; // TRUE for google.co.uk AND amazon.co.uk — WRONG
```

For any URL with a country-code second-level TLD (`.co.uk`, `.com.au`, `.co.jp`, etc.), the function strips the company name and compares only the TLD suffix. Ad block stats are **never reset** between different `.co.uk` sites.

**FIX:**

```ts
const KNOWN_CCSLDS = ['co.uk','com.au','co.jp','org.uk','co.nz','com.br','co.in','co.za','net.au','org.au'];

function getBaseDomain(hostname: string): string {
  const parts = hostname.split('.');
  const lastTwo = parts.slice(-2).join('.');
  if (KNOWN_CCSLDS.includes(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}

function isSameDomain(domain1: string, domain2: string): boolean {
  if (!domain1 || !domain2) return false;
  return getBaseDomain(extractDomain(domain1)) === getBaseDomain(extractDomain(domain2));
}
```

---

### BUG-18 — Screenshots stored inside tab objects and persisted to AsyncStorage

**FILE:** `store/browserStore.ts`

Each tab's `screenshot` field (up to 300KB) is included in `saveTabs()`. With 10 tabs, that is **3MB written to AsyncStorage on every save**. AsyncStorage has a ~1–2MB practical limit on Android. The fallback that strips screenshots only triggers **after** the first write fails.

**FIX:** Never store screenshots in the main tabs payload:

```ts
saveTabs: async () => {
  const { tabs, activeTabId } = get();
  const tabsWithoutScreenshots = tabs.map(({ screenshot, ...rest }) => rest as SimpleTab);
  await StorageManager.setItem(TABS_STORAGE_KEY, tabsWithoutScreenshots);
  if (activeTabId) await StorageManager.setItem(ACTIVE_TAB_ID_KEY, activeTabId);
},
```

---

### BUG-21 — `loadUrl` causes every new URL to load twice

**FILE:** `components/TabWebView.tsx`

```ts
loadUrl: (url: string) => {
  if (url !== sourceUri) {
    setSourceUri(url);        // triggers WebView reload via source prop change
  }
  navigation.loadUrl(url);    // called in BOTH branches — triggers a second load
},
```

When `url !== sourceUri`, `setSourceUri` changes the `source` prop (WebView reloads), then `navigation.loadUrl` fires again — **every navigation hits the server twice**.

**FIX:** Only call `navigation.loadUrl` when the source prop is NOT changing:

```ts
loadUrl: (url: string) => {
  isInternalNavigation.current = false;
  if (url === sourceUri) {
    const safeUrl = JSON.stringify(url);
    webViewRef.current?.injectJavaScript(`window.location.href = ${safeUrl};`);
    navigation.loadUrl(url);
  } else {
    setSourceUri(url);
    // source prop change handles the load — no navigation.loadUrl needed
  }
},
```

---

### BUG-22 — `isHomePage` is global state, not per-tab

**FILE:** `components/TabWebView.tsx`

`isHomePage` from `index.tsx` reflects only the **active tab's** homepage status, but is passed to ALL `TabWebView` instances. When a new blank tab is opened, all inactive tabs receive `isHomePage = true`, causing their WebViews to be hidden when switched back to.

**FIX:** Derive visibility from the individual tab's own URL:

```ts
// In TabWebView.tsx
const tabHasContent = !!(tab.url && tab.url !== '' && tab.url !== 'about:blank');
const isVisible = isActive && tabHasContent;
```

Remove `isHomePage` from `TabWebViewProps` entirely.

---

## 🟡 MEDIUM

---

### BUG-07 — Missing ATS configuration — HTTP sites blocked on iOS

No `app.json` or `app.config.js` with ATS settings. All HTTP (non-HTTPS) websites will be blocked on iOS in production builds.

**FIX:** In `app.json`, add under `expo.ios`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": false,
          "NSAllowsArbitraryLoadsInWebContent": true
        }
      }
    }
  }
}
```

---

### BUG-08 — Deprecated `Clipboard` API from `react-native`

**FILE:** `app/(tabs)/index.tsx`

```ts
import { ..., Clipboard, ... } from 'react-native'; // deprecated since RN 0.59
```

**FIX:**
```bash
npx expo install @react-native-clipboard/clipboard
```
```ts
import Clipboard from '@react-native-clipboard/clipboard';
```

---

### BUG-09 — Wrong project name in logger calls

**FILE:** `app/(tabs)/index.tsx`

```ts
logger.debug('[Aura] Received long press data', ...);
//            ^^^^^^ wrong project name
```

**FIX:** Search the entire codebase for `[Aura]` and replace all instances with `[Fluxo]`.

---

### BUG-10 — `BackHandler` runs on iOS

**FILE:** `app/(tabs)/index.tsx`

`BackHandler` event listener is registered unconditionally. iOS has no hardware back button — this registers a pointless listener and wastes memory.

**FIX:**

```ts
useEffect(() => {
  if (Platform.OS !== 'android') return;
  const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
  return () => backHandler.remove();
}, [...deps]);
```

---

### BUG-14 — `view-source:` URL scheme does not work in WebView

**FILE:** `app/(tabs)/index.tsx` + `hooks/useWebView.ts`

Opening a new tab with `view-source:https://...` fails silently on both iOS (WKWebView) and Android WebView — they do not support the `view-source:` URI scheme.

**FIX:** Route page source to a dedicated screen instead:

```ts
case 'pageSource':
  router.push({
    pathname: '/(tabs)/source-viewer',
    params: { source: data.source, url: webViewState.currentUrl }
  });
  break;
```

---

### BUG-19 — `toggleIncognitoMode` persists incognito state across app restarts

**FILE:** `store/browserStore.ts`

`incognitoMode: true` is persisted to AsyncStorage. On restart, `loadSettings()` restores `incognitoMode: true` but `privacyTabs` is `[]` (memory only, not restored). The app starts in incognito mode with no tabs → blank screen.

**FIX:** Never restore `incognitoMode` from storage:

```ts
loadSettings: async () => {
  const settings = await StorageManager.getSettings();
  set({
    settings: { ...settings, incognitoMode: false },
    incognitoMode: false, // always reset on startup
    nightMode: settings.nightMode || false,
    desktopMode: settings.desktopMode || false,
    isAdBlockEnabled: settings.adBlockEnabled ?? true,
  });
},
```

---

### BUG-23 — `console.warn` used instead of `logger` in iOS crash handler

**FILE:** `components/TabWebView.tsx`

```ts
onContentProcessDidTerminate: () => {
  console.warn('iOS WKWebView process terminated, reloading...');
  webViewRef.current?.reload();
},
```

Bypasses the logger's filtering, prefix tagging, and production log suppression.

**FIX:**

```ts
onContentProcessDidTerminate: () => {
  logger.warn('[Fluxo] iOS WKWebView process terminated, reloading', {
    tabId: tab.id,
    url: tab.url,
  });
  webViewRef.current?.reload();
},
```

---

## ✅ Final Priority Summary

| Priority | Bug IDs |
|---|---|
| 🚨 BLOCKER | BUG-24 |
| 🔴 CRITICAL | BUG-01, BUG-02, BUG-03, BUG-11, BUG-15, BUG-16, BUG-20 |
| 🟠 HIGH | BUG-04, BUG-05, BUG-06, BUG-12, BUG-13, BUG-17, BUG-18, BUG-21, BUG-22 |
| 🟡 MEDIUM | BUG-07, BUG-08, BUG-09, BUG-10, BUG-14, BUG-19, BUG-23 |

**Total: 24 bugs**

---

*Report generated by deep code audit — 2026-02-20*
