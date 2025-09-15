import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage, LangCode } from '@/contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import Step1 from '@/components/onboarding/Step1';
import Step2 from '@/components/onboarding/Step2';
import Step3 from '@/components/onboarding/Step3';

interface OnboardingData {
  nickname: string;
  language: LangCode;
  currency: string;
  accountName: string;
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const { language: initialLanguage, setLanguage } = useLanguage();

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    nickname: '',
    language: (initialLanguage as LangCode) || 'zh',
    currency: 'CNY',
    accountName: initialLanguage === 'zh' ? '现金' : 'Cash',
  });
  const { colors } = useTheme();
  const { finishOnboarding } = useUser();
  const router = useRouter();

  const handleLanguageChange = (lang: LangCode) => {
    setOnboardingData(prev => ({
      ...prev,
      language: lang,
      accountName: prev.accountName === '现金' || prev.accountName === 'Cash'
        ? (lang === 'zh' ? '现金' : 'Cash')
        : prev.accountName,
    }));
    setLanguage(lang);
  };

  const handleDataChange = (data: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  const handleNextStep1 = (data: { nickname: string }) => {
    handleDataChange(data);
    setStep(2);
  };

  const handleNextStep2 = (data: { currency: string, accountName: string }) => {
    handleDataChange(data);
    setStep(3);
  };

  const handleFinish = async () => {
    await finishOnboarding(onboardingData.nickname, onboardingData.currency, onboardingData.accountName);
    router.replace('/(tabs)');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1 onNext={handleNextStep1} language={onboardingData.language} onLanguageChange={handleLanguageChange} />;
      case 2:
        return <Step2 onNext={handleNextStep2} data={onboardingData} onDataChange={(d) => handleDataChange(d)} onLanguageChange={handleLanguageChange} />;
      case 3:
        return <Step3 onNext={handleFinish} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {renderStep()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
});