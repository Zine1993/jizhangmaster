import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Root() {
  const router = useRouter();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
        // 统一进入主应用 Tab
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Failed to check onboarding status', error);
        router.replace('/(tabs)');
      }
    };

    checkOnboardingStatus();
  }, [router]);

  // Return a blank view while redirecting
  return <View />;
}