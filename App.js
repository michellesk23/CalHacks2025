import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
  NetInfo, // <-- Added for network check, essential for real backend
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =================================================================
// ⚙️ BACKEND / MOCK CONFIGURATION ⚙️
// =================================================================
// 1. Set this to false when your backend is ready.
const USE_MOCK_DATA = true;

// 2. Set your backend URL here.
// Use 'http://10.0.2.2:3000' for Android Emulator 
// or 'http://localhost:3000' for iOS Simulator/Web (if your server runs on port 3000)
// const BASE_URL = 'http://localhost:3000'; 
// const API_ENDPOINT = `${BASE_URL}/api/check-eligibility`; EDIT THIS

// 3. Mock Data Structure (kept for mock mode)
const MOCK_DATA = {
  '049000050103': {
    name: 'Coca-Cola Classic',
    barcode: '049000050103',
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
    eligible: false,
    reason: 'Sugary beverages are not SNAP eligible in Idaho per HB 109',
    alternatives: [
      { name: '100% Apple Juice', emoji: '🧃' },
      { name: 'Sparkling Water', emoji: '💧' },
      { name: 'Whole Milk', emoji: '🥛' }
    ]
  },
  '040000000013': {
    name: 'Snickers Bar',
    barcode: '040000000013',
    image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400',
    eligible: false,
    reason: 'Candy products are not SNAP eligible in Idaho',
    alternatives: [
      { name: 'Nature Valley Granola Bar', emoji: '🥜' },
      { name: 'Mixed Nuts Trail Mix', emoji: '🌰' },
      { name: 'Dried Fruit Snacks', emoji: '🍇' }
    ]
  },
  '123456789012': { 
    name: 'Whole Milk 1 Gallon',
    barcode: '123456789012',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
    eligible: true,
    reason: 'This product is SNAP eligible in your state'
  },
  'default': {
    name: 'Unknown Product',
    barcode: '',
    image: 'https://images.unsplash.com/photo-1542838132-92c75a40b923?w=400',
    eligible: true,
    reason: 'Product information unavailable. Assuming eligible.'
  }
};
// =================================================================


