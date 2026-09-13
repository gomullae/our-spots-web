// 편집 거리(Levenshtein distance) — 한 문자열을 다른 문자열로 바꾸는 데 필요한 최소 삽입/삭제/치환 횟수
function levenshteinDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// 두 이름의 유사도(0~1, 1이 완전 동일) — 장소 등록 시 "근처에 비슷한 이름의 장소가 이미 있는지" 경고용.
// 편집 거리를 두 이름 중 긴 쪽 길이로 나눠 정규화. 한쪽이 다른 쪽을 통째로 포함하는 경우("라면점빵" vs
// "라면점빵 2호점")는 뒤에 붙는 글자가 많을수록 편집 거리 기준 점수가 낮게 나와 오히려 못 잡으므로
// 별도로 강한 유사(0.9)로 취급
export function nameSimilarity(a: string, b: string): number {
  const normA = a.trim().toLowerCase();
  const normB = b.trim().toLowerCase();
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;
  const maxLen = Math.max(normA.length, normB.length);
  return 1 - levenshteinDistance(normA, normB) / maxLen;
}
