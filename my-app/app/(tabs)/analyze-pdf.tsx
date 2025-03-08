import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import axios, { AxiosError } from 'axios';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://192.168.137.244:3000/analyze-pdf';
const REDACT_API_URL = 'http://192.168.137.244:3000/redact-pdf';
const LOG_API_URL = 'http://10.90.5.223:5000';

interface PIIEntity {
  entity_type: string;
  text_snippet: string;
  score: number;
  start: number;
  end: number;
}

const ALL_ENTITIES = [
  'PERSON', 'LOCATION', 'PHONE_NUMBER', 'EMAIL_ADDRESS', 'CREDIT_CARD',
  'ID', 'CRYPTO', 'DOMAIN_NAME', 'IP_ADDRESS', 'DATE_TIME', 'NRP',
  'MEDICAL_LICENSE', 'URL', 'ORGANIZATION'
];

const AnalyzePDFTab: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<PIIEntity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set(ALL_ENTITIES));
  const [selectedDocument, setSelectedDocument] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [redactEntities, setRedactEntities] = useState<Set<number>>(new Set());

  const buttonScale = useSharedValue(1);
  const cardOpacity = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(buttonScale.value) }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(cardOpacity.value),
  }));

  const toggleEntitySelection = (entity: string) => {
    const newSelected = new Set(selectedEntities);
    if (newSelected.has(entity)) {
      newSelected.delete(entity);
    } else {
      newSelected.add(entity);
    }
    setSelectedEntities(newSelected);
  };

  const pickDocument = async () => {
    if (selectedEntities.size === 0) {
      setError('Please select at least one entity type to analyze');
      return;
    }

    try {
      setLoading(true);
      setResults(null);
      setError(null);
      setRedactEntities(new Set());

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const document = result.assets[0];
      setSelectedDocument(document);

      const formData = new FormData();
      formData.append('file', {
        uri: document.uri,
        type: 'application/pdf',
        name: document.name || 'document.pdf',
      } as any);
      formData.append('language', 'en');
      formData.append('entities', JSON.stringify(Array.from(selectedEntities)));

      const response = await axios.post<PIIEntity[]>(API_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults(response.data);
      cardOpacity.value = 1;

      // Logging code remains the same...
      const logFormData = new FormData();
      logFormData.append('file', {
        uri: document.uri,
        type: 'application/pdf',
        name: document.name || 'document.pdf',
      } as any);
      logFormData.append('tab_name', 'analyze-pdf');
      logFormData.append('entities', JSON.stringify(response.data));

      try {
        const logResponse = await axios.post(`${LOG_API_URL}/log-usage`, logFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log('Log response:', logResponse.data);
      } catch (logError) {
        console.error('Error logging usage:', logError);
      }
    } catch (err) {
      console.error('Error analyzing PDF:', err);
      const axiosError = err as AxiosError<{ error?: string }>;
      setError(axiosError.response?.data?.error || 'Failed to analyze PDF.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRedactEntity = (index: number) => {
    const newSelected = new Set(redactEntities);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setRedactEntities(newSelected);
  };

  const redactSelected = async () => {
    // Redact function remains largely the same, just use redactEntities instead
    if (!selectedDocument || !results || redactEntities.size === 0) {
      setError('Please select a document and at least one entity to redact');
      return;
    }

    setLoading(true);
    try {
      const selectedEntityTypes = Array.from(redactEntities)
        .map(index => results[index].entity_type)
        .filter((v, i, a) => a.indexOf(v) === i);

      const formData = new FormData();
      formData.append('file', {
        uri: selectedDocument.uri,
        type: 'application/pdf',
        name: selectedDocument.name || 'document.pdf',
      } as any);
      formData.append('language', 'en');
      formData.append('entities', JSON.stringify(selectedEntityTypes));
      formData.append('redaction_style', 'blackbox');
      formData.append('score_threshold', '0.4');

      const response = await axios.post(REDACT_API_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const blob = response.data as Blob;
      const fileName = `redacted_${selectedDocument.name}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64data = (reader.result as string).split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Open Redacted PDF',
          });
        } else {
          setError(`PDF saved to ${fileUri}`);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error redacting PDF:', err);
      setError('Failed to redact PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const renderEntitySelector = () => (
    <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.entitySelector}>
      <Text style={styles.entitySelectorTitle}>Select Entities to Detect:</Text>
      <ScrollView style={styles.entityList}>
        {ALL_ENTITIES.map((entity, index) => (
          <TouchableOpacity
            key={entity}
            style={styles.entityOption}
            onPress={() => toggleEntitySelection(entity)}
          >
            <View
              style={[
                styles.checkbox,
                selectedEntities.has(entity) && styles.checkboxSelected,
              ]}
            >
              {selectedEntities.has(entity) && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <Text style={styles.entityOptionText}>{entity}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  const renderResults = () => {
    if (!results) return null;

    return (
      <Animated.View entering={FadeIn.duration(600)} style={styles.resultsWrapper}>
        <Text style={styles.resultsTitle}>Found PII Entities:</Text>
        {results.length === 0 ? (
          <Text style={styles.noResults}>No redactable elements found</Text>
        ) : (
          <ScrollView 
            style={styles.resultsContainer}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {results.map((entity, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.duration(400).delay(index * 100)}
                style={[styles.entityItem, cardAnimatedStyle]}
              >
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    redactEntities.has(index) && styles.checkboxSelected,
                  ]}
                  onPress={() => toggleRedactEntity(index)}
                >
                  {redactEntities.has(index) && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
                <View style={styles.entityDetails}>
                  <Text style={styles.entityText}>
                    <Text style={styles.entityLabel}>Type: </Text>{entity.entity_type}
                  </Text>
                  <Text style={styles.entityText}>
                    <Text style={styles.entityLabel}>Text: </Text>{entity.text_snippet}
                  </Text>
                  <Text style={styles.entityText}>
                    <Text style={styles.entityLabel}>Score: </Text>{entity.score.toFixed(2)}
                  </Text>
                  <Text style={styles.entityText}>
                    <Text style={styles.entityLabel}>Position: </Text>{entity.start}-{entity.end}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        )}
        {results.length > 0 && (
          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={redactSelected}
            disabled={loading || redactEntities.size === 0}
          >
            <Animated.View style={[styles.redactButton, buttonAnimatedStyle]}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Redact Selected</Text>
            </Animated.View>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={['#f7f9fc', '#e8ecef']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        <Animated.View entering={FadeInUp.duration(600)}>
          <Text style={styles.title}>PDF Analysis Studio</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.infoBox}>
          <Text style={styles.infoText}>
            Welcome to PDF Analysis Studio! Select the types of sensitive information you want to detect, then upload a PDF to analyze. After detection, select items to redact and generate a new PDF with hidden details.
          </Text>
        </Animated.View>

        {renderEntitySelector()}

        <Animated.View entering={FadeInDown.duration(600).delay(600)}>
          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={pickDocument}
            disabled={loading}
          >
            <Animated.View style={[styles.uploadButton, buttonAnimatedStyle]}>
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Upload PDF to Analyze</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {loading && (
          <Animated.View entering={FadeIn.duration(300)}>
            <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
          </Animated.View>
        )}

        {error && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        {renderResults()}
      </ScrollView>
    </LinearGradient>
  );
};

// Updated styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as '700',
    color: '#2D3748',
    textAlign: 'center' as 'center',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center' as 'center',
    lineHeight: 22,
  },
  entitySelector: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entitySelectorTitle: {
    fontSize: 18,
    fontWeight: '600' as '600',
    color: '#2D3748',
    marginBottom: 10,
  },
  entityList: {
    maxHeight: 200,  // Added max height for scrolling
  },
  entityOption: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    paddingVertical: 8,
  },
  entityOptionText: {
    fontSize: 16,
    color: '#4A5568',
    marginLeft: 10,
  },
  uploadButton: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    justifyContent: 'center' as 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 16,
    textAlign: 'center' as 'center',
    marginVertical: 20,
    backgroundColor: '#FFF5F5',
    padding: 10,
    borderRadius: 8,
  },
  resultsWrapper: {
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600' as '600',
    color: '#4A5568',
    marginBottom: 15,
  },
  resultsContainer: {
    maxHeight: 300,  // Reduced height to ensure visibility within screen
    marginBottom: 20,
  },
  entityItem: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  entityDetails: {
    marginLeft: 15,
    flex: 1,
  },
  entityText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 5,
  },
  entityLabel: {
    fontWeight: '600' as '600',
    color: '#2D3748',
  },
  noResults: {
    fontStyle: 'italic',
    color: '#718096',
    textAlign: 'center' as 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 6,
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  redactButton: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    justifyContent: 'center' as 'center',
    backgroundColor: '#48BB78',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default AnalyzePDFTab;