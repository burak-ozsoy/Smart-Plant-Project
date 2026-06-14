import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, TouchableOpacity, TouchableWithoutFeedback, Modal, Alert, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useFirebase } from '../context/FirebaseContext';
import LeafLoader from '../components/LeafLoader';
import * as Haptics from 'expo-haptics';

const SensorCard = React.memo(({ title, value, unit, icon, color, colors, isDark, onLongPress }: any) => {
  const handleLongPress = () => {
    onLongPress(title, value, unit, icon, color);
  };
  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      delayLongPress={500}
      style={styles.cardWrapper}
    >
      <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={[styles.card, { borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: color + '20' }]}>
            <MaterialCommunityIcons name={icon} size={22} color={color} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{title}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
            {value}
            <Text style={[styles.cardUnit, { color: colors.textSecondary }]}>{unit}</Text>
          </Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
});

const StatusIndicator = React.memo(({ title, isActive, icon, controlKey, onToggle, isLast, colors }: any) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;
  const dripValue = React.useRef(new Animated.Value(0)).current;
  const glowValue = React.useRef(new Animated.Value(0)).current;

  const spinAnimRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const dripAnimRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const glowAnimRef = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    // 1. Fan Rotation
    if (icon === 'fan' && isActive) {
      spinValue.setValue(0);
      spinAnimRef.current = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimRef.current.start();
    } else {
      if (spinAnimRef.current) {
        spinAnimRef.current.stop();
        spinAnimRef.current = null;
      }
      Animated.spring(spinValue, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }

    // 2. Water Pump Drip Flow
    if (icon === 'water-pump' && isActive) {
      dripValue.setValue(0);
      dripAnimRef.current = Animated.loop(
        Animated.timing(dripValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      dripAnimRef.current.start();
    } else {
      if (dripAnimRef.current) {
        dripAnimRef.current.stop();
        dripAnimRef.current = null;
      }
      dripValue.setValue(0);
    }

    // 3. Grow Light Glow/Pulse
    if (icon === 'lightbulb-on' && isActive) {
      glowValue.setValue(0);
      glowAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowValue, {
            toValue: 1,
            duration: 1200,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(glowValue, {
            toValue: 0,
            duration: 1200,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimRef.current.start();
    } else {
      if (glowAnimRef.current) {
        glowAnimRef.current.stop();
        glowAnimRef.current = null;
      }
      Animated.spring(glowValue, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, icon]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dripY = dripValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });

  const dripOpacity = dripValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const glowScale = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.15],
  });

  const glowOpacity = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.0],
  });

  const isLight = icon === 'lightbulb-on';
  const isFan = icon === 'fan';
  const isPump = icon === 'water-pump';

  const handleToggle = (val: boolean) => {
    onToggle(controlKey, val);
  };

  return (
    <View style={[styles.statusItem, isLast && styles.statusItemLast, { borderBottomColor: colors.cardBorder }]}>
      <View style={styles.statusLeft}>
        <View style={[
          styles.iconBadge, 
          { 
            backgroundColor: isActive 
              ? (isPump ? colors.secondary + '20' : isLight ? colors.warning + '20' : colors.primary + '20') 
              : colors.textSecondary + '20' 
          }
        ]}>
          <Animated.View style={
            isFan ? { transform: [{ rotate: spin }] } :
            (isLight && isActive) ? { transform: [{ scale: glowScale }], opacity: glowOpacity } :
            {}
          }>
            <MaterialCommunityIcons
              name={icon}
              size={22}
              color={isActive 
                ? (isPump ? colors.secondary : isLight ? colors.warning : colors.primary) 
                : colors.textSecondary
              }
            />
          </Animated.View>
          {isPump && isActive && (
            <Animated.View style={{
              position: 'absolute',
              bottom: -4,
              right: 6,
              transform: [{ translateY: dripY }],
              opacity: dripOpacity,
            }}>
              <MaterialCommunityIcons name="water" size={10} color={colors.secondary} />
            </Animated.View>
          )}
          {isLight && isActive && (
            <Animated.View style={[StyleSheet.absoluteFillObject, {
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: colors.warning,
              transform: [{ scale: glowScale }],
              opacity: glowValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.5],
              }),
            }]} />
          )}
        </View>
        <Text style={[styles.statusText, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <Switch
        trackColor={{ false: colors.tabBarInactive, true: colors.primary }}
        thumbColor={'#FFFFFF'}
        ios_backgroundColor="#3e3e3e"
        onValueChange={(val) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleToggle(val);
        }}
        value={isActive}
      />
    </View>
  );
});

