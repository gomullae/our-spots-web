import { useState } from 'react';

// 콤마 포맷 금액 입력 — HouseholdIncomeForm/HouseholdItemForm이 거의 동일하게 구현하고 있던 걸 통일.
// 입력할 때마다 숫자만 남겨서 toLocaleString('ko-KR')로 다시 표시(제출 시엔 콤마 제거 후 숫자로 변환) —
// 큰 금액이 많은 가계 현황 도메인이라 자릿수를 눈으로 세지 않아도 되게 함
export function useCommaAmountInput(initialAmount?: number) {
  const [amount, setAmount] = useState(initialAmount != null ? initialAmount.toLocaleString('ko-KR') : '');

  const amountValue = Number(amount.replace(/,/g, ''));

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, '');
    setAmount(digits ? Number(digits).toLocaleString('ko-KR') : '');
  };

  return { amount, amountValue, handleAmountChange };
}
