import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, Transaction } from '@/contexts/TransactionContext';
import AddTransactionModal from '@/components/AddTransactionModal';
import TransactionItem from '@/components/TransactionItem';
import { useTheme } from '@/contexts/ThemeContext';

export default function HomeScreen() {
  const { t } = useLanguage();
  const { transactions, getMonthlyStats, getCurrencySymbol } = useTransactions();
  const { colors } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  const { income, expense, balance } = getMonthlyStats();
  const recentTransactions = transactions.slice(0, 5);
  const currencySymbol = getCurrencySymbol();

  const StatCard = ({ 
    title, 
    amount, 
    icon, 
    color 
  }: { 
    title: string; 
    amount: number; 
    icon: React.ReactNode; 
    color: string; 
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        {icon}
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statAmount, { color }]}>
        {currencySymbol}{amount.toFixed(2)}
      </Text>
    </View>
  );

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTransaction(undefined);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.greeting}>{t('balance')}</Text>
          <Text style={styles.balanceAmount}>{currencySymbol}{balance.toFixed(2)}</Text>
          <Text style={styles.monthLabel}>{t('thisMonth')}</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            title={t('totalIncome')}
            amount={income}
            icon={<TrendingUp size={20} color={colors.income} />}
            color={colors.income}
          />
          <StatCard
            title={t('totalExpense')}
            amount={expense}
            icon={<TrendingDown size={20} color={colors.expense} />}
            color={colors.expense}
          />
        </View>

        <View style={[styles.recentSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recentTransactions')}</Text>
          
          {recentTransactions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Wallet size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>{t('noTransactions')}</Text>
              <Text style={[styles.emptyStateSubText, { color: colors.textTertiary }]}>{t('addFirst')}</Text>
            </View>
          ) : (
            <FlatList
              data={recentTransactions}
              renderItem={({ item }) => <TransactionItem transaction={item} onEdit={handleEditTransaction} />}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingTransaction(undefined);
          setShowAddModal(true);
        }}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <AddTransactionModal
        visible={showAddModal}
        onClose={handleCloseModal}
        editTransaction={editingTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.9,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  monthLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  recentSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});