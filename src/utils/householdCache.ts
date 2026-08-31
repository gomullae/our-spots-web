import { HouseholdBudgetMeta, HouseholdBudgetOverview } from '@/types';
import { createLocalCache, isSameMeta } from './localCache';

// 체중 관리와 동일한 패턴 — GET /api/household-budget가 전체(수입+예산 항목)를 한 번에 내려주는
// 구조라 일정처럼 달별로 나눌 필요 없이 전체를 통째로 캐싱
interface HouseholdLocalCache {
  meta: HouseholdBudgetMeta;
  overview: HouseholdBudgetOverview;
}

const cache = createLocalCache<HouseholdLocalCache>('household-cache-v1');

export const readHouseholdCache = cache.read;
export const writeHouseholdCache = cache.write;
// 로그아웃/토큰 만료 시 호출 — 다른 캐시보다도 민감한 데이터(순자산/급여)라 같이 쓰는 컴퓨터의
// localStorage에 로그아웃 후에도 남아있지 않도록
export const clearHouseholdCache = cache.clear;
export const isSameHouseholdMeta = isSameMeta<HouseholdBudgetMeta>;
