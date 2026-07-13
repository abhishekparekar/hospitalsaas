import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import LoginScreen from './login';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [isImpersonated, setIsImpersonated] = useState(false);

  useEffect(() => {
    // Check local storage for impersonation on web environments
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const impId = window.localStorage.getItem('impersonate_tenant_id');
      if (impId) {
        setIsImpersonated(true);
      }
    }

    const subscriber = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setInitializing(false);
      SplashScreen.hideAsync();
    });
    return subscriber; // unsubscribe on unmount
  }, []);

  const handleExitImpersonation = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('impersonate_tenant_id');
      window.location.reload();
    }
  };

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {isImpersonated && (
        <View style={styles.impersonateBanner}>
          <Text style={styles.impersonateText}>⚠️ IMPERSONATION ACTIVE (Android Dev View)</Text>
          <TouchableOpacity style={styles.exitBtn} onPress={handleExitImpersonation}>
            <Text style={styles.exitBtnText}>Exit</Text>
          </TouchableOpacity>
        </View>
      )}
      {user || isImpersonated ? <AppTabs /> : <LoginScreen />}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  impersonateBanner: {
    backgroundColor: '#f59e0b',
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  impersonateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  exitBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exitBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});
