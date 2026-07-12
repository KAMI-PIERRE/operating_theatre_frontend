import CommandHistory from "../components/CommandHistory";
import SensorHistoryTable from "../components/SensorHistoryTable";

function HistoryPage({ commands, history, historyLimit, setHistoryLimit }) {
  return (
    <div className="row g-4">
      <div className="col-12">
        <SensorHistoryTable readings={history} limit={historyLimit} onLimitChange={setHistoryLimit} loading={false} />
      </div>
      <div className="col-12">
        <CommandHistory commands={commands} />
      </div>
    </div>
  );
}

export default HistoryPage;