export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [screen, setScreen] = useState('scan');
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queuedScans, setQueuedScans] = useState([]);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    getCameraPermissions();
    loadQueue();
    
    // Setup network status listener for offline handling
    const unsubscribe = NetInfo.addEventListener(state => {
        const isOnline = state.isConnected && state.isInternetReachable !== false;
        setIsConnected(isOnline);
    });

    return () => unsubscribe();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const loadQueue = async () => {
    try {
      const queue = await AsyncStorage.getItem('scanQueue');
      if (queue) {
        setQueuedScans(JSON.parse(queue));
      }
    } catch (e) {
      console.log('Error loading queue:', e);
    }
  };

  const saveToQueue = async (barcode) => {
    try {
      const newQueue = [...queuedScans, { barcode, timestamp: Date.now() }];
      await AsyncStorage.setItem('scanQueue', JSON.stringify(newQueue));
      setQueuedScans(newQueue);
      Alert.alert(
        "Offline",
        "You are offline. Product saved to queue and will be checked later."
      );
    } catch (e) {
      console.log('Error saving to queue:', e);
    }
  };

  const handleError = (message, error) => {
    console.error(message, error);
    Alert.alert("Error", "Could not check eligibility. Please try again.");
    setLoading(false);
  };


  // ------------------------------------------------------------------
  // 🔄 Unified checkProduct function with Backend/Mock switch
  // ------------------------------------------------------------------
  const checkProduct = async (barcode) => {
    setLoading(true);

    if (USE_MOCK_DATA) {
      // 🧪 MOCK DATA PATH (Original logic)
      await new Promise(resolve => setTimeout(resolve, 1000));
      const data = MOCK_DATA[barcode] || MOCK_DATA['default'];
      
      setProductData(data);
      setScreen('result');
      setLoading(false);
      return;
    }

    if (!isConnected) {
      // 💾 OFFLINE PATH
      saveToQueue(barcode);
      setLoading(false);
      return;
    }

    try {
      // 💻 LIVE API PATH
      const response = await fetch(`${API_ENDPOINT}/${barcode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Optional: 'Authorization': 'Bearer YOUR_AUTH_TOKEN',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          Alert.alert("Not Found", `Barcode ${barcode} not found.`);
        } else {
          Alert.alert("Server Error", `Status: ${response.status}.`);
        }
        return; 
      }

      const data = await response.json();
      
      setProductData(data);
      setScreen('result');

    } catch (error) {
      handleError("API call failed. Server offline or unreachable.", error);
    } finally {
      setLoading(false);
    }
  };
  // ------------------------------------------------------------------


  const resetScanner = () => {
    setScanned(false);
    setScreen('scan');
    setProductData(null);
  };

  const openInMaps = (productName) => {
    const query = encodeURIComponent(productName);
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${query}`
      : `geo:0,0?q=${query}`;
    Linking.openURL(url);
  };

  // SCAN SCREEN
  if (screen === 'scan') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.appTitle}>SNAP Scanner</Text>
            <View style={[styles.testBadge, !USE_MOCK_DATA && styles.liveBadge, !isConnected && !USE_MOCK_DATA && styles.offlineBadge]}>
              <Text style={styles.testBadgeText}>
                {USE_MOCK_DATA ? 'MOCK MODE' : isConnected ? 'LIVE MODE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Text style={styles.heroIcon}>🛒</Text>
            </View>
            <Text style={styles.heroTitle}>Test Product Eligibility</Text>
            <Text style={styles.heroSubtitle}>
              Tap any product to see instant SNAP eligibility results
            </Text>
          </View>

          <View style={styles.productsSection}>
            <Text style={styles.sectionTitle}>Sample Products</Text>

            <TouchableOpacity
              style={styles.productCard}
              onPress={() => checkProduct('049000050103')}
              activeOpacity={0.7}
            >
              <View style={styles.productCardContent}>
                <View style={styles.productIconContainer}>
                  <Text style={styles.productIcon}>🥤</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>Coca-Cola Classic</Text>
                  <Text style={styles.productSubtitle}>12 fl oz can • Soft Drink</Text>
                </View>
                <View style={[styles.statusPill, USE_MOCK_DATA ? styles.notEligiblePill : styles.checkPill]}>
                  <Text style={styles.statusPillText}>{USE_MOCK_DATA ? 'Not Eligible' : 'Check →'}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.productCard}
              onPress={() => checkProduct('040000000013')}
              activeOpacity={0.7}
            >
              <View style={styles.productCardContent}>
                <View style={styles.productIconContainer}>
                  <Text style={styles.productIcon}>🍫</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>Snickers Bar</Text>
                  <Text style={styles.productSubtitle}>1.86 oz • Candy</Text>
                </View>
                <View style={[styles.statusPill, USE_MOCK_DATA ? styles.notEligiblePill : styles.checkPill]}>
                  <Text style={styles.statusPillText}>{USE_MOCK_DATA ? 'Not Eligible' : 'Check →'}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.productCard}
              onPress={() => checkProduct('123456789012')}
              activeOpacity={0.7}
            >
              <View style={styles.productCardContent}>
                <View style={styles.productIconContainer}>
                  <Text style={styles.productIcon}>🥛</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>Whole Milk</Text>
                  <Text style={styles.productSubtitle}>1 gallon • Dairy</Text>
                </View>
                <View style={[styles.statusPill, USE_MOCK_DATA ? styles.eligiblePill : styles.checkPill]}>
                  <Text style={styles.statusPillText}>{USE_MOCK_DATA ? 'Eligible' : 'Check →'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {queuedScans.length > 0 && (
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => setScreen('queue')}
            activeOpacity={0.9}
          >
            <Text style={styles.floatingButtonText}>📋 {queuedScans.length}</Text>
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#34A853" />
              <Text style={styles.loadingText}>Checking eligibility...</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // RESULT SCREEN
  if (screen === 'result' && productData) {
    const isEligible = productData.eligible !== false;

    return (
      <View style={styles.container}>
        <View style={[styles.header, styles.resultHeader]}>
          <TouchableOpacity onPress={resetScanner} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Result</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.resultContainer}>
          {productData.image && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: productData.image }}
                style={styles.productImage}
              />
            </View>
          )}

          <View style={styles.resultContent}>
            <Text style={styles.resultProductName}>{productData.name}</Text>
            <Text style={styles.resultBarcode}>UPC: {productData.barcode}</Text>

            <View style={[
              styles.eligibilityCard,
              isEligible ? styles.eligibleCard : styles.notEligibleCard
            ]}>
              <View style={styles.eligibilityHeader}>
                <Text style={styles.eligibilityIcon}>
                  {isEligible ? '✓' : '✗'}
                </Text>
                <Text style={styles.eligibilityStatus}>
                  {isEligible ? 'SNAP Eligible' : 'Not SNAP Eligible'}
                </Text>
              </View>
              {productData.reason && (
                <Text style={styles.eligibilityReason}>{productData.reason}</Text>
              )}
            </View>

            {!isEligible && productData.alternatives && productData.alternatives.length > 0 && (
              <View style={styles.alternativesSection}>
                <Text style={styles.alternativesHeader}>Suggested Alternatives</Text>
                <Text style={styles.alternativesSubheader}>
                  These SNAP-eligible items are available nearby
                </Text>

                {productData.alternatives.map((alt, index) => (
                  <View key={index} style={styles.alternativeCard}>
                    <View style={styles.alternativeLeft}>
                      <Text style={styles.alternativeEmoji}>{alt.emoji}</Text>
                      <Text style={styles.alternativeName}>{alt.name}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.findButton}
                      onPress={() => openInMaps(alt.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.findButtonText}>Find →</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.scanAnotherButton}
              onPress={resetScanner}
              activeOpacity={0.8}
            >
              <Text style={styles.scanAnotherText}>Scan Another Product</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // QUEUE SCREEN
  if (screen === 'queue') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={resetScanner} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Scans</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.queueContainer}>
          <View style={styles.queueHeader}>
            <Text style={styles.queueTitle}>Offline Queue</Text>
            <Text style={styles.queueDescription}>
              These items will be checked when you reconnect to the internet
            </Text>
          </View>

          {queuedScans.map((item, index) => (
            <View key={index} style={styles.queueCard}>
              <View style={styles.queueCardIcon}>
                <Text style={styles.queueIconText}>📦</Text>
              </View>
              <View style={styles.queueCardContent}>
                <Text style={styles.queueBarcode}>UPC: {item.barcode}</Text>
                <Text style={styles.queueTime}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#34A853',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  testBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  liveBadge: {
    backgroundColor: '#1A73E8', // Blue for Live Mode
  },
  offlineBadge: {
    backgroundColor: '#EA4335', // Red for Offline Mode
  },
  testBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    backgroundColor: '#fff',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIcon: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#5f6368',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  productsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5f6368',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  productIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productIcon: {
    fontSize: 32,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 4,
  },
  productSubtitle: {
    fontSize: 13,
    color: '#5f6368',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eligiblePill: {
    backgroundColor: '#e6f4ea',
  },
  notEligiblePill: {
    backgroundColor: '#fce8e6',
  },
  checkPill: { 
    backgroundColor: '#f1f3f4', 
    borderWidth: 1,
    borderColor: '#ccc',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#FF9800',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonText: {
    fontSize: 18,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 160,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
    color: '#202124',
  },
  resultContainer: {
    flex: 1,
  },
  imageContainer: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  productImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  resultContent: {
    padding: 20,
  },
  resultProductName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 8,
  },
  resultBarcode: {
    fontSize: 14,
    color: '#5f6368',
    marginBottom: 24,
  },
  eligibilityCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  eligibleCard: {
    backgroundColor: '#e6f4ea',
  },
  notEligibleCard: {
    backgroundColor: '#fce8e6',
  },
  eligibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eligibilityIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  eligibilityStatus: {
    fontSize: 22,
    fontWeight: '700',
    color: '#202124',
  },
  eligibilityReason: {
    fontSize: 15,
    color: '#5f6368',
    lineHeight: 22,
  },
  alternativesSection: {
    marginBottom: 24,
  },
  alternativesHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 8,
  },
  alternativesSubheader: {
    fontSize: 14,
    color: '#5f6368',
    marginBottom: 20,
  },
  alternativeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alternativeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alternativeEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  alternativeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    flex: 1,
  },
  findButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  findButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scanAnotherButton: {
    backgroundColor: '#34A853',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanAnotherText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  queueContainer: {
    flex: 1,
  },
  queueHeader: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  queueTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 8,
  },
  queueDescription: {
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 20,
  },
  queueCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  queueCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  queueIconText: {
    fontSize: 24,
  },
  queueCardContent: {
    flex: 1,
  },
  queueBarcode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 4,
  },
  queueTime: {
    fontSize: 13,
    color: '#5f6368',
  },
});