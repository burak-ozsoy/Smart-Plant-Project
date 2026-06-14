import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useFirebase } from '../context/FirebaseContext';
import LeafLoader from '../components/LeafLoader';
import * as Haptics from 'expo-haptics';

const screenWidth = Dimensions.get('window').width - SIZES.padding * 2;

const SensorChart = React.memo(({ title, labels, data, color, colors, isDark }: any) => {
  const chartConfig = {
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => color,
    labelColor: (opacity = 1) => colors.textSecondary,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForLabels: {
      fontSize: 9,
    }
  };

  return (
    <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={[styles.chartContainer, { borderColor: colors.cardBorder }]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <LineChart
        data={{
          labels,
          datasets: [{ data, color: () => color, strokeWidth: 3 }],
        }}
        width={screenWidth - 32} // padding inside card
        height={200}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
      />
    </BlurView>
  );
});

// Helper to parse "YYYY-MM-DD - HH-mm-ss", standard strings, or Firestore Timestamps safely on all JS engines
const parseDate = (t: any): Date => {
  if (!t) return new Date();
  
  // 1. If it has a toDate method (standard Firestore Timestamp)
  if (typeof t.toDate === 'function') {
    return t.toDate();
  }
  
  // 2. If it's a Firestore Timestamp-like object
  if (t.seconds !== undefined) {
    return new Date(t.seconds * 1000);
  }
  
  // 3. If it's already a JS Date object
  if (t instanceof Date) {
    return t;
  }
  
  // 4. If it's a number (timestamp in milliseconds)
  if (typeof t === 'number') {
    return new Date(t);
  }
  
  // 5. If it's a string
  if (typeof t === 'string') {
    const cleanStr = t.trim();
    
    // Parse custom format: "YYYY-MM-DD - HH-mm-ss"
    if (cleanStr.includes(' - ')) {
      const parts = cleanStr.split(' - ');
      if (parts.length === 2) {
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split('-');
        if (dateParts.length === 3 && timeParts.length === 3) {
          const year = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // 0-indexed
          const day = parseInt(dateParts[2], 10);
          const hour = parseInt(timeParts[0], 10);
          const minute = parseInt(timeParts[1], 10);
          const second = parseInt(timeParts[2], 10);
          
          const d = new Date(year, month, day, hour, minute, second);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
    
    // Try native parsing first (handles standard ISO strings with T/Z/offsets)
    let d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      return d;
    }
    
    // Replace space with T to handle space-separated formats like "YYYY-MM-DD HH:mm:ss"
    const isoStr = cleanStr.replace(' ', 'T');
    d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }
  
  return new Date();
};

export default function AnalyticsScreen() {
  const { colors, isDark } = useThemeColors();
  const { deviceId, historicalData, loading, error } = useFirebase();
  const [timeUnit, setTimeUnit] = useState<'Minutes' | 'Hours'>('Minutes');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Format labels and dataset lists
  const parsedData = useMemo(() => {
    return historicalData.map(h => {
      return {
        ...h,
        date: parseDate(h.readingTime),
      };
    });
  }, [historicalData]);

  const chartData = useMemo(() => {
    const latestReading = parsedData[parsedData.length - 1];
    const refDate = latestReading ? latestReading.date : new Date();

    const finalLabels: string[] = [];
    const finalTemps: number[] = [];
    const finalHums: number[] = [];
    const finalLights: number[] = [];
    const finalSoils: number[] = [];

    if (timeUnit === 'Minutes') {
      // Show the last 10 actual readings directly from Firestore (minute-by-minute)
      const last10Readings = parsedData.slice(-10);
      last10Readings.forEach(item => {
        const hourStr = item.date.getHours().toString().padStart(2, '0');
        const minStr = item.date.getMinutes().toString().padStart(2, '0');
        finalLabels.push(`${hourStr}:${minStr}`);
        finalTemps.push(item.temperature);
        finalHums.push(item.humidity);
        finalLights.push(item.lightLevel);
        finalSoils.push(item.soilMoisture);
      });
    } else {
      // Generate 10 hourly buckets aligned exactly to standard clock hours
      const hourBuckets: { label: string; start: number; end: number; dataPoints: typeof parsedData }[] = [];
      const startOfCurrentHour = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), refDate.getHours(), 0, 0, 0).getTime();
      const endOfCurrentHour = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), refDate.getHours(), 59, 59, 999).getTime();

      for (let i = 9; i >= 0; i--) {
        const bucketStart = startOfCurrentHour - i * 3600000;
        const bucketEnd = endOfCurrentHour - i * 3600000;
        
        const bucketDate = new Date(bucketStart);
        const hourStr = bucketDate.getHours().toString().padStart(2, '0');
        const label = i === 0 
          ? `${refDate.getHours().toString().padStart(2, '0')}:${refDate.getMinutes().toString().padStart(2, '0')}`
          : `${hourStr}:00`;
        
        hourBuckets.push({
          label,
          start: bucketStart,
          end: bucketEnd,
          dataPoints: [],
        });
      }

      // Map readings to hourly buckets via millisecond range check (timezone/formatting safe)
      parsedData.forEach(item => {
        const itemTime = item.date.getTime();
        for (let i = 0; i < 10; i++) {
          const bucket = hourBuckets[i];
          const isMatch = itemTime >= bucket.start && (i === 9 ? itemTime <= bucket.end : itemTime < bucket.end);
          if (isMatch) {
            bucket.dataPoints.push(item);
            break;
          }
        }
      });

      // Populate data, carrying over previous values for empty buckets
      let lastTemp = parsedData[0]?.temperature || 0;
      let lastHum = parsedData[0]?.humidity || 0;
      let lastLight = parsedData[0]?.lightLevel || 0;
      let lastSoil = parsedData[0]?.soilMoisture || 0;

      hourBuckets.forEach((bucket, idx) => {
        finalLabels.push(bucket.label);
        if (bucket.dataPoints.length > 0) {
          // Take the latest reading in this hour bucket instead of the average
          const latestInBucket = bucket.dataPoints[bucket.dataPoints.length - 1];
          lastTemp = latestInBucket.temperature;
          lastHum = latestInBucket.humidity;
          lastLight = latestInBucket.lightLevel;
          lastSoil = latestInBucket.soilMoisture;
        } else {
          if (idx === 0) {
            const beforePoints = parsedData.filter(p => p.date.getTime() < bucket.start);
            if (beforePoints.length > 0) {
              const closest = beforePoints[beforePoints.length - 1];
              lastTemp = closest.temperature;
              lastHum = closest.humidity;
              lastLight = closest.lightLevel;
              lastSoil = closest.soilMoisture;
            }
          }
        }
        finalTemps.push(parseFloat(lastTemp.toFixed(1)));
        finalHums.push(Math.round(lastHum));
        finalLights.push(Math.round(lastLight));
        finalSoils.push(Math.round(lastSoil));
      });
    }

    // Selectively render labels to prevent overlapping on the X-axis
    const chartLabels = finalLabels.map((label, idx) => {
      // Show start, middle, and end labels dynamically to prevent overlap
      if (idx === 0 || idx === Math.floor(finalLabels.length / 2) || idx === finalLabels.length - 1) {
        return label;
      }
      return '';
    });

    return { chartLabels, finalTemps, finalHums, finalLights, finalSoils };
  }, [parsedData, timeUnit]);

  if (!deviceId) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="router-wireless-off" size={48} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 12 }]}>
          Please connect a device to view analytics.
        </Text>
      </View>
    );
  }

  if (loading && historicalData.length < 2 && !error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <LeafLoader size="large" color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 12 }]}>
          Loading historical readings...
        </Text>
      </View>
    );
  }

  if (historicalData.length < 2) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20', borderColor: colors.danger, width: '80%' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>Error: {error}</Text>
          </View>
        )}
        <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={48} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 40 }]}>
          Not enough historical data to display charts. (Minimum 2 readings required)
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>Error: {error}</Text>
        </View>
      )}
      <View style={styles.headerContainer}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Analytics</Text>
        
        {/* Interval Dropdown Selector */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity 
            style={[styles.dropdownButton, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDropdownVisible(!dropdownVisible);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownButtonText, { color: colors.textPrimary }]}>
              Interval: <Text style={{ color: colors.primary, fontWeight: '700' }}>{timeUnit}</Text>
            </Text>
            <MaterialCommunityIcons name={dropdownVisible ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          {dropdownVisible && (
            <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={[styles.dropdownMenu, { borderColor: colors.cardBorder }]}>
              <TouchableOpacity 
                style={styles.dropdownMenuItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setTimeUnit('Minutes');
                  setDropdownVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownMenuItemText, { color: timeUnit === 'Minutes' ? colors.primary : colors.textPrimary, fontWeight: timeUnit === 'Minutes' ? '700' : '500' }]}>
                  Minutes (Last 10 Min)
                </Text>
              </TouchableOpacity>
              <View style={[styles.dropdownDivider, { backgroundColor: colors.cardBorder }]} />
              <TouchableOpacity 
                style={styles.dropdownMenuItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setTimeUnit('Hours');
                  setDropdownVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownMenuItemText, { color: timeUnit === 'Hours' ? colors.primary : colors.textPrimary, fontWeight: timeUnit === 'Hours' ? '700' : '500' }]}>
                  Hours (Last 10 Hours)
                </Text>
              </TouchableOpacity>
            </BlurView>
          )}
        </View>
      </View>

      <SensorChart title={`Temperature (°C) - Last 10 ${timeUnit}`} labels={chartData.chartLabels} data={chartData.finalTemps} color={colors.warning} colors={colors} isDark={isDark} />
      <SensorChart title={`Humidity (%) - Last 10 ${timeUnit}`} labels={chartData.chartLabels} data={chartData.finalHums} color={colors.secondary} colors={colors} isDark={isDark} />
      <SensorChart title={`Light Level (%) - Last 10 ${timeUnit}`} labels={chartData.chartLabels} data={chartData.finalLights} color={colors.warning} colors={colors} isDark={isDark} />
      <SensorChart title={`Soil Moisture (%) - Last 10 ${timeUnit}`} labels={chartData.chartLabels} data={chartData.finalSoils} color={colors.primary} colors={colors} isDark={isDark} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SIZES.padding, paddingBottom: 40 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
    zIndex: 100,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  dropdownContainer: {
    position: 'relative',
    zIndex: 200,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 42,
    right: 0,
    width: 180,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 999,
  },
  dropdownMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownMenuItemText: {
    fontSize: 14,
  },
  dropdownDivider: {
    height: 1,
  },
  chartContainer: {
    paddingVertical: 20, paddingHorizontal: 16, marginBottom: 20,
    borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1,
  },
  chartHeader: { marginBottom: 16 },
  chartTitle: { fontSize: 18, fontWeight: '600' },
  chart: { borderRadius: SIZES.radius },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoText: { fontSize: 16, fontWeight: '500' },
  errorContainer: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '600' },
});
