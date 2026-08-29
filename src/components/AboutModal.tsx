'use client';

import { useEscapeKey } from '@/hooks/useEscapeKey';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 아이가 2020년생(2026년 기준 6살, 한국식 나이)이라 연도 차로 계산 — 매년 별도 수정 없이 자동 반영됨
const CHILD_BIRTH_YEAR = 2020;

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  useEscapeKey(onClose, isOpen);
  if (!isOpen) return null;

  const childAge = new Date().getFullYear() - CHILD_BIRTH_YEAR;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed z-50 inset-0 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 pt-5 pb-4">
            <h2
              className="text-base font-semibold text-gray-900 mb-3"
              style={{ fontFamily: 'var(--font-noto-serif-kr), serif' }}
            >
              About This Project
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-3">
              <p>인천 검단신도시에 거주하는 {childAge}살 아이의 아빠입니다.</p>
              <p>
                아이와 함께 다니며 기억에 남았던 장소와,
                광화문·천호역 근무 시절부터 현재 잠실까지 이어진
                맛집을 정리하다 보니 하나의 지도가 완성되었습니다.
              </p>
              <p>
                &lsquo;Our Spots&rsquo;는 개인 경험을 기반으로 정리한
                토이 프로젝트이며, 가까운 사람들과 정보를 공유하기 위해
                제작되었습니다.
              </p>
            </div>
          </div>
          <div className="px-5 pb-4">
            <button
              onClick={onClose}
              className="w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
