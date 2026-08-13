import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TeachingStatsChartProps {
  data: Array<{ month: string; hours: number; sessions: number }>;
  emptyLabel: string;
  hoursLabel: string;
  titleLabel: string;
}

export function TeachingStatsChart({
  data,
  emptyLabel,
  hoursLabel,
  titleLabel,
}: TeachingStatsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary, #6246ea)" stopOpacity={0.25}/>
            <stop offset="95%" stopColor="var(--color-primary, #6246ea)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-gray-800" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '16px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
            background: 'var(--color-card, #ffffff)',
            color: 'var(--color-text, #2b2c34)',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
          formatter={(value: number) => [`${value} ${hoursLabel}`, titleLabel]}
        />
        <Area
          type="monotone"
          dataKey="hours"
          stroke="var(--color-primary, #6246ea)"
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#colorHours)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
