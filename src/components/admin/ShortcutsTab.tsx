'use client';

import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CalendarIcon, ScaleIcon, WalletIcon } from '@/components/icons';

const SHORTCUTS = [
  { path: '/admin/weight', label: 'My Weight', description: '체중 기록 입력/그래프/전체 기록', Icon: ScaleIcon },
  { path: '/admin/expenses', label: 'Our Budget', description: '지출 달력/이력/통계', Icon: WalletIcon },
  { path: '/admin/schedule', label: 'Our Schedule', description: '공유 캘린더', Icon: CalendarIcon },
] as const;

export default function ShortcutsTab() {
  const router = useRouter();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {SHORTCUTS.map(({ path, label, description, Icon }) => (
        <button
          key={path}
          onClick={() => router.push(path)}
          className="w-full flex items-center gap-3 border rounded-lg p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-gray-300 shrink-0" />
        </button>
      ))}
    </div>
  );
}
