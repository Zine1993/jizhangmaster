import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing, useWindowDimensions, Text, StyleSheet } from 'react-native';

type TriggerOptions = {
  count?: number;      // 雨滴数量
  duration?: number;   // 总时长(ms)
  size?: number;       // 字体大小
};

type EmojiRainContextType = {
  triggerEmojiRain: (emoji: string, options?: TriggerOptions) => void;
};

const EmojiRainContext = createContext<EmojiRainContextType | undefined>(undefined);

type Drop = {
  id: string;
  x: number;
  rotate: number;
  scale: number;
  startTop: number;

};

export function EmojiRainProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const [drops, setDrops] = useState<Drop[]>([]);
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const emissionTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCountRef = useRef(0);
  const batchIdRef = useRef(0);

  const clearAll = useCallback(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    emissionTimersRef.current.forEach(clearTimeout);
    emissionTimersRef.current = [];
    pendingCountRef.current = 0;
    setDrops([]);
    animMapRef.current.clear();
  }, []);

  const triggerEmojiRain = useCallback((emoji: string, options?: TriggerOptions) => {
    const count = Math.max(6, Math.min(options?.count ?? 24, 80));
    const rainDuration = Math.max(800, Math.min(options?.duration ?? 3000, 8000));
    const size = Math.max(16, Math.min(options?.size ?? 28, 64));

    // 更新渲染用的引用
    currentEmojiRef.current = emoji;
    currentSizeRef.current = size;
    currentDurationRef.current = rainDuration;

    // 取消上一轮，开启新一轮
    clearAll();
    const localBatch = ++batchIdRef.current;
    pendingCountRef.current = 0;

    const map = new Map<string, Animated.Value>();
    animMapRef.current = map;

    // 预计算“车道”并打乱顺序，使水平分布更均匀且无明显先后偏侧
    const margin = 12;
    const usableWidth = Math.max(1, (width - margin * 2));
    const laneCount = Math.max(6, Math.min(12, Math.round(usableWidth / 60)));
    const laneWidth = usableWidth / laneCount;
    const laneCenters: number[] = Array.from({ length: laneCount }, (_, k) => margin + laneWidth * (k + 0.5));
    const indices = Array.from({ length: laneCount }, (_, k) => k);
    for (let k = indices.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      const tmp = indices[k]; indices[k] = indices[r]; indices[r] = tmp;
    }

    // 在 rainDuration 窗口内分散触发每一滴
    for (let i = 0; i < count; i++) {
      const spawnDelay = Math.floor(Math.random() * rainDuration);

      const timer = setTimeout(() => {
        if (batchIdRef.current !== localBatch) return;

        const center = laneCenters[indices[i % laneCount]];
        const jitter = 0; // 移除抖动，垂直直落
        const x = Math.max(margin, Math.min(margin + usableWidth, center + jitter));
        const rotate = 0;
        const scale = 0.9 + Math.random() * 0.4;
        const startTop = -80 + Math.random() * 60;  // -80 ~ -20

        const id = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;

        const drop: Drop = { id, x, rotate, scale, startTop };
        setDrops(prev => [...prev, drop]);

        const v = new Animated.Value(0);
        map.set(id, v);

        // 按像素速度计算时长，保证不同机型落速一致（约 500–800 px/s）
        const distance = (height + 60) - startTop; // 从起点到屏幕底部外 60px
        const speed = 240 + Math.random() * 110;   // 240~350 px/s，略快一些
        const fallDuration = Math.max(400, Math.floor((distance / speed) * 1000));
        pendingCountRef.current += 1;

        Animated.timing(v, {
          toValue: 1,
          duration: fallDuration,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return;
          if (batchIdRef.current !== localBatch) return;
          pendingCountRef.current -= 1;
          if (pendingCountRef.current <= 0) {
            clearAll();
          }
        });
      }, spawnDelay);

      emissionTimersRef.current.push(timer);
    }
  }, [width, clearAll]);

  const currentEmojiRef = useRef<string>('🙂');
  const currentSizeRef = useRef<number>(28);
  const currentDurationRef = useRef<number>(3000);

  const ctx = useMemo<EmojiRainContextType>(() => ({ triggerEmojiRain }), [triggerEmojiRain]);

  return (
    <EmojiRainContext.Provider value={ctx}>
      <View style={styles.providerRoot}>
        {children}
        {!!drops.length && (
          <View pointerEvents="none" style={StyleSheet.flatten([styles.overlay, { width, height }])}>
            {drops.map((d) => {
              const v = animMapRef.current.get(d.id) || new Animated.Value(0);
              const translateY = v.interpolate({
                inputRange: [0, 1],
                outputRange: [d.startTop, height + 60],
              });
              const opacity = 1;

              // 水平漂移移除：直线下落
              // const translateX = 0;




              return (
                <Animated.View
                  key={d.id}
                  style={{
                    position: 'absolute',
                    left: d.x,
                    top: 0,
                    transform: [
                      { translateY },


                      { scale: d.scale },

                    ],
                    opacity,
                  }}
                >
                  <Text style={{ fontSize: currentSizeRef.current }}>
                    {currentEmojiRef.current}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>
    </EmojiRainContext.Provider>
  );
}

export function useEmojiRain() {
  const ctx = useContext(EmojiRainContext);
  if (!ctx) throw new Error('useEmojiRain must be used within EmojiRainProvider');
  return ctx;
}

const styles = StyleSheet.create({
  providerRoot: { flex: 1, position: 'relative' },
  overlay: {
    position: 'absolute',
    zIndex: 9999,
    left: 0, right: 0, top: 0, bottom: 0,
  },
});