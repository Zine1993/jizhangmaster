import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Transaction, useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
}

function formatDateYYYYMMDD(date: Date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TransactionItem({ transaction, onEdit }: TransactionItemProps) {
  const { t } = useLanguage();
  const { deleteTransaction, getCurrencySymbol, emotions } = useTransactions();
  const { colors } = useTheme();

  const isIncome = transaction.type === 'income';
  const color = isIncome ? colors.income : colors.expense;
  const currencySymbol = getCurrencySymbol();
  // 当翻译缺失时避免显示为"..."，回退为原始分类名
  const translatedCategory = t(transaction.category);
  const title =
    !translatedCategory || translatedCategory === '...'
      ? (transaction.category || t('category'))
      : translatedCategory;

  const emoji = (() => {
    if (!transaction.emotion) return '🙂';
    const tag = emotions.find(e => e.name === transaction.emotion);
    return tag?.emoji || '🙂';
  })();

  const handleLongPress = () => {
    Alert.alert(
      t('editTransaction'),
      '',
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('edit'), onPress: () => onEdit?.(transaction) },
        { text: t('delete'), style: 'destructive', onPress: () => handleDelete() },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      t('delete'),
      t('deleteConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('confirm'), style: 'destructive', onPress: () => deleteTransaction(transaction.id) },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.inputBackground, shadowColor: '#000000' },
      ]}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.9}
    >
      <View style={[styles.emojiContainer, { backgroundColor: colors.surface }]}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[styles.category, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            {!!transaction.emotion && (
              <View style={[styles.emotionPill, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.emotionText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {(() => { const s = t(transaction.emotion); return s && s !== '...' ? s : transaction.emotion; })()}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.amount, { color }]} numberOfLines={1}>
            {currencySymbol}{Number(transaction.amount).toFixed(0)}
          </Text>
        </View>

        <View style={styles.details}>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {transaction.description || t(transaction.category)}
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]} numberOfLines={1}>
            {formatDateYYYYMMDD(new Date(transaction.date))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderRadius: 12,
    // subtle shadow
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  emojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emojiText: { fontSize: 22 },
  content: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  category: { fontSize: 16, fontWeight: '600', maxWidth: '70%' },
  amount: { fontSize: 16, fontWeight: '800' },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  description: { flex: 1, fontSize: 14, marginRight: 8 },
  date: { fontSize: 12 },
  emotionPill: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emotionText: { fontSize: 12, fontWeight: '600' },
});