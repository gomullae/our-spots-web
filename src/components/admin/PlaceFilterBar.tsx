import { TYPE_CONFIG, GRADE_LABELS } from '@/constants/placeConfig';
import { PlaceType } from '@/types';

const ALL_TYPES = Object.keys(TYPE_CONFIG) as PlaceType[];

interface PlaceFilterBarProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onShowAll: () => void;
  today: string;
  keywordInput: string;
  onKeywordInputChange: (value: string) => void;
  onKeywordSearch: () => void;
  typeFilter: PlaceType | '';
  onTypeFilterChange: (value: PlaceType | '') => void;
  gradeFilter: number | '';
  onGradeFilterChange: (value: number | '') => void;
  includeDeleted: boolean;
  onIncludeDeletedChange: (value: boolean) => void;
}

export default function PlaceFilterBar({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onShowAll,
  today,
  keywordInput,
  onKeywordInputChange,
  onKeywordSearch,
  typeFilter,
  onTypeFilterChange,
  gradeFilter,
  onGradeFilterChange,
  includeDeleted,
  onIncludeDeletedChange,
}: PlaceFilterBarProps) {
  return (
    <div className="flex flex-col gap-2 px-4 py-2 border-b shrink-0">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={fromDate}
          max={toDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">~</span>
        <input
          type="date"
          value={toDate}
          min={fromDate}
          max={today}
          onChange={(e) => onToDateChange(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onShowAll}
          className="px-2.5 py-1 border rounded text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
        >
          전체
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={keywordInput}
          onChange={(e) => onKeywordInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onKeywordSearch(); }}
          placeholder="이름/주소 검색"
          className="flex-1 min-w-0 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onKeywordSearch}
          className="px-2.5 py-1 bg-gray-800 text-white rounded text-xs font-medium hover:bg-gray-700 transition-colors shrink-0"
        >
          검색
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as PlaceType | '')}
          className="flex-1 min-w-0 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 유형</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}</option>
          ))}
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => onGradeFilterChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="flex-1 min-w-0 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 등급</option>
          {GRADE_LABELS.map(({ grade, label }) => (
            <option key={grade} value={grade}>{label}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={includeDeleted}
          onChange={(e) => onIncludeDeletedChange(e.target.checked)}
          className="w-3.5 h-3.5"
        />
        삭제된 항목 포함
      </label>
    </div>
  );
}
