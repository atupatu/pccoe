import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import axios, { AxiosResponse } from 'axios';
import Animated, {
  FadeIn,
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

const ALL_ENTITIES = [
  'PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD', 'CRYPTO',
  'DOMAIN_NAME', 'IP_ADDRESS', 'DATE_TIME', 'NRP', 'LOCATION',
  'MEDICAL_LICENSE', 'URL', 'ORGANIZATION',
];

interface PreferredEntitiesResponse {
  preferred_entities: string[];
}

export default function RedactImageScreen() {
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [redactedImage, setRedactedImage] = useState<{ uri: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [isLoadingEntities, setIsLoadingEntities] = useState<boolean>(true);

  const buttonScale = useSharedValue(1);
  const imageOpacity = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(buttonScale.value) }],
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(imageOpacity.value),
  }));

  useEffect(() => {
    fetchDefaultEntities();
  }, []);

  const fetchDefaultEntities = async () => {
    try {
      setIsLoadingEntities(true);
      const response: AxiosResponse<PreferredEntitiesResponse> = await axios.get(`${LOG_API_URL}/get-preferred-entities?tab=redact-image`);
      const preferredEntities = new Set<string>(response.data.preferred_entities);
      setSelectedEntities(preferredEntities.size > 0 ? preferredEntities : new Set(ALL_ENTITIES));
    } catch (error) {
      console.error('Error fetching preferred entities:', error);
      setSelectedEntities(new Set(ALL_ENTITIES));
    } finally {
      setIsLoadingEntities(false);
    }
  };

  const autosuggestEntities = async () => {
    try {
      setLoading(true);
      const response: AxiosResponse<PreferredEntitiesResponse> = await axios.get(`${LOG_API_URL}/get-preferred-entities?tab=redact-image`);
      const preferredEntities = new Set<string>(response.data.preferred_entities);
      setSelectedEntities(preferredEntities.size > 0 ? preferredEntities : new Set(ALL_ENTITIES));
    } catch (error) {
      console.error('Error autosuggesting entities:', error);
      Alert.alert('Error', 'Failed to fetch autosuggested entities');
    } finally {
      setLoading(false);
    }
  };

  const toggleEntitySelection = (entity: string) => {
    const newSelected = new Set(selectedEntities);
    if (newSelected.has(entity)) {
      newSelected.delete(entity);
    } else {
      newSelected.add(entity);
    }
    setSelectedEntities(newSelected);
  };

  const pickImage = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setSelectedImage(result.assets[0]);
      setRedactedImage(null);
      imageOpacity.value = 1;
    }
  };

  const takePhoto = async (): Promise<void> => {
    const cameraPermission = await Camera.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setSelectedImage(result.assets[0]);
      setRedactedImage(null);
      imageOpacity.value = 1;
    }
  };

  const redactImage = async (): Promise<void> => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }
    if (selectedEntities.size === 0) {
      Alert.alert('Error', 'Please select at least one entity type to redact');
      return;
    }

    setLoading(true);
    const logFormData = new FormData();
    logFormData.append('file', {
      uri: selectedImage.uri,
      type: 'image/jpeg',
      name: selectedImage.fileName || 'image.jpg',
    } as any);
    logFormData.append('tab_name', 'redact-image');
    logFormData.append('selected_entities', JSON.stringify(Array.from(selectedEntities)));

    try {
      await axios.post(`${LOG_API_URL}/log-usage`, logFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      console.error('Error logging usage:', error);
    }

    const redactFormData = new FormData();
    redactFormData.append('file', {
      uri: selectedImage.uri,
      type: 'image/jpeg',
      name: selectedImage.fileName || 'image.jpg',
    } as any);
    redactFormData.append('language', 'en');
    redactFormData.append('entities', JSON.stringify(Array.from(selectedEntities)));

    try {
      const response = await axios.post(`${API_BASE_URL}/redact-image`, redactFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const blob = response.data as Blob;
      const reader = new FileReader();
      reader.onload = () => {
        setRedactedImage({ uri: reader.result as string });
        imageOpacity.value = 1;
      };
      reader.readAsDataURL(blob);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to redact image: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderEntityItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.entityOption}
      onPress={() => toggleEntitySelection(item)}
      disabled={loading || isLoadingEntities} // Disable while loading
    >
      <View
        style={[
          styles.checkbox,
          selectedEntities.has(item) && styles.checkboxSelected,
        ]}
      >
        {selectedEntities.has(item) && (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
      </View>
      <Text style={styles.entityOptionText}>{item}</Text>
    </TouchableOpacity>
  );

  const renderEntitySelector = () => (
    <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.entitySelector}>
      <Text style={styles.entitySelectorTitle}>Select Entities to Redact:</Text>
      {isLoadingEntities ? (
        <ActivityIndicator size="small" color="#4A90E2" />
      ) : (
        <>
          <FlatList
            data={ALL_ENTITIES}
            renderItem={renderEntityItem}
            keyExtractor={(item) => item}
            style={styles.entityList}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            extraData={selectedEntities} // Ensure re-render on selection change
          />
          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={autosuggestEntities}
            disabled={loading || isLoadingEntities}
          >
            <Animated.View style={[styles.autosuggestButton, buttonAnimatedStyle]}>
              <Ionicons name="bulb-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Autosuggest</Text>
            </Animated.View>
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  );

  return (
    <LinearGradient colors={['#f7f9fc', '#e8ecef']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        <Animated.View entering={FadeInUp.duration(600)}>
          <Text style={styles.title}>Image Redaction Studio</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.infoBox}>
          <Text style={styles.infoText}>
            Welcome to Image Redaction Studio! Select entity types to redact (use Autosuggest for preferences), then pick an image or take a photo. Tap "Redact Image" to hide the selected details.
          </Text>
        </Animated.View>

        {renderEntitySelector()}

        <Animated.View entering={FadeInDown.duration(600).delay(600)} style={styles.buttonContainer}>
          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={pickImage}
          >
            <Animated.View style={[styles.customButton, buttonAnimatedStyle]}>
              <Ionicons name="image-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Pick from Gallery</Text>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={takePhoto}
          >
            <Animated.View style={[styles.customButton, buttonAnimatedStyle, styles.cameraButton]}>
              <Ionicons name="camera-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Capture Photo</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {selectedImage && (
          <Animated.View entering={FadeIn.duration(600)} style={styles.imageContainer}>
            <Text style={styles.label}>Original Image</Text>
            <Animated.Image
              source={{ uri: selectedImage.uri }}
              style={[styles.image, imageAnimatedStyle]}
            />
          </Animated.View>
        )}

        {selectedImage && (
          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={redactImage}
            disabled={loading}
          >
            <Animated.View style={[styles.redactButton, buttonAnimatedStyle]}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Redact Image</Text>
            </Animated.View>
          </TouchableOpacity>
        )}

        {loading && (
          <Animated.View entering={FadeIn.duration(300)}>
            <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
          </Animated.View>
        )}

        {redactedImage && (
          <Animated.View entering={FadeIn.duration(600)} style={styles.imageContainer}>
            <Text style={styles.label}>Redacted Image</Text>
            <Animated.Image
              source={{ uri: redactedImage.uri }}
              style={[styles.image, imageAnimatedStyle]}
            />
          </Animated.View>
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
    fontWeight: '700' as '700',
    color: '#2D3748',
    textAlign: 'center' as 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
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
    maxHeight: 200,
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
  buttonContainer: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-around' as 'space-around',
    marginBottom: 30,
  },
  customButton: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
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
  cameraButton: {
    backgroundColor: '#2D3748',
  },
  autosuggestButton: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    justifyContent: 'center' as 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 15,
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
  imageContainer: {
    marginVertical: 20,
    alignItems: 'center' as 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 18,
    fontWeight: '600' as '600',
    color: '#4A5568',
    marginBottom: 12,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 12,
    resizeMode: 'contain' as 'contain',
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
  loader: {
    marginVertical: 20,
  },
});