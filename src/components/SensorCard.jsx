function SensorCard({ title, value, unit, subtitle, icon, tone = "info" }) {
  const displayValue = value === null || value === undefined ? "--" : value;

  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-primary",
  }[tone] || "text-primary";

  return (
    <div className="col-6 col-md-4 col-xl-3">
      <div className="metric-card p-3 h-100">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="text-muted small">{title}</div>
          <span className={`fs-5 ${toneClass}`}>{icon}</span>
        </div>

        <div className="d-flex align-items-end gap-1">
          <span className={`fs-3 fw-bold ${toneClass}`}>{displayValue}</span>
          {unit ? <span className="text-muted mb-1">{unit}</span> : null}
        </div>

        {subtitle ? <div className="small text-muted mt-2">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export default SensorCard;