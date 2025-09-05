import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Vibration, Platform, Animated, Easing } from 'react-native';
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
  LogOut,
  UserCircle,
  Sun,
  Moon,
  Monitor,
  Languages,
  ArrowUpFromLine,
  Wallet,
  Smile,
  Plus,
  Trash2,
  ChevronRight,

  Check,
  Lock,
  Unlock,
} from 'lucide-react-native';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';

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

/** avatar utilities: deterministic color + initial by seed (email/id) */
function _hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function _hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const R = Math.round((r + m) * 255), G = Math.round((g + m) * 255), B = Math.round((b + m) * 255);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return '#' + toHex(R) + toHex(G) + toHex(B);
}
function _contrastOn(hex: string): '#fff' | '#111' {
  const v = hex.replace('#','');
  const r = parseInt(v.substring(0,2),16), g = parseInt(v.substring(2,4),16), b = parseInt(v.substring(4,6),16);
  const lum = (0.2126*r + 0.7152*g + 0.0722*b)/255;
  return lum < 0.6 ? '#fff' : '#111';
}
function pickAvatarColors(seed: string): { bg: string; fg: string } {
  const h = _hashCode(seed) % 360;
  const bg = _hslToHex(h, 65, 55);
  const fg = _contrastOn(bg);
  return { bg, fg };
}
function pickInitial(seed: string): string {
  const m = seed.match(/[A-Za-z0-9]/);
  return (m ? m[0] : 'U').toUpperCase();
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { emotions, removeEmotionTag, clearAllData, exportData, importData } = useTransactions();
  const { user, requireLogin, resetPassword, recoveryPending, completePasswordReset, signOut } = useAuth();
  const { upsertUserSettings, wipeAllUserData } = useSupabaseSync();

  const [showThemeModal, setShowThemeModal] = React.useState(false);
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);
  const [showDataModal, setShowDataModal] = React.useState(false);
  const [busyExport, setBusyExport] = React.useState(false);
  const [busyImport, setBusyImport] = React.useState(false);
  // Edit nickname modal states
  const [showEditName, setShowEditName] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [displayNameLocal, setDisplayNameLocal] = React.useState<string | null>(null);

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

  // 锁图标开锁动画
  const lockAnim = React.useRef(new Animated.Value(0)).current;
  const lockRotate = lockAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-20deg', '0deg'],
  });
  const lockScale = lockAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.15, 1],
  });
  const lockOpacity = lockAnim.interpolate({
    inputRange: [0, 0.4, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const unlockOpacity = lockAnim.interpolate({
    inputRange: [0, 0.4, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });
  // avatar computed values
  const avatarSeed = (user?.email || user?.id || 'guest');
  const { bg, fg } = React.useMemo(() => pickAvatarColors(avatarSeed), [avatarSeed]);
  const initial = React.useMemo(() => pickInitial(user?.email || user?.id || 'U'), [user?.email, user?.id]);
  // display name: prefer nickname/full name from user_metadata, fallback to email local-part, else neutral
  const displayName = React.useMemo(() => {
    if (!user) return (t('login') as string) || '登录';
    const md: any = (user as any)?.user_metadata || {};
    const candidate = (md.full_name || md.name || md.nickname || '').trim?.();
    if (candidate) return candidate;
    const local = (user.email || '').split('@')[0] || '';
    const alias = local.replace(/[._]+/g, ' ').trim();
    if (alias) return alias;
    return t('myAccount') || '我的账户';
  }, [user, t]);

  const appName = (Constants?.expoConfig?.name as string) || ((Constants as any)?.manifest?.name) || '记账大师';
  const version = (Constants?.expoConfig?.version as string) || ((Constants as any)?.manifest?.version) || '';


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
              } else {
                const md: any = (user as any)?.user_metadata || {};
                const base = (md.full_name || md.name || md.nickname || (user.email || '').split('@')[0] || '').toString();
                setEditName(base);
                setShowEditName(true);
              }
            }}
          >
            {user ? (
              <View style={[styles.avatar, { backgroundColor: bg }]}>
                <Text style={[styles.avatarText, { color: fg }]}>{initial}</Text>
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.background }]}>
                <UserCircle size={28} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="middle">
                {displayNameLocal || displayName}
              </Text>
              
            </View>
            <TouchableOpacity
              onPress={async () => {
                if (user) {
                  const r = await signOut();
                  if (!r.ok) Alert.alert(t('operationFailed') || '操作失败', r.error || '');
                } else {
                  requireLogin();
                }
              }}
              style={{ padding: 8, marginLeft: 8 }}
            >
              {user ? <LogOut size={22} color={colors.textSecondary} /> : <LogIn size={22} color={colors.textSecondary} />}
            </TouchableOpacity>
          </TouchableOpacity>
        </Card>

        {/* Account Management */}
        <Card padding={0} style={{ marginBottom: 16 }}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: colors.primary + '20' }]}>
                <Wallet size={20} color={colors.primary} />
              </View>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t('accountManagement')}</Text>
            </View>
            <View style={styles.rowRight}>
              <TouchableOpacity
                onPress={() => {
                  const proceed = () => {
                    if (!pwdSet) setShowPwdSetup(true);
                    else { setPwdInput(''); setShowPwdPrompt(true); }
                  };
                  try { Vibration.vibrate?.(10); } catch {}
                  lockAnim.setValue(0);
                  Animated.timing(lockAnim, {
                    toValue: 1,
                    duration: 200,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }).start(() => {
                    proceed();
                    // 重置以便下次点击可再次播放
                    lockAnim.setValue(0);
                  });
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={t('setPassword') || '设置密码'}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 6, marginRight: -12 }}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={{
                    width: 24,
                    height: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: [{ rotate: lockRotate as any }, { scale: lockScale as any }],
                  }}
                >
                  <Animated.View style={{ position: 'absolute', opacity: lockOpacity as any }}>
                    <Lock size={18} color={colors.primary} />
                  </Animated.View>
                  <Animated.View style={{ position: 'absolute', opacity: unlockOpacity as any }}>
                    <Unlock size={18} color={colors.primary} />
                  </Animated.View>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* 外观设置 */}
        <Card padding={0} style={{ marginBottom: 8 }}>
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
          <SettingRow
            icon={<Smile size={20} color={colors.primary} />}
            title={t('emotionTagManagement')}
            onPress={() => router.push('/emotions')}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <SettingRow
            icon={<ArrowUpFromLine size={20} color={colors.primary} />}
            title={t('importExport') || '导入 / 导出'}
            onPress={() => setShowDataModal(true)}
          />
        </Card>

        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16, marginTop: 6 }} />
        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
            {appName}{version ? ` v${version}` : ''}{(Constants as any)?.nativeBuildVersion ? ` (${(Constants as any).nativeBuildVersion})` : ''}
          </Text>
        </View>










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



      {/* Data Modal: Import / Export */}
      <Modal transparent visible={showDataModal} animationType="fade" onRequestClose={() => setShowDataModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('importExport') || '导入 / 导出'}</Text>

            <TouchableOpacity
              disabled={busyImport}
              style={[styles.modalOption, { opacity: busyImport ? 0.6 : 1 }]}
              onPress={async () => {
                try {
                  setBusyImport(true);
                  const res: any = await DocumentPicker.getDocumentAsync({ type: 'application/json', multiple: false, copyToCacheDirectory: true });
                  if (res.canceled) { return; }
                  const asset = (res.assets && res.assets[0]) || res;
                  const uri = asset?.uri;
                  if (!uri) { Alert.alert(t('importFailed') || '导入失败'); return; }
                  const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
                  const r = importData(content);
                  if ((r as any)?.ok) {
                    Alert.alert(t('success') || '成功', t('importSuccess') || '导入成功');
                  } else {
                    Alert.alert(t('importFailed') || '导入失败', (r as any)?.error || (t('invalidJSON') || 'JSON 内容不合法'));
                  }
                } catch (e: any) {
                  Alert.alert(t('importFailed') || '导入失败', e?.message || '');
                } finally {
                  setBusyImport(false);
                  setShowDataModal(false);
                }
              }}
            >
              <Text style={{ color: colors.text }}>{t('importJSONFile') || '从 JSON 文件导入'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={busyExport}
              style={[styles.modalOption, { borderColor: colors.primary, backgroundColor: colors.primary + '20', opacity: busyExport ? 0.6 : 1 }]}
              onPress={async () => {
                try {
                  setBusyExport(true);
                  const json = exportData();
                  const fileName = `jizhang_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
                  const tmpUri = baseDir + fileName;
                  await FileSystem.writeAsStringAsync(tmpUri, json, { encoding: FileSystem.EncodingType.UTF8 });

                  if (Platform.OS === 'android' && (FileSystem as any).StorageAccessFramework) {
                    const SAF: any = (FileSystem as any).StorageAccessFramework;
                    const permissions = await SAF.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                      const targetUri = await SAF.createFileAsync(permissions.directoryUri, fileName, 'application/json');
                      const content = await FileSystem.readAsStringAsync(tmpUri, { encoding: FileSystem.EncodingType.UTF8 });
                      await SAF.writeAsStringAsync(targetUri, content);
                      Alert.alert(t('success') || '成功', t('exportSuccess') || '已导出 JSON 文件');
                    } else {
                      if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(tmpUri, { mimeType: 'application/json', dialogTitle: t('exportDataJSON') || '导出 JSON' });
                      } else {
                        Alert.alert(t('exportFailed') || '导出失败', t('noSharingAvailable') || '当前环境不支持保存文件');
                      }
                    }
                  } else {
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(tmpUri, { mimeType: 'application/json', dialogTitle: t('exportDataJSON') || '导出 JSON' });
                    } else {
                      Alert.alert(t('exportFailed') || '导出失败', t('noSharingAvailable') || '当前环境不支持保存文件');
                    }
                  }
                } catch (e: any) {
                  Alert.alert(t('exportFailed') || '导出失败', e?.message || '');
                } finally {
                  setBusyExport(false);
                  setShowDataModal(false);
                }
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('exportJSONFile') || '导出为 JSON 文件'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDataModal(false)}>
              <Text style={{ color: colors.textSecondary }}>{t('cancel') || '取消'}</Text>
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
                      try {
                        if (user?.id) {
                          await wipeAllUserData(user.id);
                        }
                      } catch (e: any) {
                        Alert.alert(t('operationFailed') || '操作失败', '云端数据清理失败，请检查网络后重试');
                        return;
                      }
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



      {/* Edit Nickname Modal */}
      <Modal transparent visible={showEditName} animationType="fade" onRequestClose={() => setShowEditName(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('editNickname') || '编辑昵称'}</Text>
            <TextInput
              placeholder={t('enterNickname') || '请输入昵称'}
              placeholderTextColor={colors.textSecondary}
              value={editName}
              onChangeText={setEditName}
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setShowEditName(false)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: colors.textSecondary }}>{t('cancel') || '取消'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const name = (editName || '').trim();
                  if (!name) { Alert.alert(t('tip') || '提示', t('fillAllFields') || '请填写完整'); return; }
                  try {
                    const supa = getSupabase();
                    const { error } = await supa.auth.updateUser({ data: { full_name: name } });
                    if (error) {
                      Alert.alert(t('operationFailed') || '操作失败', error.message || '');
                    } else {
                      setDisplayNameLocal(name);
                      setShowEditName(false);
                    }
                  } catch (e: any) {
                    Alert.alert(t('operationFailed') || '操作失败', e?.message || '');
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


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
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