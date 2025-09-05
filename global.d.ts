/* Minimal shim for react-native-calendars to satisfy TS in case editor can't resolve types.
   Safe to keep; if the library's own types are resolved later, this remains non-intrusive (loose any). */
import * as React from 'react';

declare module 'react-native-calendars' {
  export type DateObject = {
    dateString: string;
    day: number;
    month: number;
    year: number;
    timestamp: number;
  };

  export interface CalendarProps {
    markingType?: 'simple' | 'period' | 'multi-dot' | 'multi-period' | 'custom';
    markedDates?: Record<string, any>;
    onDayPress?: (day: DateObject) => void;
    theme?: any;
    firstDay?: number;
    [key: string]: any;
  }

  export const Calendar: React.ComponentType<CalendarProps>;
  export const CalendarList: React.ComponentType<any>;
  export const Agenda: React.ComponentType<any>;
}

/* Fallback declare to silence TS2307 in some editors/workspaces */
declare module 'react-native-calendars';