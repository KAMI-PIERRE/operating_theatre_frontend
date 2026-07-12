import RobotControls from "../components/RobotControls";
import AlertsPanel from "../components/AlertsPanel";

function ControlsPage({ reading, alerts, onCommandSent }) {
  return (
    <div className="row g-4">
      <div className="col-12 col-xl-7">
        <RobotControls currentMode={reading?.operating_mode} onCommandSent={onCommandSent} />
      </div>
      <div className="col-12 col-xl-5">
        <AlertsPanel alerts={alerts.slice(0, 8)} loading={false} showAll={false} onToggle={() => {}} />
      </div>
    </div>
  );
}

export default ControlsPage;
