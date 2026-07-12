import { FiActivity, FiClock, FiMapPin } from "react-icons/fi";

function Navbar({ device, isOnline, lastUpdated }) {
  const location = device?.location || "Academic Operating Theatre";
  const deviceName = device?.device_name || "Operating Theatre Monitoring Robot";

  return (
    <nav className="navbar navbar-dark" style={{ background: "#0f4c81" }}>
      <div className="container-fluid px-3 px-lg-4 py-2">
        <div>
          <span className="navbar-brand mb-0 h4">{deviceName}</span>
          <div className="text-light-50 small">
            {location}
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className={`status-pill ${isOnline ? "badge-success" : "badge-warning"}`}>
            <FiActivity /> {isOnline ? "Online" : "Offline"}
          </span>
          <span className="status-pill badge-info">
            <FiMapPin /> {location}
          </span>
          <span className="status-pill badge-light text-dark">
            <FiClock /> {lastUpdated ? new Date(lastUpdated).toLocaleString() : "Awaiting data"}
          </span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;