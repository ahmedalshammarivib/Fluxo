import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LanguageSettingsComponent } from '../components/settings/LanguageSettings';

describe('LanguageSettings Component', () => {
  const mockSettings = {
    preferredLanguage: 'en',
    translationEnabled: true,
  };
  
  const mockOnSettingChange = jest.fn();
  const mockOnBack = jest.fn();
  
  beforeEach(() => {
    mockOnSettingChange.mockClear();
    mockOnBack.mockClear();
  });
  
  it('renders correctly with default settings', () => {
    const { getByText } = render(
      <LanguageSettingsComponent
        settings={mockSettings}
        onSettingChange={mockOnSettingChange}
        onBack={mockOnBack}
      />
    );
    
    // Check if the component renders the correct language
    expect(getByText('English')).toBeTruthy();
    
    // Check if translation toggle is enabled
    expect(getByText('Automatic Translation')).toBeTruthy();
  });
  
  it('calls onBack when back button is pressed', () => {
    const { getByText } = render(
      <LanguageSettingsComponent
        settings={mockSettings}
        onSettingChange={mockOnSettingChange}
        onBack={mockOnBack}
      />
    );
    
    // Press the back button
    fireEvent.press(getByText('Language Settings').parent);
    
    // Check if onBack was called
    expect(mockOnBack).toHaveBeenCalled();
  });
  
  it('toggles translation setting when switch is pressed', () => {
    const { getByText } = render(
      <LanguageSettingsComponent
        settings={mockSettings}
        onSettingChange={mockOnSettingChange}
        onBack={mockOnBack}
      />
    );
    
    // Find and toggle the translation switch
    const translationSwitch = getByText('Automatic Translation').parent.parent.findByType('Switch');
    fireEvent.press(translationSwitch);
    
    // Check if onSettingChange was called with the correct parameters
    expect(mockOnSettingChange).toHaveBeenCalledWith('translationEnabled', false);
  });
});