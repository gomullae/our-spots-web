interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ page, totalPages, onChange, className = 'flex items-center justify-center gap-4 pt-3' }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={className}>
      <button
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="text-xs font-medium text-gray-600 disabled:text-gray-300 transition-colors"
      >
        이전
      </button>
      <span className="text-[11px] text-gray-400">{page + 1} / {totalPages}</span>
      <button
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className="text-xs font-medium text-gray-600 disabled:text-gray-300 transition-colors"
      >
        다음
      </button>
    </div>
  );
}
