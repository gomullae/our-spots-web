'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { WeightRecord } from '@/types';
import { todayString } from '@/utils/weightDate';
import { formatWeight } from '@/utils/weightFormat';
import {
  PERIODS,
  RAW_PERIODS,
  Period,
  cutoffDate,
  formatYearMonth,
  formatMonthTick,
  formatFullDate,
  formatDayTick,
  monthRange,
  rawMonthlyAverages,
  fillMonthlySeries,
  formatMonthDayDot,
  formatShortDateDot,
  summarizeWeights,
} from '@/utils/weightStats';

interface WeightGraphTabProps {
  records: WeightRecord[];
}

const MAX_COLOR = '#e5484d';
const MIN_COLOR = '#2f7fe0';

function SummaryCell({ label, labelColor, value, sub }: { label: string; labelColor?: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="px-1.5 py-2.5 text-center min-w-0">
      <div className="text-[10px] text-gray-500" style={labelColor ? { color: labelColor } : undefined}>{label}</div>
      <div className="text-base font-medium my-0.5">{value}</div>
      <div className="text-[10px] text-gray-400 whitespace-nowrap">{sub}</div>
    </div>
  );
}

export default function WeightGraphTab({ records }: WeightGraphTabProps) {
  const [period, setPeriod] = useState<Period>('1y');
  const isRawPeriod = RAW_PERIODS.includes(period);

  const monthlyAverages = useMemo(() => rawMonthlyAverages(records), [records]);

  const monthKeys = useMemo(() => {
    if (records.length === 0) return [];
    const cutoff = cutoffDate(period);
    const startMonth = cutoff
      ? cutoff.slice(0, 7)
      : records.reduce((min, r) => (r.recordedDate < min ? r.recordedDate : min), records[0].recordedDate).slice(0, 7);
    const endMonth = todayString().slice(0, 7);
    return monthRange(startMonth, endMonth);
  }, [records, period]);

  const monthlySeries = useMemo(
    () => fillMonthlySeries(monthKeys, monthlyAverages),
    [monthKeys, monthlyAverages]
  );

  const average = monthlySeries.length > 0
    ? monthlySeries.reduce((sum, p) => sum + p.weightKg, 0) / monthlySeries.length
    : null;

  const rawFiltered = useMemo(() => {
    const cutoff = cutoffDate(period);
    const inRange = cutoff ? records.filter(r => r.recordedDate >= cutoff) : records;
    return [...inRange].sort((a, b) => a.recordedDate.localeCompare(b.recordedDate));
  }, [records, period]);

  const summary = useMemo(() => summarizeWeights(records, rawFiltered), [records, rawFiltered]);

  const chartData = useMemo(() => {
    if (isRawPeriod) return rawFiltered;
    return monthlySeries.map(p => ({ recordedDate: `${p.month}-01`, weightKg: p.weightKg }));
  }, [isRawPeriod, rawFiltered, monthlySeries]);

  const { yDomain, yTicks } = useMemo(() => {
    if (chartData.length === 0) return { yDomain: [0, 100] as [number, number], yTicks: [] as number[] };
    const values = chartData.map(r => r.weightKg);
    const domainMin = Math.floor((Math.min(...values) - 2) / 2) * 2;
    const domainMax = Math.ceil((Math.max(...values) + 2) / 2) * 2;
    const ticks: number[] = [];
    for (let t = domainMin; t <= domainMax; t += 2) ticks.push(t);
    return { yDomain: [domainMin, domainMax] as [number, number], yTicks: ticks };
  }, [chartData]);

  // 최고/최저 강조 점 — 원본 기간은 그 기록 자리에, 월별 기간은 그 기록이 속한 달의 점(월평균) 위에 찍는다
  // (월별 차트의 점은 월평균이라 실제 최고/최저 값 높이에는 점이 없기 때문)
  const markerAt = (record: WeightRecord | null) => {
    if (!record) return null;
    const x = isRawPeriod ? record.recordedDate : `${record.recordedDate.slice(0, 7)}-01`;
    const point = chartData.find(p => p.recordedDate === x);
    return point ? { x, y: point.weightKg } : null;
  };
  const maxMarker = summary.max && summary.max.id !== summary.min?.id ? markerAt(summary.max) : null;
  const minMarker = summary.min && summary.max?.id !== summary.min.id ? markerAt(summary.min) : null;

  const { latest, max, min, base, change } = summary;
  const changeLabel = change === null ? null : change === 0 ? '±0.0kg' : `${change < 0 ? '▼' : '▲'}${formatWeight(Math.abs(change))}kg`;
  const changeColor = change === null || change === 0 ? undefined : change < 0 ? MIN_COLOR : MAX_COLOR;

  const formatTick = isRawPeriod ? formatDayTick : formatMonthTick;
  const formatTooltipLabel = isRawPeriod ? formatFullDate : formatYearMonth;

  return (
    <div className="p-4">
      <div className="flex gap-0.5 bg-gray-100 rounded-full p-1 mb-5">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 text-[11px] py-1.5 rounded-full transition-colors ${
              period === p.key ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {monthlySeries.length === 0 || average === null ? (
        <p className="text-sm text-gray-400 text-center py-10">기록된 데이터가 없습니다</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">
            {formatYearMonth(monthlySeries[0].month)} ~ {formatYearMonth(monthlySeries[monthlySeries.length - 1].month)}
          </p>

          <div className="grid grid-cols-4 border border-gray-200 rounded-xl mb-4 divide-x divide-gray-200">
            <SummaryCell label="평균" value={average.toFixed(1)} sub="월평균" />
            <SummaryCell label="최고" labelColor={MAX_COLOR} value={max ? formatWeight(max.weightKg) : '-'} sub={max ? formatShortDateDot(max.recordedDate) : '-'} />
            <SummaryCell label="최저" labelColor={MIN_COLOR} value={min ? formatWeight(min.weightKg) : '-'} sub={min ? formatShortDateDot(min.recordedDate) : '-'} />
            <SummaryCell label="최근" value={latest ? formatWeight(latest.weightKg) : '-'} sub={latest ? formatMonthDayDot(latest.recordedDate) : '-'} />
          </div>
          {base && changeLabel && (
            <p className="text-[11px] text-gray-500 -mt-2.5 mb-4 px-0.5">
              {formatShortDateDot(base.recordedDate)}(첫 기록 {formatWeight(base.weightKg)}kg) 대비{' '}
              <span className="font-medium" style={changeColor ? { color: changeColor } : undefined}>{changeLabel}</span>
            </p>
          )}

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="recordedDate"
                  tickFormatter={(value: string) => formatTick(value)}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  domain={yDomain}
                  ticks={yTicks}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  formatter={value => [`${formatWeight(Number(value))}kg`, '체중']}
                  labelFormatter={label => formatTooltipLabel(String(label))}
                />
                <ReferenceLine
                  y={average}
                  stroke="#7f77dd"
                  strokeOpacity={0.5}
                  strokeDasharray="5 4"
                />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke="#7f77dd"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#7f77dd' }}
                  activeDot={{ r: 5 }}
                />
                {maxMarker && <ReferenceDot x={maxMarker.x} y={maxMarker.y} r={5} fill="#fff" stroke={MAX_COLOR} strokeWidth={2.5} />}
                {minMarker && <ReferenceDot x={minMarker.x} y={minMarker.y} r={5} fill="#fff" stroke={MIN_COLOR} strokeWidth={2.5} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
