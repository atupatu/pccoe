import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
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

const API_BASE_URL = 'http://192.168.137.244:3000'; // Replace with your backend URL

export default function AnalyzeScreen() {
  const [text, setText] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);

  // Animation values
  const buttonScale = useSharedValue(1);
  const cardOpacity = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(buttonScale.value) }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(cardOpacity.value),
  }));

  const analyzeText = async (): Promise<void> => {
    if (!text) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/analyze`, {
        text,
        language: 'en',
        entities: ['PERSON', 'PHONE_NUMBER'],
      });
      setResults(response.data);
      cardOpacity.value = 1;
    } catch (error: any) {
      console.error('Error analyzing text:', error);
      Alert.alert('Error', 'Failed to analyze text: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <LinearGradient
      colors={['#f7f9fc', '#e8ecef']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp.duration(600)}>
          <Text style={styles.title}>Text Analysis Studio</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <TextInput
            style={styles.input}
            placeholder="Enter text to analyze"
            value={text}
            onChangeText={setText}
            multiline
            placeholderTextColor="#718096"
          />
        </Animated.View>

        <TouchableOpacity
          onPressIn={() => (buttonScale.value = 0.95)}
          onPressOut={() => (buttonScale.value = 1)}
          onPress={analyzeText}
        >
          <Animated.View style={[styles.analyzeButton, buttonAnimatedStyle]}>
            <Ionicons name="search-outline" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Analyze Text</Text>
          </Animated.View>
        </TouchableOpacity>

        {results.length > 0 && (
          <Animated.View entering={FadeIn.duration(600)} style={styles.results}>
            <Text style={styles.label}>Analysis Results:</Text>
            {results.map((result, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.duration(400).delay(index * 100)}
                style={[styles.resultItem, cardAnimatedStyle]}
              >
                <Ionicons name="information-circle-outline" size={24} color="#4A5568" style={styles.resultIcon} />
                <View style={styles.resultDetails}>
                  <Text style={styles.resultText}>
                    <Text style={styles.resultLabel}>Type: </Text>{result.entity_type}
                  </Text>
                  <Text style={styles.resultText}>
                    <Text style={styles.resultLabel}>Text: </Text>"{result.text_snippet}"
                  </Text>
                  <Text style={styles.resultText}>
                    <Text style={styles.resultLabel}>Score: </Text>{result.score.toFixed(2)}
                  </Text>
                </View>
              </Animated.View>
            ))}
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
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 20,
    minHeight: 150,
    borderRadius: 12,
    fontSize: 16,
    color: '#2D3748',
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  results: {
    marginTop: 20,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  resultIcon: {
    marginRight: 15,
  },
  resultDetails: {
    flex: 1,
  },
  resultText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 5,
  },
  resultLabel: {
    fontWeight: '600',
    color: '#2D3748',
  },
});