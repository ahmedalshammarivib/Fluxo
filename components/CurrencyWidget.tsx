import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyAPI, CurrencyRate, CryptoPrice } from '../utils/currencyApi';
import { logger } from '@/utils/logger';
import { EthereumIcon } from './icons/EthereumIcon';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveIconSize,
  responsiveWidth,
  responsiveHeight,
  responsiveBorderRadius,
  isSmallScreen,
  wp
} from '../utils/responsive';

export const CurrencyWidget: React.FC = () => {
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
  const [cryptos, setCryptos] = useState<CryptoPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const { width } = useWindowDimensions();
  
  // Enhanced responsive configuration
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

  useEffect(() => {
    loadData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [currencyData, cryptoData] = await Promise.all([
        CurrencyAPI.getCurrencyRates(),
        CurrencyAPI.getCryptoPrices(),
      ]);

      setCurrencies(currencyData.slice(0, 3)); // Show top 3 currencies
      setCryptos(cryptoData.slice(0, 2)); // Show top 2 cryptos
      setLastUpdate(Date.now());
    } catch (error) {
      logger.error('Failed to load market data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return price.toFixed(2);
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      {/* Header with refresh */}
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>Market Data</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={isTablet ? 24 : 20} color="#4285f4" />
        </TouchableOpacity>
      </View>

      {/* Currency Rates */}
      <View style={[styles.section, isTablet && styles.sectionTablet]}>
        <View style={[styles.currencyGrid, isTablet && styles.currencyGridTablet]}>
          {currencies.map((currency, index) => (
            <TouchableOpacity key={index} style={[styles.currencyCard, isTablet && styles.currencyCardTablet]}>
              <Text style={[styles.currencySymbol, isTablet && styles.currencySymbolTablet]}>{currency.symbol}</Text>
              <Text style={[styles.currencyCode, isTablet && styles.currencyCodeTablet]}>{currency.code}</Text>
              <Text style={[styles.currencyRate, isTablet && styles.currencyRateTablet]}>{formatPrice(currency.rate)}</Text>
              <Text style={[
                styles.currencyChange,
                { color: currency.change24h >= 0 ? '#4CAF50' : '#f44336' },
                isTablet && styles.currencyChangeTablet
              ]}>
                {formatChange(currency.change24h)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Crypto Prices */}
      <View style={[styles.section, isTablet && styles.sectionTablet]}>
        <View style={[styles.cryptoGrid, isTablet && styles.cryptoGridTablet]}>
          {cryptos.map((crypto, index) => (
            <TouchableOpacity key={index} style={[styles.cryptoCard, isTablet && styles.cryptoCardTablet]}>
              <View style={[styles.cryptoHeader, isTablet && styles.cryptoHeaderTablet]}>
                <View style={[styles.cryptoIcon, isTablet && styles.cryptoIconTablet]}>
                  {crypto.symbol === 'ETH' ? (
                    <EthereumIcon size={isTablet ? 28 : 24} color="#627eea" />
                  ) : (
                    <Ionicons
                      name={crypto.symbol === 'BTC' ? 'logo-bitcoin' :
                        crypto.symbol === 'ADA' ? 'heart-outline' : 'flash-outline'}
                      size={isTablet ? 28 : 24}
                      color={crypto.symbol === 'BTC' ? '#f7931a' :
                        crypto.symbol === 'ADA' ? '#0033ad' : '#00d4aa'}
                    />
                  )}
                </View>
                <Text style={[styles.cryptoSymbol, isTablet && styles.cryptoSymbolTablet]}>{crypto.symbol}</Text>
              </View>
              <Text style={[styles.cryptoName, isTablet && styles.cryptoNameTablet]}>{crypto.name}</Text>
              <Text style={[styles.cryptoPrice, isTablet && styles.cryptoPriceTablet]}>${formatPrice(crypto.price)}</Text>
              <Text style={[
                styles.cryptoChange,
                { color: crypto.change24h >= 0 ? '#4CAF50' : '#f44336' },
                isTablet && styles.cryptoChangeTablet
              ]}>
                {formatChange(crypto.change24h)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Last Update Info */}
      {lastUpdate > 0 && (
        <View style={[styles.updateInfo, isTablet && styles.updateInfoTablet]}>
          <Ionicons name="time-outline" size={isTablet ? 18 : 16} color="#888" />
          <Text style={[styles.updateText, isTablet && styles.updateTextTablet]}>
            Updated {new Date(lastUpdate).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: responsiveSpacing(isSmallScreen() ? 16 : 20),
  },
  containerTablet: {
    padding: responsiveSpacing(24),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveSpacing(isSmallScreen() ? 16 : 20),
  },
  headerTablet: {
    marginBottom: responsiveSpacing(24),
  },
  headerTitle: {
    fontSize: responsiveFontSize(isSmallScreen() ? 16 : 18),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerTitleTablet: {
    fontSize: responsiveFontSize(20),
  },
  refreshButton: {
    padding: responsiveSpacing(8),
  },
  section: {
    marginBottom: responsiveSpacing(isSmallScreen() ? 16 : 20),
  },
  sectionTablet: {
    marginBottom: responsiveSpacing(28),
  },
  sectionTitle: {
    fontSize: responsiveFontSize(isSmallScreen() ? 12 : 14),
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: responsiveSpacing(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  currencyGridTablet: {
    justifyContent: 'space-between',
    paddingHorizontal: responsiveSpacing(12),
  },
  currencyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: responsiveBorderRadius(12),
    padding: responsiveSpacing(isSmallScreen() ? 12 : 16),
    alignItems: 'center',
    minWidth: responsiveWidth(isSmallScreen() ? 80 : 90),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    marginHorizontal: responsiveSpacing(2),
    maxWidth: responsiveWidth(100),
  },
  currencyCardTablet: {
    padding: responsiveSpacing(24),
    minWidth: responsiveWidth(120),
    maxWidth: responsiveWidth(140),
    marginHorizontal: responsiveSpacing(3),
    borderRadius: responsiveBorderRadius(16),
    borderWidth: 1.5,
  },
  currencySymbol: {
    fontSize: responsiveFontSize(isSmallScreen() ? 20 : 24),
    fontWeight: 'bold',
    color: '#4285f4',
    marginBottom: responsiveSpacing(4),
  },
  currencySymbolTablet: {
    fontSize: responsiveFontSize(28),
    marginBottom: responsiveSpacing(6),
  },
  currencyCode: {
    fontSize: responsiveFontSize(isSmallScreen() ? 10 : 12),
    color: '#888',
    marginBottom: responsiveSpacing(4),
  },
  currencyCodeTablet: {
    fontSize: responsiveFontSize(14),
    marginBottom: responsiveSpacing(8),
  },
  currencyRate: {
    fontSize: responsiveFontSize(isSmallScreen() ? 14 : 16),
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: responsiveSpacing(4),
  },
  currencyRateTablet: {
    fontSize: responsiveFontSize(20),
    marginBottom: responsiveSpacing(8),
  },
  currencyChange: {
    fontSize: responsiveFontSize(isSmallScreen() ? 10 : 12),
    fontWeight: '500',
  },
  currencyChangeTablet: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  cryptoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  cryptoGridTablet: {
    justifyContent: 'space-around',
    paddingHorizontal: responsiveSpacing(16),
  },
  cryptoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: responsiveBorderRadius(12),
    padding: responsiveSpacing(isSmallScreen() ? 12 : 16),
    flex: 1,
    marginHorizontal: responsiveSpacing(4),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: responsiveWidth(150),
  },
  cryptoCardTablet: {
    padding: responsiveSpacing(24),
    marginHorizontal: responsiveSpacing(10),
    maxWidth: responsiveWidth(200),
    borderRadius: responsiveBorderRadius(16),
    borderWidth: 1.5,
  },
  cryptoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveSpacing(8),
  },
  cryptoHeaderTablet: {
    marginBottom: responsiveSpacing(10),
  },
  cryptoIcon: {
    marginRight: responsiveSpacing(6),
  },
  cryptoIconTablet: {
    marginRight: responsiveSpacing(8),
  },
  cryptoSymbol: {
    fontSize: responsiveFontSize(isSmallScreen() ? 12 : 14),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cryptoSymbolTablet: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
  },
  cryptoName: {
    fontSize: responsiveFontSize(isSmallScreen() ? 10 : 12),
    color: '#888',
    marginBottom: responsiveSpacing(4),
  },
  cryptoNameTablet: {
    fontSize: responsiveFontSize(14),
    marginBottom: responsiveSpacing(8),
  },
  cryptoPrice: {
    fontSize: responsiveFontSize(isSmallScreen() ? 14 : 16),
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: responsiveSpacing(4),
  },
  cryptoPriceTablet: {
    fontSize: responsiveFontSize(22),
    marginBottom: responsiveSpacing(8),
    fontWeight: '700',
  },
  cryptoChange: {
    fontSize: responsiveFontSize(isSmallScreen() ? 10 : 12),
    fontWeight: '500',
  },
  cryptoChangeTablet: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: responsiveSpacing(10),
  },
  updateInfoTablet: {
    marginTop: responsiveSpacing(16),
  },
  updateText: {
    fontSize: responsiveFontSize(isSmallScreen() ? 10 : 12),
    color: '#888',
    marginLeft: responsiveSpacing(4),
  },
  updateTextTablet: {
    fontSize: responsiveFontSize(13),
    marginLeft: responsiveSpacing(6),
  },
});