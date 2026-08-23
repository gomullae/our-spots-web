export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

// 매년 갱신 필요 — 새 연도가 필요해지면 그 해 목록을 추가할 것
const KOREAN_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name: '신정' },
  { date: '2026-02-16', name: '설날 연휴' },
  { date: '2026-02-17', name: '설날' },
  { date: '2026-02-18', name: '설날 연휴' },
  { date: '2026-03-01', name: '삼일절' },
  { date: '2026-03-02', name: '삼일절 대체공휴일' },
  { date: '2026-05-05', name: '어린이날' },
  { date: '2026-05-24', name: '부처님오신날' },
  { date: '2026-05-25', name: '부처님오신날 대체공휴일' },
  { date: '2026-06-03', name: '전국동시지방선거' },
  { date: '2026-06-06', name: '현충일' },
  { date: '2026-08-15', name: '광복절' },
  { date: '2026-08-17', name: '광복절 대체공휴일' },
  { date: '2026-09-24', name: '추석 연휴' },
  { date: '2026-09-25', name: '추석' },
  { date: '2026-09-26', name: '추석 연휴' },
  { date: '2026-10-03', name: '개천절' },
  { date: '2026-10-05', name: '개천절 대체공휴일' },
  { date: '2026-10-09', name: '한글날' },
  { date: '2026-12-25', name: '기독탄신일' },
];

const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2026: KOREAN_HOLIDAYS_2026,
};

export function getHoliday(dateStr: string): Holiday | undefined {
  const year = Number(dateStr.slice(0, 4));
  return HOLIDAYS_BY_YEAR[year]?.find((h) => h.date === dateStr);
}
