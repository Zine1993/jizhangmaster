import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DONE = 'hasCompletedOnboarding';
const KEY_PROFILE = 'onboarding_profile'; // { nickname, language, currency, defaultAccount }

export type OnboardingProfile = {
  nickname?: string;
  language?: string;
  currency?: string;
  defaultAccount?: string;
};

export async function getHasOnboarded(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY_DONE);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setHasOnboarded(v: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_DONE, v ? 'true' : 'false');
  } catch {}
}

export async function saveProfile(patch: OnboardingProfile): Promise<void> {
  try {
    const prevRaw = await AsyncStorage.getItem(KEY_PROFILE);
    const prev: OnboardingProfile = prevRaw ? JSON.parse(prevRaw) : {};
    const next = { ...prev, ...patch };
    await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(next));
  } catch {}
}

export async function getProfile(): Promise<OnboardingProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_DONE, KEY_PROFILE]);
  } catch {}
}

/**
 * 将引导信息应用到系统：
 * - 设置默认货币
 * - 同步昵称到本地/云端（若已登录）
 */
export async function applyProfile(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
    const p: OnboardingProfile = raw ? JSON.parse(raw) : {};
    // 应用货币到 formatCurrency
    try {
      const mod: any = await import('@/lib/formatCurrency');
      if (p.currency && mod?.setDefaultCurrency) {
        mod.setDefaultCurrency(p.currency);
      }
    } catch {}
    // 同步昵称
    try {
      if (p.nickname) {
        // 本地缓存一个显示名键
        await AsyncStorage.setItem('local_display_name', p.nickname);
        // 若有 supabase，尝试更新
        const supaMod: any = await import('@/lib/supabase');
        const supa = supaMod?.getSupabase?.();
        if (supa?.auth) {
          const { data } = await supa.auth.getUser();
          if (data?.user?.id) {
            await supa.auth.updateUser({ data: { full_name: p.nickname } });
          }
        }
      }
    } catch {}
  } catch {}
}