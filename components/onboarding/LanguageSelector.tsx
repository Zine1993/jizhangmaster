import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const LANGUAGES = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
] as const;

export type LangCode = typeof LANGUAGES[number]['code'];

interface LanguageSelectorProps {
  selectedLang: LangCode;
  onSelectLang: (langCode: LangCode) => void;
}

export default function LanguageSelector({ selectedLang, onSelectLang }: LanguageSelectorProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.langRow}>
      {LANGUAGES.map((opt) => (
        <TouchableOpacity
          key={opt.code}
          onPress={() => onSelectLang(opt.code)}
          style={[
            styles.langChip,
            { 
              borderColor: selectedLang === opt.code ? colors.primary : '#E0E0E0', 
              backgroundColor: selectedLang === opt.code ? '#ffffff' : '#F5F5F5' 
            },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.langChipText, { color: selectedLang === opt.code ? colors.primary : '#333' }]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  langChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  langChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});