import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';

export default function CameraScreen() {
  const { colors, isDark } = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Live Camera</Text>
        <View style={styles.liveBadge}>
          <View style={[styles.liveDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.liveText, { color: colors.danger }]}>LIVE</Text>
        </View>
      </View>

      <View style={[styles.cameraContainer, { backgroundColor: colors.cardBackground }]}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1599598425947-33002629b3ee?auto=format&fit=crop&q=80&w=800' }}
          style={styles.feedImage}
        />
      </View>

      <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={[styles.controlsContainer, { borderColor: colors.cardBorder }]}>
        <TouchableOpacity style={styles.controlButton}>
          <MaterialCommunityIcons name="camera" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, styles.captureButton, { borderColor: colors.textPrimary }]}>
          <View style={[styles.captureInner, { backgroundColor: colors.textPrimary }]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton}>
          <MaterialCommunityIcons name="image-multiple" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SIZES.padding },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  liveText: { fontSize: 13, fontWeight: '700' },
  cameraContainer: {
    flex: 1, width: '100%', borderRadius: SIZES.radius, overflow: 'hidden', marginBottom: 20,
  },
  feedImage: { width: '100%', height: '100%' },
  controlsContainer: {
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingVertical: 20, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1,
  },
  controlButton: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  captureButton: { width: 72, height: 72, borderRadius: 36, borderWidth: 4 },
  captureInner: { width: 54, height: 54, borderRadius: 27 },
});
