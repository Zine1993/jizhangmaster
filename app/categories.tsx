import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import GradientHeader from '@/components/ui/GradientHeader';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';

type Cat = { id: string; name: string; emoji: string };
type Tab = 'expense' | 'income';

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const {
    expenseCategories,
    incomeCategories,
    addExpenseCategory,
    removeExpenseCategory,
    resetExpenseCategoriesToDefault,
    addIncomeCategory,
    removeIncomeCategory,
    resetIncomeCategoriesToDefault,
  } = useTransactions();

  const [tab, setTab] = React.useState<Tab>('expense');
  const [emoji, setEmoji] = React.useState('');
  const [name, setName] = React.useState('');

  const firstGrapheme = (s: string) => {
    try {
      const Seg: any = (Intl as any)?.Segmenter;
      if (Seg) {
        const seg = new Seg('zh', { granularity: 'grapheme' }) as any;
        const iterator = (seg.segment(String(s)) as any)[Symbol.iterator]();
        const next = iterator.next();
        const g = next && next.value && next.value.segment;
        if (g) return String(g);
      }
    } catch {}
    const arr = Array.from(String(s));
    return arr.length ? String(arr[0]) : '';
  };

  const cats: Cat[] = tab === 'expense' ? (expenseCategories as Cat[]) : (incomeCategories as Cat[]);

  const handleAdd = () => {
    const n = (name || '').trim();
    const e = firstGrapheme((emoji || '').trim());

    if (!n) {
      Alert.alert(t('nameRequired') || '请填写名称');
      return;
    }
    if (!e) {
      Alert.alert(t('emojiRequired') || '请填写表情');
      return;
    }
    const list = cats;
    if (list.some(c => c.name === n)) {
      Alert.alert(t('duplicateName') || '名称已存在');
      return;
    }

    if (tab === 'expense') addExpenseCategory(n, e);
    else addIncomeCategory(n, e);
    setEmoji('');
    setName('');
  };

  const handleRemove = (id: string, n: string) => {
    Alert.alert(
      t('confirm') || '确认',
      (t('deleteConfirm') as string) || `确定要删除“${n}”吗？`,
      [
        { text: t('cancel') || '取消', style: 'cancel' },
        {
          text: t('delete') || '删除',
          style: 'destructive',
          onPress: () => {
            if (tab === 'expense') removeExpenseCategory(id);
            else removeIncomeCategory(id);
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      t('confirm') || '确认',
      t('resetToDefault') || '将恢复为默认类别，确定继续？',
      [
        { text: t('cancel') || '取消', style: 'cancel' },
        {
          text: t('resetToDefault') || '恢复默认',
          style: 'destructive',
          onPress: () => {
            if (tab === 'expense') resetExpenseCategoriesToDefault();
            else resetIncomeCategoriesToDefault();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <GradientHeader
        title={t('categoryManagement') || '类别管理'}
        left={
          <IconButton onPress={() => router.back()} size={32}>
            <ChevronLeft size={24} color="#fff" />
          </IconButton>
        }
        shape="flat"
        height={61}
        centered={true}
        centerTitle={true}
      />

      {/* Segment Control */}
      <View style={styles.segmentWrapper}>
        <View style={[styles.segment, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setTab('expense')}
            style={[
              styles.segmentBtn,
              { backgroundColor: tab === 'expense' ? colors.primary : 'transparent', borderColor: colors.primary + '50' },
            ]}
            activeOpacity={0.8}
          >
            <Text style={{ color: tab === 'expense' ? '#fff' : colors.text }}>{t('expense') || '支出'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setTab('income')}
            style={[
              styles.segmentBtn,
              { backgroundColor: tab === 'income' ? colors.primary : 'transparent', borderColor: colors.primary + '50' },
            ]}
            activeOpacity={0.8}
          >
            <Text style={{ color: tab === 'income' ? '#fff' : colors.text }}>{t('income') || '收入'}</Text>
          </TouchableOpacity>
        </View>

        <Button
          variant="outline"
          size="sm"
          label={(t('resetToDefault') as string) || '恢复默认'}
          onPress={handleReset}
        />
      </View>

      {/* Add Row */}
      <View style={styles.addRow}>
        <View style={{ width: 72 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('emoji') || '表情'}</Text>
          <TextInput
            value={emoji}
            onChangeText={(txt) => setEmoji(firstGrapheme(txt))}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, width: 72, textAlign: 'center' }]}
            maxLength={10}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('name') || '名称'}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}
            maxLength={20}
          />
        </View>
        <Chip
          onPress={handleAdd}
          icon={<Plus size={16} color={colors.primary} />}
          label={(t('add') as string) || '添加'}
          style={{ marginTop: 18 }}
        />
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {cats.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>{t('noData') || '暂无数据'}</Text>
        ) : (
          cats.map((item: Cat) => (
            <View key={item.id} style={[styles.itemRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>{item.emoji}</Text>
              <Text style={{ color: colors.text, flex: 1 }}>{item.name}</Text>
              <IconButton onPress={() => handleRemove(item.id, item.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 size={18} color={colors.textSecondary} />
              </IconButton>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    gap: 6,
    flex: 1,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  resetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  removeBtn: {
    padding: 6,
    marginLeft: 8,
  },
});