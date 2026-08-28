import { WeightMeta, WeightRecord } from '@/types';
import { createLocalCache, isSameMeta } from './localCache';

// 홈 화면 바로가기(standalone 웹앱) 재실행 시 인메모리 상태가 매번 초기화되는 문제 때문에 일정 관리와 동일한 패턴으로 localStorage 캐싱
// 체중은 GET /api/weights가 전체 목록을 한 번에 내려주는 구조라(월별 아님) 일정처럼 달별로 나눌 필요 없이 전체를 통째로 캐싱
interface WeightLocalCache {
  meta: WeightMeta;
  records: WeightRecord[];
}

const cache = createLocalCache<WeightLocalCache>('weight-cache-v1');

export const readWeightCache = cache.read;
export const writeWeightCache = cache.write;
// 로그아웃/토큰 만료 시 호출 — 같이 쓰는 컴퓨터에서 로그아웃 후에도 체중 기록이 localStorage에 남아있지 않도록
export const clearWeightCache = cache.clear;
export const isSameWeightMeta = isSameMeta<WeightMeta>;
