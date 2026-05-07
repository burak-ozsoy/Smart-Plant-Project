import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LineChart } from 'react-native-chart-kit';
import { SIZES } from '../constants/theme';
import { MOCK_CHART_DATA } from '../constants/mockData';
import { useThemeColors } from '../hooks/useThemeColors';

const screenWidth = Dimensions.get('window').width - SIZES.padding * 2;

const SensorChart = ({ title, data, color, colors, isDark }: any) => {
  const chartConfig = {
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => color,
    labelColor: (opacity = 1) => colors.textSecondary,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  return (
    <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={[styles.chartContainer, { borderColor: colors.cardBorder }]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <LineChart
        data={{
          labels: MOCK_CHART_DATA.labels,
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
};

export default function AnalyticsScreen() {
  const { colors, isDark } = useThemeColors();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Analytics</Text>
      <SensorChart title="Temperature" data={MOCK_CHART_DATA.temperature} color={colors.warning} colors={colors} isDark={isDark} />
      <SensorChart title="Humidity" data={MOCK_CHART_DATA.humidity} color={colors.secondary} colors={colors} isDark={isDark} />
      <SensorChart title="Light Intensity" data={MOCK_CHART_DATA.light} color={colors.warning} colors={colors} isDark={isDark} />
      <SensorChart title="Soil Moisture" data={MOCK_CHART_DATA.soil} color={colors.primary} colors={colors} isDark={isDark} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SIZES.padding, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, marginTop: 10 },
  chartContainer: {
    paddingVertical: 20, paddingHorizontal: 16, marginBottom: 20,
    borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1,
  },
  chartHeader: { marginBottom: 16 },
  chartTitle: { fontSize: 18, fontWeight: '600' },
  chart: { borderRadius: SIZES.radius },
});
