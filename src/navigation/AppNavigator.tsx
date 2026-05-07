import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import CameraScreen from '../screens/CameraScreen';
import { useThemeColors } from '../hooks/useThemeColors';

const Tab = createMaterialTopTabNavigator();

export default function AppNavigator() {
  const { colors, isDark, toggleTheme } = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Smart Plant</Text>
          <MaterialCommunityIcons name="sprout" size={32} color={colors.primary} style={styles.headerIcon} />
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <MaterialCommunityIcons 
            name={isDark ? "weather-sunny" : "weather-night"} 
            size={28} 
            color={colors.textPrimary} 
          />
        </TouchableOpacity>
      </View>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: [styles.tabBar, { backgroundColor: colors.background }],
            tabBarActiveTintColor: colors.tabBarActive,
            tabBarInactiveTintColor: colors.tabBarInactive,
            tabBarIndicatorStyle: [styles.tabBarIndicator, { backgroundColor: colors.tabBarActive }],
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        >
          <Tab.Screen name="Sensors" component={DashboardScreen} />
          <Tab.Screen name="Analytics" component={AnalyticsScreen} />
          <Tab.Screen name="Insights" component={InsightsScreen} />
          <Tab.Screen name="Camera" component={CameraScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggle: {
    padding: 4,
  },
  headerIcon: {
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tabBar: {
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  tabBarIndicator: {
    height: 2,
    borderRadius: 2,
    width: 0.4, 
    marginLeft: 15,
  },
  tabBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'none',
  },
});
