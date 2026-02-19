
import { rateLimiter } from '../utils/rateLimiter';
import { useBrowserStore } from '../store/browserStore';

// Mock StorageManager
jest.mock('../utils/storage', () => ({
  StorageManager: {
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockImplementation((key, defaultValue) => Promise.resolve(defaultValue)),
    updateSettings: jest.fn().mockResolvedValue(undefined),
  },
  STORAGE_KEYS: {
    SETTINGS: '@browser_settings',
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RateLimiter Utility', () => {
  const testUrl = 'https://example.com/page';
  const domain = 'example.com';

  beforeEach(async () => {
    // Reset store state
    const store = useBrowserStore.getState();
    store.clearRateLimit(domain);
    await store.updateSetting('rateLimitEnabled', true);
    await store.updateSetting('maxRequestsPerMinute', 60);
    await store.updateSetting('rateLimitCooldown', 1000);
    rateLimiter.reset();
  });

  test('should allow requests within limit', () => {
    const result = rateLimiter.isAllowed(testUrl);
    expect(result.allowed).toBe(true);
    expect(result.waitTime).toBe(0);
  });

  test('should throttle requests exceeding rate limit', async () => {
    const store = useBrowserStore.getState();
    await store.updateSetting('maxRequestsPerMinute', 1); // 1 request per minute

    // First request allowed
    let result = rateLimiter.isAllowed(testUrl);
    expect(result.allowed).toBe(true);

    // Second request immediately should be throttled
    result = rateLimiter.isAllowed(testUrl);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('throttled');
    expect(result.waitTime).toBeGreaterThan(0);
  });

  test('should block requests during 429 cooldown', () => {
    const store = useBrowserStore.getState();
    store.recordRateLimitError(domain, 5000); // 5s cooldown

    const result = rateLimiter.isAllowed(testUrl);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('cooldown');
    expect(result.waitTime).toBeGreaterThan(0);
    expect(result.waitTime).toBeLessThanOrEqual(5000);
  });

  test('should use exponential backoff for repeated 429 errors', () => {
    const store = useBrowserStore.getState();
    const baseCooldown = 1000;

    // First error
    store.recordRateLimitError(domain, baseCooldown);
    let info = store.getRateLimitInfo(domain);
    expect(info?.errorCount).toBe(1);
    let cooldown = info!.cooldownUntil - info!.lastErrorTime;
    expect(cooldown).toBe(baseCooldown);

    // Second error
    store.recordRateLimitError(domain, baseCooldown);
    info = store.getRateLimitInfo(domain);
    expect(info?.errorCount).toBe(2);
    cooldown = info!.cooldownUntil - info!.lastErrorTime;
    expect(cooldown).toBe(baseCooldown * 2);

    // Third error
    store.recordRateLimitError(domain, baseCooldown);
    info = store.getRateLimitInfo(domain);
    expect(info?.errorCount).toBe(3);
    cooldown = info!.cooldownUntil - info!.lastErrorTime;
    expect(cooldown).toBe(baseCooldown * 4);
  });

  test('should allow requests when rate limiting is disabled', async () => {
    const store = useBrowserStore.getState();
    await store.updateSetting('rateLimitEnabled', false);
    await store.updateSetting('maxRequestsPerMinute', 1);

    // Multiple requests allowed despite low limit
    expect(rateLimiter.isAllowed(testUrl).allowed).toBe(true);
    expect(rateLimiter.isAllowed(testUrl).allowed).toBe(true);
  });
});
