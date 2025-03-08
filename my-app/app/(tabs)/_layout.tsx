import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0000ff',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="redact-image"
        options={{
          title: 'Redact Image',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="image" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="redact-pdf"
        options={{
          title: 'Redact PDF',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="audio-redact"
        options={{
          title: 'Redact Audio',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="musical-notes" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: 'Analyze Text',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analyze-pdf"
        options={{
          title: 'Analyze PDF',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}