const RegisterDeviceModal = ({ visible, onClose, deviceName, setDeviceName, macAddress, setMacAddress, onAdd, adding, success, error, colors, isDark }: any) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={success ? undefined : onClose}
    >
      <BlurView
        intensity={isDark ? 40 : 80}
        tint={isDark ? "dark" : "light"}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.cardBorder }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {success ? "Success" : "Register New Device"}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={adding || success}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} style={{ opacity: (adding || success) ? 0.3 : 1 }} />
            </TouchableOpacity>
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <View style={[styles.successIconCircle, { backgroundColor: colors.primary + '15' }]}>
                <MaterialCommunityIcons name="check-decagram" size={54} color={colors.primary} />
              </View>
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
                Connected Successfully!
              </Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                Your device has been successfully linked to your account.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Link a Smart Plant device to your account.
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Device Name</Text>
              <TextInput
                style={[
                  styles.setupInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  }
                ]}
                placeholder="Living Room Plant"
                placeholderTextColor={colors.tabBarInactive}
                value={deviceName}
                onChangeText={setDeviceName}
                editable={!adding}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>MAC Address</Text>
              <TextInput
                style={[
                  styles.setupInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  }
                ]}
                placeholder="XX:XX:XX:XX:XX:XX"
                placeholderTextColor={colors.tabBarInactive}
                value={macAddress}
                onChangeText={setMacAddress}
                autoCapitalize="characters"
                editable={!adding}
              />

              {error && (
                <Text style={[styles.errorText, { color: colors.danger, marginBottom: 16 }]}>{error}</Text>
              )}

              <TouchableOpacity
                style={[styles.setupButton, { backgroundColor: colors.primary, marginTop: 8 }]}
                onPress={onAdd}
                disabled={adding}
              >
                {adding ? (
                  <LeafLoader size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.setupButtonText}>Add Device</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </BlurView>
    </Modal>
  );
};

