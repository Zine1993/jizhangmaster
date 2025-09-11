import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert } from 'react-native';
import { useEmotionTags, EmojiResource } from '@/contexts/EmotionTagContext';
import Card from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';

type Row = { emotion: string; res: EmojiResource };

export default function EmotionTagsManager() {
  const { colors } = useTheme();
  // 调试：打印设置页看到的 tagsMap 键
  try {
    // eslint-disable-next-line no-console
    console.log('[EmotionTagsManager] tagNames=%o', Object.keys((useEmotionTags() as any).tagsMap || {}));
  } catch {}
  const { tagsMap, setTag, removeTag, resetToDefaults, ready } = useEmotionTags();
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

  const renderItem = ({ item }: { item: Row }) => {
    return (
      <Card style={{ marginBottom: 12, padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 24 }}>
              {item.res.type === 'emoji' ? item.res.value : '❓'}
            </Text>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.emotion}</Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert('删除确认', `删除情绪「${item.emotion}」？`, [
                { text: '取消', style: 'cancel' },
                { text: '删除', style: 'destructive', onPress: () => removeTag(item.emotion) },
              ])
            }
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: pressed ? colors.card + '44' : colors.card,
              borderWidth: 1,
              borderColor: colors.border,
            })}
          >
            <Text style={{ color: colors.textSecondary }}>删除</Text>
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>情绪标签管理</Text>

      {/* 新增/编辑区域 */}
      <Card style={{ padding: 12, marginBottom: 16 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>情绪名称</Text>
          <TextInput
            placeholder="如：开心"
            placeholderTextColor={colors.textSecondary}
            value={emotion}
            onChangeText={setEmotion}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              color: colors.text,
            }}
          />

          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>输入表情（仅支持原生 emoji）</Text>
          <TextInput
            placeholder="输入emoji，如 😄"
            placeholderTextColor={colors.textSecondary}
            value={emojiChar}
            onChangeText={(v) => setEmojiChar(v)}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              color: colors.text,
            }}
          />

          {/* 预览 */}
          <View style={{ marginTop: 8, minHeight: 32 }}>
            {emojiChar ? <Text style={{ fontSize: 24 }}>{emojiChar}</Text> : null}
          </View>

          <Pressable
            onPress={onSave}
            style={({ pressed }) => ({
              marginTop: 8,
              alignSelf: 'flex-start',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: pressed ? colors.primary : colors.primary,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ color: '#fff' }}>保存</Text>
          </Pressable>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: colors.textSecondary }}>已配置 {data.length} 个</Text>
        <Pressable
          onPress={() =>
            Alert.alert('重置确认', '将恢复到默认表情映射，当前更改会丢失。', [
              { text: '取消', style: 'cancel' },
              { text: '重置', style: 'destructive', onPress: resetToDefaults },
            ])
          }
        >
          <Text style={{ color: colors.textSecondary }}>恢复默认</Text>
        </Pressable>
      </View>

      <FlatList
        data={data}
        keyExtractor={(it) => it.emotion}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}