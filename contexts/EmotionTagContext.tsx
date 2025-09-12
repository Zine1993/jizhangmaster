import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase';

export type EmojiResource =
  | { type: 'emoji'; value: string }
  | { type: 'image'; value: any };

type EmotionTagMap = Record<string, EmojiResource>;

interface EmotionTagContextValue {
  tagsMap: EmotionTagMap;
  supported: Set<string>;
  orderedNames: string[];
  setTag: (emotion: string, res: EmojiResource) => void;
  removeTag: (emotion: string) => void;
  resetToDefaults: () => void;
  reload: () => Promise<void>;
  ready: boolean;
}

const STORAGE_KEY = 'emotion_tags_map_v1';

const EmotionTagContext = createContext<EmotionTagContextValue | undefined>(undefined);

export function EmotionTagProvider({ children }: { children: React.ReactNode }) {
  const [tagsMap, setTagsMap] = useState<EmotionTagMap>({});
  const [orderedNames, setOrderedNames] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const _updateStateAndStorage = async (map: EmotionTagMap, names: string[]) => {
    setTagsMap(map);
    setOrderedNames(names);
    try {
      const stateToSave = JSON.stringify({ map, names });
      await AsyncStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (e) {
      // ignore storage errors
    }
  };

  const reload = async () => {
    try {
      if (isSupabaseConfigured()) {
        const sb = getSupabase();
        const { data, error } = await sb
          .from('emotion_tags')
          .select('name,emoji,is_active,sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        const map: EmotionTagMap = {};
        const names: string[] = [];
        for (const row of data || []) {
          map[row.name] = { type: 'emoji', value: row.emoji };
          names.push(row.name);
        }
        await _updateStateAndStorage(map, names);
      }
    } catch (e) {
      console.error('Failed to reload emotion tags from database:', e);
      // Do not clear existing state if DB fails, rely on cache.
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.map && parsed.names) {
            setTagsMap(parsed.map);
            setOrderedNames(parsed.names);
          }
        }
      } catch (e) {
        console.error('Failed to load emotion tags from async storage:', e);
      }

      await reload(); // Always try to reload from DB for freshness
      setReady(true);
    })();
  }, []);

  // Local manipulation is disabled in favor of DB-driven updates via reload()
  const setTag = (emotion: string, res: EmojiResource) => {};
  const removeTag = (emotion: string) => {};

  const resetToDefaults = async () => {
    try {
      if (isSupabaseConfigured()) {
        const sb = getSupabase();
        await sb.rpc('restore_default_emotion_tags');
        await reload();
      }
    } catch (e) {
      console.error('Failed to reset to default emotion tags:', e);
    }
  };

  const supported = useMemo(() => new Set(orderedNames), [orderedNames]);

  const value = useMemo(
    () => ({ tagsMap, supported, orderedNames, setTag, removeTag, resetToDefaults, reload, ready }),
    [tagsMap, supported, orderedNames, ready]
  );

  return <EmotionTagContext.Provider value={value}>{children}</EmotionTagContext.Provider>;
}

export function useEmotionTags() {
  const ctx = useContext(EmotionTagContext);
  if (!ctx) throw new Error('useEmotionTags must be used within EmotionTagProvider');
  return ctx;
}