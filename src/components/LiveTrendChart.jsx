import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatTimeLabel(value) {
  if (!value) {
    return "—";
  }

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return "—";
  }

  return dateValue.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LiveTrendChart({ title, subtitle, data = [], series = [], height = 300 }) {
  const chartData = useMemo(() => {
    return (data || [])
      .map((item) => {
        const timestamp = item?.recorded_at || item?.timestamp || item?.created_at;
        const entry = {
          timeLabel: formatTimeLabel(timestamp),
        };

        series.forEach(({ key }) => {
          const rawValue = item?.[key];
          const numericValue = Number(rawValue);

          entry[key] = Number.isFinite(numericValue) ? numericValue : null;
        });

        return entry;
      })
      .filter((item) => series.some(({ key }) => item[key] !== null));
  }, [data, series]);

  return (
    <div className="chart-card">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h3 className="h6 mb-1">{title}</h3>
          {subtitle ? <p className="mb-0 small text-muted">{subtitle}</p> : null}
        </div>
      </div>

      {chartData.length ? (
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 6, right: 8, left: -14, bottom: 0 }}
            >
              <CartesianGrid stroke="#e6edf6" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="timeLabel" tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              {series.map(({ key, label, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={label}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">No chartable readings yet.</div>
      )}
    </div>
  );
}

export default LiveTrendChart;
