import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://192.168.137.244:3000';
const LOG_API_URL = 'http://10.90.5.223:5000';

interface ProcessedFile {
  original_name: string;
  output: string;
  status: 'success' | 'error';
  error?: string;
}

export default function BatchRedactPdfScreen() {
  const [selectedPdfs, setSelectedPdfs] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const buttonScale = useSharedValue<number>(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(buttonScale.value) }],
  }));

  const pickPdfs = async (): Promise<void> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setSelectedPdfs(result.assets);
    }
  };

  const clearSelection = (): void => {
    setSelectedPdfs([]);
    setProcessedFiles([]);
  };

  const logUsage = async (file: DocumentPicker.DocumentPickerAsset): Promise<void> => {
    const logFormData = new FormData();
    logFormData.append('file', {
      uri: file.uri,
      type: 'application/pdf',
      name: file.name || 'document.pdf',
    } as any);
    logFormData.append('tab_name', 'batch-redact-pdf');

    try {
      await axios.post(`${LOG_API_URL}/log-usage`, logFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      console.error('Error logging usage:', error);
    }
  };

  const batchRedactPdfs = async (): Promise<void> => {
    if (selectedPdfs.length === 0) {
      Alert.alert('Error', 'Please select at least one PDF');
      return;
    }

    setLoading(true);
    const batchFormData = new FormData();

    selectedPdfs.forEach((pdf, index) => {
      batchFormData.append(`files[]`, {
        uri: pdf.uri,
        type: 'application/pdf',
        name: pdf.name || `document_${index}.pdf`,
      } as any);
    });

    batchFormData.append('language', 'en');
    batchFormData.append('entities', JSON.stringify([
      'PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD', 'CRYPTO',
      'DOMAIN_NAME', 'IP_ADDRESS', 'DATE_TIME', 'NRP', 'LOCATION',
      'MEDICAL_LICENSE', 'URL', 'ORGANIZATION',
    ]));
    batchFormData.append('redaction_style', 'blackbox');

    try {
      for (const pdf of selectedPdfs) {
        await logUsage(pdf);
      }

      const response = await axios.post<{ batch_id: string; total_files: number; processed_files: ProcessedFile[] }>(
        `${API_BASE_URL}/batch-redact-pdf`,
        batchFormData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      const { batch_id, total_files, processed_files } = response.data;
      setProcessedFiles(processed_files); // Update only after full batch is processed

      Alert.alert(
        'Batch Processing Complete',
        `Processed ${total_files} files with batch ID: ${batch_id}`,
        [{ text: 'OK' }],
      );
    } catch (error: any) {
      console.error('Error batch redacting PDFs:', error);
      Alert.alert('Error', 'Failed to redact PDFs: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const downloadRedactedFile = async (outputPath: string, originalName: string): Promise<void> => {
    try {
      setLoading(true);
      const fileUri = await FileSystem.downloadAsync(
        `${API_BASE_URL}/download-redacted/${outputPath}`,
        `${FileSystem.documentDirectory}redacted_${originalName}`
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Open redacted_${originalName}`,
        });
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const renderPdfItem = ({ item, index }: { item: DocumentPicker.DocumentPickerAsset; index: number }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100)} style={styles.pdfItem}>
      <Ionicons name="document-outline" size={24} color="#4A5568" style={styles.pdfIcon} />
      <View style={styles.pdfInfo}>
        <Text style={styles.pdfName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.smallText}>
          {item.size ? Math.round(item.size / 1024) : 'Unknown'} {item.size ? 'KB' : 'size'}
        </Text>
      </View>
    </Animated.View>
  );

  const renderProcessedFileItem = ({ item, index }: { item: ProcessedFile; index: number }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100)} style={styles.processedFileItem}>
      <Ionicons
        name={item.status === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={24}
        color={item.status === 'success' ? '#48BB78' : '#E53E3E'}
        style={styles.pdfIcon}
      />
      <View style={styles.pdfInfo}>
        <Text style={styles.pdfName} numberOfLines={1}>Original: {item.original_name}</Text>
        <Text style={styles.smallText} numberOfLines={1}>
          {item.status === 'success' ? `Output: ${item.output}` : `Error: ${item.error || 'Unknown'}`}
        </Text>
      </View>
      {item.status === 'success' && (
        <TouchableOpacity
          onPressIn={() => (buttonScale.value = 0.95)}
          onPressOut={() => (buttonScale.value = 1)}
          onPress={() => downloadRedactedFile(item.output, item.original_name)}
        >
          <Animated.View style={[styles.downloadButton, buttonAnimatedStyle]}>
            <Ionicons name="download-outline" size={16} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <LinearGradient colors={['#f7f9fc', '#e8ecef']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp.duration(600)}>
          <Text style={styles.title}>Batch PDF Redaction</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.buttonContainer}>
          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={pickPdfs}
            disabled={loading}
          >
            <Animated.View style={[styles.customButton, buttonAnimatedStyle]}>
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Select PDFs</Text>
            </Animated.View>
          </TouchableOpacity>

          {selectedPdfs.length > 0 && (
            <TouchableOpacity
              onPressIn={() => (buttonScale.value = 0.95)}
              onPressOut={() => (buttonScale.value = 1)}
              onPress={clearSelection}
              disabled={loading}
            >
              <Animated.View style={[styles.clearButton, buttonAnimatedStyle]}>
                <Ionicons name="trash-outline" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Clear Selection</Text>
              </Animated.View>
            </TouchableOpacity>
          )}
        </Animated.View>

        {selectedPdfs.length > 0 && (
          <View style={styles.selectedFilesContainer}>
            <Text style={styles.label}>Selected Files: {selectedPdfs.length}</Text>
            <FlatList
              data={selectedPdfs}
              renderItem={renderPdfItem}
              keyExtractor={(_, index) => `pdf-${index}`}
              style={styles.pdfList}
            />
            <TouchableOpacity
              onPressIn={() => (buttonScale.value = 0.95)}
              onPressOut={() => (buttonScale.value = 1)}
              onPress={batchRedactPdfs}
              disabled={loading}
            >
              <Animated.View style={[styles.redactButton, buttonAnimatedStyle]}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Redact {selectedPdfs.length} PDFs</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
            <Text style={styles.progressText}>Processing batch request...</Text>
          </Animated.View>
        )}

        {processedFiles.length > 0 && (
          <View style={styles.processedFilesContainer}>
            <Text style={styles.label}>Processed Files:</Text>
            <FlatList
              data={processedFiles}
              renderItem={renderProcessedFileItem}
              keyExtractor={(_, index) => `processed-${index}`}
              style={styles.processedFilesList}
            />
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

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
    fontWeight: '700' as const,
    color: '#2D3748',
    textAlign: 'center' as const,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: 30,
  },
  customButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  clearButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#E53E3E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  redactButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  selectedFilesContainer: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  pdfList: {
    maxHeight: 200,
  },
  pdfItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pdfIcon: {
    marginRight: 10,
  },
  pdfInfo: {
    flex: 1,
  },
  pdfName: {
    fontSize: 16,
    color: '#2D3748',
    marginBottom: 5,
  },
  smallText: {
    fontSize: 12,
    color: '#718096',
  },
  processedFilesContainer: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  processedFilesList: {
    maxHeight: 250,
  },
  processedFileItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  downloadButton: {
    backgroundColor: '#4A90E2',
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#4A5568',
    marginBottom: 15,
    textAlign: 'center' as const,
  },
  loader: {
    marginVertical: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 10,
    textAlign: 'center' as const,
  },
});