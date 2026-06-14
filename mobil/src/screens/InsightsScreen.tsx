import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useFirebase } from '../context/FirebaseContext';
import LeafLoader from '../components/LeafLoader';

const InsightCard = React.memo(({ title, value, icon, color, description, colors, isDark }: any) => (
  <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={[styles.card, { borderColor: colors.cardBorder }]}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={26} color={color} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
    </View>
    <View style={styles.cardBody}>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
    </View>
  </BlurView>
));

export default function InsightsScreen() {
  const { colors, isDark } = useThemeColors();
  const { deviceId, sensors, loading, error } = useFirebase();

  if (!deviceId) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="router-wireless-off" size={48} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 12 }]}>
          Please connect a device to view insights.
        </Text>
      </View>
    );
  }

  if (loading && !sensors && !error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <LeafLoader size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Analyzing plant vitals...</Text>
      </View>
    );
  }

  // Dynamic calculations based on Firebase sensor data
  const wateringNeed = sensors ? Math.max(0, 100 - sensors.soilMoisture) : 0;
  let wateringDesc = sensors ? "Soil moisture is adequate, but you may need to water the plant in about 2 days." : "";
  if (sensors) {
    if (sensors.soilMoisture < 30) {
      wateringDesc = "Soil is very dry! Please water the plant immediately or turn on the Water Pump.";
    } else if (sensors.soilMoisture > 70) {
      wateringDesc = "Soil is fully saturated. No watering is needed at this time.";
    }
  }

  let lightAdequacy = sensors ? "Optimal" : "No Data";
  let lightDesc = sensors ? "The plant is receiving enough light for photosynthesis during the day." : "";
  let lightColor = colors.warning;
  if (sensors) {
    if (sensors.lightLevel < 30) {
      lightAdequacy = "Low Light";
      lightDesc = "Light levels are low. Consider turning on the Grow Light or moving the plant to a brighter spot.";
      lightColor = colors.danger;
    } else if (sensors.lightLevel > 80) {
      lightAdequacy = "Too Bright";
      lightDesc = "Light is very intense. Ensure the plant is not getting scorched by direct midday sun.";
      lightColor = colors.warning;
    }
  }

  const isHealthy = sensors ? (sensors.soilMoisture >= 30 && sensors.soilMoisture <= 80 && sensors.temperature >= 15 && sensors.temperature <= 32) : false;
  const overallStatus = sensors ? (isHealthy ? "Healthy" : "Needs Attention") : "N/A";
  const overallColor = sensors ? (isHealthy ? colors.primary : colors.danger) : colors.textSecondary;
  let overallDesc = sensors ? "Your plant is currently in optimal health condition. Keep up the good work!" : "No vital sensor readings found for this device.";
  if (sensors && !isHealthy) {
    if (sensors.soilMoisture < 30) {
      overallDesc = "Critical: Plant needs water! Low soil moisture detected.";
    } else if (sensors.temperature > 32) {
      overallDesc = "Warning: Temperature is too high. Consider turning on the Fan.";
    } else if (sensors.temperature < 15) {
      overallDesc = "Warning: Temperature is too cold for optimal growth.";
    } else {
      overallDesc = "Vitals are slightly unbalanced. Check recommendations below.";
    }
  }

  // Compile active warnings/alerts for visual standout
  const alerts: { type: 'danger' | 'warning'; title: string; message: string; icon: string }[] = [];
  if (sensors) {
    if (sensors.soilMoisture < 30) {
      alerts.push({
        type: 'danger',
        title: 'Critical Soil Moisture',
        message: `Soil moisture is extremely low (${sensors.soilMoisture}%). Water the plant immediately to prevent wilting!`,
        icon: 'water-alert',
      });
    } else if (sensors.soilMoisture > 80) {
      alerts.push({
        type: 'warning',
        title: 'High Soil Moisture',
        message: `Soil moisture is very high (${sensors.soilMoisture}%). Consider pausing watering and checking drainage.`,
        icon: 'water-percent',
      });
    }

    if (sensors.temperature > 32) {
      alerts.push({
        type: 'danger',
        title: 'Temperature Too High',
        message: `Ambient temperature is ${sensors.temperature}°C. Turn on the fan or relocate the plant to a cooler room.`,
        icon: 'thermometer-alert',
      });
    } else if (sensors.temperature < 15) {
      alerts.push({
        type: 'danger',
        title: 'Temperature Too Cold',
        message: `Ambient temperature is ${sensors.temperature}°C. Move the plant to a warmer area to prevent cold damage.`,
        icon: 'snowflake-alert',
      });
    }

    if (sensors.lightLevel < 30) {
      alerts.push({
        type: 'warning',
        title: 'Low Light Intensity',
        message: `Light level is only ${sensors.lightLevel}%. Turn on grow lights or move the plant near a window.`,
        icon: 'weather-sunny-alert',
      });
    } else if (sensors.lightLevel > 80) {
      alerts.push({
        type: 'warning',
        title: 'Excessive Light Intensity',
        message: `Light level is very high (${sensors.lightLevel}%). Protect the plant from scorching direct sun.`,
        icon: 'weather-sunny-off',
      });
    }
  }

  const hasDanger = alerts.some(a => a.type === 'danger');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>Error: {error}</Text>
        </View>
      )}

      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Insights</Text>

      {sensors && alerts.length > 0 ? (
        <BlurView 
          intensity={isDark ? 35 : 70} 
          tint={isDark ? "dark" : "light"} 
          style={[
            styles.warningContainer, 
            { 
              borderColor: hasDanger ? colors.danger : colors.warning,
              backgroundColor: hasDanger ? colors.danger + '10' : colors.warning + '10'
            }
          ]}
        >
          <View style={styles.warningHeader}>
            <MaterialCommunityIcons 
              name="alert-decagram" 
              size={26} 
              color={hasDanger ? colors.danger : colors.warning} 
            />
            <Text style={[styles.warningTitle, { color: hasDanger ? colors.danger : colors.warning }]}>
              {hasDanger ? 'CRITICAL SYSTEM ALERTS' : 'SYSTEM WARNINGS'}
            </Text>
          </View>
          <View style={styles.warningList}>
            {alerts.map((alert, idx) => (
              <View key={idx} style={[styles.alertItem, idx > 0 && { borderTopColor: colors.cardBorder, borderTopWidth: 1 }]}>
                <View style={styles.alertIconWrapper}>
                  <MaterialCommunityIcons 
                    name={alert.icon as any} 
                    size={22} 
                    color={alert.type === 'danger' ? colors.danger : colors.warning} 
                  />
                </View>
                <View style={styles.alertTextWrapper}>
                  <Text style={[styles.alertTitleText, { color: colors.textPrimary }]}>{alert.title}</Text>
                  <Text style={[styles.alertMsgText, { color: colors.textSecondary }]}>{alert.message}</Text>
                </View>
              </View>
            ))}
          </View>
        </BlurView>
      ) : sensors ? (
        <BlurView 
          intensity={isDark ? 30 : 60} 
          tint={isDark ? "dark" : "light"} 
          style={[styles.healthyContainer, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
        >
          <View style={styles.healthyHeader}>
            <MaterialCommunityIcons name="check-decagram" size={26} color={colors.primary} />
            <Text style={[styles.healthyTitle, { color: colors.primary }]}>
              ALL VITALS HEALTHY
            </Text>
          </View>
          <Text style={[styles.healthyMsg, { color: colors.textSecondary }]}>
            All sensor levels are within the optimal range. Your plant is growing in a perfect environment!
          </Text>
        </BlurView>
      ) : null}
      
      {!sensors ? (
        <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={[styles.card, { borderColor: colors.cardBorder, padding: 20 }]}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>No vitals analysis available for this device.</Text>
        </BlurView>
      ) : (
        <>
          <InsightCard 
            title="Overall Health"
            value={overallStatus}
            icon="heart-pulse"
            color={overallColor}
            description={overallDesc}
            colors={colors}
            isDark={isDark}
          />
          
          <InsightCard 
            title="Watering Need"
            value={`${wateringNeed}%`}
            icon="water"
            color={colors.secondary}
            description={wateringDesc}
            colors={colors}
            isDark={isDark}
          />
          
          <InsightCard 
            title="Light Adequacy"
            value={lightAdequacy}
            icon="white-balance-sunny"
            color={lightColor}
            description={lightDesc}
            colors={colors}
            isDark={isDark}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SIZES.padding, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, marginTop: 10 },
  card: { padding: 20, marginBottom: 20, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 17, fontWeight: '600' },
  cardBody: { paddingLeft: 56 },
  value: { fontSize: 32, fontWeight: '700', marginBottom: 6 },
  description: { fontSize: 14, lineHeight: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, fontWeight: '500' },
  errorContainer: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '600' },
  infoText: { fontSize: 16, fontWeight: '500' },
  
  // New styled components for Warnings/Alerts
  warningContainer: {
    padding: 16,
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    marginBottom: 20,
    overflow: 'hidden',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 1.0,
  },
  warningList: {
    flexDirection: 'column',
  },
  alertItem: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  alertIconWrapper: {
    marginRight: 10,
    marginTop: 1,
  },
  alertTextWrapper: {
    flex: 1,
  },
  alertTitleText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertMsgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  healthyContainer: {
    padding: 16,
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    marginBottom: 20,
    overflow: 'hidden',
  },
  healthyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  healthyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 1.0,
  },
  healthyMsg: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 34,
  },
});
