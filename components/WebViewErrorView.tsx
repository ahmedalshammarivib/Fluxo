import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { responsiveFontSize, responsiveSpacing, responsiveBorderRadius } from '@/utils/responsive';
import { useBrowserStore } from '@/store/browserStore';

interface WebViewErrorViewProps {
  error: {
    domain?: string;
    code?: number;
    description?: string;
    waitTime?: number;
    reason?: string;
  };
  onReload: () => void;
  onGoBack: () => void;
  onSwitchSearchEngine?: () => void;
}

export const WebViewErrorView: React.FC<WebViewErrorViewProps> = ({ error, onReload, onGoBack, onSwitchSearchEngine }) => {
  const isRateLimit = error.code === 429;
  const [timeLeft, setTimeLeft] = useState<number>(Math.ceil((error.waitTime || 0) / 1000));

  useEffect(() => {
    if (!isRateLimit || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isRateLimit, timeLeft]);

  const renderRateLimitUI = () => {
    const isIOS = Platform.OS === 'ios';
    const isCooldown = error.reason === 'cooldown';

    const getMessage = () => {
      if (isIOS && isCooldown) {
        return 'Google has temporarily restricted access. This can happen due to browser compatibility on iOS. Try switching to another search engine or enabling Desktop Mode.';
      }
      if (isIOS && error.reason === 'throttled') {
        return "Slowing down requests to protect your session.";
      }
      return error.reason === 'throttled'
        ? "We're slowing down requests to prevent being blocked."
        : 'Google has temporarily rate-limited your requests.';
    };

    return (
      <>
        <Ionicons name="timer-outline" size={64} color="#f4b400" />
        <Text style={styles.title}>Slow Down a Bit</Text>
        <Text style={styles.message}>{getMessage()}</Text>
      
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          {timeLeft > 0 ? `Resuming in ${timeLeft}s...` : 'Ready to try again!'}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${Math.min(100, (1 - timeLeft / ((error.waitTime || 60000) / 1000)) * 100)}%` }
            ]} 
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onGoBack}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton, timeLeft > 0 && styles.disabledButton]} 
          onPress={onReload}
          disabled={timeLeft > 0}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.buttonText}>Retry Now</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.secondaryAction} onPress={onSwitchSearchEngine}>
        <Text style={styles.secondaryActionText}>Try another search engine</Text>
      </TouchableOpacity>
    </>
    );
  };

  const renderDefaultErrorUI = () => {
    // Handle specific error codes
    const isConnectionLost = error.code === -1005;
    
    return (
    <>
      <Ionicons name={isConnectionLost ? "alert-circle-outline" : "cloud-offline-outline"} size={64} color="#666" />
      <Text style={styles.title}>{isConnectionLost ? "Invalid Request" : "Page Not Available"}</Text>
      <Text style={styles.message}>
        {isConnectionLost 
          ? "The request could not be processed. This may happen if the URL is invalid or the connection was lost."
          : "The webpage could not be loaded because:"}
      </Text>
      <View style={styles.errorDetails}>
        <Text style={styles.errorText}>{error.description || 'Unknown error'}</Text>
        {error.code && <Text style={styles.errorCode}>Code: {error.code}</Text>}
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onGoBack}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onReload}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.buttonText}>Reload</Text>
        </TouchableOpacity>
      </View>
    </>
  );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {isRateLimit ? renderRateLimitUI() : renderDefaultErrorUI()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    padding: responsiveSpacing(20),
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: responsiveFontSize(20),
    fontWeight: 'bold',
    color: '#333',
    marginTop: responsiveSpacing(16),
    marginBottom: responsiveSpacing(8),
  },
  message: {
    fontSize: responsiveFontSize(16),
    color: '#666',
    textAlign: 'center',
    marginBottom: responsiveSpacing(16),
  },
  errorDetails: {
    backgroundColor: '#f5f5f5',
    padding: responsiveSpacing(12),
    borderRadius: responsiveBorderRadius(8),
    marginBottom: responsiveSpacing(24),
    width: '100%',
  },
  errorText: {
    fontSize: responsiveFontSize(14),
    color: '#d32f2f',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorCode: {
    fontSize: responsiveFontSize(12),
    color: '#666',
    textAlign: 'center',
    marginTop: responsiveSpacing(4),
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: responsiveSpacing(12),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveSpacing(10),
    paddingHorizontal: responsiveSpacing(20),
    backgroundColor: '#757575',
    borderRadius: responsiveBorderRadius(20),
    gap: responsiveSpacing(8),
  },
  primaryButton: {
    backgroundColor: '#1a73e8',
  },
  buttonText: {
    fontSize: responsiveFontSize(14),
    color: '#fff',
    fontWeight: '600',
    marginLeft: responsiveSpacing(8),
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: responsiveSpacing(24),
  },
  timerText: {
    fontSize: responsiveFontSize(16),
    color: '#333',
    fontWeight: '600',
    marginBottom: responsiveSpacing(12),
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f4b400',
  },
  secondaryAction: {
    marginTop: responsiveSpacing(24),
    padding: responsiveSpacing(8),
  },
  secondaryActionText: {
    fontSize: responsiveFontSize(14),
    color: '#1a73e8',
    textDecorationLine: 'underline',
  },
});
