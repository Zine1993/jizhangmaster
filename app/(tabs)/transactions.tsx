import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Settings } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, Transaction } from '@/contexts/TransactionContext';
import AddTransactionModal from '@/components/AddTransactionModal';
import TransactionItem from '@/components/TransactionItem';
import { useTheme } from '@/contexts/ThemeContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import Fab from '@/components/ui/Fab';

export default function TransactionsScreen() {
  const { t } = useLanguage();
  const router = useRouter();
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

  const sections = Object.entries(groupedTransactions).map(([date, txs]) => ({
    title: date,
    data: txs,
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
    <View style={[styles.sectionHeader, { backgroundColor: colors.sectionBackground }]} >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} > { title } </Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} >
      <GradientHeader
        variant="emojiTicker"
        right={
          <TouchableOpacity onPress={() => router.push('/settings')} style={{ padding: 8 }}>
            <Settings size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      <Card padding={16}>
        <Text style={[styles.pageTitle, { color: colors.text }]} > { t('transactions') } </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }} > { t('recordsSubtitle') } </Text>
      </Card>
      {transactions.length === 0 ? (
        <Card>
          <View style={styles.emptyState}>
            <Search size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]} > { t('noTransactions') } </Text>
            <Text style={[styles.emptyStateSubText, { color: colors.textTertiary }]} > { t('addFirst') } </Text>
          </View>
        </Card>
      ) : (
        <Card padding={0} style={{ flex: 1 }}>
          <FlatList
            data={sections}
            renderItem={renderSection}
            keyExtractor={item => item.title}
            style={{ paddingHorizontal: 16, paddingTop: 12 }}
            contentContainerStyle={{ paddingBottom: 95 }}
            showsVerticalScrollIndicator={false}
          />
        </Card>
      )}

      <AddTransactionModal
        visible={showAddModal}
        onClose={handleCloseModal}
        editTransaction={editingTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 16,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
});