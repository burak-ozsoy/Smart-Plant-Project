import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { SIZES } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useFirebase } from '../context/FirebaseContext';
import LeafLoader from '../components/LeafLoader';

export default function CameraScreen() {
  const { colors, isDark } = useThemeColors();
  const { deviceId, ipAddress } = useFirebase();
  const isFocused = useIsFocused();

  const [frame, setFrame] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const [isSaving, setIsSaving] = useState(false);

  const handleCapture = async () => {
    if (!frame) return;

    setIsSaving(true);
    try {
      // 1. Request permission if not already granted
      let { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== 'granted') {
        const request = await MediaLibrary.requestPermissionsAsync();
        status = request.status;
      }

      if (status !== 'granted') {
        Alert.alert("Permission Required", "Please allow gallery access to save photos.");
        return;
      }

      // 2. Extract base64 data from frame string
      const base64Data = frame.split(';base64,').pop();
      if (!base64Data) {
        throw new Error("Invalid frame data");
      }

      // 3. Write data to a cached temp file
      const filename = `smart_plant_photo_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 4. Save to device gallery
      await MediaLibrary.saveToLibraryAsync(fileUri);

      // 5. Clean up temp file
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } catch (err) {
        console.warn("Could not delete temp cache file:", err);
      }

      // 6. Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved Successfully", "The photo has been saved to your gallery.");
    } catch (err: any) {
      console.error("Capture/Save error:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error Saving", err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // If no device, no IP address, or screen is not focused, close any active socket.
    if (!deviceId || !ipAddress || !isFocused) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
      setFrame(null);
      return;
    }

    let isComponentActive = true;
    const wsUrl = `ws://${ipAddress}:8000/ws/camera`;

    const connectCameraWs = () => {
      if (!isComponentActive) return;

      console.log(`🔌 [CameraWS] Connecting to ${wsUrl}...`);
      setIsConnecting(true);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isComponentActive) {
          ws.close();
          return;
        }
        console.log(`✅ [CameraWS] Connection established to ${wsUrl}`);
        setIsConnected(true);
        setIsConnecting(false);
      };

      ws.onmessage = (event) => {
        if (!isComponentActive) return;

        // FastAPI server streams binary bytes (raw JPEG data).
        // Convert the Blob to a Data URL (base64) so <Image /> can render it.
        try {
          const blob = event.data;
          const reader = new FileReader();
          reader.onloadend = () => {
            if (!isComponentActive) return;
            const dataUrl = typeof reader.result === 'string'
              ? reader.result.replace('data:application/octet-stream;', 'data:image/jpeg;')
              : null;
            if (dataUrl) {
              setFrame(dataUrl);
            }
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.warn("❌ [CameraWS] Error processing frame blob:", err);
        }
      };

      ws.onclose = (e) => {
        if (!isComponentActive) return;
        console.log(`🔌 [CameraWS] Connection closed for ${wsUrl}. Reconnecting in 3 seconds...`, e.reason);
        setIsConnected(false);
        setFrame(null);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectCameraWs, 3000);
      };

      ws.onerror = (err) => {
        if (!isComponentActive) return;
        console.log(`❌ [CameraWS] Connection error for ${wsUrl}:`, err);
        ws.close();
      };
    };

    connectCameraWs();

    return () => {
      isComponentActive = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [deviceId, ipAddress, isFocused]);

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
          { backgroundColor: frame ? 'rgba(255, 69, 58, 0.15)' : 'rgba(142, 142, 147, 0.15)' }
        ]}>
          <View style={[styles.liveDot, { backgroundColor: frame ? colors.danger : colors.textSecondary }]} />
          <Text style={[styles.liveText, { color: frame ? colors.danger : colors.textSecondary }]}>
            {frame ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <View style={[
        styles.cameraContainer, 
        { 
          backgroundColor: colors.cardBackground, 
          borderColor: colors.cardBorder, 
          borderWidth: frame ? 0 : 1 
        }
      ]}>
        {frame ? (
          <Image 
            source={{ uri: frame }}
            style={styles.feedImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImageContainer}>
            {isConnecting ? (
              <LeafLoader size="large" />
            ) : (
              <MaterialCommunityIcons name="camera-off" size={40} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            )}
            <Text style={[styles.noImageText, { color: colors.textSecondary, marginTop: 8 }]}>
              {isConnecting ? "Connecting to camera..." : "No Image Available"}
            </Text>
          </View>
        )}
      </View>

      <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={[styles.controlsContainer, { borderColor: colors.cardBorder }]}>
        <TouchableOpacity style={styles.controlButton} disabled={!frame || isSaving} onPress={handleCapture}>
          <MaterialCommunityIcons name="camera" size={28} color={(frame && !isSaving) ? colors.textPrimary : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            styles.captureButton, 
            { borderColor: (frame && !isSaving) ? colors.textPrimary : colors.textSecondary }
          ]} 
          disabled={!frame || isSaving}
          onPress={handleCapture}
        >
          {isSaving ? (
            <LeafLoader size="small" color={colors.primary} />
          ) : (
            <View style={[styles.captureInner, { backgroundColor: frame ? colors.textPrimary : colors.textSecondary }]} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} disabled={!frame || isSaving}>
          <MaterialCommunityIcons name="image-multiple" size={28} color={(frame && !isSaving) ? colors.textPrimary : colors.textSecondary} />
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
