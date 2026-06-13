import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/context/ThemeContext';
import { FirebaseProvider } from './src/context/FirebaseContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FirebaseProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </FirebaseProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
