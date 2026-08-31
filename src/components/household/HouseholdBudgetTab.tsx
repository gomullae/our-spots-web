'use client';

import { useCallback, useEffect, useState } from 'react';
import HouseholdIncomeForm from './HouseholdIncomeForm';
import HouseholdItemForm from './HouseholdItemForm';
import HouseholdHistoryModal from './HouseholdHistoryModal';
import { Toast } from '@/hooks/useToast';
import { useLatestRequestGuard } from '@/hooks/useLatestRequestGuard';
import { householdBudgetApi } from '@/services/api';
import { HouseholdBudgetItem, HouseholdBudgetItemPayload, HouseholdBudgetMeta, HouseholdIncome, HouseholdIncomePayload, HouseholdSectionType } from '@/types';
import { HOUSEHOLD_ASSET_KIND_LABELS, HOUSEHOLD_PAYER_LABELS } from '@/constants/householdConfig';
import { formatAmount } from '@/utils/expenseFormat';
import { isSameHouseholdMeta, readHouseholdCache, writeHouseholdCache } from '@/utils/householdCache';

interface HouseholdBudgetTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

type ItemFormState = { mode: 'new'; sectionType: HouseholdSectionType } | HouseholdBudgetItem;
type IncomeFormState = 'new' | HouseholdIncome;
type HistoryTarget = { kind: 'income' | 'item'; id: number; label: string };

// 고정비 계좌 소계 내부 정렬: 1차 자동이체(autoDebitBank) 값별로 묶고(그룹 등장 순서는 그 값이 처음
// 나타난 항목의 id 기준 — 데이터 등록순). 자동이체가 없는 그룹은 2차로 금액 내림차순, 있는 그룹은 2차로
// 이체일이 있는 항목이 먼저·없는 항목이 나중, 3차로 이체일이 있는 항목끼리는 1일에 가까운 순 오름차순,
// 이체일까지 같으면 금액 내림차순
function sortByAutoDebitAndDebitDay(groupItems: HouseholdBudgetItem[]): HouseholdBudgetItem[] {
  const bankOrder = new Map<string, number>();
  [...groupItems]
    .sort((a, b) => a.id - b.id)
    .forEach((item) => {
      const key = item.autoDebitBank || '';
      if (!bankOrder.has(key)) bankOrder.set(key, bankOrder.size);
    });
  return [...groupItems].sort((a, b) => {
    const bankA = bankOrder.get(a.autoDebitBank || '') ?? 0;
    const bankB = bankOrder.get(b.autoDebitBank || '') ?? 0;
    if (bankA !== bankB) return bankA - bankB;
    if (!a.autoDebitBank && !b.autoDebitBank) return b.amount - a.amount || a.id - b.id;
    if (a.debitDay == null && b.debitDay == null) return b.amount - a.amount || a.id - b.id;
    if (a.debitDay == null) return 1;
    if (b.debitDay == null) return -1;
    return a.debitDay - b.debitDay || b.amount - a.amount || a.id - b.id;
  });
}

