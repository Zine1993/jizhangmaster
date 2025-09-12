import { getSupabase } from '../supabase';

export type EmotionTag = {
  id: string;
  name: string;
  emoji: string;
  is_active: boolean;
  sort_order: number;
};

export async function listEmotionTags(): Promise<EmotionTag[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('emotion_tags')
    .select('id,name,emoji,is_active,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function adminListAllEmotionTags(): Promise<EmotionTag[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('emotion_tags')
    .select('id,name,emoji,is_active,sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEmotionTag(payload: { name: string; emoji: string }): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('emotion_tags').insert({
    name: payload.name.trim(),
    emoji: payload.emoji,
    is_active: true,
    sort_order: Date.now() % 1000000, // simple increasing
  });
  if (error) throw error;
}

export async function deleteEmotionTag(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('emotion_tags').delete().eq('id', id);
  if (error) throw error;
}

export async function restoreDefaultEmotionTags(): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc('restore_default_emotion_tags');
  if (error) throw error;
}