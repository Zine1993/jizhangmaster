import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Share, TextInput, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/contexts/TransactionContext';
import {
  ChevronLeft,
  LogIn,
  UserCircle,
  Sun,
  Moon,
  Monitor,
  Languages,
  ArrowUpFromLine,
  ArrowDownToLine,
  Wallet,
  Smile,
  Plus,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Check,
  Lock,
} from 'lucide-react-native';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';

// 新的、符合图片风格的设置行组件
const SettingRow = ({ icon, title, value, onPress, titleColor }: { icon: React.ReactNode, title: string, value?: string, onPress?: () => void, titleColor?: string }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBg, { backgroundColor: colors.primary + '20' }]} >
          {icon}
        </View>
        <Text style={[styles.rowTitle, { color: titleColor || colors.text }]} > { title } </Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: colors.textSecondary }]} > { value } </Text>}
        <ChevronRight size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { emotions, removeEmotionTag, clearAllData, exportData, importData } = useTransactions();
  const { user, requireLogin, resetPassword, recoveryPending, completePasswordReset } = useAuth();
  const { upsertUserSettings } = useSupabaseSync();

  const [showThemeModal, setShowThemeModal] = React.useState(false);
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [exportJson, setExportJson] = React.useState('');
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importText, setImportText] = React.useState('');

  // Password gate states (simplified)
  const [pwdSet, setPwdSet] = React.useState(false);
  const [showPwdSetup, setShowPwdSetup] = React.useState(false);
  const [showPwdPrompt, setShowPwdPrompt] = React.useState(false);
  const [showPwdManage, setShowPwdManage] = React.useState(false);
  const [setupPwd, setSetupPwd] = React.useState('');
  const [setupPwd2, setSetupPwd2] = React.useState('');
  const [pwdInput, setPwdInput] = React.useState('');
  const [pwdError, setPwdError] = React.useState(false);
  const [newPwd, setNewPwd] = React.useState('');
  const [newPwd2, setNewPwd2] = React.useState('');

  const PWD_KEY = '@account_password_hash_v2';
  const MIGRATION_KEY = '@password_logic_migrated_v2';

  const sha256 = async (text: string) => {
    try {
      const g: any = globalThis as any;
      if (g?.crypto?.subtle && g?.TextEncoder) {
        const enc = new g.TextEncoder().encode(text);
        const buf = await g.crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch {}
    return 'plain:' + text;
  };

  const checkHash = async (input: string, stored: string | null) => {
    if (!stored) return false;
    if (stored.startsWith('plain:')) return 'plain:' + input === stored;
    const h = await sha256(input);
    return h === stored;
  };

  React.useEffect(() => {
    (async () => {
      try {
        // one-time migration: remove legacy password & security question data
        const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
        if (!migrated) {
          await AsyncStorage.multiRemove([
            '@accounts_pwd_hash',
            '@accounts_sec_q',
            '@accounts_sec_a_hash',
            '@accounts_sec_fail',
            '@accounts_pwd_fail',
            '@account_password_hash_v2', // also clear any existing v2 password once
          ]);
          await AsyncStorage.setItem(MIGRATION_KEY, 'true');
        }
        // check new password
        const ph = await AsyncStorage.getItem(PWD_KEY);
        setPwdSet(!!ph);
      } catch {}
    })();
  }, []);



  const handleClearData = () => {
    Alert.alert(
      t('clearAllData') || 'Clear All Data',
      t('areYouSureYouWantToClearAllData') || 'This will delete all transactions, accounts, and settings. This action cannot be undone.',
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('clear'), style: 'destructive', onPress: clearAllData },
      ],
    );
  };

  const handleRemoveEmotion = (id: string, name: string) => {
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
        title={t('settings')}
        left={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>
        }
        shape="flat"
        height={61}
        centered={true}
        centerTitle={true}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* 登录/用户信息卡片 */}
        <Card padding={16} style={{ marginBottom: 16 }}>
          <TouchableOpacity
            style={styles.profileSection}
            onPress={() => {
              if (!user) {
                requireLogin();
              }
              // TODO: Add navigation to user profile if logged in
            }}
          >
            <UserCircle size={48} color={colors.textSecondary} />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {user ? (user.email || 'User') : t('loginOrRegister')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {user ? t('loggedInAccount') : t('guestSubtitle')}
              </Text>
            </View>
            <LogIn size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* 外观设置 */}
        <Card padding={0} style={{ marginBottom: 16 }}>
          <SettingRow
            icon={<Sun size={20} color={colors.primary} />}
            title={t('theme')}
            value={t('systemTheme')}
            onPress={() => setShowThemeModal(true)}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <SettingRow
            icon={<Languages size={20} color={colors.primary} />}
            title={t('language')}
            value={
              language === 'zh' ? t('chinese')
              : language === 'en' ? t('english')
              : language === 'es' ? t('spanish')
              : language === 'fr' ? t('french')
              : language === 'de' ? t('german')
              : language === 'ja' ? t('japanese')
              : t('korean')
            }
            onPress={() => setShowLanguageModal(true)}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          {/* Account Management row with right lock button */}
          <View style={styles.row}>
            <TouchableOpacity onPress={() => { if (!pwdSet) setShowPwdSetup(true); else { setPwdInput(''); setShowPwdPrompt(true); } }} style={styles.rowLeft} activeOpacity={0.8}>
              <View style={[styles.iconBg, { backgroundColor: colors.primary + '20' }]}>
                <Wallet size={20} color={colors.primary} />
              </View>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t('accountManagement')}</Text>
            </TouchableOpacity>
            <View style={styles.rowRight}>
              <TouchableOpacity
                onPress={() => {
                  if (!pwdSet) setShowPwdSetup(true);
                  else { setPwdInput(''); setShowPwdPrompt(true); }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 6, marginRight: -12 }}
              >
                <Lock size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <SettingRow
            icon={<Smile size={20} color={colors.primary} />}
            title={t('emotionTagManagement')}
            onPress={() => router.push('/emotions')}
          />
        </Card>



        {/* 数据管理 */}
        <Card padding={0} style={{ marginBottom: 16 }}>
          <SettingRow
            icon={<ArrowUpFromLine size={20} color={colors.primary} />}
            title={t('exportDataJSON')}
            onPress={() => { try { const json = exportData(); setExportJson(json); setShowExportModal(true); } catch { Alert.alert(t('exportFailed') || 'Export failed'); } }}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <SettingRow
            icon={<ArrowDownToLine size={20} color={colors.primary} />}
            title={t('importData')}
            onPress={() => { setShowImportModal(true); }}
          />
        </Card>



        {/* 危险区域 */}
        <Card padding={0} style={{ marginBottom: 16 }}>
           <SettingRow
            icon={<AlertTriangle size={20} color={colors.expense} />}
            title={t('clearAllData') || 'Clear All Data'}
            onPress={handleClearData}
            titleColor={colors.expense}
          />
        </Card>


      </ScrollView>

      {/* Theme Modal */}
      <Modal transparent visible={showThemeModal} animationType="fade" onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('theme')}</Text>
            {(['system','light','dark'] as any).map((mode: 'system'|'light'|'dark') => {
              const selected = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modalOption,
                    { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '20' : 'transparent' }
                  ]}
                  onPress={() => { setThemeMode(mode as any); setShowThemeModal(false); }}
                >
                  <View style={styles.modalOptionLeft}>
                    {mode === 'system' ? (
                      <Monitor size={18} color={colors.textSecondary} />
                    ) : mode === 'light' ? (
                      <Sun size={18} color={colors.textSecondary} />
                    ) : (
                      <Moon size={18} color={colors.textSecondary} />
                    )}
                    <Text style={{ color: colors.text }}>
                      {mode === 'system' ? t('systemTheme') : mode === 'light' ? t('lightTheme') : t('darkTheme')}
                    </Text>
                  </View>
                  {selected ? <Check size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowThemeModal(false)}>
              <Text style={{ color: colors.textSecondary }}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal transparent visible={showLanguageModal} animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('language')}</Text>
            {[{code:'zh',label:(t('chinese')||'中文')},{code:'en',label:(t('english')||'English')},{code:'es',label:(t('spanish')||'Español')},{code:'fr',label:(t('french')||'Français')},{code:'de',label:(t('german')||'Deutsch')},{code:'ja',label:(t('japanese')||'日本語')},{code:'ko',label:(t('korean')||'한국어')}].map(opt => {
              const selected = language === opt.code;
              return (
                <TouchableOpacity
                  key={opt.code}
                  style={[
                    styles.modalOption,
                    { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '20' : 'transparent' }
                  ]}
                  onPress={() => { setLanguage(opt.code as any); setShowLanguageModal(false); }}
                >
                  <View style={styles.modalOptionLeft}>
                    <View style={[styles.languageBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                        {opt.code === 'zh' ? '中' : opt.code.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text }}>{opt.label}</Text>
                  </View>
                  {selected ? <Check size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLanguageModal(false)}>
              <Text style={{ color: colors.textSecondary }}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      {/* Export Modal */}
      <Modal transparent visible={showExportModal} animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('exportDataJSON')}</Text>
            <ScrollView style={[styles.jsonBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text selectable style={{ color: colors.text }}>{exportJson}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalOption} onPress={async () => { try { await Share.share({ message: exportJson }); } catch {} }}>
              <Text style={{ color: colors.textSecondary }}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowExportModal(false)}>
              <Text style={{ color: colors.textSecondary }}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Setup Modal */}
      <Modal transparent visible={showPwdSetup} animationType="fade" onRequestClose={() => setShowPwdSetup(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('setPassword') || '设置密码'}</Text>
            <TextInput
              placeholder={t('enterPassword') || '请输入密码'}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={setupPwd}
              onChangeText={setSetupPwd}
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <TextInput
              placeholder={t('confirmPassword') || '确认密码'}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={setupPwd2}
              onChangeText={setSetupPwd2}
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setShowPwdSetup(false)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: colors.textSecondary }}>{t('cancel') || '取消'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    if (!setupPwd || !setupPwd2) {
                      Alert.alert(t('tip') || '提示', t('fillAllFields') || '请填写完整'); return;
                    }
                    if (setupPwd !== setupPwd2) {
                      Alert.alert(t('tip') || '提示', t('passwordNotMatch') || '两次密码不一致'); return;
                    }
                    if (setupPwd.length < 4) {
                      Alert.alert(t('tip') || '提示', t('passwordTooShort') || '密码至少 4 位'); return;
                    }
                    const ph = await sha256(setupPwd);
                    await AsyncStorage.setItem(PWD_KEY, ph);
                    try { if (user?.id) { await upsertUserSettings(user.id, { gate_pwd_hash: ph }); } } catch {}
                    setPwdSet(true);
                    setShowPwdSetup(false);
                    setSetupPwd(''); setSetupPwd2('');
                    // 可选：设置完成后要求再次输入以进入账户管理
                    setPwdInput('');
                    setShowPwdPrompt(true);
                  } catch {
                    Alert.alert(t('operationFailed') || '操作失败', '');
                  }
                }}
                style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t('save') || '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Prompt Modal */}
      <Modal transparent visible={showPwdPrompt} animationType="fade" onRequestClose={() => setShowPwdPrompt(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('enterPassword') || '输入密码'}</Text>
            <TextInput
              placeholder={t('enterPassword') || '输入密码'}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={pwdInput}
              onChangeText={(txt) => { setPwdInput(txt); if (pwdError) setPwdError(false); }}
              style={[styles.input, { color: pwdError ? colors.expense : colors.text, backgroundColor: colors.background, borderColor: pwdError ? colors.expense : colors.border }]}
            />
            <TouchableOpacity onPress={() => { setShowPwdPrompt(false); setShowPwdManage(true); }} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              <Text style={{ color: colors.primary, fontSize: 13 }}>{t('forgotPassword') || '忘记密码？'}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setShowPwdPrompt(false)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: colors.textSecondary }}>{t('cancel') || '取消'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const ph = await AsyncStorage.getItem(PWD_KEY);
                    const ok = await checkHash(pwdInput || '', ph);
                    if (ok) {
                      setShowPwdPrompt(false);
                      setPwdInput('');
                      router.push('/accounts');
                    } else {
                      setPwdError(true);
                      try { Vibration.vibrate(50); } catch {}
                    }
                  } catch {
                    Alert.alert(t('operationFailed') || '操作失败', '');
                  }
                }}
                style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t('verify') || '验证'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Password Modal (for logged-in users) */}
      <Modal transparent visible={showPwdManage} animationType="fade" onRequestClose={() => setShowPwdManage(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('passwordRecovery') || '密码恢复'}</Text>
            {recoveryPending ? (
              <>
                <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                  {t('enterNewPassword') || '请输入新的登录密码'}
                </Text>
                <TextInput
                  placeholder={t('enterPassword') || '请输入密码'}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  value={newPwd}
                  onChangeText={setNewPwd}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                />
                <TextInput
                  placeholder={t('confirmPassword') || '确认密码'}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  value={newPwd2}
                  onChangeText={setNewPwd2}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                />
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      if (!newPwd || !newPwd2) { Alert.alert(t('tip') || '提示', t('fillAllFields') || '请填写完整'); return; }
                      if (newPwd !== newPwd2) { Alert.alert(t('tip') || '提示', t('passwordNotMatch') || '两次密码不一致'); return; }
                      if (newPwd.length < 6) { Alert.alert(t('tip') || '提示', t('passwordTooShort') || '密码至少 6 位'); return; }
                      const r = await completePasswordReset(newPwd);
                      if (r.ok) {
                        Alert.alert(t('success') || '成功', t('passwordUpdated') || '密码已更新');
                        setShowPwdManage(false);
                        setNewPwd('');
                        setNewPwd2('');
                      } else {
                        Alert.alert(t('operationFailed') || '操作失败', r.error || '');
                      }
                    } catch {}
                  }}
                  style={[styles.modalOption, { borderColor: colors.primary, backgroundColor: colors.primary + '20' }]}
                >
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('save') || '保存'}</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {user?.email ? (
              <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                {(t('willSendResetTo') || '将发送重置邮件到：') + user.email}
              </Text>
            ) : (
              <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                {t('pleaseLoginToReset') || '请先登录以使用邮箱验证或重置账户'}
              </Text>
            )}
            {user?.email ? (
              <TouchableOpacity
                onPress={async () => {
                  const res = await resetPassword(user.email!);
                  if (res.ok) {
                    Alert.alert(t('success') || '成功', t('resetEmailSent') || '已发送重置邮件');
                    setShowPwdManage(false);
                  } else {
                    Alert.alert(t('operationFailed') || '操作失败', res.error || '');
                  }
                }}
                style={[styles.modalOption, { borderColor: colors.primary, backgroundColor: colors.primary + '20' }]}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('sendEmail') || '发送邮件'}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  t('resetAccount') || '重置账户',
                  t('resetAccountWarning') || '这将删除您所有的账户和交易数据，并移除密码。此操作无法撤销。',
                  [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('reset'), style: 'destructive', onPress: async () => {
                      await clearAllData();
                      await AsyncStorage.removeItem(PWD_KEY);
                      try { if (user?.id) { await upsertUserSettings(user.id, { gate_pwd_hash: null }); } } catch {}
                      setPwdSet(false);
                      setShowPwdManage(false);
                      Alert.alert(t('success') || '成功', t('accountReset') || '账户已重置');
                    }},
                  ]
                );
              }}
              style={[styles.modalOption, { borderColor: colors.expense, marginTop: 12 }]}
            >
              <Text style={{ color: colors.expense, fontWeight: '600' }}>{t('resetAccount') || '重置账户'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPwdManage(false)}>
              <Text style={{ color: colors.textSecondary }}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal transparent visible={showImportModal} animationType="fade" onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('importData')}</Text>
            <Text style={{ color: colors.textSecondary }}>Paste JSON below</Text>
            <TextInput
              multiline
              value={importText}
              onChangeText={setImportText}
              placeholder="Paste exported JSON here"
              placeholderTextColor={colors.textSecondary}
              style={[styles.textArea, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <TouchableOpacity style={styles.modalOption} onPress={() => {
              const res = importData(importText);
              if ((res as any)?.ok) {
                Alert.alert(t('importSuccess') || 'Import succeeded');
                setShowImportModal(false);
                setImportText('');
              } else {
                Alert.alert(t('importFailed') || 'Import failed', (res as any)?.error || 'Please check the JSON content');
              }
            }}>
              <Text style={{ color: colors.text }}>{t('importData')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowImportModal(false)}>
              <Text style={{ color: colors.textSecondary }}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68, // 16 (padding) + 36 (icon) + 16 (gap)
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E9E7FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  addButtonText: {
    fontWeight: '600',
  },
  emotionTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  emotionTagName: {
    fontSize: 14,
  },

  // modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    borderRadius: 12,
    padding: 16,
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#00000020',
    marginTop: 8,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancel: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000020',
  },
  jsonBox: {
    maxHeight: 240,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    textAlignVertical: 'top',
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 8,
  },
});