import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useFirebase } from '../context/FirebaseContext';

export default function CameraScreen() {
  const { colors, isDark } = useThemeColors();
  const { deviceId } = useFirebase();
  const cameraUrl = null; // Decoupled from Firestore; to be connected to WebSockets in the future

  if (!deviceId) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="router-wireless-off" size={48} color={colors.textSecondary} />
        <Text style={[styles.noImageText, { color: colors.textSecondary, marginTop: 12, textAlign: 'center' }]}>
          Please connect a device to view camera.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Live Camera</Text>
        <View style={[
          styles.liveBadge, 
          { backgroundColor: cameraUrl ? 'rgba(255, 69, 58, 0.15)' : 'rgba(142, 142, 147, 0.15)' }
        ]}>
          <View style={[styles.liveDot, { backgroundColor: cameraUrl ? colors.danger : colors.textSecondary }]} />
          <Text style={[styles.liveText, { color: cameraUrl ? colors.danger : colors.textSecondary }]}>
            {cameraUrl ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <View style={[
        styles.cameraContainer, 
        { 
          backgroundColor: colors.cardBackground, 
          borderColor: colors.cardBorder, 
          borderWidth: cameraUrl ? 0 : 1 
        }
      ]}>
        {cameraUrl ? (
          <Image 
            source={{ uri: cameraUrl }}
            style={styles.feedImage}
          />
        ) : (
          <View style={styles.noImageContainer}>
            <MaterialCommunityIcons name="camera-off" size={40} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={[styles.noImageText, { color: colors.textSecondary }]}>No Image Available</Text>
          </View>
        )}
      </View>

      <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={[styles.controlsContainer, { borderColor: colors.cardBorder }]}>
        <TouchableOpacity style={styles.controlButton} disabled={!cameraUrl}>
          <MaterialCommunityIcons name="camera" size={28} color={cameraUrl ? colors.textPrimary : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            styles.captureButton, 
            { borderColor: cameraUrl ? colors.textPrimary : colors.textSecondary }
          ]} 
          disabled={!cameraUrl}
        >
          <View style={[styles.captureInner, { backgroundColor: cameraUrl ? colors.textPrimary : colors.textSecondary }]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} disabled={!cameraUrl}>
          <MaterialCommunityIcons name="image-multiple" size={28} color={cameraUrl ? colors.textPrimary : colors.textSecondary} />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SIZES.padding },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  liveText: { fontSize: 13, fontWeight: '700' },
  cameraContainer: {
    flex: 1, width: '100%', borderRadius: SIZES.radius, overflow: 'hidden', marginBottom: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  feedImage: { width: '100%', height: '100%' },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noImageText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  controlsContainer: {
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingVertical: 20, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1,
  },
  controlButton: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  captureButton: { width: 72, height: 72, borderRadius: 36, borderWidth: 4 },
  captureInner: { width: 54, height: 54, borderRadius: 27 },
});
