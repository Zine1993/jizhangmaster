import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { LangCode } from '@/contexts/LanguageContext';

interface Step1Props {
  onNext: (data: { nickname: string }) => void;
  language: LangCode;
  onLanguageChange: (lang: LangCode) => void;
}

export default function Step1({ onNext, language, onLanguageChange }: Step1Props) {
  const [name, setName] = useState(() => {
    const n = Math.floor(1000 + Math.random() * 9000);
    return `user${n}`;
  });
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('onboarding.step1.title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.step1.subtitle')}</Text>

      <LanguageSelector selectedLang={language} onSelectLang={onLanguageChange} />
      
      <TextInput
        style={styles.input}
        placeholder={t('onboarding.step1.placeholder')}
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity disabled={!name.trim()} style={[styles.button, { opacity: name.trim() ? 1 : 0.5 }]} onPress={() => onNext({ nickname: name.trim() })}>
        <Text style={styles.buttonText}>{t('onboarding.next')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 20,
        color: '#FFFFFFB3', // White with 70% opacity
        textAlign: 'center',
        marginBottom: 40,
    },
    input: {
        backgroundColor: '#FFFFFF',
        color: '#000000',
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 20,
        fontSize: 16,
        marginBottom: 20,
        width: '100%',
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});