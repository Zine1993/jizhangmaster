import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEmotionTags, EmojiResource } from '@/contexts/EmotionTagContext';
import { useTheme } from '@/contexts/ThemeContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';

type Row = { emotion: string; res: EmojiResource };

export default function EmotionTagsManager() {
  const router = useRouter();
  const { colors } = useTheme();
  const { tagsMap, setTag, removeTag, resetToDefaults } = useEmotionTags();
  const [emotion, setEmotion] = useState('');
  const [emojiChar, setEmojiChar] = useState('');

  const data = useMemo<Row[]>(() => Object.entries(tagsMap).map(([k, v]) => ({ emotion: k, res: v })), [tagsMap]);

  // 暂不支持图片选择（未安装 expo-image-picker）


  const onSave = () => {
    const name = emotion.trim();
    if (!name) {
      Alert.alert('提示', '请输入情绪名称');
      return;
    }
    let res: EmojiResource | null = null;
    if (emojiChar.trim()) {
      res = { type: 'emoji', value: emojiChar.trim() };
    }
    if (!res) {
      Alert.alert('提示', '请选择一种表情资源（emoji 或 图片）');
      return;
    }
    setTag(name, res);
    setEmotion('');
    setEmojiChar('');
  };

  const renderRow = (item: Row) => (
    <View key={item.emotion} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }} numberOfLines={1}>{item.res.type === 'emoji' ? item.res.value : '❓'}</Text>
        </View>
        <Text style={{ color: colors.text, flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }} numberOfLines={1} ellipsizeMode="tail">
          {item.emotion}
        </Text>
      </View>
      <TouchableOpacity onPress={() =>
        Alert.alert('删除确认', `删除情绪「${item.emotion}」？`, [
          { text: '取消', style: 'cancel' },
          { text: '删除', style: 'destructive', onPress: () => removeTag(item.emotion) },
        ])
      }>
        <Trash2 size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <GradientHeader
        title="情绪标签管理"
        left={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>
        }
        shape="flat"
        height={61}
        centered={true}
        centerTitle={true}
        right={null}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card padding={16}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>情绪标签管理</Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert('重置确认', '将恢复到默认表情映射，当前更改会丢失。', [
                  { text: '取消', style: 'cancel' },
                  { text: '重置', style: 'destructive', onPress: resetToDefaults },
                ])
              }
            >
              <Text style={[styles.link, { color: colors.primary }]}>恢复默认包</Text>
            </TouchableOpacity>
          </View>

          {/* 添加区域：完全对齐“类别管理” */}
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 72 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>表情符号</Text>
              <TextInput
                value={emojiChar}
                onChangeText={setEmojiChar}
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, width: 72, textAlign: 'center' }]}
                maxLength={10}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>名称</Text>
              <TextInput
                value={emotion}
                onChangeText={setEmotion}
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}
                maxLength={20}
              />
            </View>
            <TouchableOpacity
              onPress={onSave}
              activeOpacity={0.85}
              style={{
                marginTop: 18,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.primary + '40',
                backgroundColor: colors.primary + '15',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={{ marginLeft: 4, color: colors.primary, fontWeight: '600' }}>添加</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.list}>
            {data.length === 0 ? (
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>暂无数据</Text>
            ) : (
              data.map(it => renderRow(it))
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  list: { marginTop: 8, gap: 8 },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionBtnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  link: { fontSize: 14, fontWeight: '600' },
  inputLabel: { fontSize: 12, marginBottom: 4 },
});