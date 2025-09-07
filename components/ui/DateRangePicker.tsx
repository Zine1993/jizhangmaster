/// <reference path='../../global.d.ts' />
import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, TouchableWithoutFeedback } from 'react-native';
/* 使用运行时 require 避免 TS 模块解析报错 */
const { Calendar } = require('react-native-calendars');
type DateObject = { dateString: string; day: number; month: number; year: number; timestamp: number };
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialStartDate: Date;
  initialEndDate: Date;
  onApply: (range: { start: Date; end: Date; label?: string }) => void;
  minDate?: Date;
};

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function DateRangePicker({ visible, onClose, initialStartDate, initialEndDate, onApply, minDate }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const min = useMemo(() => startOfDay(minDate || new Date(1970, 0, 1)), [minDate]);

  const today = useMemo(() => new Date(), []);
  const [localStart, setLocalStart] = useState<Date>(startOfDay(initialStartDate || today));
  const [localEnd, setLocalEnd] = useState<Date>(endOfDay(initialEndDate || today));
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [awaitingCustom, setAwaitingCustom] = useState(false);
  const [selectingRange, setSelectingRange] = useState(false);
  React.useEffect(() => {
    const s0 = startOfDay(initialStartDate || today);
    const e0 = endOfDay(initialEndDate || today);
    const s = s0 < min ? min : s0;
    const e = e0 < min ? min : e0;
    setLocalStart(s);
    setLocalEnd(e);
  }, [visible, initialStartDate, initialEndDate, minDate]);

  const presets = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 周一=0
    const thisWeekStart = startOfDay(addDays(now, -dow));
    const thisWeekEnd = endOfDay(addDays(thisWeekStart, 6));
    const lastWeekStart = startOfDay(addDays(thisWeekStart, -7));
    const lastWeekEnd = endOfDay(addDays(lastWeekStart, 6));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const thisYearEnd = endOfDay(new Date(now.getFullYear(), 11, 31));

    return [
      { key: 'today', label: t('today'), range: { start: startOfDay(now), end: endOfDay(now) } },
      { key: 'yesterday', label: t('yesterday'), range: { start: startOfDay(addDays(now, -1)), end: endOfDay(addDays(now, -1)) } },
      { key: 'thisWeek', label: t('thisWeek') || 'This week', range: { start: thisWeekStart, end: thisWeekEnd } },
      { key: 'lastWeek', label: t('lastWeek') || 'Last week', range: { start: lastWeekStart, end: lastWeekEnd } },
      { key: 'last7', label: t('last7Days'), range: { start: startOfDay(addDays(now, -6)), end: endOfDay(now) } },
      { key: 'last14', label: t('last14Days') || 'Last 14 days', range: { start: startOfDay(addDays(now, -13)), end: endOfDay(now) } },
      { key: 'thisMonth', label: t('thisMonth'), range: { start: thisMonthStart, end: thisMonthEnd } },
      { key: 'lastMonth', label: t('lastMonth') || 'Last month', range: { start: lastMonthStart, end: lastMonthEnd } },
      { key: 'last30', label: t('last30Days'), range: { start: startOfDay(addDays(now, -29)), end: endOfDay(now) } },
      { key: 'thisYear', label: t('thisYear'), range: { start: min, end: endOfDay(now) } },
      { key: 'custom', label: t('customRange'), range: null as any },
    ];
  }, [t, min]);

  const onSelectPreset = (key: string) => {
    const p = presets.find(x => x.key === key);
    if (!p) return;
    if (p.range && endOfDay(p.range.end) < min) {
      return;
    }
    if (!p.range) {
      setSelectedPreset('custom');
      setAwaitingCustom(true);
      setSelectingRange(true);
      return;
    }
    setSelectedPreset(key);
    if (p.range) {
      setAwaitingCustom(false);
      setSelectingRange(false);
      const s0 = startOfDay(p.range.start);
      const e0 = endOfDay(p.range.end);
      const s = s0 < min ? min : s0;
      const e = e0 < min ? min : e0;
      setLocalStart(s);
      setLocalEnd(e);
    }
  };

  const onDayPress = (day: DateObject) => {
    const raw = new Date(day.dateString);
    const d = raw < min ? min : raw;

    // Custom 后第一次点击：设置开始，进入选择第二点
    if (awaitingCustom) {
      setLocalStart(startOfDay(d));
      setLocalEnd(startOfDay(d));
      setSelectedPreset('custom');
      setAwaitingCustom(false);
      setSelectingRange(true);
      return;
    }

    // 若正在选择第二个日期，则完成区间
    if (selectingRange) {
      const s = startOfDay(localStart);
      const e = startOfDay(d);
      if (e < s) {
        setLocalStart(e);
        setLocalEnd(s);
      } else {
        setLocalEnd(e);
      }
      setSelectedPreset('custom');
      setSelectingRange(false);
      return;
    }

    // 非选择态：从新点击开始一个新的区间（第一点）
    setLocalStart(startOfDay(d));
    setLocalEnd(startOfDay(d));
    setSelectedPreset('custom');
    setSelectingRange(true);
  };

  const markedDates = useMemo(() => {
    if (awaitingCustom) return {};
    const marks: any = {};
    const s = startOfDay(localStart);
    const e = endOfDay(localEnd);
    const color = colors.primary || '#6366F1';
    const keyS = fmt(s);
    const keyE = fmt(new Date(e.getFullYear(), e.getMonth(), e.getDate()));
    if (keyS === keyE) {
      marks[keyS] = {
        customStyles: {
          container: { width: 22, height: 22, borderRadius: 11, backgroundColor: color, alignSelf: 'center', justifyContent: 'center', marginVertical: 2 },
          text: { color: '#fff' }
        }
      };
      return marks;
    }
    if (s && e && s <= e) {
      const totalDays = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
      if (totalDays > 120) {
        marks[keyS] = {
          customStyles: {
            container: { width: 22, height: 22, borderRadius: 11, backgroundColor: color, alignSelf: 'center', justifyContent: 'center', marginVertical: 2 },
            text: { color: '#fff' }
          }
        };
        marks[keyE] = {
          customStyles: {
            container: { width: 22, height: 22, borderRadius: 11, backgroundColor: color, alignSelf: 'center', justifyContent: 'center', marginVertical: 2 },
            text: { color: '#fff' }
          }
        };
        return marks;
      }
      let cur = new Date(s);
      while (cur <= e) {
        const key = fmt(cur);
        const isStart = key === fmt(s);
        const isEnd = key === fmt(e);
        marks[key] = {
          startingDay: isStart,
          endingDay: isEnd,
          color,
          textColor: '#fff',
        };
        cur = addDays(cur, 1);
      }
    } else if (s) {
      const key = fmt(s);
      marks[key] = { startingDay: true, endingDay: true, color, textColor: '#fff' };
    }
    return marks;
  }, [localStart, localEnd, colors.primary, awaitingCustom]);
  const isSingleDay = useMemo(() => fmt(localStart) === fmt(localEnd), [localStart, localEnd]);
  const isLongRange = useMemo(() => {
    const a = startOfDay(localStart).getTime();
    const b = endOfDay(localEnd).getTime();
    return Math.floor(Math.abs(b - a) / 86400000) + 1 > 120;
  }, [localStart, localEnd]);

  const apply = () => {
    const a = startOfDay(localStart);
    const b = endOfDay(localEnd);
    const label = selectedPreset
      ? (presets.find(p => p.key === selectedPreset)?.label)
      : undefined;
    onApply({ start: a <= b ? a : b, end: a <= b ? b : a, label });
  };



  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('customRange')}</Text>
        </View>

        <View style={styles.body}>
          <View style={[styles.sidebar, { borderRightColor: colors.border, width: 0, display: 'none' }]}>
            <ScrollView contentContainerStyle={{ paddingVertical: 6 }}>
              {presets.map(p => (
                <Pressable
                  key={p.key}
                  disabled={p.range ? endOfDay(p.range.end) < min : false}
                  onPress={() => onSelectPreset(p.key)}
                  style={[
                    styles.presetItem,
                    selectedPreset === p.key && { backgroundColor: (colors.border || '#eee') },
                    (p.range ? endOfDay(p.range.end) < min : false) && { opacity: 0.4 }
                  ]}
                >
                  <Text style={{ color: colors.text }}>{p.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.calendarBox}>
            <Calendar
              markingType={isSingleDay || isLongRange ? 'custom' : 'period'}
              markedDates={markedDates}
              onDayPress={onDayPress}
              minDate={fmt(min)}
              firstDay={1}
              theme={{
                calendarBackground: colors.card,
                todayTextColor: colors.primary,
                monthTextColor: colors.text,
                dayTextColor: colors.text,
                textSectionTitleColor: colors.textSecondary,
                textDisabledColor: (colors as any).textTertiary || colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#fff',
                todayBackgroundColor: (colors.primary || '#6366F1') + '20',
                arrowColor: colors.text,
              }}
            />
            
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Pressable style={[styles.btn, styles.btnGhost, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={{ color: colors.textSecondary }}>{t('cancel') || 'Cancel'}</Text>
          </Pressable>

          <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={apply}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('apply') || 'Apply'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '75%',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: 16, fontWeight: '700' },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 140, borderRightWidth: StyleSheet.hairlineWidth },
  presetItem: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginHorizontal: 8, marginVertical: 4 },
  calendarBox: { flex: 1, paddingRight: 8 },
  rangeInfo: { paddingHorizontal: 12, paddingVertical: 6 },
  footer: {
    flexDirection: 'row', gap: 12,
    padding: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  btnGhost: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
});