import { useState } from "react";
import { FiAlertTriangle, FiPauseCircle, FiPlayCircle, FiRadio, FiShieldOff } from "react-icons/fi";
import { sendRobotCommand } from "../services/robotService";

const movementCommands = [
  {
    command: "MOVE",
    label: "Move robot",
    className: "btn-success",
    icon: <FiPlayCircle />,
  },
  {
    command: "STOP",
    label: "Stop robot",
    className: "btn-danger",
    icon: <FiPauseCircle />,
  },
];

const modeCommands = [
  {
    command: "REAL",
    label: "Real",
    className: "btn-outline-primary",
  },
  {
    command: "NORMAL",
    label: "Normal",
    className: "btn-outline-success",
  },
  {
    command: "WARNING",
    label: "Warning",
    className: "btn-outline-warning",
  },
  {
    command: "DANGER",
    label: "Danger",
    className: "btn-outline-danger",
  },
];

function RobotControls({ currentMode, onCommandSent }) {
  const [sendingCommand, setSendingCommand] = useState("");
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  async function handleCommand(command) {
    if (command === "DANGER") {
      const confirmed = window.confirm("Trigger the danger-state simulation for the theatre robot?");
      if (!confirmed) {
        return;
      }
    }

    try {
      setSendingCommand(command);
      setMessage("");
      setHasError(false);

      const result = await sendRobotCommand(command);
      setMessage(result?.message || `${command} command sent.`);

      if (onCommandSent) {
        onCommandSent();
      }
    } catch (error) {
      console.error("Command dispatch error", error);
      setHasError(true);
      setMessage(error.response?.data?.message || "The command could not be sent.");
    } finally {
      setSendingCommand("");
    }
  }

  return (
    <section className="card dashboard-card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h3 className="h5 mb-1">Robot control</h3>
            <p className="text-muted small mb-0">Issue movement and alert-state commands to the theatre robot.</p>
          </div>
          <span className="status-pill badge-info">
            <FiShieldOff /> Current mode: {currentMode || "—"}
          </span>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-4">
          {movementCommands.map((item) => (
            <button
              key={item.command}
              type="button"
              className={`btn ${item.className} ${item.command === "STOP" ? "btn-lg" : ""}`}
              disabled={Boolean(sendingCommand)}
              onClick={() => handleCommand(item.command)}
            >
              {sendingCommand === item.command ? "Sending…" : <><span className="me-2">{item.icon}</span>{item.label}</>}
            </button>
          ))}
        </div>

        <div className="d-flex flex-wrap gap-2">
          {modeCommands.map((item) => {
            const isActive = currentMode === item.command;

            return (
              <button
                key={item.command}
                type="button"
                className={`btn ${item.className} ${isActive ? "active" : ""}`}
                disabled={Boolean(sendingCommand)}
                onClick={() => handleCommand(item.command)}
              >
                {sendingCommand === item.command ? "Sending…" : item.label}
              </button>
            );
          })}
        </div>

        {message ? (
          <div className={`alert ${hasError ? "alert-danger" : "alert-success"} mt-3 mb-0 d-flex align-items-center gap-2`} role="status">
            <FiAlertTriangle /> {message}
          </div>
        ) : null}

        <div className="mt-3 small text-muted d-flex align-items-center gap-2">
          <FiRadio /> Commands are transmitted through the monitoring service and reflected in the dashboard after a short refresh interval.
        </div>
      </div>
    </section>
  );
}

export default RobotControls;