import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import TransactionItem from '@/components/TransactionItem';

export default function Step3({ onNext }: { onNext: () => void }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors);

  const [visible, setVisible] = useState(true);

  // 构造一条虚拟交易，样式与列表一致
  const fakeTx = {
    id: 'onboarding-demo',
    type: 'expense',
    amount: 5,
    date: new Date().toISOString(),
    category: 'Sample',
    description: String(t('onboarding.step3.sampleTransactionSubtext') || 'Swipe or long-press to delete'),
    emotion: null,
    accountId: 'default',
    currency: 'CNY',
  } as any;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('onboarding.step3.title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.step3.subtitle')}</Text>
      {visible ? (
        <TransactionItem
          transaction={fakeTx}
          onDelete={() => { setVisible(false); onNext(); }}
        />
      ) : null}
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
    // 复用列表组件样式，删除本地卡片样式
});