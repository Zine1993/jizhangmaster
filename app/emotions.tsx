import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { ChevronLeft, Trash2, Plus } from 'lucide-react-native';
import GradientHeader from '@/components/ui/GradientHeader';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import { displayNameFor } from '@/lib/i18n';


export default function EmotionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const tt = React.useCallback((k: string, fallback: string) => {
    const v = t(k as any);
    return v === k ? fallback : v;
  }, [t]);
  const { emotions, removeEmotionTag, addEmotionTag, resetEmotionTagsToDefault } = useTransactions();


  const [newEmoji, setNewEmoji] = React.useState('');
  const [newName, setNewName] = React.useState('');



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


  const handleSaveNew = () => {
    const name = newName.trim();
    const emoji = firstGrapheme(newEmoji.trim());
    if (!name) {
      Alert.alert(t('nameRequired'));
      return;
    }
    if (!emoji) {
      Alert.alert(t('emojiRequired'));
      return;
    }
    if (emotions.some(e => e.name === name)) {
      Alert.alert(t('duplicateName'));
      return;
    }
    addEmotionTag(name, emoji);
    setNewEmoji('');
    setNewName('');
  };

  const handleResetDefault = () => {
    Alert.alert(
      t('confirm'),
      t('resetToDefault'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('resetToDefault'), style: 'destructive', onPress: () => resetEmotionTagsToDefault() },
      ],
    );
  };







  const handleRemove = (id: string, name: string) => {
    Alert.alert(
      t('confirm'),
      t('deleteConfirm') as string,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('remove'), style: 'destructive', onPress: () => removeEmotionTag(id) },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <GradientHeader
        title={t('emotionTagManagement')}
        left={
          <IconButton onPress={() => router.back()} size={32}>
            <ChevronLeft size={24} color="#fff" />
          </IconButton>
        }
        shape="flat"
        height={61}
        centered={true}
        centerTitle={true}
        right={null}
      />
      <ScrollView contentContainerStyle={styles.content}>
        
          {/* 顶部工具条：与类别管理一致 */}
          <View style={styles.segmentWrapper}>
            <Text style={[styles.toolbarTitle, { color: colors.text }]} numberOfLines={1}>{t('emotionTagManagement')}</Text>
            <Button
              variant="outline"
              size="sm"
              label={t('resetToDefault') as string}
              onPress={handleResetDefault}
            />
          </View>
          <View style={styles.emotionList}>
            {/* 行内新增（与类别页一致） */}
            <View style={styles.addRow}>
              <View style={{ width: 72 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('emoji')}</Text>
                <TextInput
                  value={newEmoji}
                  onChangeText={(txt) => setNewEmoji(firstGrapheme(txt))}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, textAlign: 'center' }]}
                  maxLength={10}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('name')}</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  maxLength={20}
                />
              </View>
              <Chip
                onPress={handleSaveNew}
                icon={<Plus size={16} color={colors.primary} />}
                label={t('add') as string}
                style={{ marginTop: 18 }}
              />
            </View>

            {emotions.length === 0 ? (
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('noData')}</Text>
            ) : emotions.map(item => (
              <View key={item.id} style={[styles.emotionRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }} numberOfLines={1}>{item.emoji}</Text>
                  </View>
                  <Text style={{ color: colors.text, flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, overflow: 'hidden' }} numberOfLines={1} ellipsizeMode="tail">{displayNameFor(item, 'emotions', t as any, language as any)}</Text>
                </View>
                <IconButton onPress={() => handleRemove(item.id, item.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Trash2 size={18} color={colors.textSecondary} />
                </IconButton>
              </View>
            ))}
          </View>
        
      </ScrollView>





    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emotionList: {
    marginTop: 8,
    gap: 8,
  },
  emotionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },



  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },



  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 顶部工具条样式（对齐 categories.tsx）
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
  resetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  // 与类别页一致的输入标签与新增行
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  addRow: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inputMultiline: {
    height: 160,
    textAlignVertical: 'top',
  },
});