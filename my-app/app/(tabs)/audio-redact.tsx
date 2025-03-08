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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
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
import * as Sharing from 'expo-sharing';

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

export default function CensorAudioScreen() {
  const [selectedAudio, setSelectedAudio] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [censoredAudioUri, setCensoredAudioUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [isLoadingEntities, setIsLoadingEntities] = useState<boolean>(true);

  const buttonScale = useSharedValue(1);
  const audioPlayerOpacity = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(buttonScale.value) }],
  }));

  const audioPlayerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(audioPlayerOpacity.value),
  }));

  useEffect(() => {
    fetchDefaultEntities();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const fetchDefaultEntities = async () => {
    try {
      setIsLoadingEntities(true);
      const response: AxiosResponse<PreferredEntitiesResponse> = await axios.get(`${LOG_API_URL}/get-preferred-entities?tab=censor-audio`);
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
      const response: AxiosResponse<PreferredEntitiesResponse> = await axios.get(`${LOG_API_URL}/get-preferred-entities?tab=censor-audio`);
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

  const pickAudio = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        setSelectedAudio(result.assets[0]);
        setRecordedAudioUri(null);
        setCensoredAudioUri(null);
        audioPlayerOpacity.value = 1;
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const startRecording = async (): Promise<void> => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your microphone');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording.recording);
      Alert.alert('Recording Started', 'Tap "Stop Recording" when finished');
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async (): Promise<void> => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (uri) {
        setRecordedAudioUri(uri);
        setSelectedAudio(null);
        setCensoredAudioUri(null);
        audioPlayerOpacity.value = 1;
      }

      setRecording(null);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const playAudio = async (uri: string): Promise<void> => {
    if (isPlaying) {
      if (sound) {
        await sound.stopAsync();
        setIsPlaying(false);
      }
      return;
    }

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  };

  const shareAudio = async (uri: string): Promise<void> => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing not available', 'Sharing is not available on this device');
      return;
    }

    try {
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error sharing audio:', error);
      Alert.alert('Error', 'Failed to share audio');
    }
  };

  const censorAudio = async (): Promise<void> => {
    const audioUri = selectedAudio?.uri || recordedAudioUri;
    if (!audioUri) {
      Alert.alert('Error', 'Please select or record an audio file first');
      return;
    }
    if (selectedEntities.size === 0) {
      Alert.alert('Error', 'Please select at least one entity type to censor');
      return;
    }

    setLoading(true);
    const logFormData = new FormData();
    logFormData.append('file', {
      uri: audioUri,
      type: 'audio/mpeg',
      name: selectedAudio?.name || 'recording.mp3',
    } as any);
    logFormData.append('tab_name', 'censor-audio');
    logFormData.append('selected_entities', JSON.stringify(Array.from(selectedEntities)));

    try {
      await axios.post(`${LOG_API_URL}/log-usage`, logFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      console.error('Error logging usage:', error);
    }

    const censorFormData = new FormData();
    censorFormData.append('file', {
      uri: audioUri,
      type: 'audio/mpeg',
      name: selectedAudio?.name || 'recording.mp3',
    } as any);
    censorFormData.append('entities', JSON.stringify(Array.from(selectedEntities)));

    try {
      const response = await axios.post(`${API_BASE_URL}/censor-audio`, censorFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const blob = response.data as Blob;
      
      // Create a temporary file path for the censored audio
      const tempFilePath = `${FileSystem.cacheDirectory}censored_audio_${Date.now()}.mp3`;
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64data = reader.result?.toString().split(',')[1];
        if (base64data) {
          // Write the file
          await FileSystem.writeAsStringAsync(tempFilePath, base64data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          setCensoredAudioUri(tempFilePath);
          audioPlayerOpacity.value = 1;
        }
      };
      reader.readAsDataURL(blob);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to censor audio: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderEntityItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.entityOption}
      onPress={() => toggleEntitySelection(item)}
      disabled={loading || isLoadingEntities}
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
      <Text style={styles.entitySelectorTitle}>Select Entities to Censor:</Text>
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
            extraData={selectedEntities}
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

  const renderAudioPlayer = (uri: string, label: string) => (
    <Animated.View entering={FadeIn.duration(600)} style={styles.audioPlayerContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.audioControls}>
        <TouchableOpacity
          onPressIn={() => (buttonScale.value = 0.95)}
          onPressOut={() => (buttonScale.value = 1)}
          onPress={() => playAudio(uri)}
        >
          <Animated.View style={[styles.controlButton, buttonAnimatedStyle]}>
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={24} 
              color="#fff" 
            />
          </Animated.View>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPressIn={() => (buttonScale.value = 0.95)}
          onPressOut={() => (buttonScale.value = 1)}
          onPress={() => shareAudio(uri)}
        >
          <Animated.View style={[styles.controlButton, buttonAnimatedStyle, styles.shareButton]}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <LinearGradient colors={['#f7f9fc', '#e8ecef']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        <Animated.View entering={FadeInUp.duration(600)}>
          <Text style={styles.title}>Audio Censoring Studio</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.infoBox}>
          <Text style={styles.infoText}>
            Welcome to Audio Censoring Studio! Select entity types to censor (use Autosuggest for preferences), then pick an audio file or record audio. Tap "Censor Audio" to replace sensitive information with beeps.
          </Text>
        </Animated.View>

        {renderEntitySelector()}

        <Animated.View entering={FadeInDown.duration(600).delay(600)} style={styles.buttonContainer}>
          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={pickAudio}
          >
            <Animated.View style={[styles.customButton, buttonAnimatedStyle]}>
              <Ionicons name="document-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Pick Audio File</Text>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={recording ? stopRecording : startRecording}
          >
            <Animated.View style={[styles.customButton, buttonAnimatedStyle, recording ? styles.stopRecordingButton : styles.recordButton]}>
              <Ionicons name={recording ? "stop" : "mic-outline"} size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>{recording ? "Stop Recording" : "Record Audio"}</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {selectedAudio && (
          <Animated.View style={[styles.audioFileInfo, audioPlayerAnimatedStyle]}>
            <Text style={styles.label}>Selected Audio:</Text>
            <Text style={styles.audioFilename}>{selectedAudio.name}</Text>
            {renderAudioPlayer(selectedAudio.uri, "Original Audio")}
          </Animated.View>
        )}

        {recordedAudioUri && (
          <Animated.View style={[styles.audioFileInfo, audioPlayerAnimatedStyle]}>
            <Text style={styles.label}>Recorded Audio:</Text>
            {renderAudioPlayer(recordedAudioUri, "Original Recording")}
          </Animated.View>
        )}

        {(selectedAudio || recordedAudioUri) && (
          <TouchableOpacity
            onPressIn={() => (buttonScale.value = 0.95)}
            onPressOut={() => (buttonScale.value = 1)}
            onPress={censorAudio}
            disabled={loading}
          >
            <Animated.View style={[styles.censorButton, buttonAnimatedStyle]}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Censor Audio</Text>
            </Animated.View>
          </TouchableOpacity>
        )}

        {loading && (
          <Animated.View entering={FadeIn.duration(300)}>
            <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
          </Animated.View>
        )}

        {censoredAudioUri && (
          <Animated.View entering={FadeIn.duration(600)} style={styles.audioPlayerContainer}>
            <Text style={styles.label}>Censored Audio</Text>
            {renderAudioPlayer(censoredAudioUri, "Censored Audio")}
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
  recordButton: {
    backgroundColor: '#E53E3E',
  },
  stopRecordingButton: {
    backgroundColor: '#9C4221',
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
  audioFileInfo: {
    marginVertical: 15,
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
  audioFilename: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 10,
    fontStyle: 'italic' as 'italic',
  },
  audioPlayerContainer: {
    marginVertical: 15,
    alignItems: 'center' as 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  label: {
    fontSize: 18,
    fontWeight: '600' as '600',
    color: '#4A5568',
    marginBottom: 12,
  },
  audioControls: {
    flexDirection: 'row' as 'row',
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
    width: '100%',
    marginTop: 10,
  },
  controlButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  shareButton: {
    backgroundColor: '#38B2AC',
  },
  censorButton: {
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