'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
} from '@/utils/weightStats';

interface WeightGraphTabProps {
  records: WeightRecord[];
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
          <p className="text-xs text-gray-500 mb-0.5">평균</p>
          <p className="text-2xl font-medium mb-0.5">
            {average.toFixed(1)}<span className="text-sm text-gray-500">kg</span>
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {formatYearMonth(monthlySeries[0].month)} ~ {formatYearMonth(monthlySeries[monthlySeries.length - 1].month)}
          </p>

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
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke="#7f77dd"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#7f77dd' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
