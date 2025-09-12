import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { adminListAllEmotionTags, createEmotionTag, deleteEmotionTag, restoreDefaultEmotionTags, type EmotionTag } from '@/lib/emotion/tags';
import { useEmotionTags } from '@/contexts/EmotionTagContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2 } from 'lucide-react-native';

export default function EmotionTagsSettings() {
  const { colors } = useTheme();
  const { reload } = useEmotionTags();
  const clearCacheAndReload = async () => {
    try {
      await AsyncStorage.removeItem('emotion_tags_map_v1');
    } catch {}
    try { await reload(); } catch {}
    await load();
  };
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<EmotionTag[]>([]);
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminListAllEmotionTags();
      setTags(data);
    } catch (e: any) {
      Alert.alert(t('operationFailed'), String(e?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!emoji.trim() || !name.trim()) return;
    try {
      await createEmotionTag({ emoji: emoji.trim(), name: name.trim() });
      setEmoji('');
      setName('');
      await load();
      try { await reload(); } catch {}
    } catch (e: any) {
      Alert.alert(t('operationFailed'), String(e?.message || ''));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmotionTag(id);
      await load();
      try { await reload(); } catch {}
    } catch (e: any) {
      Alert.alert(t('operationFailed'), String(e?.message || ''));
    }
  };

  const handleRestore = async () => {
    Alert.alert(t('confirm'), t('restoreDefaults') as any, [
      { text: t('cancel') as any, style: 'cancel' },
      { text: t('ok') as any, onPress: async () => {
        try {
          await restoreDefaultEmotionTags();
          await load();
          try { await reload(); } catch {}
        } catch (e: any) {
          Alert.alert(t('operationFailed'), String(e?.message || ''));
        }
      }},
    ]);
  };

  const renderItem = ({ item }: { item: EmotionTag }) => (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
        <Trash2 size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{(t('emotionTags') as any) || '情绪标签管理'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={clearCacheAndReload} style={[styles.restoreBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary }}>{(t('clearCache') as any) || '清除缓存'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} style={[styles.restoreBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.primary }}>{(t('restoreDefaults') as any) || '恢复默认'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          value={emoji}
          onChangeText={setEmoji}
          placeholder="🙂"
          placeholderTextColor={colors.textTertiary}
        />
        <TextInput
          style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder={(t('name') as any) || '名称'}
          placeholderTextColor={colors.textTertiary}
        />
        <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#fff' }}>{(t('add') as any) || '添加'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tags}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  restoreBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 64 },
  addBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  emoji: { fontSize: 18, marginRight: 10 },
  name: { fontSize: 16, flex: 1, fontWeight: '500' },
  deleteBtn: { padding: 8 },
});