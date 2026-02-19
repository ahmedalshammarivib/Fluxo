import LanguageManager from '../utils/languageManager';
import { useBrowserStore } from '../store/browserStore';

// Mock the browser store
jest.mock('../store/browserStore', () => ({
  useBrowserStore: {
    getState: jest.fn().mockReturnValue({
      settings: {
        language: {
          preferredLanguage: 'en',
          translationEnabled: true,
        }
      },
      updateSetting: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('LanguageManager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should get current language settings', () => {
    const languageSettings = LanguageManager.getCurrentLanguage();
    
    expect(languageSettings).toEqual({
      preferredLanguage: 'en',
      translationEnabled: true,
    });
    expect(useBrowserStore.getState).toHaveBeenCalled();
  });

  it('should update language settings', async () => {
    await LanguageManager.updateLanguageSetting('preferredLanguage', 'fr');
    
    expect(useBrowserStore.getState).toHaveBeenCalled();
    expect(useBrowserStore.getState().updateSetting).toHaveBeenCalledWith(
      'language',
      {
        preferredLanguage: 'fr',
        translationEnabled: true,
      }
    );
  });

  it('should get language name from code', () => {
    const name = LanguageManager.getLanguageName('fr');
    expect(name).toBe('French');
  });

  it('should return "Unknown" for invalid language code', () => {
    const name = LanguageManager.getLanguageName('invalid-code');
    expect(name).toBe('Unknown');
  });

  it('should return a list of supported languages', () => {
    const languages = LanguageManager.getSupportedLanguages();
    expect(languages).toBeInstanceOf(Array);
    expect(languages.length).toBeGreaterThan(0);
    expect(languages[0]).toHaveProperty('code');
    expect(languages[0]).toHaveProperty('name');
    expect(languages[0]).toHaveProperty('flag');
  });
});