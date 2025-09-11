import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type EmojiResource =
  | { type: 'emoji'; value: string }
  | { type: 'image'; value: any };

type EmotionTagMap = Record<string, EmojiResource>;

interface EmotionTagContextValue {
  tagsMap: EmotionTagMap;
  supported: Set<string>;
  setTag: (emotion: string, res: EmojiResource) => void;
  removeTag: (emotion: string) => void;
  resetToDefaults: () => void;
  ready: boolean;
}

const STORAGE_KEY = 'emotion_tags_map_v1';

const DEFAULTS: EmotionTagMap = {
  开心: { type: 'emoji', value: '😄' },
  满足: { type: 'emoji', value: '😊' },
  期待: { type: 'emoji', value: '✨' },
  平静: { type: 'emoji', value: '😌' },
  焦虑: { type: 'emoji', value: '😟' },
  沮丧: { type: 'emoji', value: '😞' },
};

const EmotionTagContext = createContext<EmotionTagContextValue | undefined>(undefined);

export function EmotionTagProvider({ children }: { children: React.ReactNode }) {
  const [tagsMap, setTagsMap] = useState<EmotionTagMap>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        // 调试：记录加载到的键
        try {
          const keys = saved ? Object.keys(JSON.parse(saved) || {}) : [];
          // eslint-disable-next-line no-console
          console.log('[EmotionTagProvider] loaded keys=%o', keys);
        } catch {}
        if (saved) {
          const parsed = JSON.parse(saved);
          // 仅在格式正确时替换
          if (parsed && typeof parsed === 'object') {
            setTagsMap(parsed);
          }
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tagsMap)).catch(() => {});
  }, [tagsMap, ready]);

  const setTag = (emotion: string, res: EmojiResource) => {
    setTagsMap((prev) => ({ ...prev, [emotion]: res }));
  };

  const removeTag = (emotion: string) => {
    setTagsMap((prev) => {
      const next = { ...prev };
      delete next[emotion];
      return next;
    });
  };

  const resetToDefaults = () => setTagsMap(DEFAULTS);

  const supported = useMemo(() => new Set(Object.keys(tagsMap)), [tagsMap]);

  const value = useMemo(
    () => ({ tagsMap, supported, setTag, removeTag, resetToDefaults, ready }),
    [tagsMap, supported, ready]
  );

  return <EmotionTagContext.Provider value={value}>{children}</EmotionTagContext.Provider>;
}

export function useEmotionTags() {
  const ctx = useContext(EmotionTagContext);
  if (!ctx) throw new Error('useEmotionTags must be used within EmotionTagProvider');
  return ctx;
}