import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { X } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, Transaction } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { useEmojiRain } from '@/contexts/EmojiRainContext';

const currencies = [
  { code: 'CNY', name: '人民币', symbol: '¥' }, { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' }, { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }, { code: 'KRW', name: 'Korean Won', symbol: '₩' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' }, { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' }, { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' }, { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' }, { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' }, { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' }, { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' }, { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' }, { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' }, { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
];

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  editTransaction?: Transaction;
}

const expenseCategories = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'health',
  'education',
  'other',
];

const incomeCategories = [
  'salary',
  'freelance',
  'investment',
  'other',
];

export default function AddTransactionModal({ visible, onClose, editTransaction }: AddTransactionModalProps) {
  const { t } = useLanguage();
  const { addTransaction, updateTransaction, getCurrencySymbol, emotions, accounts } = useTransactions();
  const { colors } = useTheme();
  const { triggerEmojiRain } = useEmojiRain();

  const effectiveEmotions = emotions && emotions.length ? emotions : [
    { id: 'happy', name: '开心', emoji: '😊' },
    { id: 'anxious', name: '焦虑', emoji: '😰' },
    { id: 'lonely', name: '孤独', emoji: '😔' },
    { id: 'bored', name: '无聊', emoji: '😑' },
    { id: 'reward', name: '奖励自己', emoji: '🎉' },
    { id: 'stress', name: '压力大', emoji: '😣' },
    { id: 'excited', name: '兴奋', emoji: '😄' },
    { id: 'sad', name: '难过', emoji: '😢' },
  ];
  
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [emotion, setEmotion] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');

  const isEditing = !!editTransaction;
  const scrollRef = useRef<any>(null);

  const selectedAccount = useMemo(() => {
    return accounts?.find(a => a.id === accountId);
  }, [accountId, accounts]);

  const symbolOf = useCallback((code: string | undefined) => {
    if (!code) return getCurrencySymbol();
    return currencies.find(c => c.code === code)?.symbol || code;
  }, [getCurrencySymbol]);

  const currencySymbol = symbolOf(selectedAccount?.currency);

  useEffect(() => {
    if (editTransaction && visible) {
      setType(editTransaction.type);
      setAmount(String(editTransaction.amount));
      setCategory(editTransaction.category);
      setDescription(editTransaction.description || '');
      setEmotion(editTransaction.emotion || '');
      setAccountId((editTransaction as any).accountId || '');
    } else if (!editTransaction && visible) {
      setType('expense');
      setAmount('');
      setCategory('food');
      setDescription('');
      setEmotion('');
      setAccountId((accounts?.[0]?.id) || '');
    }
  }, [editTransaction, visible]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        try {
          scrollRef.current?.scrollTo?.({ y: 0, animated: false });
        } catch {}
      }, 0);
    }
  }, [visible]);

  const handleSave = () => {
    if (!amount || isNaN(Number(amount)) || parseFloat(amount) <= 0) {
      const title = (t && t('amountInvalidTitle')) || 'Error';
      const msg = (t && t('amountInvalidMessage')) || 'Please enter a valid amount';
      Alert.alert(title, msg);
      return;
    }

    if (!emotion || emotion.trim() === '') {
      const et = (t && (t('emotionRequiredTitle') || t('error'))) || '提示';
      const em = (t && (t('emotionRequiredMessage') || t('pleaseSelectEmotion'))) || '请选择一个情绪';
      Alert.alert(et, em);
      return;
    }

    const finalAccountId = accountId || accounts?.[0]?.id;
    if (!finalAccountId) {
      Alert.alert(t('noAccountAvailableTitle') || '无可用账户', t('noAccountAvailableMessage') || '请先在设置中添加一个账户');
      return;
    }
    const finalAccount = accounts?.find(a => a.id === finalAccountId);
    if (!finalAccount) {
      // This should not happen if logic is correct
      Alert.alert('Error', 'Selected account not found.');
      return;
    }

    const list = type === 'expense' ? expenseCategories : incomeCategories;
    const safeCategory = (category && list.includes(category)) ? category : list[0];

    const tx: Omit<Transaction, 'id'> = {
      type,
      amount: parseFloat(amount),
      category: safeCategory,
      description: description.trim(),
      date: new Date(),
      emotion: emotion || '',
      accountId: finalAccountId,
      // @ts-ignore
      currency: finalAccount.currency,
    };

    if (isEditing && editTransaction) {
      updateTransaction(editTransaction.id, tx);
    } else {
      addTransaction(tx);
      // 触发表情雨：根据所选情绪名称在有效情绪中查找 emoji，找不到则使用默认
      const emojiChar = (effectiveEmotions.find(e => e.name === (emotion || ''))?.emoji) || '🙂';
      triggerEmojiRain(emojiChar, { count: 16, duration: 3000, size: 28 });
    }
    setType('expense');
    setAmount('');
    setCategory('food');
    setDescription('');
    setEmotion('');
    onClose();
  };

  const TypeButton = ({
    transactionType,
    label,
    color,
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
      onPress={() => {
        setType(transactionType);
        const list = transactionType === 'expense' ? expenseCategories : incomeCategories;
        setCategory((prev) => (list.includes(prev) ? prev : list[0]));
      }}
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

  const EmotionTag = ({ name, emoji }: { name: string; emoji: string }) => (
    <TouchableOpacity
      style={[
        styles.emotionTag,
        { borderColor: colors.border, backgroundColor: colors.inputBackground },
        emotion === name && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
      ]}
      onPress={() => setEmotion(name)}
    >
      <Text style={{ fontSize: 16, marginRight: 6 }}>{emoji}</Text>
      {(() => {
        const translated = t(name);
        return <Text style={{ color: colors.text }}>{!translated || translated === '...' ? name : translated}</Text>;
      })()}
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

        <ScrollView
          ref={scrollRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{(() => { const s = t('transactionType'); return s && s !== '...' ? s : '交易类型'; })()}</Text>
            <View style={styles.typeContainer}>
              <TypeButton transactionType="expense" label={t('expense')} color={colors.expense} />
              <TypeButton transactionType="income" label={t('income')} color={colors.income} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{(() => { const s = t('account'); return s && s !== '...' ? s : '账户'; })()}</Text>
            <View style={styles.emotionContainer}>
              {(accounts || []).map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.emotionTag,
                    { borderColor: colors.border, backgroundColor: colors.inputBackground },
                    accountId === a.id && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                  ]}
                  onPress={() => setAccountId(a.id)}
                >
                  <Text style={{ color: colors.text }}>{a.name}</Text>
                </TouchableOpacity>
              ))}
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
                autoFocus={false}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('category')}</Text>
            <View style={styles.categoryContainer}>
              {(type === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
                <CategoryButton key={cat} categoryKey={cat} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{(() => { const s = t('currentEmotion'); return s && s !== '...' ? s : '当前情绪'; })()}</Text>
            <View style={styles.emotionContainer}>
              {effectiveEmotions.map((e) => (
                <EmotionTag key={e.id} name={e.name} emoji={e.emoji} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('description')}</Text>
            <TextInput
              style={[styles.descriptionInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder={(() => { const s = t('notePlaceholder'); return s && s !== '...' ? s : '备注信息（可选）'; })()}
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
          <View style={{ flex: 1 }}>
            <PrimaryButton label={isEditing ? t('update') : t('save')} onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600' },
  placeholder: { width: 40 },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  typeContainer: { flexDirection: 'row', gap: 12 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeButtonText: { fontSize: 16, fontWeight: '600' },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  currencySymbol: { fontSize: 18, fontWeight: '600', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '600' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  categoryButtonText: { fontSize: 14, fontWeight: '500' },
  emotionContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emotionTag: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1 },
  descriptionInput: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, fontSize: 16, textAlignVertical: 'top', minHeight: 80 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '500' },
});