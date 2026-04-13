import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../state/appStore';
import { settingsAPI } from '../api/apiClient';

export default function MaintenanceScreen() {
  const setMaintenanceMode = useAppStore(s => s.setMaintenanceMode);
  const [checking, setChecking] = React.useState(false);

  const handleRetry = async () => {
    setChecking(true);
    try {
      await settingsAPI.getPublicSettings();
      // If the call succeeds, maintenance is over
      setMaintenanceMode(false);
    } catch {
      // Still in maintenance
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Ionicons name="construct" size={80} color="#fff" />
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 24, textAlign: 'center' }}>
        Under Maintenance
      </Text>
      <Text style={{ fontSize: 16, color: '#fffbeb', marginTop: 12, textAlign: 'center', lineHeight: 24 }}>
        We're improving GroLotto for you. Please check back in a few minutes.
      </Text>
      <Pressable
        onPress={handleRetry}
        disabled={checking}
        style={{
          marginTop: 32,
          backgroundColor: '#fff',
          paddingHorizontal: 32,
          paddingVertical: 14,
          borderRadius: 12,
          opacity: checking ? 0.6 : 1,
        }}
      >
        <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 16 }}>
          {checking ? 'Checking...' : 'Try Again'}
        </Text>
      </Pressable>
    </View>
  );
}
