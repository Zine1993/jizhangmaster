import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { LangCode } from '@/contexts/LanguageContext';

interface Step2Props {
  onNext: (data: { currency: string, accountName: string }) => void;
  data: {
    language: LangCode;
    currency: string;
    accountName: string;
  };
  onDataChange: (data: Partial<{ currency: string; accountName: string; }>) => void;
  onLanguageChange: (lang: LangCode) => void;
}

export default function Step2({ onNext, data, onDataChange, onLanguageChange }: Step2Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { language, currency, accountName } = data;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('onboarding.step2.title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.step2.subtitle')}</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{t('onboarding.step2.language')}</Text>
        <LanguageSelector selectedLang={language} onSelectLang={onLanguageChange} />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{t('onboarding.step2.currency')}</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={currency}
            style={styles.picker}
            onValueChange={(itemValue: string) => onDataChange({ currency: itemValue })}
            dropdownIconColor={colors.textSecondary}
          >
            <Picker.Item label="USD ($)" value="USD" color="#000" />
            <Picker.Item label="CNY (¥)" value="CNY" color="#000" />
            <Picker.Item label="EUR (€)" value="EUR" color="#000" />
            <Picker.Item label="JPY (¥)" value="JPY" color="#000" />
            <Picker.Item label="GBP (£)" value="GBP" color="#000" />
          </Picker>
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{t('onboarding.step2.account')}</Text>
        <TextInput
            style={styles.input}
            placeholder={t('onboarding.step2.accountPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={accountName}
            onChangeText={(text) => onDataChange({ accountName: text })}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, { marginTop: 10 }]}
        onPress={() => onNext({ currency, accountName })}
      >
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
        color: '#FFFFFFB3',
        textAlign: 'center',
        marginBottom: 40,
    },
    fieldContainer: {
        marginBottom: 20,
        width: '100%',
    },
    label: {
        fontSize: 16,
        color: '#FFFFFFB3',
        marginBottom: 8,
        fontWeight: '500',
    },
    pickerWrapper: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        width: '100%',
        overflow: 'hidden',
    },
    picker: {
        width: '100%',
        height: '100%',
        color: '#000000',
    },
    input: {
        backgroundColor: '#FFFFFF',
        color: '#000000',
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 20,
        fontSize: 16,
        width: '100%',
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});