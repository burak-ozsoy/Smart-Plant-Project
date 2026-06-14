import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, StyleSheet, View, Text, TouchableOpacity, Animated, AppState, LayoutAnimation, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import DashboardScreen from '../screens/DashboardScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import CameraScreen from '../screens/CameraScreen';
import AuthScreen from '../screens/AuthScreen';
import { useThemeColors } from '../hooks/useThemeColors';
import { useFirebase } from '../context/FirebaseContext';
import LeafLoader from '../components/LeafLoader';

const Tab = createMaterialTopTabNavigator();

export default function AppNavigator() {
  const { colors, isDark, toggleTheme } = useThemeColors();
  const { user, logout, loading: firebaseLoading, deviceId, userDoc, sensors } = useFirebase();

  const [showWelcome, setShowWelcome] = React.useState(false);
  const [welcomeTimerStarted, setWelcomeTimerStarted] = React.useState(false);
  const [showGoodbye, setShowGoodbye] = React.useState(false);
  const [goodbyeName, setGoodbyeName] = React.useState('');
  const [appState, setAppState] = React.useState(AppState.currentState);

  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const fadeScaleAnim = React.useRef(new Animated.Value(0)).current;

  // Trigger smooth layout animations on state transitions
  React.useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [showWelcome, showGoodbye, user]);

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out of your account?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            const name = userDoc?.name || user?.displayName || "User";
            setGoodbyeName(name);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowGoodbye(true);
            setWelcomeTimerStarted(false);

            // Reset and trigger mount animation for goodbye screen
            fadeScaleAnim.setValue(0);
            Animated.timing(fadeScaleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }).start();

            // Show goodbye overlay briefly, then log out
            setTimeout(async () => {
              try {
                await logout();
              } catch (err) {
                console.error("Logout error:", err);
              } finally {
                setShowGoodbye(false);
              }
            }, 2200);
          }
        }
      ]
    );
  };

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  React.useEffect(() => {
    if (user && !welcomeTimerStarted) {
      setShowWelcome(true);
      setWelcomeTimerStarted(true);

      // Start mount animations (fade & scale)
      Animated.timing(fadeScaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start();

      // Start looping float animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start looping rotation (sway) animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
    if (!user) {
      setShowWelcome(false);
      setWelcomeTimerStarted(false);
      floatAnim.setValue(0);
      rotateAnim.setValue(0);
      fadeScaleAnim.setValue(0);
    }
  }, [user]);

  let content;

  if (showGoodbye) {
    const translateY = floatAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-12, 12],
    });

    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['-6deg', '6deg'],
    });

    const opacity = fadeScaleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.08],
    });

    const scale = fadeScaleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1.15],
    });

    content = (
      <View style={[styles.welcomeContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
        
        {/* Animated Background Leaf */}
        <Animated.View
          style={[
            styles.welcomeBgContainer,
            {
              opacity,
              transform: [{ translateY }, { rotate }, { scale }],
            }
          ]}
        >
          <MaterialCommunityIcons name="leaf" size={260} color={colors.primary} />
        </Animated.View>

        {/* Goodbye Foreground Content */}
        <View style={styles.welcomeContent}>
          <MaterialCommunityIcons name="leaf-off" size={80} color={colors.danger} style={styles.welcomeIcon} />
          <Text style={[styles.welcomeTitle, { color: colors.textSecondary }]}>Goodbye,</Text>
          <Text style={[styles.welcomeName, { color: colors.textPrimary }]}>
            {goodbyeName}
          </Text>
        </View>
      </View>
    );
  } else if (firebaseLoading && !user) {
    content = (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LeafLoader size="large" color={colors.primary} />
      </View>
    );
  } else if (!user) {
    content = <AuthScreen />;
  } else if (showWelcome) {
    const displayName = userDoc?.name || user?.displayName || "";

    const translateY = floatAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-12, 12],
    });

    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['-6deg', '6deg'],
    });

    const opacity = fadeScaleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.08],
    });

    const scale = fadeScaleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1.15],
    });

    content = (
      <View style={[styles.welcomeContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
        
        {/* Animated Background Leaf */}
        <Animated.View
          style={[
            styles.welcomeBgContainer,
            {
              opacity,
              transform: [{ translateY }, { rotate }, { scale }],
            }
          ]}
        >
          <MaterialCommunityIcons name="leaf" size={260} color={colors.primary} />
        </Animated.View>

        {/* Welcome Foreground Content */}
        <View style={styles.welcomeContent}>
          <MaterialCommunityIcons name="sprout" size={80} color={colors.primary} style={styles.welcomeIcon} />
          <Text style={[styles.welcomeTitle, { color: colors.textSecondary }]}>Welcome,</Text>
          <Text style={[styles.welcomeName, { color: colors.textPrimary }]}>
            {displayName || "User"}
          </Text>
        </View>
      </View>
    );
  } else {
    content = (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Smart Plant</Text>
            <MaterialCommunityIcons name="sprout" size={32} color={colors.primary} style={styles.headerIcon} />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
              <MaterialCommunityIcons
                name="logout"
                size={26}
                color={colors.danger}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
              <MaterialCommunityIcons
                name={isDark ? "weather-sunny" : "weather-night"}
                size={28}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              tabBarStyle: [
                styles.tabBar, 
                { 
                  backgroundColor: colors.background,
                  display: deviceId ? 'flex' : 'none'
                }
              ],
              tabBarActiveTintColor: colors.tabBarActive,
              tabBarInactiveTintColor: colors.tabBarInactive,
              tabBarIndicatorStyle: [styles.tabBarIndicator, { backgroundColor: colors.tabBarActive }],
              tabBarLabelStyle: styles.tabBarLabel,
            }}
          >
            <Tab.Screen name="Sensors" component={DashboardScreen} />
            <Tab.Screen name="Analytics" component={AnalyticsScreen} />
            <Tab.Screen 
              name="Insights" 
              component={InsightsScreen} 
              options={{
                tabBarLabel: ({ color }) => {
                  const isHealthy = sensors ? (
                    sensors.soilMoisture >= 30 && 
                    sensors.soilMoisture <= 80 && 
                    sensors.temperature >= 15 && 
                    sensors.temperature <= 32 &&
                    sensors.lightLevel >= 30 &&
                    sensors.lightLevel <= 80
                  ) : true;

                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.tabBarLabel, { color }]}>Insights</Text>
                      {!isHealthy && (
                        <View style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.danger,
                          marginLeft: 4,
                        }} />
                      )}
                    </View>
                  );
                }
              }}
            />
            <Tab.Screen name="Camera" component={CameraScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {content}
      {(appState === 'inactive' || appState === 'background') && (
        <View style={[styles.privacyOverlay, { backgroundColor: colors.background }]}>
          <MaterialCommunityIcons name="leaf" size={120} color={colors.primary} />
        </View>
      )}
    </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 4,
    marginRight: 12,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  welcomeBgContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  welcomeContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  welcomeIcon: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  welcomeName: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  privacyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
});
