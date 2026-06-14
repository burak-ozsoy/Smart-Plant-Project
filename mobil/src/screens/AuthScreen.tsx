import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Animated, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useFirebase } from '../context/FirebaseContext';
import LeafLoader from '../components/LeafLoader';

const getFriendlyErrorMessage = (errorMsg: string): string => {
  if (!errorMsg) return '';
  const message = errorMsg.toLowerCase();
  
  if (message.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('auth/user-not-found') || message.includes('auth/wrong-password') || message.includes('auth/invalid-credential')) {
    return 'Incorrect email address or password.';
  }
  if (message.includes('auth/email-already-in-use')) {
    return 'This email address is already in use.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Password must be at least 6 characters.';
  }
  if (message.includes('auth/network-request-failed')) {
    return 'Network error. Please check your internet connection.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Too many failed attempts. Please try again later.';
  }
  
  return errorMsg.replace(/FirebaseError:\s*Firebase:\s*Error\s*\((.*?)\)\.?/, '$1');
};

export default function AuthScreen() {
  const { colors, isDark } = useThemeColors();
  const { login, signUp, sendPasswordReset } = useFirebase();

  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation state for error alert entry
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (error) {
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [error]);

  const handleAuth = async () => {
    setError(null);

    // Validation
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (isForgotPassword) {
      setLoading(true);
      try {
        await sendPasswordReset(cleanEmail);
        Alert.alert(
          "Password Reset Sent",
          "A password reset link has been sent to your email address.",
          [{ text: "OK", onPress: () => setIsForgotPassword(false) }]
        );
      } catch (err: any) {
        setError(getFriendlyErrorMessage(err.message || err.toString()));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError("Please fill in all fields.");
      return;
    }

    if (isSignUp) {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(name.trim(), cleanEmail, password);
      } else {
        await login(cleanEmail, password);
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" scrollEnabled={false}>
        {/* Minimal Botanical Outline Background */}
        <View style={styles.bgIconContainerTR}>
          <MaterialCommunityIcons name={"leaf" as any} size={480} color={colors.primary + '06'} />
        </View>
        <View style={styles.bgIconContainerBL}>
          <MaterialCommunityIcons name={"sprout" as any} size={380} color={colors.primary + '04'} />
        </View>

        <View style={styles.header}>
          <MaterialCommunityIcons name="sprout" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Smart Plant</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isForgotPassword 
              ? "Enter your email to receive a password reset link" 
              : isSignUp 
                ? "Create a new account to monitor your plant" 
                : "Sign in to connect to your smart plant"}
          </Text>
        </View>

        <BlurView
          intensity={isDark ? 30 : 60}
          tint={isDark ? "dark" : "light"}
          style={[styles.authCard, { borderColor: colors.cardBorder }]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {isForgotPassword ? "Reset Password" : isSignUp ? "Sign Up" : "Login"}
          </Text>

          {error && (
            <Animated.View style={[
              styles.errorContainer,
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-15, 0]
                  })
                }],
                backgroundColor: colors.danger + '12',
                borderColor: colors.danger + '40',
              }
            ]}>
              <View style={styles.errorContent}>
                <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} style={styles.errorIcon} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
              <TouchableOpacity onPress={() => setError(null)} style={styles.errorClose} activeOpacity={0.7}>
                <MaterialCommunityIcons name="close" size={18} color={colors.danger} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {!isForgotPassword && isSignUp && (
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Full Name"
                placeholderTextColor={colors.tabBarInactive}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError(null);
                }}
                editable={!loading}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Email"
              placeholderTextColor={colors.tabBarInactive}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {!isForgotPassword && (
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Password"
                placeholderTextColor={colors.tabBarInactive}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          )}

          {!isForgotPassword && isSignUp && (
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-check" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.tabBarInactive}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          )}

          {!isSignUp && !isForgotPassword && (
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => {
                setIsForgotPassword(true);
                setError(null);
              }}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotButtonText, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <LeafLoader size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Login"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
              } else {
                setIsSignUp(!isSignUp);
              }
              setError(null);
            }}
            disabled={loading}
          >
            <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
              {isForgotPassword 
                ? "Back to " 
                : isSignUp 
                  ? "Already have an account? " 
                  : "Don't have an account? "}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {isForgotPassword ? "Login" : isSignUp ? "Login" : "Sign Up"}
              </Text>
            </Text>
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SIZES.padding,
    position: 'relative',
  },
  bgIconContainerTR: {
    position: 'absolute',
    top: -120,
    right: -160,
    transform: [{ rotate: '-35deg' }],
    zIndex: 0,
  },
  bgIconContainerBL: {
    position: 'absolute',
    bottom: -100,
    left: -120,
    transform: [{ rotate: '25deg' }],
    zIndex: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    zIndex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  authCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  toggleText: {
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorClose: {
    padding: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
