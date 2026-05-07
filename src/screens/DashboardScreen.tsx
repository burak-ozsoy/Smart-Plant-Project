import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { MOCK_SENSOR_DATA, MOCK_SYSTEM_STATUS } from '../constants/mockData';
import { useThemeColors } from '../hooks/useThemeColors';

const SensorCard = ({ title, value, unit, icon, color, colors, isDark }: any) => (
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
);

const StatusIndicator = ({ title, isActive, icon, onToggle, isLast, colors }: any) => {
  return (
    <View style={[styles.statusItem, isLast && styles.statusItemLast, { borderBottomColor: colors.cardBorder }]}>
      <View style={styles.statusLeft}>
        <View style={[styles.iconBadge, { backgroundColor: isActive ? colors.primary + '20' : colors.textSecondary + '20' }]}>
          <MaterialCommunityIcons 
            name={icon} 
            size={22} 
            color={isActive ? colors.primary : colors.textSecondary} 
          />
        </View>
        <Text style={[styles.statusText, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <Switch
        trackColor={{ false: colors.tabBarInactive, true: colors.primary }}
        thumbColor={'#FFFFFF'}
        ios_backgroundColor="#3e3e3e"
        onValueChange={onToggle}
        value={isActive}
      />
    </View>
  );
};

export default function DashboardScreen() {
  const { colors, isDark } = useThemeColors();
  const [pumpStatus, setPumpStatus] = useState(MOCK_SYSTEM_STATUS.pump);
  const [lightStatus, setLightStatus] = useState(MOCK_SYSTEM_STATUS.light);
  const [fanStatus, setFanStatus] = useState(MOCK_SYSTEM_STATUS.fan);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sensors</Text>
      <View style={styles.grid}>
        <SensorCard title="Temperature" value={MOCK_SENSOR_DATA.temperature} unit="°C" icon="thermometer" color={colors.warning} colors={colors} isDark={isDark} />
        <SensorCard title="Humidity" value={MOCK_SENSOR_DATA.humidity} unit="%" icon="water-percent" color={colors.secondary} colors={colors} isDark={isDark} />
        <SensorCard title="Light" value={MOCK_SENSOR_DATA.lightIntensity} unit=" lux" icon="white-balance-sunny" color={colors.warning} colors={colors} isDark={isDark} />
        <SensorCard title="Soil Moisture" value={MOCK_SENSOR_DATA.soilMoisture} unit="%" icon="sprout" color={colors.primary} colors={colors} isDark={isDark} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Controls</Text>
      <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={[styles.statusContainer, { borderColor: colors.cardBorder }]}>
        <StatusIndicator title="Water Pump" isActive={pumpStatus} icon="water-pump" onToggle={setPumpStatus} colors={colors} />
        <StatusIndicator title="Grow Light" isActive={lightStatus} icon="lightbulb-on" onToggle={setLightStatus} colors={colors} />
        <StatusIndicator title="Fan" isActive={fanStatus} icon="fan" onToggle={setFanStatus} isLast colors={colors} />
      </BlurView>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SIZES.padding, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  card: {
    width: '48%', borderRadius: SIZES.radius, padding: 16, marginBottom: 16,
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
});
