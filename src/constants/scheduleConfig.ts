import { ScheduleCategory } from '@/types';

export const SCHEDULE_CATEGORY_LABELS: Record<ScheduleCategory, string> = {
  COMMON: '공통 일정',
  SHARED: '공유 일정',
  MUST_CHECK: '필수 체크',
  JINWOO: '진우 일정',
  CHOYOUNG: '초영 일정',
  WORK_FROM_HOME: '재택 근무',
  HOLIDAY: '공휴일',
  TRAVEL: '여행',
  ANNIVERSARY: '기념일',
};

export const SCHEDULE_CATEGORIES: ScheduleCategory[] = [
  'COMMON', 'SHARED', 'MUST_CHECK', 'JINWOO', 'CHOYOUNG', 'WORK_FROM_HOME', 'HOLIDAY', 'TRAVEL', 'ANNIVERSARY',
];

// bg: 캘린더 막대/색상 선택 동그라미 배경, text는 카테고리 구분 없이 통일된 짙은 회색(참고 캘린더처럼 차분하게)
export const SCHEDULE_CATEGORY_COLORS: Record<ScheduleCategory, { bg: string; text: string }> = {
  COMMON: { bg: 'bg-emerald-200', text: 'text-gray-800' },
  SHARED: { bg: 'bg-amber-200', text: 'text-gray-800' },
  MUST_CHECK: { bg: 'bg-pink-200', text: 'text-gray-800' },
  JINWOO: { bg: 'bg-blue-200', text: 'text-gray-800' },
  CHOYOUNG: { bg: 'bg-orange-200', text: 'text-gray-800' },
  WORK_FROM_HOME: { bg: 'bg-stone-300', text: 'text-gray-800' },
  HOLIDAY: { bg: 'bg-red-200', text: 'text-gray-800' },
  TRAVEL: { bg: 'bg-purple-200', text: 'text-gray-800' },
  ANNIVERSARY: { bg: 'bg-teal-200', text: 'text-gray-800' },
};
