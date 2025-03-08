import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Platform } from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

// Note: You'll need to install:
// npm install @expo/vector-icons react-native-svg

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const renderPIIDiagram = () => (
    <View style={styles.diagramContainer}>
      <Text style={styles.diagramTitle}>What is PII?</Text>
      <View style={styles.diagramContent}>
        <View style={styles.piiCategory}>
          <View style={[styles.piiIcon, { backgroundColor: '#FF6B6B' }]}>
            <MaterialIcons name="person" size={24} color="white" />
          </View>
          <Text style={styles.piiCategoryTitle}>Personal Identifiers</Text>
          <Text style={styles.piiCategoryDesc}>Names, SSN, ID numbers, addresses</Text>
        </View>
        
        <View style={styles.piiCategory}>
          <View style={[styles.piiIcon, { backgroundColor: '#4ECDC4' }]}>
            <MaterialIcons name="location-on" size={24} color="white" />
          </View>
          <Text style={styles.piiCategoryTitle}>Contact Information</Text>
          <Text style={styles.piiCategoryDesc}>Email, phone, physical address</Text>
        </View>
        
        <View style={styles.piiCategory}>
          <View style={[styles.piiIcon, { backgroundColor: '#FFD166' }]}>
            <MaterialIcons name="credit-card" size={24} color="white" />
          </View>
          <Text style={styles.piiCategoryTitle}>Financial Data</Text>
          <Text style={styles.piiCategoryDesc}>Account numbers, credit card data</Text>
        </View>
        
        <View style={styles.piiCategory}>
          <View style={[styles.piiIcon, { backgroundColor: '#6A0572' }]}>
            <MaterialIcons name="healing" size={24} color="white" />
          </View>
          <Text style={styles.piiCategoryTitle}>Health Information</Text>
          <Text style={styles.piiCategoryDesc}>Medical records, insurance IDs</Text>
        </View>
      </View>
    </View>
  );

  const renderImplementationFlow = () => (
    <View style={styles.flowContainer}>
      <Text style={styles.diagramTitle}>PII Implementation Workflow</Text>
      <View style={styles.flowDiagram}>
        {/* Step 1 */}
        <View style={styles.flowStep}>
          <View style={styles.flowIcon}>
            <MaterialIcons name="search" size={24} color="white" />
          </View>
          <View style={styles.flowLine} />
          <Text style={styles.flowStepTitle}>1. Identify</Text>
          <Text style={styles.flowStepDesc}>Scan documents for sensitive data</Text>
        </View>
        
        {/* Step 2 */}
        <View style={styles.flowStep}>
          <View style={[styles.flowIcon, { backgroundColor: '#6772E5' }]}>
            <MaterialIcons name="category" size={24} color="white" />
          </View>
          <View style={styles.flowLine} />
          <Text style={styles.flowStepTitle}>2. Classify</Text>
          <Text style={styles.flowStepDesc}>Categorize different types of PII</Text>
        </View>
        
        {/* Step 3 */}
        <View style={styles.flowStep}>
          <View style={[styles.flowIcon, { backgroundColor: '#FF6B6B' }]}>
            <MaterialIcons name="security" size={24} color="white" />
          </View>
          <View style={styles.flowLine} />
          <Text style={styles.flowStepTitle}>3. Redact</Text>
          <Text style={styles.flowStepDesc}>Mask or remove sensitive information</Text>
        </View>
        
        {/* Step 4 */}
        <View style={styles.flowStep}>
          <View style={[styles.flowIcon, { backgroundColor: '#38ef7d' }]}>
            <MaterialIcons name="check-circle" size={24} color="white" />
          </View>
          <Text style={styles.flowStepTitle}>4. Validate</Text>
          <Text style={styles.flowStepDesc}>Ensure all PII is properly handled</Text>
        </View>
      </View>
    </View>
  );

  const renderSecurityTips = () => (
    <View style={styles.tipsContainer}>
      <Text style={styles.diagramTitle}>PII Best Practices</Text>
      <View style={styles.tipsGrid}>
        <View style={styles.tipCard}>
          <Ionicons name="shield-checkmark" size={24} color="#6772E5" />
          <Text style={styles.tipTitle}>Encrypt Data</Text>
          <Text style={styles.tipDesc}>Always encrypt stored PII using strong algorithms</Text>
        </View>
        
        <View style={styles.tipCard}>
          <MaterialIcons name="verified-user" size={24} color="#6772E5" />
          <Text style={styles.tipTitle}>Access Control</Text>
          <Text style={styles.tipDesc}>Implement strict user permissions</Text>
        </View>
        
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="clipboard-list" size={24} color="#6772E5" />
          <Text style={styles.tipTitle}>Data Minimization</Text>
          <Text style={styles.tipDesc}>Only collect necessary information</Text>
        </View>
        
        <View style={styles.tipCard}>
          <MaterialIcons name="update" size={24} color="#6772E5" />
          <Text style={styles.tipTitle}>Regular Audits</Text>
          <Text style={styles.tipDesc}>Review data handling procedures</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />
      
      {/* Header with gradient background */}
      <View style={styles.header}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#6A0572" />
              <Stop offset="100%" stopColor="#6772E5" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grad)" />
        </Svg>
        <Text style={styles.headerTitle}>Redact</Text>
        <Text style={styles.headerSubtitle}>Secure PII Management Solution</Text>
      </View>
      
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Protect Sensitive Information with Confidence</Text>
          <Text style={styles.heroSubtitle}>
            Redact helps you identify, manage, and secure personally identifiable information across all your documents and images.
          </Text>
          
          <View style={styles.ctaContainer}>
            <Link href="/(tabs)/redact-image" style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Link>
            <Link href="/(tabs)/redact-image" style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Learn More</Text>
            </Link>
          </View>
        </View>
        
        {/* Illustration for PII */}
        <View style={styles.illustrationContainer}>
          <Svg height="180" width={width - 40} viewBox="0 0 400 200">
            <Rect x="50" y="30" width="300" height="140" rx="10" fill="#f5f5f5" />
            <Rect x="70" y="50" width="180" height="20" rx="4" fill="#e0e0e0" />
            <Rect x="70" y="80" width="120" height="20" rx="4" fill="#FF6B6B" />
            <Rect x="200" y="80" width="130" height="20" rx="4" fill="#e0e0e0" />
            <Rect x="70" y="110" width="90" height="20" rx="4" fill="#e0e0e0" />
            <Rect x="170" y="110" width="90" height="20" rx="4" fill="#4ECDC4" />
            <Rect x="270" y="110" width="60" height="20" rx="4" fill="#FFD166" />
            <Circle cx="330" cy="60" r="25" fill="#6772E5" opacity="0.8" />
            <Path d="M320 60 L330 70 L345 55" stroke="white" strokeWidth="3" fill="none" />
          </Svg>
        </View>
        
        {renderPIIDiagram()}
        {renderImplementationFlow()}
        {renderSecurityTips()}
        
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>Ready to secure your sensitive data?</Text>
          <Link href="/(tabs)/redact-image" style={styles.footerButton}>
            <Text style={styles.footerButtonText}>Start Redacting Now</Text>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 20,
  },
  heroSection: {
    padding: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  ctaContainer: {
    flexDirection: 'row',
    marginVertical: 20,
  },
  primaryButton: {
    backgroundColor: '#6772E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  diagramContainer: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  diagramTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  diagramContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  piiCategory: {
    width: '48%',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  piiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  piiCategoryTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  piiCategoryDesc: {
    fontSize: 12,
    color: '#666',
  },
  flowContainer: {
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  flowDiagram: {
    marginTop: 10,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  flowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6A0572',
    marginRight: 15,
  },
  flowLine: {
    position: 'absolute',
    left: 20,
    top: 40,
    width: 2,
    height: 30,
    backgroundColor: '#e0e0e0',
    zIndex: -1,
  },
  flowStepTitle: {
    fontWeight: 'bold',
    width: '30%',
    fontSize: 16,
    color: '#333',
  },
  flowStepDesc: {
    width: '50%',
    fontSize: 14,
    color: '#666',
  },
  tipsContainer: {
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  tipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tipCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tipTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 5,
    color: '#333',
  },
  tipDesc: {
    fontSize: 12,
    color: '#666',
  },
  footerSection: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginHorizontal: 10,
  },
  footerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  footerButton: {
    backgroundColor: '#6A0572',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  footerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});