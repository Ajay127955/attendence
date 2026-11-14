import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

/** Theme-aware chart primitives. All colours are greyscale + 3 semantic hues. */
const SEMANTIC = { present: '#15803d', absent: '#b91c1c', late: '#b45309', excused: '#a1a1aa' };

function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    grid: dark ? '#27272a' : '#e4e4e7',
    axis: dark ? '#71717a' : '#a1a1aa',
    text: dark ? '#a1a1aa' : '#52525b',
    surface: dark ? '#18181b' : '#ffffff',
    border: dark ? '#3f3f46' : '#e4e4e7',
    main: dark ? '#f4f4f5' : '#18181b',
    dark,
  };
}

function TooltipBox({ active, payload, label, suffix = '' }) {
  const t = useChartTheme();
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-pop"
      style={{ background: t.surface, borderColor: t.border }}
    >
      {label !== undefined && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize" style={{ color: t.text }}>
            {p.name}
          </span>
          <span className="ml-auto font-semibold">
            {p.value}
            {suffix}
          </span>
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ data = [] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="pctFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.main} stopOpacity={0.28} />
            <stop offset="100%" stopColor={t.main} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: t.axis }}
          tickFormatter={(v) => String(v).slice(5)}
          tickLine={false}
          axisLine={{ stroke: t.grid }}
          minTickGap={20}
        />
        <YAxis tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
        <Tooltip content={<TooltipBox suffix="%" />} />
        <Area
          type="monotone"
          dataKey="percentage"
          name="Attendance"
          stroke={t.main}
          strokeWidth={2}
          fill="url(#pctFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusBarChart({ data = [] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barSize={18}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={{ stroke: t.grid }} />
        <YAxis tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={false} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
        <Legend wrapperStyle={{ fontSize: 12, color: t.text }} />
        <Bar dataKey="present" name="Present" stackId="a" fill={SEMANTIC.present} />
        <Bar dataKey="late" name="Late" stackId="a" fill={SEMANTIC.late} />
        <Bar dataKey="excused" name="Excused" stackId="a" fill={SEMANTIC.excused} />
        <Bar dataKey="absent" name="Absent" stackId="a" fill={SEMANTIC.absent} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ClassPercentageChart({ data = [] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barSize={26}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={{ stroke: t.grid }} />
        <YAxis tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
        <Tooltip content={<TooltipBox suffix="%" />} cursor={{ fill: t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="percentage" name="Attendance" radius={[6, 6, 0, 0]} fill={t.main}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.percentage < 75 ? SEMANTIC.absent : t.main} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ counts = {} }) {
  const t = useChartTheme();
  const data = ['present', 'absent', 'late', 'excused']
    .map((k) => ({ name: k, value: counts[k] || 0, fill: SEMANTIC[k] }))
    .filter((d) => d.value > 0);

  if (!data.length) {
    return <p className="grid h-[220px] place-items-center text-sm text-ink-500 dark:text-ink-400">No data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3} stroke="none">
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox />} />
        <Legend wrapperStyle={{ fontSize: 12, color: t.text, textTransform: 'capitalize' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SubjectLineChart({ data = [] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: t.axis }} tickFormatter={(v) => String(v).slice(5)} tickLine={false} axisLine={{ stroke: t.grid }} />
        <YAxis tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
        <Tooltip content={<TooltipBox suffix="%" />} />
        <Line type="monotone" dataKey="percentage" name="Attendance" stroke={t.main} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export { SEMANTIC };
