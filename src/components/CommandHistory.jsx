import { FiClock } from "react-icons/fi";

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

function getStatusBadgeClass(status) {
  const value = (status || "PENDING").toUpperCase();

  if (value === "COMPLETED") {
    return "badge-success";
  }

  if (value === "FAILED") {
    return "badge-danger";
  }

  if (value === "RECEIVED") {
    return "badge-info";
  }

  return "badge-warning";
}

function CommandHistory({ commands = [] }) {
  return (
    <section className="card dashboard-card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h3 className="h5 mb-1">Command history</h3>
            <p className="text-muted small mb-0">Robot requests and execution states.</p>
          </div>
          <span className="badge rounded-pill bg-light text-dark">
            <FiClock className="me-1" /> {commands.length} entries
          </span>
        </div>

        {commands.length ? (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Received</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((command, index) => (
                  <tr key={`${command?.id || index}-${command?.command || index}`}>
                    <td className="fw-semibold">{command?.command || "—"}</td>
                    <td>
                      <span className={`badge rounded-pill ${getStatusBadgeClass(command?.status)}`}>
                        {command?.status || "PENDING"}
                      </span>
                    </td>
                    <td>{formatTime(command?.requested_at || command?.timestamp)}</td>
                    <td>{formatTime(command?.received_at)}</td>
                    <td>{formatTime(command?.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No commands recorded yet.</div>
        )}
      </div>
    </section>
  );
}

export default CommandHistory;
