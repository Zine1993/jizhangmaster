import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ShoppingCart, Car, Utensils, Gamepad2, Heart, GraduationCap, Banknote, Briefcase, TrendingUp, MoveHorizontal as MoreHorizontal } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Transaction, useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
}

const categoryIcons: Record<string, React.ComponentType<any>> = {
  food: Utensils,
  transport: Car,
  shopping: ShoppingCart,
  entertainment: Gamepad2,
  health: Heart,
  education: GraduationCap,
  salary: Banknote,
  freelance: Briefcase,
  investment: TrendingUp,
  other: MoreHorizontal,
};

export default function TransactionItem({ transaction, onEdit }: TransactionItemProps) {
  const { t } = useLanguage();
  const { deleteTransaction, getCurrencySymbol } = useTransactions();
  const { colors } = useTheme();
  
  const IconComponent = categoryIcons[transaction.category] || MoreHorizontal;
  const isIncome = transaction.type === 'income';
  const color = isIncome ? colors.income : colors.expense;
  const sign = isIncome ? '+' : '-';
  const currencySymbol = getCurrencySymbol();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLongPress = () => {
    Alert.alert(
      t('editTransaction'),
      '',
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('edit'),
          onPress: () => onEdit?.(transaction),
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => handleDelete(),
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      t('delete'),
      t('deleteConfirm'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: () => deleteTransaction(transaction.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <IconComponent size={20} color={color} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.category, { color: colors.text }]}>{t(transaction.category)}</Text>
          <Text style={[styles.amount, { color }]}>
            {sign}{currencySymbol}{transaction.amount.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.details}>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {transaction.description || t(transaction.category)}
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]}>
            {formatDate(new Date(transaction.date))}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
  },
});