import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { X, ChevronDown } from 'lucide-react-native';
import PrimaryButton from '@/components/ui/PrimaryButton';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { accounts, addTransaction } = useTransactions();

  const [type, setType] = React.useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | undefined>(accounts[0]?.id);
  const [showAccountModal, setShowAccountModal] = React.useState(false);

  const handleSave = () => {
    if (!amount || !category || !selectedAccountId) {
      // Basic validation
      return;
    }
    addTransaction({
      type,
      amount: parseFloat(amount),
      category,
      description,
      date: new Date(),
      accountId: selectedAccountId,
    });
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('addTransaction')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.typeSwitch}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'expense' && { backgroundColor: colors.expense }]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.typeButtonText, { color: type === 'expense' ? '#fff' : colors.text }]}>{t('expense')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === 'income' && { backgroundColor: colors.income }]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.typeButtonText, { color: type === 'income' ? '#fff' : colors.text }]}>{t('income')}</Text>
          </TouchableOpacity>
        </View>

        {/* Account Selector */}
        <TouchableOpacity style={[styles.selector, { borderColor: colors.border }]} onPress={() => setShowAccountModal(true)}>
          <Text style={{ color: colors.text }}>
            {accounts.find(a => a.id === selectedAccountId)?.name || t('selectAccount')}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Amount Input */}
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          value={amount}
          onChangeText={setAmount}
          placeholder={t('amount')}
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
        />

        {/* Category Input */}
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          value={category}
          onChangeText={setCategory}
          placeholder={t('category')}
          placeholderTextColor={colors.textTertiary}
        />

        {/* Description Input */}
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('descriptionOptional')}
          placeholderTextColor={colors.textTertiary}
        />

        <PrimaryButton label={t('save')} onPress={handleSave} style={{ marginTop: 24 }} />
      </View>

      <Modal transparent visible={showAccountModal} animationType="fade" onRequestClose={() => setShowAccountModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowAccountModal(false)} activeOpacity={1}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('selectAccount')}</Text>
            {accounts.map(account => (
              <TouchableOpacity
                key={account.id}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedAccountId(account.id);
                  setShowAccountModal(false);
                }}
              >
                <Text style={{ color: colors.text }}>{account.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333', // Or use theme color
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  typeSwitch: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonText: {
    fontWeight: 'bold',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalOption: {
    paddingVertical: 12,
  },
});