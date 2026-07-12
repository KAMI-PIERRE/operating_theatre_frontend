import { useMemo } from "react";

function formatTime(value) {
  if (!value) {
    return "—";
  }

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return "—";
  }

  return dateValue.toLocaleString();
}

function formatValue(value, decimals = 1) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "—";
  }

  return numericValue.toFixed(decimals);
}

function SensorHistoryTable({ readings = [], limit = 25, onLimitChange, loading = false }) {
  const visibleReadings = useMemo(() => readings.slice(0, limit), [readings, limit]);

  return (
    <section className="card dashboard-card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h3 className="h5 mb-1">Sensor history</h3>
            <p className="text-muted small mb-0">Recent environmental readings from the robot.</p>
          </div>
          <div className="btn-group btn-group-sm" role="group" aria-label="History limit">
            {[10, 25, 50].map((option) => (
              <button
                key={option}
                type="button"
                className={`btn ${limit === option ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => onLimitChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Refreshing history…</div>
        ) : visibleReadings.length ? (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Mode</th>
                  <th>Robot</th>
                  <th>Alert</th>
                  <th>Temp</th>
                  <th>Hum</th>
                  <th>CO₂</th>
                  <th>N₂O</th>
                  <th>O₂</th>
                  <th>PM2.5</th>
                  <th>PM10</th>
                  <th>Risk</th>
                  <th>Dist.</th>
                </tr>
              </thead>
              <tbody>
                {visibleReadings.map((reading, index) => (
                  <tr key={`${reading?.id || index}-${reading?.recorded_at || index}`}>
                    <td>{formatTime(reading?.recorded_at)}</td>
                    <td>{reading?.operating_mode || "—"}</td>
                    <td>{reading?.robot_status || "—"}</td>
                    <td>{reading?.alert_status || "—"}</td>
                    <td>{formatValue(reading?.temperature_c)}°C</td>
                    <td>{formatValue(reading?.humidity_percent)}%</td>
                    <td>{formatValue(reading?.co2_trend_ppm)} ppm</td>
                    <td>{formatValue(reading?.n2o_risk_percent)}%</td>
                    <td>{formatValue(reading?.oxygen_index_percent)}%</td>
                    <td>{formatValue(reading?.pm25_ug_m3)} µg/m³</td>
                    <td>{formatValue(reading?.pm10_ug_m3)} µg/m³</td>
                    <td>{formatValue(reading?.contamination_risk_percent)}%</td>
                    <td>{formatValue(reading?.distance_cm)} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No historical sensor rows available.</div>
        )}
      </div>
    </section>
  );
}

export default SensorHistoryTable;
