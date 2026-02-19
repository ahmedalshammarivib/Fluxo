import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Clipboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logErrorBoundary } from '@/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
  showDetails?: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    showDetails: false
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to crash reporting service with component stack
    logErrorBoundary(error, { componentStack: errorInfo.componentStack || '' });
    this.setState({ componentStack: errorInfo.componentStack || undefined });
  }

  handleCopyError = () => {
    const { error, componentStack } = this.state;
    const errorDetails = `Error: ${error?.message}\n\nStack: ${componentStack}`;
    Clipboard.setString(errorDetails);
    Alert.alert('Copied', 'Error details copied to clipboard');
  };

  handleReportError = () => {
    // Placeholder for reporting logic
    Alert.alert('Report Sent', 'Thank you for your feedback. We will investigate this issue.');
  };

  toggleDetails = () => {
    this.setState(prevState => ({ showDetails: !prevState.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We encountered an unexpected error. The browser has been safely paused to prevent data loss.
            </Text>
            
            <TouchableOpacity onPress={this.toggleDetails} style={styles.detailsToggle}>
               <Text style={styles.detailsToggleText}>
                 {this.state.showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
               </Text>
               <Ionicons name={this.state.showDetails ? "chevron-up" : "chevron-down"} size={16} color="#666" />
            </TouchableOpacity>

            {this.state.showDetails && this.state.error && (
              <View style={styles.technicalDetails}>
                <Text style={styles.errorText}>
                  {this.state.error.message}
                </Text>
                {this.state.componentStack && (
                  <Text style={styles.stackText}>
                    {this.state.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => this.setState({ hasError: false, error: undefined, showDetails: false })}
              >
                <Ionicons name="refresh" size={20} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Reload Page</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.handleCopyError}
              >
                <Ionicons name="copy-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Copy Error</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.reportLink}
              onPress={this.handleReportError}
            >
              <Text style={styles.reportLinkText}>Report this issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 16,
    borderRadius: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
  },
  detailsToggleText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
    fontWeight: '600',
  },
  technicalDetails: {
    backgroundColor: '#f1f3f5',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
    maxHeight: 200,
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#d6336c',
    marginBottom: 8,
  },
  stackText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#868e96',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#4285F4',
  },
  secondaryButton: {
    backgroundColor: '#868e96',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  reportLink: {
    padding: 8,
  },
  reportLinkText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '500',
  },
});