export default function DashboardScreen({ navigation }: any) {
  const { colors, isDark } = useThemeColors();
  const { deviceId, devicesList, selectDevice, addDevice, removeDevice, sensors, controls, updateControl, loading, error } = useFirebase();

  const isHealthy = React.useMemo(() => {
    if (!sensors) return true;
    return sensors.soilMoisture >= 30 && 
           sensors.soilMoisture <= 80 && 
           sensors.temperature >= 15 && 
           sensors.temperature <= 32 &&
           sensors.lightLevel >= 30 &&
           sensors.lightLevel <= 80;
  }, [sensors]);

  const [registerModalVisible, setRegisterModalVisible] = React.useState(false);
  const [selectModalVisible, setSelectModalVisible] = React.useState(false);
  const [deviceName, setDeviceName] = React.useState('');
  const [macAddress, setMacAddress] = React.useState('');
  const [addingDevice, setAddingDevice] = React.useState(false);
  const [addSuccess, setAddSuccess] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [selectedSensor, setSelectedSensor] = React.useState<{ title: string; value: any; unit: string; icon: string; color: string; desc: string } | null>(null);

  // Pulsing animation for sensor icon badge in diagnostics card
  const pulseValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (selectedSensor) {
      pulseValue.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.08,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseValue.setValue(1);
    }
  }, [selectedSensor]);

  const getGaugeData = (title: string, value: any) => {
    const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
    let percent = 0;
    let zones = [];
    let statusText = "OPTIMAL";
    let statusColor = '#34C759'; // primary green

    if (title === 'Temperature') {
      // Range: 0 to 45
      const min = 0;
      const max = 45;
      percent = ((numVal - min) / (max - min)) * 100;
      percent = Math.max(0, Math.min(100, percent));
      zones = [
        { label: 'Low', color: '#0A84FF', flex: 15 },
        { label: 'Ideal', color: '#34C759', flex: 17 },
        { label: 'High', color: '#FF9F0A', flex: 13 },
      ];
      if (numVal < 15) {
        statusText = "TOO COLD";
        statusColor = '#0A84FF';
      } else if (numVal > 32) {
        statusText = "TOO HOT";
        statusColor = '#FF9F0A';
      }
    } else if (title === 'Humidity') {
      // Range: 0 to 100
      percent = numVal;
      percent = Math.max(0, Math.min(100, percent));
      zones = [
        { label: 'Low', color: '#FF9F0A', flex: 40 },
        { label: 'Ideal', color: '#34C759', flex: 60 },
      ];
      if (numVal < 40) {
        statusText = "DRY AIR";
        statusColor = '#FF9F0A';
      }
    } else if (title === 'Light') {
      // Range: 0 to 100
      percent = numVal;
      percent = Math.max(0, Math.min(100, percent));
      zones = [
        { label: 'Low', color: '#FF9F0A', flex: 30 },
        { label: 'Ideal', color: '#34C759', flex: 50 },
        { label: 'Bright', color: '#FFD60A', flex: 20 },
      ];
      if (numVal < 30) {
        statusText = "LOW LIGHT";
        statusColor = '#FF9F0A';
      } else if (numVal > 80) {
        statusText = "TOO BRIGHT";
        statusColor = '#FFD60A';
      }
    } else { // Soil Moisture
      // Range: 0 to 100
      percent = numVal;
      percent = Math.max(0, Math.min(100, percent));
      zones = [
        { label: 'Dry', color: '#FF453A', flex: 30 },
        { label: 'Ideal', color: '#34C759', flex: 50 },
        { label: 'Wet', color: '#0A84FF', flex: 20 },
      ];
      if (numVal < 30) {
        statusText = "DRY SOIL";
        statusColor = '#FF453A';
      } else if (numVal > 80) {
        statusText = "OVERWATERED";
        statusColor = '#0A84FF';
      }
    }

    return { percent, zones, statusText, statusColor };
  };

  const handleSensorLongPress = (title: string, value: any, unit: string, icon: string, color: string) => {
    // Provide a physical heavy click on open
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    let desc = "Sensor level is normal.";
    const numVal = typeof value === 'string' ? parseFloat(value) : value;
    
    if (title === 'Temperature') {
      if (numVal < 15) desc = "Too Cold: Ambient temperature is low. Relocate the plant to a warmer environment.";
      else if (numVal > 32) desc = "Too Hot: Ambient temperature is high. Consider activating the Fan control.";
      else desc = "Optimal temperature: The environment temperature is ideal for growth.";
    } else if (title === 'Humidity') {
      if (numVal < 40) desc = "Dry Air: Air humidity is low. Consider misting or placing a humidifier nearby.";
      else desc = "Healthy Humidity: The ambient moisture is excellent.";
    } else if (title === 'Light') {
      if (numVal < 30) desc = "Low Light: Light intensity is low. Enable the Grow Light to assist photosynthesis.";
      else if (numVal > 80) desc = "Too Bright: Plant is receiving intense light. Protect it from direct midday sun.";
      else desc = "Optimal Light: The current light level is perfect for growth.";
    } else if (title === 'Soil Moisture') {
      if (numVal < 30) desc = "Dry Soil: Soil moisture is critically low. Activate the Water Pump immediately!";
      else if (numVal > 80) desc = "High Moisture: Soil is fully saturated. Pause watering to prevent root rot.";
      else desc = "Healthy Moisture: The soil is perfectly watered.";
    }

    setSelectedSensor({ title, value, unit, icon, color, desc });
  };

  const activeDevice = devicesList.find(d => d.macAddress === deviceId);
  const activeDeviceName = activeDevice ? activeDevice.deviceName : (deviceId || 'No Device Configured');

  const handleAddDevice = React.useCallback(async () => {
    if (!deviceName.trim() || !macAddress.trim()) {
      setLocalError("Please fill in all fields.");
      return;
    }
    setAddingDevice(true);
    setLocalError(null);
    try {
      await addDevice(deviceName.trim(), macAddress.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddSuccess(true);
      
      // Delay closing modal to show success checkmark smoothly
      setTimeout(() => {
        setRegisterModalVisible(false);
        // Reset success state after modal fade animation finishes
        setTimeout(() => {
          setAddSuccess(false);
          setDeviceName('');
          setMacAddress('');
        }, 300);
      }, 2000);
    } catch (err: any) {
      setLocalError(err.message || "Failed to add device.");
    } finally {
      setAddingDevice(false);
    }
  }, [deviceName, macAddress, addDevice]);

  const handleDeleteConfirm = React.useCallback((device: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Remove Device",
      `Are you sure you want to remove "${device.deviceName}"? This will disconnect it from your account.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              await removeDevice(device.macAddress);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to remove device.");
            }
          } 
        }
      ]
    );
  }, [removeDevice]);

  const showFetchingStatus = loading && !sensors && !addingDevice && !error;
  const showSyncingSensors = deviceId && !sensors && !error;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!deviceId ? (
        <ScrollView contentContainerStyle={styles.centerScroll}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20', borderColor: colors.danger, width: '100%', maxWidth: 340, marginBottom: 20 }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>Error: {error}</Text>
            </View>
          )}
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={[styles.setupCard, { borderColor: colors.cardBorder }]}>
            <View style={[styles.iconBadgeLarge, { backgroundColor: colors.primary + '20' }]}>
              <MaterialCommunityIcons name="router-wireless-off" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.setupTitle, { color: colors.textPrimary }]}>No Device Found</Text>
            <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
              Please connect your smart plant device to start monitoring.
            </Text>

            <TouchableOpacity
              style={[styles.setupButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setLocalError(null);
                setRegisterModalVisible(true);
              }}
            >
              <Text style={styles.setupButtonText}>Add Device</Text>
            </TouchableOpacity>
          </BlurView>
        </ScrollView>
      ) : (showFetchingStatus || showSyncingSensors) ? (
        <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
          <LeafLoader size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {showFetchingStatus ? "Fetching status..." : "Syncing device sensors..."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>Error: {error}</Text>
            </View>
          )}

          {/* Active Device Selector Card */}
          <TouchableOpacity
            style={[styles.selectorCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
            onPress={() => setSelectModalVisible(true)}
            activeOpacity={0.7}
          >
            <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={styles.selectorBlur}>
              <View style={styles.selectorLeft}>
                <View style={[styles.selectorIconBadge, { backgroundColor: colors.primary + '20' }]}>
                  <MaterialCommunityIcons name="flower" size={26} color={colors.primary} />
                </View>
                <View style={styles.selectorTextContent}>
                  <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Active Plant / Device</Text>
<Text style={[styles.selectorName, { color: colors.textPrimary }]}>{activeDeviceName}</Text>
                  <Text style={[styles.selectorMac, { color: colors.textSecondary }]}>{deviceId}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textSecondary} />
            </BlurView>
          </TouchableOpacity>

          {/* Vitals Warning Redirect Banner */}
          {!isHealthy && (
            <TouchableOpacity 
              style={[styles.alertBanner, { borderColor: colors.danger, backgroundColor: colors.danger + '15' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('Insights');
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} style={{ marginRight: 10 }} />
              <Text style={[styles.alertBannerText, { color: colors.textPrimary }]}>
                Vitals Alert: Plant needs attention. <Text style={{ color: colors.danger, fontWeight: '700' }}>Tap for Insights</Text>
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.danger} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 10 }]}>Sensors</Text>
          <View style={styles.grid}>
            <SensorCard 
              title="Temperature" 
              value={sensors ? (typeof sensors.temperature === 'number' ? sensors.temperature.toFixed(1) : sensors.temperature) : '--'} 
              unit="°C" 
              icon="thermometer" 
              color={colors.warning} 
              colors={colors} 
              isDark={isDark} 
              onLongPress={handleSensorLongPress}
            />
            <SensorCard 
              title="Humidity" 
              value={sensors ? sensors.humidity : '--'} 
              unit="%" 
              icon="water-percent" 
              color={colors.secondary} 
              colors={colors} 
              isDark={isDark} 
              onLongPress={handleSensorLongPress}
            />
            <SensorCard 
              title="Light" 
              value={sensors ? sensors.lightLevel : '--'} 
              unit="%" 
              icon="white-balance-sunny" 
              color={colors.warning} 
              colors={colors} 
              isDark={isDark} 
              onLongPress={handleSensorLongPress}
            />
            <SensorCard 
              title="Soil Moisture" 
              value={sensors ? sensors.soilMoisture : '--'} 
              unit="%" 
              icon="sprout" 
              color={colors.primary} 
              colors={colors} 
              isDark={isDark} 
              onLongPress={handleSensorLongPress}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Controls</Text>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={[styles.statusContainer, { borderColor: colors.cardBorder }]}>
            {!controls ? (
              <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
                <LeafLoader size="small" color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 12, fontFamily: 'sans-serif' }}>
                  Connecting to local device...
                </Text>
              </View>
            ) : (
              <>
                <StatusIndicator title="Water Pump" isActive={controls.pumpOn} icon="water-pump" controlKey="pumpOn" onToggle={updateControl} colors={colors} />
                <StatusIndicator title="Grow Light" isActive={controls.growLightOn} icon="lightbulb-on" controlKey="growLightOn" onToggle={updateControl} colors={colors} />
                <StatusIndicator title="Fan" isActive={controls.fanOn} icon="fan" controlKey="fanOn" onToggle={updateControl} isLast colors={colors} />
              </>
            )}
          </BlurView>
        </ScrollView>
      )}

      {/* Device Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={selectModalVisible}
        onRequestClose={() => setSelectModalVisible(false)}
      >
        <BlurView
          intensity={isDark ? 40 : 80}
          tint={isDark ? "dark" : "light"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                My Plants & Devices
              </Text>
              <TouchableOpacity onPress={() => setSelectModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary, marginBottom: 16 }]}>
              Select which smart plant you want to monitor:
            </Text>

            <ScrollView style={styles.deviceListScroll} showsVerticalScrollIndicator={false}>
              {devicesList.map((item) => {
                const isSelected = item.macAddress === deviceId;
                return (
                  <View
                    key={item.macAddress}
                    style={[
                      styles.deviceListItem,
                      {
                        backgroundColor: isSelected ? colors.primary + '10' : 'rgba(255,255,255,0.03)',
                        borderColor: isSelected ? colors.primary + '40' : colors.cardBorder,
                      }
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.deviceListItemTap}
                      onPress={() => {
                        setSelectModalVisible(false);
                        selectDevice(item.macAddress);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons 
                        name="sprout" 
                        size={22} 
                        color={isSelected ? colors.primary : colors.textSecondary} 
                        style={{ marginRight: 12 }} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.deviceListItemName, { color: colors.textPrimary, fontWeight: isSelected ? '700' : '500' }]} numberOfLines={1}>
                          {item.deviceName}
                        </Text>
                        <Text style={[styles.deviceListItemMac, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.macAddress}
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteDeviceButton}
                      onPress={() => handleDeleteConfirm(item)}
                      activeOpacity={0.6}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.addNewButton, { borderColor: colors.primary }]}
              onPress={() => {
                setSelectModalVisible(false);
                setLocalError(null);
                setRegisterModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.addNewButtonText, { color: colors.primary }]}>Add New Device</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      <RegisterDeviceModal
        visible={registerModalVisible}
        onClose={() => { if (!addingDevice) setRegisterModalVisible(false); }}
        deviceName={deviceName}
        setDeviceName={(txt: string) => {
          setDeviceName(txt);
          if (localError) setLocalError(null);
        }}
        macAddress={macAddress}
        setMacAddress={(txt: string) => {
          setMacAddress(txt);
          if (localError) setLocalError(null);
        }}
        onAdd={handleAddDevice}
        adding={addingDevice}
        success={addSuccess}
        error={localError}
        colors={colors}
        isDark={isDark}
      />

      {/* Detailed Sensor Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedSensor !== null}
        onRequestClose={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedSensor(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlayTouch}
          activeOpacity={1}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedSensor(null);
          }}
        >
          <BlurView
            intensity={isDark ? 35 : 70}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFillObject}
          />
          {selectedSensor && (
            <TouchableWithoutFeedback>
              <View style={[styles.detailModalContent, { backgroundColor: isDark ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', borderColor: colors.cardBorder }]}>
                {/* Real-time Diagnostics Category Header */}
                <View style={styles.detailHeaderContainer}>
                  <Text style={[styles.detailCategoryTag, { color: colors.textSecondary }]}>
                    Real-time Diagnostics
                  </Text>
                </View>

                <View style={styles.detailBody}>
                  {/* Pulsing Icon Badge */}
                  <Animated.View style={[
                    styles.detailIconBadge,
                    {
                      backgroundColor: selectedSensor.color + '15',
                      borderColor: selectedSensor.color,
                      transform: [{ scale: pulseValue }]
                    }
                  ]}>
                    <MaterialCommunityIcons name={selectedSensor.icon as any} size={54} color={selectedSensor.color} />
                  </Animated.View>

                  <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
                    {selectedSensor.title}
                  </Text>
                  
                  {/* Visual Value Showcase */}
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                    {selectedSensor.value}
                    <Text style={[styles.detailUnit, { color: colors.textSecondary }]}>
                      {selectedSensor.unit}
                    </Text>
                  </Text>

                  {/* Horizontal Range Gauge Bar */}
                  {(() => {
                    const { percent, zones, statusText, statusColor } = getGaugeData(selectedSensor.title, selectedSensor.value);
                    return (
                      <View style={styles.gaugeContainer}>
                        <View style={styles.gaugeHeader}>
                          <Text style={[styles.gaugeStatusText, { color: statusColor }]}>{statusText}</Text>
                        </View>
                        
                        <View style={styles.gaugeBarRow}>
                          {zones.map((zone: any, index: number) => (
                            <View 
                              key={index} 
                              style={[
                                styles.gaugeSegment, 
                                { 
                                  backgroundColor: zone.color + '20',
                                  flex: zone.flex,
                                  borderWidth: 1.5,
                                  borderColor: zone.color,
                                  marginLeft: index === 0 ? 0 : 5 
                                }
                              ]} 
                            />
                          ))}
                          {/* Floating pointer dot */}
                          <View style={[styles.gaugePointer, { left: `${percent}%`, backgroundColor: selectedSensor.color }]} />
                        </View>

                        <View style={styles.gaugeLabelsRow}>
                          {zones.map((zone: any, index: number) => (
                            <Text key={index} style={[styles.gaugeLabelText, { flex: zone.flex, color: colors.textSecondary }]}>
                              {zone.label}
                            </Text>
                          ))}
                        </View>
                      </View>
                    );
                  })()}

                  {/* Status and Action Recommendation Box */}
                  <View style={[styles.statusBox, { backgroundColor: colors.cardBorder + '10', borderColor: colors.cardBorder }]}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 1 }} />
                    <Text style={[styles.statusBoxText, { color: colors.textSecondary }]}>
                      {selectedSensor.desc}
                    </Text>
                  </View>

                  {/* Dismiss gesture Hint text */}
                  <Text style={[styles.dismissHintText, { color: colors.textSecondary }]}>
                    Tap anywhere outside the card to close
                  </Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SIZES.padding, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  cardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    width: '100%', borderRadius: SIZES.radius, padding: 16,
    overflow: 'hidden', borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  cardContent: {},
  cardValue: { fontSize: 26, fontWeight: '700' },
  cardUnit: { fontSize: 16 },
  statusContainer: { borderRadius: SIZES.radius, paddingHorizontal: 16, overflow: 'hidden', borderWidth: 1 },
  statusItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  statusItemLast: { borderBottomWidth: 0 },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 17, fontWeight: '500', marginLeft: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, fontWeight: '500' },
  errorContainer: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '600' },

  // Setup styles
  centerScroll: { flexGrow: 1, justifyContent: 'center', padding: SIZES.padding },
  setupCard: {
    borderRadius: SIZES.radius,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  iconBadgeLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  setupSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  setupInput: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  setupButton: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 10,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  deviceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },

  // Selector Card styling
  selectorCard: {
    borderRadius: SIZES.radius,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
    marginTop: 10,
  },
  selectorBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  selectorTextContent: {
    flexDirection: 'column',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorName: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectorMac: {
    fontSize: 13,
  },

  // Modal selector styles
  deviceListScroll: {
    maxHeight: 250,
    width: '100%',
    marginBottom: 16,
  },
  deviceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  deviceListItemTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceListItemName: {
    fontSize: 16,
  },
  deviceListItemMac: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteDeviceButton: {
    padding: 6,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addNewButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertBannerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlayTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  detailModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 12,
  },
  detailHeaderContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailCategoryTag: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  detailBody: {
    alignItems: 'center',
    width: '100%',
  },
  detailIconBadge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 54,
    fontWeight: '800',
    marginBottom: 20,
  },
  detailUnit: {
    fontSize: 24,
    fontWeight: '600',
  },
  gaugeContainer: {
    width: '100%',
    marginBottom: 24,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gaugeStatusText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gaugeBarRow: {
    width: '100%',
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    position: 'relative',
    marginBottom: 12,
  },
  gaugeSegment: {
    height: 8,
    borderRadius: 4,
  },
  gaugePointer: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    top: -4,
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  gaugeLabelsRow: {
    width: '100%',
    flexDirection: 'row',
  },
  gaugeLabelText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
  },
  statusBoxText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  dismissHintText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.5,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    width: '100%',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
