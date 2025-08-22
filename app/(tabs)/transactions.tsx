import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import AddTransactionModal from '@/components/AddTransactionModal';
import TransactionItem from '@/components/TransactionItem';
import { useTheme } from '@/contexts/ThemeContext';

export default function TransactionsScreen() {
  const { t } = useLanguage();
  const { transactions } = useTransactions();
  const { colors } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = new Date(transaction.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;
    if (date.toDateString() === today.toDateString()) {
      dateKey = t('today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = t('yesterday');
    } else {
      dateKey = date.toLocaleDateString();
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const sections = Object.entries(groupedTransactions).map(([date, transactions]) => ({
    title: date,
    data: transactions,
  }));

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTransaction(undefined);
  };

  const renderSectionHeader = (title: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.sectionBackground }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  const renderSection = ({ item: section }: { item: typeof sections[0] }) => (
    <View>
      {renderSectionHeader(section.title)}
      {section.data.map(transaction => (
        <TransactionItem key={transaction.id} transaction={transaction} onEdit={handleEditTransaction} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('transactions')}</Text>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Search size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>{t('noTransactions')}</Text>
          <Text style={[styles.emptyStateSubText, { color: colors.textTertiary }]}>{t('addFirst')}</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={item => item.title}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

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
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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