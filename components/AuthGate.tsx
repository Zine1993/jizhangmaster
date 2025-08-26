import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LogIn, UserPlus, KeyRound, ArrowLeft } from 'lucide-react-native';

type Mode = 'login' | 'register' | 'reset';

export default function AuthGate() {
  const { user, loading, skipped, signInWithPassword, signUpWithPassword, resetPassword, skipLogin } = useAuth();
  const { colors } = useTheme();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (mode === 'reset') return email.trim().length > 0;
    if (mode === 'register') return email.trim().length > 0 && password.length >= 6 && confirmPassword.length >= 6;
    return email.trim().length > 0 && password.length >= 6;
  }, [busy, mode, email, password, confirmPassword]);

  const handleSubmit = async () => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await signInWithPassword(email.trim(), password);
        if (!res.ok) {
          setErr(res.error || '登录失败');
        }
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          setErr('两次输入的密码不一致');
          return;
        }
        const res = await signUpWithPassword(email.trim(), password);
        if (!res.ok) {
          setErr(res.error || '注册失败');
        } else {
          setMsg('注册成功，请检查邮箱验证或直接登录');
          setPassword('');
          setConfirmPassword('');
          setMode('login');
        }
      } else if (mode === 'reset') {
        const res = await resetPassword(email.trim());
        if (!res.ok) {
          setErr(res.error || '重置密码邮件发送失败');
        } else {
          setMsg('重置密码邮件已发送，请检查邮箱');
          setMode('login');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (user || skipped) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {mode === 'login' ? '登录' : mode === 'register' ? '注册' : '忘记密码'}
      </Text>

      {!!err && <Text style={[styles.error, { color: colors.error }]}>{err}</Text>}
      {!!msg && <Text style={[styles.message, { color: colors.text }]}>{msg}</Text>}

      <TextInput
        placeholder="邮箱"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
      />
      {mode !== 'reset' && (
        <>
          <TextInput
            placeholder="密码（至少6位）"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          />
          {mode === 'register' && (
            <TextInput
              placeholder="确认密码"
              placeholderTextColor={colors.muted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            />
          )}
        </>
      )}

      <TouchableOpacity
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={[
          styles.primaryBtn,
          { backgroundColor: canSubmit ? colors.primary : colors.disabled },
        ]}
      >
        <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
          {mode === 'login' ? '登录' : mode === 'register' ? '注册' : '发送重置邮件'}
        </Text>
        {mode === 'login' ? (
          <LogIn size={20} color={colors.onPrimary} />
        ) : mode === 'register' ? (
          <UserPlus size={20} color={colors.onPrimary} />
        ) : (
          <KeyRound size={20} color={colors.onPrimary} />
        )}
      </TouchableOpacity>

      <View style={styles.row}>
        {mode !== 'login' && (
          <TouchableOpacity onPress={() => { setMode('login'); setErr(null); setMsg(null); }}>
            <Text style={[styles.link, { color: colors.primary }]}>返回登录</Text>
          </TouchableOpacity>
        )}
        {mode !== 'register' && (
          <TouchableOpacity onPress={() => { setMode('register'); setErr(null); setMsg(null); }}>
            <Text style={[styles.link, { color: colors.primary }]}>去注册</Text>
          </TouchableOpacity>
        )}
        {mode !== 'reset' && (
          <TouchableOpacity onPress={() => { setMode('reset'); setErr(null); setMsg(null); }}>
            <Text style={[styles.link, { color: colors.primary }]}>忘记密码</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.skip} onPress={skipLogin}>
        <ArrowLeft size={18} color={colors.muted} />
        <Text style={[styles.skipText, { color: colors.muted }]}> 先跳过</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  primaryBtn: { marginTop: 8, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryBtnText: { fontSize: 16, fontWeight: '600' },
  row: { marginTop: 12, flexDirection: 'row', gap: 16, justifyContent: 'center' },
  link: { fontSize: 14 },
  error: { textAlign: 'center', marginBottom: 4 },
  message: { textAlign: 'center', marginBottom: 4 },
  skip: { marginTop: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center' },
  skipText: { fontSize: 12 },
});