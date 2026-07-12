import { NavLink } from "react-router-dom";
import { FiBarChart2, FiCpu, FiClock, FiShield } from "react-icons/fi";

import AlertsPanel from "../components/AlertsPanel";
import SensorCard from "../components/SensorCard";
import StatusCard from "../components/StatusCard";

function OverviewPage({ device, reading, alerts, onRefresh, refreshing, connectionError, sensorCards }) {
  const quickLinks = [
    { to: "/monitoring", title: "Live monitoring", desc: "Charts and environmental trends", icon: <FiBarChart2 /> },
    { to: "/controls", title: "Robot controls", desc: "Send movement and safety commands", icon: <FiCpu /> },
    { to: "/history", title: "Historical data", desc: "Past readings and sensor logs", icon: <FiClock /> },
  ];

  return (
    <>
      <StatusCard
        robotStatus={reading?.robot_status || "NO DATA"}
        operatingMode={reading?.operating_mode || "--"}
        alertStatus={reading?.alert_status || "--"}
        distance={reading?.distance_cm ? Number(reading.distance_cm).toFixed(1) : "--"}
        device={device}
        isOnline={Boolean(device?.is_online)}
      />

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-8">
          <section className="card dashboard-card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                <div>
                  <h2 className="h5 mb-1">Operational overview</h2>
                  <p className="text-muted small mb-0">A concise view of the robot’s current operating context.</p>
                </div>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={onRefresh} disabled={refreshing}>
                  {refreshing ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              <div className="row g-3">
                {sensorCards.slice(0, 6).map((card) => (
                  <SensorCard key={card.title} title={card.title} value={card.value} unit={card.unit} subtitle={card.subtitle} icon={card.icon} tone={card.tone} />
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="col-12 col-lg-4">
          <section className="card dashboard-card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <FiShield className="text-primary" />
                <h2 className="h5 mb-0">Quick navigation</h2>
              </div>
              <div className="d-grid gap-2">
                {quickLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className="card border-0 metric-card p-3 text-decoration-none">
                    <div className="d-flex align-items-center gap-2 mb-2 text-primary">
                      {link.icon}
                      <span className="fw-semibold">{link.title}</span>
                    </div>
                    <div className="small text-muted">{link.desc}</div>
                  </NavLink>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <AlertsPanel alerts={alerts.slice(0, 5)} loading={false} showAll={false} onToggle={() => {}} />
    </>
  );
}

export default OverviewPage;
