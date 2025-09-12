import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmotionTags } from '@/contexts/EmotionTagContext';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { ChevronLeft, Trash2, Plus, RotateCcw } from 'lucide-react-native';
import GradientHeader from '@/components/ui/GradientHeader';
import Chip from '@/components/ui/Chip';
import IconButton from '@/components/ui/IconButton';
import { displayNameFor } from '@/lib/i18n';

export default function SettingsEmotionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const { orderedNames, tagsMap, reload } = useEmotionTags();

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

  const handleReset = () => {
    Alert.alert(
      t('confirm') as string,
      (t('emotionsPage.areYouSureYouWantToReset') as string) || (t('resetEmotionTagsToDefault') as string),
      [
        { text: t('cancel') as string, style: 'cancel' },
        {
          text: t('reset') as string,
          style: 'destructive',
          onPress: async () => {
            if (isSupabaseConfigured()) {
              const sb = getSupabase();
              const { error } = await sb.rpc('restore_default_emotion_tags');
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                await reload();
                Alert.alert(t('success') as string, t('resetEmotionTagsRestored') as string);
              }
            }
          },
        },
      ]
    );
  };

  const handleSaveNew = async () => {
    const name = newName.trim();
    const emoji = firstGrapheme(newEmoji.trim());
    if (!name) { Alert.alert((t('emotionsPage.nameRequired') as string) || (t('nameRequired') as string)); return; }
    if (!emoji) { Alert.alert((t('emotionsPage.emojiRequired') as string) || (t('emojiRequired') as string)); return; }
    if ((orderedNames || []).includes(name)) { Alert.alert((t('emotionsPage.duplicateName') as string) || (t('duplicateName') as string)); return; }

    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      const { error } = await sb.from('emotion_tags').insert({ name, emoji, is_active: true });
      if (error) { Alert.alert('Error', error.message); }
      else { setNewEmoji(''); setNewName(''); await reload(); }
    }
  };

  const handleRemove = (name: string) => {
    Alert.alert(
      t('confirm') as string,
      (t('deleteConfirm', { name }) as string) || (t('areYouSureYouWantToRemoveThisTag') as string),
      [
        { text: t('cancel') as string, style: 'cancel' },
        {
          text: t('remove') as string,
          style: 'destructive',
          onPress: async () => {
            if (isSupabaseConfigured()) {
              const sb = getSupabase();
              const { error } = await sb.from('emotion_tags').update({ is_active: false }).eq('name', name);
              if (error) { Alert.alert('Error', error.message); }
              else { await reload(); }
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <GradientHeader
        title={(t('emotionsPage.emotionTagManagement') as string) || (t('emotionTagManagement') as string)}
        left={
          <IconButton onPress={() => router.back()} size={32}>
            <ChevronLeft size={24} color="#fff" />
          </IconButton>
        }
        shape="flat"
        height={61}
        centered
        centerTitle
        right={
          <IconButton onPress={handleReset} size={32}>
            <RotateCcw size={20} color="#fff" />
          </IconButton>
        }
      />

      {/* 行1：仅重置按钮 */}
      <View style={[styles.addRow, { justifyContent: 'flex-end' }]}>
        <TouchableOpacity onPress={handleReset} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
          <RotateCcw size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 行2：输入框 + 添加 同行 */}
      <View style={[styles.addRow, { paddingTop: 0, alignItems: 'center' }]}>
        <View style={{ width: 72 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('emoji') as string}</Text>
          <TextInput
            value={newEmoji}
            onChangeText={(txt) => setNewEmoji(firstGrapheme(txt))}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, width: 72, textAlign: 'center' },
            ]}
            maxLength={10}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('name') as string}</Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}
            maxLength={20}
          />
        </View>
        <View style={{ justifyContent: 'flex-start' }}>
          {/* 占位的“伪标签”用于与左侧输入块的 label 高度对齐 */}
          <View style={{ height: 16, marginBottom: 4 }} />
          <Chip
            onPress={handleSaveNew}
            icon={<Plus size={16} color={colors.primary} />}
            label={t('add') as string}
            style={{ maxWidth: Math.round(Dimensions.get('window').width * 0.42), marginTop: 0 }}
          />
        </View>
      </View>

      {/* 列表 */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {(orderedNames || []).length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>{t('noData') as string}</Text>
        ) : (
          orderedNames.map((name) => {
            const item = tagsMap[name];
            if (!item) return null;
            const emoji = item.type === 'emoji' ? item.value : '🙂';
            return (
              <View key={name} style={[styles.itemRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>{emoji}</Text>
                <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">
                  {displayNameFor({ id: String(name).toLowerCase(), name: name }, 'emotions', t as any, language as any)}
                </Text>
                <IconButton onPress={() => handleRemove(name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Trash2 size={18} color={colors.textSecondary} />
                </IconButton>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
});