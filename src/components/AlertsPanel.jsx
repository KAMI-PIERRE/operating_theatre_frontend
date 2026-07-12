import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

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

function getSeverityBadgeClass(severity) {
  const value = (severity || "INFO").toUpperCase();

  if (value.includes("DANGER") || value.includes("CRITICAL")) {
    return "badge-danger";
  }

  if (value.includes("WARNING") || value.includes("ALERT")) {
    return "badge-warning";
  }

  return "badge-info";
}

function AlertsPanel({ alerts = [], loading = false, showAll = false, onToggle }) {
  const visibleAlerts = showAll ? alerts : alerts.slice(0, 10);

  return (
    <section className="card dashboard-card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h3 className="h5 mb-1">Recent alerts</h3>
            <p className="text-muted small mb-0">Latest incident notices and acknowledgements.</p>
          </div>
          {alerts.length > 10 ? (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onToggle}>
              {showAll ? "Show less" : "View more"}
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="empty-state">Refreshing alerts…</div>
        ) : visibleAlerts.length ? (
          <div className="list-group list-group-flush">
            {visibleAlerts.map((alert, index) => {
              const severity = alert?.severity || alert?.level || alert?.status || "INFO";
              const acknowledged = Boolean(alert?.acknowledged ?? alert?.is_acknowledged ?? alert?.acknowledged_at);

              return (
                <div className="list-group-item px-0 py-3" key={`${alert?.id || index}-${alert?.title || alert?.message || index}`}>
                  <div className="d-flex justify-content-between gap-3 flex-wrap">
                    <div className="d-flex gap-2 align-items-center">
                      <span className={`badge rounded-pill ${getSeverityBadgeClass(severity)} px-3 py-2`}>
                        {String(severity).toUpperCase()}
                      </span>
                      <div>
                        <h4 className="h6 mb-1">{alert?.title || "Alert"}</h4>
                        <p className="mb-0 small text-muted">{alert?.message || "No additional detail was provided."}</p>
                      </div>
                    </div>
                    <div className="text-end text-muted small">
                      <div>{formatTime(alert?.recorded_at || alert?.timestamp || alert?.created_at)}</div>
                      <div className="mt-1 d-flex align-items-center justify-content-end gap-1">
                        {acknowledged ? <FiCheckCircle className="text-success" /> : <FiAlertTriangle className="text-warning" />}
                        <span>{acknowledged ? "Acknowledged" : "Pending"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No alerts recorded yet.</div>
        )}
      </div>
    </section>
  );
}

export default AlertsPanel;
