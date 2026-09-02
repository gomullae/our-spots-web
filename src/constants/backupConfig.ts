import { BackupPeriod, BackupTable } from '@/types';

export const BACKUP_TABLE_LABELS: Record<BackupTable, string> = {
  PLACES: '장소',
  EXPENSE_RECORDS: '지출 내역',
  WEIGHT_RECORDS: '체중 기록',
  LOGIN_ATTEMPTS: '로그인 시도',
  FEEDBACKS: '방명록',
  ERROR_LOGS: '에러 로그',
  ACCESS_DENIED_LOGS: '비정상 접근',
  SCHEDULE_EVENTS: '일정',
  HOUSEHOLD_INCOMES: '가계 현황 - 수입',
  HOUSEHOLD_BUDGET_ITEMS: '가계 현황 - 예산 항목',
  HOUSEHOLD_HISTORY: '가계 현황 - 변경 이력',
};

export const BACKUP_PERIOD_LABELS: Record<BackupPeriod, string> = {
  ALL: '전체',
  RECENT_3_MONTHS: '최근 3개월',
};

export const BACKUP_PERIODS: BackupPeriod[] = ['ALL', 'RECENT_3_MONTHS'];
