import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { MOCK_DERIVED_DATA } from '../constants/mockData';
import { useThemeColors } from '../hooks/useThemeColors';

const InsightCard = ({ title, value, icon, color, description, colors, isDark }: any) => (
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
);

export default function InsightsScreen() {
  const { colors, isDark } = useThemeColors();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Insights</Text>
      <InsightCard 
        title="Overall Health"
        value={MOCK_DERIVED_DATA.overallStatus}
        icon="heart-pulse"
        color={colors.primary}
        description="Your plant is currently in optimal health condition. Keep up the good work!"
        colors={colors}
        isDark={isDark}
      />
      <InsightCard 
        title="Watering Need"
        value={`${MOCK_DERIVED_DATA.wateringNeed}%`}
        icon="water"
        color={colors.secondary}
        description="Soil moisture is adequate, but you may need to water the plant in about 2 days."
        colors={colors}
        isDark={isDark}
      />
      <InsightCard 
        title="Light Adequacy"
        value={MOCK_DERIVED_DATA.lightAdequacy}
        icon="white-balance-sunny"
        color={colors.warning}
        description="The plant is receiving enough light for photosynthesis during the day."
        colors={colors}
        isDark={isDark}
      />
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
});
