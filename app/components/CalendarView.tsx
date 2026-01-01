"use client";
import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // デフォルトのスタイル
import { format } from 'date-fns';

type Props = {
  expenses: any[];
  currentDate: string;
  onDateChange: (date: string) => void;
};

export default function CalendarView({ expenses, currentDate, onDateChange }: Props) {
  // 支出がある日付のリストを作る
  const activeDates = expenses.map(ex => {
    const d = ex.date?.toDate();
    return d ? format(d, 'yyyy-MM-dd') : '';
  });

  return (
    <div className="bg-white p-4 rounded-[30px] shadow-sm border border-slate-50 mb-6 custom-calendar">
      <Calendar
        locale="ja-JP"
        value={new Date(currentDate)}
        onChange={(value) => {
          if (value instanceof Date) {
            onDateChange(format(value, 'yyyy-MM-dd'));
          }
        }}
        tileContent={({ date, view }) => {
          // 日付のマスに「点」を表示する処理
          if (view === 'month') {
            const dateStr = format(date, 'yyyy-MM-dd');
            if (activeDates.includes(dateStr)) {
              return <div className="h-1.5 w-1.5 bg-pink-400 rounded-full mx-auto mt-1"></div>;
            }
          }
        }}
        next2Label={null}
        prev2Label={null}
        formatDay={(locale, date) => format(date, 'd')} // '1日' ではなく '1' と表示
        className="w-full border-none font-bold text-slate-600 text-sm"
      />
      {/* カレンダーの見た目を可愛くするCSS（このファイル内限定） */}
      <style jsx global>{`
        .react-calendar { width: 100%; border: none; font-family: inherit; }
        .react-calendar__tile { padding: 10px 0; }
        .react-calendar__tile--now { background: #fff5f7; color: #ec4899; border-radius: 10px; }
        .react-calendar__tile--active { background: #ec4899 !important; color: white !important; border-radius: 10px; }
        .react-calendar__navigation button { font-size: 14px; font-weight: bold; }
      `}</style>
    </div>
  );
}