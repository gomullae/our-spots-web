// 여러 정렬/그룹핑 로직이 공유하는 규칙 — "그 키가 가장 먼저 등록된(id가 가장 작은) 항목 기준으로
// 그룹/순위를 정한다"를 한 곳으로 통일 (HouseholdBudgetTab의 고정비 계좌 소계, 구독료/고정비 정렬의
// 자동이체·대상자 그룹 순서가 전부 이 규칙을 각자 따로 구현하고 있었음)

// items를 id 오름차순으로 먼저 정렬한 뒤, keyFn으로 뽑은 키가 처음 등장하는 순서대로 묶은 Map을 반환 —
// Map의 키 순회 순서(삽입 순서)가 곧 "첫 등장 순서"라 별도 order 배열을 안 만들어도 됨
export function groupByFirstOccurrence<T, K>(items: T[], keyFn: (item: T) => K, idFn: (item: T) => number): Map<K, T[]> {
  const sorted = [...items].sort((a, b) => idFn(a) - idFn(b));
  const grouped = new Map<K, T[]>();
  for (const item of sorted) {
    const key = keyFn(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }
  return grouped;
}

// 그룹핑 결과 자체(묶인 항목들)가 아니라 "이 키가 몇 번째로 먼저 등장했는지" 순위만 필요한 경우
// (평평한 배열을 그룹 우선순위로 정렬할 때의 비교자로 사용)
export function rankByFirstOccurrence<T, K>(items: T[], keyFn: (item: T) => K, idFn: (item: T) => number): Map<K, number> {
  const rank = new Map<K, number>();
  [...groupByFirstOccurrence(items, keyFn, idFn).keys()].forEach((key, index) => rank.set(key, index));
  return rank;
}
