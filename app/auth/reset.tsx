import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AuthResetBridge() {
  const router = useRouter();
  const { recoveryPending } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    // 给 AuthContext 的 Linking 处理少许时间完成 setSession/exchangeCodeForSession
    const timer = setTimeout(() => {
      if (recoveryPending) {
        router.replace('/settings');
      } else {
        router.replace('/');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [recoveryPending, router]);

  const tip = recoveryPending
    ? (t('processingPasswordReset') as string)
    : (t('processingEmailVerification') as string);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 12, fontSize: 16, textAlign: 'center' }}>{tip}</Text>
    </View>
  );
}