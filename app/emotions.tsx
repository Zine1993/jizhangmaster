import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { ChevronLeft, Trash2, Plus } from 'lucide-react-native';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';

export default function EmotionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const tt = React.useCallback((k: string, fallback: string) => {
    const v = t(k as any);
    return v === k ? fallback : v;
  }, [t]);
  const { emotions, removeEmotionTag, addEmotionTag, resetEmotionTagsToDefault } = useTransactions();

  const [addModalVisible, setAddModalVisible] = React.useState(false);
  const [newEmoji, setNewEmoji] = React.useState('🙂');
  const [newName, setNewName] = React.useState('');


  const handleSaveNew = () => {
    const name = newName.trim();
    const emoji = newEmoji.trim();
    if (!name) {
      Alert.alert(t('nameRequired') || '请填写名称');
      return;
    }
    if (!emoji) {
      Alert.alert(t('emojiRequired') || '请填写表情');
      return;
    }
    if (emotions.some(e => e.name === name)) {
      Alert.alert(t('duplicateName') || '名称已存在');
      return;
    }
    addEmotionTag(name, emoji);
    setAddModalVisible(false);
    setNewEmoji('🙂');
    setNewName('');
  };

  const handleResetDefault = () => {
    Alert.alert(
      t('resetToDefault') || '恢复默认',
      t('areYouSureYouWantToResetEmotionTags') || '确定恢复默认情绪标签吗？',
      [
        { text: t('cancel') || '取消', style: 'cancel' },
        { text: t('reset') || (t('confirm') || '确定'), style: 'destructive', onPress: () => resetEmotionTagsToDefault() },
      ],
    );
  };







  const handleRemove = (id: string, name: string) => {
    Alert.alert(
      `${t('remove')} "${name}"`,
      t('areYouSureYouWantToRemoveThisTag'),
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('emotionTagManagement')}</Text>
            <TouchableOpacity onPress={handleResetDefault}>
              <Text style={[styles.link, { color: colors.primary }]}>{tt('resetToDefaultPack', '初始化')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emotionList}>
            <TouchableOpacity
              onPress={() => setAddModalVisible(true)}
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={16} color={colors.text} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{tt('customEmotionPack', '自定义表情包')}</Text>
            </TouchableOpacity>

            {emotions.length === 0 ? (
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('noData')}</Text>
            ) : emotions.map(item => (
              <View key={item.id} style={[styles.emotionRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                  <Text style={{ color: colors.text }} numberOfLines={1}>{item.name}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemove(item.id, item.name)}>
                  <Trash2 size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <Modal transparent animationType="fade" visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalMask}>
          <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{tt('customEmotionPack', '自定义表情包')}</Text>
            <View style={{ gap: 12 }}>
              <TextInput
                value={newEmoji}
                onChangeText={setNewEmoji}
                placeholder={tt('emojiPlaceholder', '例如：😊')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign: 'center', fontSize: 18 }]}
                maxLength={4}
              />
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder={tt('namePlaceholder', '例如：开心')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                maxLength={20}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={{ color: colors.text }}>{t('cancel') || '取消'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveNew} style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff' }}>{t('save') || '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



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
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
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
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputMultiline: {
    height: 160,
    textAlignVertical: 'top',
  },
});