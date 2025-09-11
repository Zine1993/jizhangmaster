// 统一表情包管理：情绪 -> 表情资源
// 支持两种类型：'emoji'（Unicode字符）或 'image'（本地图片资源）
export type EmojiResource =
  | { type: 'emoji'; value: string }
  | { type: 'image'; value: any }; // require(...) 结果

// 默认表情包（占位），可按需在此增删或替换为图片资源
// 若要使用图片示例：{ type: 'image', value: require('@/assets/emojis/happy.png') }
export const EMOJI_PACK: Record<string, EmojiResource> = {
  开心: { type: 'emoji', value: '😄' },
  满足: { type: 'emoji', value: '😊' },
  期待: { type: 'emoji', value: '✨' },
  平静: { type: 'emoji', value: '😌' },
  焦虑: { type: 'emoji', value: '😟' },
  沮丧: { type: 'emoji', value: '😞' },
};

// 对外提供读取API
export function getEmojiResource(emotion: string): EmojiResource | undefined {
  return EMOJI_PACK[emotion];
}

// 列出受支持情绪集合（用于过滤未知情绪）
export const SUPPORTED_EMOTIONS = new Set(Object.keys(EMOJI_PACK));