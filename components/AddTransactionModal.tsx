import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { X, DollarSign } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, Transaction } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  editTransaction?: Transaction;
}

const categories = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'health',
  'education',
  'salary',
  'freelance',
  'investment',
  'other',
];

export default function AddTransactionModal({ visible, onClose, editTransaction }: AddTransactionModalProps) {
  const { t } = useLanguage();
  const { addTransaction, updateTransaction, getCurrencySymbol } = useTransactions();
  const { colors } = useTheme();
  
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');

  const isEditing = !!editTransaction;
  const currencySymbol = getCurrencySymbol();

  // Load edit data when modal opens
  React.useEffect(() => {
    if (editTransaction && visible) {
      setType(editTransaction.type);
      setAmount(editTransaction.amount.toString());
      setCategory(editTransaction.category);
      setDescription(editTransaction.description);
    } else if (!editTransaction && visible) {
      // Reset form for new transaction
      setType('expense');
      setAmount('');
      setCategory('food');
      setDescription('');
    }
  }, [editTransaction, visible]);

  const handleSave = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('错误', '请输入有效金额');
      return;
    }

    const transaction: Omit<Transaction, 'id'> = {
      type,
      amount: parseFloat(amount),
      category,
      description: description.trim(),
      date: new Date(),
    };

    if (isEditing && editTransaction) {
      updateTransaction(editTransaction.id, transaction);
    } else {
      addTransaction(transaction);
    }
    
    // Reset form
    setType('expense');
    setAmount('');
    setCategory('food');
    setDescription('');
    
    onClose();
  };

  const TypeButton = ({ 
    transactionType, 
    label, 
    color 
  }: { 
    transactionType: 'income' | 'expense'; 
    label: string; 
    color: string; 
  }) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        { backgroundColor: colors.inputBackground, borderColor: colors.border },
        type === transactionType && { backgroundColor: color, borderColor: color },
      ]}
      onPress={() => setType(transactionType)}
    >
      <Text
        style={[
          styles.typeButtonText,
          { color: colors.textSecondary },
          type === transactionType && { color: '#FFFFFF' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const CategoryButton = ({ categoryKey }: { categoryKey: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        { backgroundColor: colors.inputBackground, borderColor: colors.border },
        category === categoryKey && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
      onPress={() => setCategory(categoryKey)}
    >
      <Text
        style={[
          styles.categoryButtonText,
          { color: colors.textSecondary },
          category === categoryKey && { color: '#FFFFFF', fontWeight: '600' },
        ]}
      >
        {t(categoryKey)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.modalBackground }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEditing ? t('editTransaction') : t('addTransaction')}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>交易类型</Text>
            <View style={styles.typeContainer}>
              <TypeButton
                transactionType="expense"
                label={t('expense')}
                color={colors.expense}
              />
              <TypeButton
                transactionType="income"
                label={t('income')}
                color={colors.income}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('amount')}</Text>
            <View style={[styles.amountContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{currencySymbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                autoFocus={!isEditing}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('category')}</Text>
            <View style={styles.categoryContainer}>
              {categories.map(cat => (
                <CategoryButton key={cat} categoryKey={cat} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('description')}</Text>
            <TextInput
              style={[styles.descriptionInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="备注信息（可选）"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{isEditing ? t('update') : t('save')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionInput: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});