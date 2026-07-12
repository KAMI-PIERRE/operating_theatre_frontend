import { FiActivity, FiAlertTriangle, FiCpu, FiNavigation, FiRadio } from "react-icons/fi";

function getAlertClass(alertStatus) {
  if (alertStatus === "DANGER") {
    return "text-danger";
  }

  if (alertStatus === "WARNING") {
    return "text-warning";
  }

  return "text-success";
}

function getRobotClass(robotStatus) {
  if (robotStatus === "STOPPED") {
    return "text-secondary";
  }

  if (robotStatus === "OBSTACLE") {
    return "text-danger";
  }

  return "text-primary";
}

function StatusCard({ robotStatus, operatingMode, alertStatus, distance, device, isOnline }) {
  const statusItems = [
    {
      label: "Robot status",
      value: robotStatus || "NO DATA",
      tone: getRobotClass(robotStatus),
      icon: <FiActivity />,
    },
    {
      label: "Operating mode",
      value: operatingMode || "--",
      tone: "text-primary",
      icon: <FiCpu />,
    },
    {
      label: "Alert status",
      value: alertStatus || "--",
      tone: getAlertClass(alertStatus),
      icon: <FiAlertTriangle />,
    },
    {
      label: "Obstacle distance",
      value: `${distance ?? "--"} cm`,
      tone: "text-dark",
      icon: <FiNavigation />,
    },
  ];

  return (
    <section className="card dashboard-card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h3 className="h5 mb-1">System status</h3>
            <p className="text-muted small mb-0">High-level device and safety indicators.</p>
          </div>
          <span className={`status-pill ${isOnline ? "badge-success" : "badge-warning"}`}>
            <FiRadio /> {isOnline ? "System connected" : "Connection lost"}
          </span>
        </div>

        <div className="row g-3">
          {statusItems.map((item) => (
            <div className="col-6 col-lg-3" key={item.label}>
              <div className="metric-card p-3 h-100">
                <div className="text-muted small d-flex align-items-center gap-2">
                  {item.icon}
                  {item.label}
                </div>
                <div className={`fs-5 fw-bold mt-2 ${item.tone}`}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 small text-muted">
          Device {device?.device_id || "OT_ROBOT_001"} · Firmware {device?.firmware_version || "1.0.0"} · Last seen {device?.last_seen ? new Date(device.last_seen).toLocaleString() : "—"}
        </div>
      </div>
    </section>
  );
}

export default StatusCard;