// "Our Budget" 4번째 탭 "가계 현황" — 원본 스프레드시트("하민이 가족 가계부")의 표 양식과 섹션 순서를 그대로 재현:
// 요약 → 고정비 → 자산 현황 → 지출예정액 → 구독료. 각 표는 LogHistoryTab의 표 스타일(overflow-x-auto +
// min-w-full text-xs)을 그대로 재사용 — 컬럼이 많아서 모바일에서는 가로 스크롤로 봄
export default function HouseholdBudgetTab({ showToast, showConfirm }: HouseholdBudgetTabProps) {
  // 초기 렌더 시점에 캐시를 동기적으로 읽어서 첫 페인트부터 바로 그려지게 함(체중 관리와 동일한 패턴) —
  // 실제로 최신인지는 마운트 후 백그라운드에서 검증
  const [incomes, setIncomes] = useState<HouseholdIncome[]>(() => readHouseholdCache()?.overview.incomes ?? []);
  const [items, setItems] = useState<HouseholdBudgetItem[]>(() => readHouseholdCache()?.overview.items ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const beginRequest = useLatestRequestGuard();

  const [incomeForm, setIncomeForm] = useState<IncomeFormState | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState | null>(null);
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);

  // 마운트 시점과 CRUD 성공 직후 둘 다 이 함수로 재조회 — "그 항목만 로컬 patch + meta만 재기록"하는
  // 방식은 다른 항목이 앱 밖(SQL 등)에서 바뀐 경우 그 항목이 영영 캐시에 낡은 채로 박제되는 문제가 있어서
  // (meta가 patch 시점 기준으로 다시 "최신"이라고 찍혀버려 다음번 마운트 때도 불일치가 감지 안 됨),
  // 일정 관리(ScheduleCalendarTab)의 fetchEvents()와 동일하게 매번 서버에서 전체를 다시 받아오는 방식으로 통일.
  // visibilitychange 재검증과 CRUD 직후 호출이 겹치면 먼저 시작한 요청의 응답이 나중에 도착할 수 있어서
  // (레이스), beginRequest/isStale로 그 시점 가장 최근 호출이 아니면 결과를 버림(ScheduleCalendarTab과 동일 패턴)
  const fetchAll = useCallback(() => {
    const isStale = beginRequest();
    const cache = readHouseholdCache();
    // 캐시가 없는 진짜 첫 조회일 때만 로딩 표시 — 캐시가 있으면 이미 화면엔 그 데이터가 보이고 있어서 백그라운드에서 조용히 검증만 함
    setIsLoading(!cache);

    const fetchFromServer = (meta: HouseholdBudgetMeta | null) => {
      householdBudgetApi.getOverview()
        .then((data) => {
          if (isStale()) return;
          setIncomes(data.incomes);
          setItems(data.items);
          if (meta) writeHouseholdCache({ meta, overview: data });
        })
        // 배경 재검증 실패로 화면 전체를 비우지 않고(캐시 데이터는 계속 보여줌) 토스트로만 알림
        .catch((err) => { if (!isStale()) showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'); })
        .finally(() => { if (!isStale()) setIsLoading(false); });
    };

    householdBudgetApi.getMeta()
      .then((meta) => {
        if (isStale()) return;
        const cacheValid = !!cache && isSameHouseholdMeta(cache.meta, meta);
        // 캐시가 이미 정확한 걸로 확인됨 — 화면엔 이미 그 데이터가 보이고 있으므로 더 할 일 없음
        if (cacheValid) { setIsLoading(false); return; }
        fetchFromServer(meta);
      })
      // meta 확인 자체가 실패하면(오프라인 등) 캐시 검증을 포기하고 그냥 서버에서 직접 불러옴
      .catch(() => { if (!isStale()) fetchFromServer(null); });
  }, [beginRequest, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  // 모바일에서 홈 화면 앱을 백그라운드로 보냈다가 다시 보는 것만으로는(완전 종료 후 재실행과 달리)
  // 컴포넌트가 다시 마운트되지 않아 위 useEffect가 재실행되지 않음 — 그래서 화면이 다시 보이는 시점마다
  // (visibilitychange) 별도로 meta를 재검증. 캐시를 지우는 게 아니라 getMeta()만 가볍게 다시 확인해서
  // 실제로 달라졌을 때만 fetchFromServer가 도는 구조라 대부분은 이 가벼운 호출 한 번으로 끝남
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchAll();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchAll]);

  // ===== 계산 =====
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);

  // 계좌(account)별로 그룹핑 — 어떤 항목이 어느 계좌 소계에 속하는지는 항목 이름을 하드코딩하지 않고
  // 항상 item.account 데이터로만 판단. 계좌 순서는 그 계좌에 속한 항목 중 가장 먼저 등록된(id가 가장 작은)
  // 항목 기준으로 정해서, 원본 스프레드시트의 계좌 블록 순서(공과금통장 → 진우통장 → 생활비통장)와 자연히 일치함
  const fixedCostGroups = (() => {
    const byId = [...items.filter((i) => i.sectionType === 'FIXED_COST')].sort((a, b) => a.id - b.id);
    const order: string[] = [];
    const grouped = new Map<string, HouseholdBudgetItem[]>();
    byId.forEach((item) => {
      const key = item.account || '미분류';
      if (!grouped.has(key)) {
        grouped.set(key, []);
        order.push(key);
      }
      grouped.get(key)!.push(item);
    });
    return order.map((account) => {
      const groupItems = sortByAutoDebitAndDebitDay(grouped.get(account)!);
      const total = groupItems.reduce((sum, i) => sum + i.amount, 0);
      // 공과금통장처럼 한 계좌에 일단 다 모였다가, 초영 대상분만 초영통장으로 다시 이체되는 구조를 표현하기 위한 서브 집계
      const choyoungTotal = groupItems.filter((i) => i.payer === 'CHOYOUNG').reduce((sum, i) => sum + i.amount, 0);
      return { account, items: groupItems, total, choyoungTotal };
    });
  })();
  const totalFixedCost = fixedCostGroups.reduce((sum, g) => sum + g.total, 0);
  const balance = totalIncome - totalFixedCost;

  // 자산도 동일한 패턴 — assetKind(ASSET/LIABILITY)로 그룹핑
  const assetGroups = (['ASSET', 'LIABILITY'] as const).map((kind) => {
    const groupItems = [...items.filter((i) => i.sectionType === 'ASSET' && i.assetKind === kind)].sort((a, b) => a.id - b.id);
    const total = groupItems.reduce((sum, i) => sum + i.amount, 0);
    return { kind, items: groupItems, total };
  });
  const totalAssets = assetGroups.find((g) => g.kind === 'ASSET')?.total ?? 0;
  const totalLiabilities = assetGroups.find((g) => g.kind === 'LIABILITY')?.total ?? 0;
  const netWorth = totalAssets - totalLiabilities;

  const plannedItems = [...items.filter((i) => i.sectionType === 'PLANNED_EXPENSE')]
    .sort((a, b) => (a.plannedMonth || '').localeCompare(b.plannedMonth || ''));
  // 1차: 대상자별로 묶기(그룹 등장 순서는 그 대상자가 처음 등장한 항목의 id 기준 — 데이터 등록순).
  // 2차(같은 대상자 안에서): 이체일이 있는 항목이 먼저(1일에 가까운 순 오름차순), 없는 항목은 뒤에 금액 내림차순
  const subscriptionItems = (() => {
    const raw = items.filter((i) => i.sectionType === 'SUBSCRIPTION');
    const payerOrder = new Map<string, number>();
    [...raw]
      .sort((a, b) => a.id - b.id)
      .forEach((item) => {
        const key = item.payer || '';
        if (!payerOrder.has(key)) payerOrder.set(key, payerOrder.size);
      });
    return [...raw].sort((a, b) => {
      const payerA = payerOrder.get(a.payer || '') ?? 0;
      const payerB = payerOrder.get(b.payer || '') ?? 0;
      if (payerA !== payerB) return payerA - payerB;
      if (a.debitDay != null && b.debitDay != null) return a.debitDay - b.debitDay || a.id - b.id;
      if (a.debitDay != null) return -1;
      if (b.debitDay != null) return 1;
      return b.amount - a.amount || a.id - b.id;
    });
  })();

  // ===== 수입 CRUD ===== (저장/삭제 성공 후엔 로컬 patch 대신 fetchAll()로 서버에서 통째로 다시 받아옴)
  const handleCreateIncome = async (data: HouseholdIncomePayload) => {
    await householdBudgetApi.createIncome(data);
    fetchAll();
    showToast('등록했습니다', 'success');
  };

  const handleUpdateIncome = async (data: HouseholdIncomePayload) => {
    if (!incomeForm || incomeForm === 'new') return;
    await householdBudgetApi.updateIncome(incomeForm.id, data);
    fetchAll();
    showToast('수정했습니다', 'success');
  };

  const handleDeleteIncome = (income: HouseholdIncome) => {
    showConfirm(`"${income.label}"을(를) 삭제하시겠습니까?`, async () => {
      try {
        await householdBudgetApi.deleteIncome(income.id);
        fetchAll();
        setIncomeForm(null);
        showToast('삭제했습니다', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
      }
    }, true);
  };

  // ===== 예산 항목 CRUD =====
  const handleCreateItem = async (data: HouseholdBudgetItemPayload) => {
    await householdBudgetApi.createItem(data);
    fetchAll();
    showToast('등록했습니다', 'success');
  };

  const handleUpdateItem = async (data: HouseholdBudgetItemPayload) => {
    if (!itemForm || 'mode' in itemForm) return;
    await householdBudgetApi.updateItem(itemForm.id, data);
    fetchAll();
    showToast('수정했습니다', 'success');
  };

  const handleDeleteItem = (item: HouseholdBudgetItem) => {
    showConfirm(`"${item.label}"을(를) 삭제하시겠습니까?`, async () => {
      try {
        await householdBudgetApi.deleteItem(item.id);
        fetchAll();
        setItemForm(null);
        showToast('삭제했습니다', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
      }
    }, true);
  };

  if (isLoading) return <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>;

  const isNewItemForm = itemForm !== null && 'mode' in itemForm;
  const isEditItemForm = itemForm !== null && !('mode' in itemForm);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-5">
      <SectionHeader title="요약" onAdd={() => setIncomeForm('new')} addLabel="+ 수입 추가" />
      <Table headers={['구분', '금액', '비고']}>
        {incomes.map((income) => (
          <ItemRow
            key={income.id}
            cells={[income.label, <span key="amount" className="block text-right">{formatAmount(income.amount)}</span>]}
            memo={income.memo}
            onClick={() => setIncomeForm(income)}
          />
        ))}
        <tr className="bg-gray-50 font-medium">
          <Td>고정비</Td>
          <Td className="text-right text-gray-500">- {formatAmount(totalFixedCost)}</Td>
          <Td></Td>
        </tr>
        <tr className="bg-blue-50 font-medium">
          <Td>잔액</Td>
          <Td className={`text-right ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatAmount(balance)}</Td>
          <Td>카카오뱅크 비상금 통장으로 이체</Td>
        </tr>
      </Table>

      <SectionHeader
        title="고정비"
        onAdd={() => setItemForm({ mode: 'new', sectionType: 'FIXED_COST' })}
        addLabel="+ 고정비 추가"
      />
      <Table headers={['항목명', '업체명', '금액', '대상자', '자동이체', '이체일', '비고']}>
        <tr className="bg-gray-50 font-medium">
          <Td colSpan={2}>고정비 총계</Td>
          <Td className="text-right">{formatAmount(totalFixedCost)}</Td>
          <Td colSpan={4}></Td>
        </tr>
        {fixedCostGroups.flatMap(({ account, items: groupItems, total, choyoungTotal }) => {
          const renderItem = (item: HouseholdBudgetItem) => (
            <ItemRow
              key={item.id}
              cells={[
                item.label,
                item.vendor || '',
                <span key="amount" className="block text-right">{formatAmount(item.amount)}</span>,
                item.payer ? HOUSEHOLD_PAYER_LABELS[item.payer] : '',
                item.autoDebitBank || '',
                item.debitDay != null ? `${item.debitDay}일` : '',
              ]}
              memo={item.memo}
              onClick={() => setItemForm(item)}
            />
          );
          // 초영통장 서브라인은 초영 대상 항목들 바로 아래, 나머지 항목들 위에 위치 — 그 서브라인이
          // 어떤 항목들의 합인지 시각적으로 바로 이어지게 하기 위함
          const choyoungItems = groupItems.filter((item) => item.payer === 'CHOYOUNG');
          const otherItems = groupItems.filter((item) => item.payer !== 'CHOYOUNG');
          return [
            <tr key={`${account}-header`} className="bg-gray-100 font-medium border-t-2 border-gray-200">
              <Td colSpan={2}>{account} 소계</Td>
              <Td className="text-right">{formatAmount(total)}</Td>
              <Td colSpan={4}></Td>
            </tr>,
            ...choyoungItems.map(renderItem),
            ...(choyoungTotal > 0
              ? [
                  <tr key={`${account}-choyoung`} className="bg-gray-50 text-gray-500">
                    <Td colSpan={2} className="pl-4">└ 초영통장 소계</Td>
                    <Td className="text-right">{formatAmount(choyoungTotal)}</Td>
                    <Td colSpan={4}></Td>
                  </tr>,
                ]
              : []),
            ...otherItems.map(renderItem),
          ];
        })}
      </Table>

      <SectionHeader
        title="자산 현황"
        onAdd={() => setItemForm({ mode: 'new', sectionType: 'ASSET' })}
        addLabel="+ 자산/부채 추가"
      />
      <Table headers={['자산구분', '항목명', '금액', '대상자', '업체명', '비고']}>
        <tr className="bg-blue-50 font-medium">
          <Td colSpan={2}>순자산 계</Td>
          <Td className={`text-right ${netWorth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatAmount(netWorth)}</Td>
          <Td colSpan={3}></Td>
        </tr>
        {assetGroups.flatMap(({ kind, items: groupItems, total }) => [
          <tr key={`${kind}-header`} className="bg-gray-100 font-medium border-t-2 border-gray-200">
            <Td colSpan={2}>{kind === 'ASSET' ? '자본 계' : '부채 계'}</Td>
            <Td className={`text-right ${kind === 'LIABILITY' ? 'text-gray-500' : ''}`}>
              {kind === 'LIABILITY' ? `- ${formatAmount(total)}` : formatAmount(total)}
            </Td>
            <Td colSpan={3}></Td>
          </tr>,
          ...groupItems.map((item) => (
            <ItemRow
              key={item.id}
              cells={[
                item.assetKind ? HOUSEHOLD_ASSET_KIND_LABELS[item.assetKind] : '',
                item.label,
                <span key="amount" className="block text-right">{formatAmount(item.amount)}</span>,
                item.payer ? HOUSEHOLD_PAYER_LABELS[item.payer] : '',
                item.vendor || '',
              ]}
              memo={item.memo}
              onClick={() => setItemForm(item)}
            />
          )),
        ])}
      </Table>

      <SectionHeader
        title="지출예정액"
        onAdd={() => setItemForm({ mode: 'new', sectionType: 'PLANNED_EXPENSE' })}
        addLabel="+ 지출예정 추가"
      />
      <Table headers={['지출 월', '항목명', '금액', '비고']}>
        {plannedItems.map((item) => (
          <ItemRow
            key={item.id}
            cells={[item.plannedMonth || '', item.label, <span key="amount" className="block text-right">{formatAmount(item.amount)}</span>]}
            memo={item.memo}
            onClick={() => setItemForm(item)}
          />
        ))}
      </Table>

      <SectionHeader
        title="구독료"
        onAdd={() => setItemForm({ mode: 'new', sectionType: 'SUBSCRIPTION' })}
        addLabel="+ 구독료 추가"
      />
      <Table headers={['대상자', '항목명', '금액', '이체일', '비고']}>
        {subscriptionItems.map((item) => (
          <ItemRow
            key={item.id}
            cells={[
              item.payer ? HOUSEHOLD_PAYER_LABELS[item.payer] : '',
              item.label,
              <span key="amount" className="block text-right">{formatAmount(item.amount)}</span>,
              item.debitDay != null ? `${item.debitDay}일` : '',
            ]}
            memo={item.memo}
            onClick={() => setItemForm(item)}
          />
        ))}
      </Table>

      {incomeForm && (
        <HouseholdIncomeForm
          isEditMode={incomeForm !== 'new'}
          initialLabel={incomeForm !== 'new' ? incomeForm.label : undefined}
          initialAmount={incomeForm !== 'new' ? incomeForm.amount : undefined}
          initialMemo={incomeForm !== 'new' ? incomeForm.memo : undefined}
          onSubmit={incomeForm === 'new' ? handleCreateIncome : handleUpdateIncome}
          onClose={() => setIncomeForm(null)}
          onDelete={incomeForm !== 'new' ? () => handleDeleteIncome(incomeForm) : undefined}
          onHistory={
            incomeForm !== 'new'
              ? () => setHistoryTarget({ kind: 'income', id: incomeForm.id, label: incomeForm.label })
              : undefined
          }
        />
      )}

      {itemForm && (
        <HouseholdItemForm
          isEditMode={isEditItemForm}
          initialSectionType={itemForm.sectionType}
          initialAssetKind={isEditItemForm ? (itemForm as HouseholdBudgetItem).assetKind : undefined}
          initialLabel={isEditItemForm ? (itemForm as HouseholdBudgetItem).label : undefined}
          initialVendor={isEditItemForm ? (itemForm as HouseholdBudgetItem).vendor : undefined}
          initialAmount={isEditItemForm ? (itemForm as HouseholdBudgetItem).amount : undefined}
          initialPayer={isEditItemForm ? (itemForm as HouseholdBudgetItem).payer : undefined}
          initialAutoDebitBank={isEditItemForm ? (itemForm as HouseholdBudgetItem).autoDebitBank : undefined}
          initialDebitDay={isEditItemForm ? (itemForm as HouseholdBudgetItem).debitDay : undefined}
          initialAccount={isEditItemForm ? (itemForm as HouseholdBudgetItem).account : undefined}
          initialPlannedMonth={isEditItemForm ? (itemForm as HouseholdBudgetItem).plannedMonth : undefined}
          initialMemo={isEditItemForm ? (itemForm as HouseholdBudgetItem).memo : undefined}
          onSubmit={isNewItemForm ? handleCreateItem : handleUpdateItem}
          onClose={() => setItemForm(null)}
          onDelete={isEditItemForm ? () => handleDeleteItem(itemForm as HouseholdBudgetItem) : undefined}
          onHistory={
            isEditItemForm
              ? () => {
                  const item = itemForm as HouseholdBudgetItem;
                  setHistoryTarget({ kind: 'item', id: item.id, label: item.label });
                }
              : undefined
          }
        />
      )}

      {historyTarget && (
        <HouseholdHistoryModal
          kind={historyTarget.kind}
          id={historyTarget.id}
          label={historyTarget.label}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-bold">{title}</h3>
      <button onClick={onAdd} className="text-xs font-medium text-blue-600 hover:text-blue-700">
        {addLabel}
      </button>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border rounded-lg -mt-2">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-2 py-1.5 font-medium text-gray-500 whitespace-nowrap ${h === '금액' ? 'text-right' : 'text-left'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

function Td({
  children,
  className = '',
  title,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  colSpan?: number;
}) {
  return (
    <td title={title} colSpan={colSpan} className={`px-2 py-1.5 text-gray-700 whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}

function ItemRow({
  cells,
  memo,
  onClick,
}: {
  cells: React.ReactNode[];
  memo?: string;
  onClick: () => void;
}) {
  return (
    <tr onClick={onClick} className="cursor-pointer hover:bg-gray-50 transition-colors">
      {cells.map((cell, i) => (
        <Td key={i}>{cell}</Td>
      ))}
      <Td>{memo || ''}</Td>
    </tr>
  );
}
