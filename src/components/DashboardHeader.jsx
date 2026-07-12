import { FiRefreshCw, FiAlertTriangle } from "react-icons/fi";

function formatTime(value) {
  if (!value) {
    return "Waiting for first reading";
  }

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return "Waiting for first reading";
  }

  return dateValue.toLocaleString();
}

function DashboardHeader({ onRefresh, lastUpdated, refreshing = false, error = "", isReady = false }) {
  return (
    <section className="card dashboard-card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <p className="text-uppercase small text-primary fw-semibold mb-2">Operating theatre monitoring system</p>
            <h1 className="h3 mb-2">Air quality and contamination risk monitoring for theatre robotics</h1>
            <p className="text-muted mb-0">
              A responsive clinical monitoring interface for tracking environmental conditions, alert states, and robot operations in real time.
            </p>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={onRefresh} disabled={refreshing}>
              <FiRefreshCw className={`me-2 ${refreshing ? "spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh now"}
            </button>
            <span className="badge rounded-pill bg-light text-dark">Last update: {formatTime(lastUpdated)}</span>
          </div>
        </div>

        {error ? (
          <div className="alert alert-warning mt-3 mb-0 d-flex justify-content-between align-items-center flex-wrap gap-2" role="alert">
            <div className="d-flex align-items-center gap-2">
              <FiAlertTriangle />
              <span>{error}</span>
            </div>
            <button type="button" className="btn btn-sm btn-warning" onClick={onRefresh} disabled={refreshing}>
              Retry connection
            </button>
          </div>
        ) : null}

        <div className={`alert ${isReady ? "alert-info" : "alert-secondary"} mt-3 mb-0`} role="status">
          <strong>Clinical monitoring workflow support interface.</strong>
        </div>
      </div>
    </section>
  );
}

export default DashboardHeader;
