import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  FiActivity,
  FiAlertCircle,
  FiCloud,
  FiDroplet,
  FiLayers,
  FiThermometer,
  FiWind,
} from "react-icons/fi";

import DashboardHeader from "../components/DashboardHeader";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getAlerts, getCommandHistory, getLatestData, getSensorHistory } from "../services/robotService";
import ControlsPage from "./ControlsPage";
import HistoryPage from "./HistoryPage";
import MonitoringPage from "./MonitoringPage";
import OverviewPage from "./OverviewPage";

const LATEST_INTERVAL_MS = 2000;
const HISTORY_INTERVAL_MS = 5000;

function roundValue(value, decimals = 1) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue.toFixed(decimals);
}

function getToneFromValue(title, value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "info";
  }

  if (title.includes("Temperature") && numericValue > 26) {
    return "warning";
  }

  if (title.includes("Humidity") && numericValue > 70) {
    return "warning";
  }

  if ((title.includes("CO") || title.includes("N₂O") || title.includes("Contamination")) && numericValue > 20) {
    return "danger";
  }

  if ((title.includes("Oxygen") || title.includes("PM")) && numericValue > 50) {
    return "warning";
  }

  return "info";
}

function Dashboard() {
  const location = useLocation();
  const [device, setDevice] = useState(null);
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [commands, setCommands] = useState([]);
  const [historyLimit, setHistoryLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const latestRequestRef = useRef(false);
  const historyRequestRef = useRef(false);
  const alertsRequestRef = useRef(false);
  const commandsRequestRef = useRef(false);

  const sensorCards = useMemo(() => {
    const temperatureValue = roundValue(reading?.temperature_c);
    const humidityValue = roundValue(reading?.humidity_percent);
    const co2Value = roundValue(reading?.co2_trend_ppm);
    const n2oValue = roundValue(reading?.n2o_risk_percent);
    const oxygenValue = roundValue(reading?.oxygen_index_percent);
    const pm25Value = roundValue(reading?.pm25_ug_m3);
    const pm10Value = roundValue(reading?.pm10_ug_m3);
    const contaminationValue = roundValue(reading?.contamination_risk_percent);
    const mq135Value = reading?.mq135_raw;

    return [
      { title: "Temperature", value: temperatureValue, unit: "°C", subtitle: "Ambient thermal stability", icon: <FiThermometer />, tone: getToneFromValue("Temperature", temperatureValue) },
      { title: "Humidity", value: humidityValue, unit: "%", subtitle: "Relative air moisture", icon: <FiDroplet />, tone: getToneFromValue("Humidity", humidityValue) },
      { title: "CO₂ trend", value: co2Value, unit: "ppm", subtitle: "Academic estimate from MQ135", icon: <FiCloud />, tone: getToneFromValue("CO₂ trend", co2Value) },
      { title: "N₂O leakage risk", value: n2oValue, unit: "%", subtitle: "Leakage risk index, not direct ppm", icon: <FiAlertCircle />, tone: getToneFromValue("N₂O leakage risk", n2oValue) },
      { title: "Estimated oxygen index", value: oxygenValue, unit: "%", subtitle: "Estimated ventilation index", icon: <FiWind />, tone: getToneFromValue("Estimated oxygen index", oxygenValue) },
      { title: "PM2.5", value: pm25Value, unit: "µg/m³", subtitle: "Fine particulates", icon: <FiLayers />, tone: getToneFromValue("PM2.5", pm25Value) },
      { title: "PM10", value: pm10Value, unit: "µg/m³", subtitle: "Coarse particulates", icon: <FiLayers />, tone: getToneFromValue("PM10", pm10Value) },
      { title: "Contamination risk", value: contaminationValue, unit: "%", subtitle: "Derived from PM2.5 and PM10", icon: <FiAlertCircle />, tone: getToneFromValue("Contamination risk", contaminationValue) },
      { title: "MQ135 raw", value: mq135Value, subtitle: "Uncalibrated sensor response", icon: <FiActivity />, tone: getToneFromValue("MQ135 raw", mq135Value) },
    ];
  }, [reading]);

  const chartSeries = useMemo(() => [
    { key: "temperature_c", label: "Temperature", color: "#0f4c81" },
    { key: "humidity_percent", label: "Humidity", color: "#2e8b57" },
  ], []);

  const gasSeries = useMemo(() => [
    { key: "co2_trend_ppm", label: "CO₂", color: "#8b5cf6" },
    { key: "n2o_risk_percent", label: "N₂O", color: "#f59e0b" },
    { key: "oxygen_index_percent", label: "O₂", color: "#2563eb" },
  ], []);

  const particulateSeries = useMemo(() => [
    { key: "pm25_ug_m3", label: "PM2.5", color: "#0ea5e9" },
    { key: "pm10_ug_m3", label: "PM10", color: "#14b8a6" },
  ], []);

  const riskSeries = useMemo(() => [
    { key: "contamination_risk_percent", label: "Risk", color: "#ef4444" },
  ], []);

  const loadLatestData = useCallback(async (isManual = false) => {
    if (latestRequestRef.current) {
      return { success: true };
    }

    latestRequestRef.current = true;

    if (isManual) {
      setRefreshing(true);
    } else if (loading) {
      setLoading(true);
    }

    try {
      const result = await getLatestData();
      const nextDevice = result?.data?.device ?? null;
      const nextReading = result?.data?.reading ?? null;

      setDevice((currentDevice) => nextDevice ?? currentDevice);
      setReading((currentReading) => (nextReading ?? currentReading));

      if (nextReading?.recorded_at) {
        setLastUpdated(nextReading.recorded_at);
      }

      setConnectionError("");
      return { success: true };
    } catch (error) {
      console.error("Latest data request failed", error);
      setConnectionError(error.response?.data?.message || "Unable to reach the Flask backend. The dashboard is keeping the last known values.");
      return { success: false };
    } finally {
      latestRequestRef.current = false;
      if (isManual) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [loading]);

  const loadHistoryData = useCallback(async (isManual = false) => {
    if (historyRequestRef.current) {
      return { success: true };
    }

    historyRequestRef.current = true;

    try {
      const result = await getSensorHistory(historyLimit);
      const readings = result?.data?.readings || [];
      setHistory(readings);
      return { success: true };
    } catch (error) {
      console.error("History request failed", error);
      return { success: false };
    } finally {
      historyRequestRef.current = false;
    }
  }, [historyLimit]);

  const loadAlertsData = useCallback(async (isManual = false) => {
    if (alertsRequestRef.current) {
      return { success: true };
    }

    alertsRequestRef.current = true;

    try {
      const result = await getAlerts(50);
      const nextAlerts = result?.data?.alerts || [];
      setAlerts(nextAlerts);
      return { success: true };
    } catch (error) {
      console.error("Alerts request failed", error);
      return { success: false };
    } finally {
      alertsRequestRef.current = false;
    }
  }, []);

  const loadCommandHistory = useCallback(async (isManual = false) => {
    if (commandsRequestRef.current) {
      return { success: true };
    }

    commandsRequestRef.current = true;

    try {
      const result = await getCommandHistory(30);
      const nextCommands = result?.data?.commands || [];
      setCommands(nextCommands);
      return { success: true };
    } catch (error) {
      console.error("Command history request failed", error);
      return { success: false };
    } finally {
      commandsRequestRef.current = false;
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.allSettled([
      loadLatestData(true),
      loadHistoryData(true),
      loadAlertsData(true),
      loadCommandHistory(true),
    ]);

    const failed = results.some((result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value?.success));

    if (failed) {
      setConnectionError("One or more refreshes failed. The dashboard is still showing the last known values.");
    }

    setRefreshing(false);
  }, [loadAlertsData, loadCommandHistory, loadHistoryData, loadLatestData]);

  useEffect(() => {
    refreshDashboard();

    const latestTimer = window.setInterval(() => {
      loadLatestData(false);
    }, LATEST_INTERVAL_MS);

    const historyTimer = window.setInterval(() => {
      loadHistoryData(false);
      loadAlertsData(false);
      loadCommandHistory(false);
    }, HISTORY_INTERVAL_MS);

    return () => {
      window.clearInterval(latestTimer);
      window.clearInterval(historyTimer);
    };
  }, [loadAlertsData, loadCommandHistory, loadHistoryData, loadLatestData, refreshDashboard]);

  const chartData = useMemo(() => {
    return [...(history || [])]
      .filter((item) => item?.recorded_at)
      .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  }, [history]);

  const navItems = [
    { to: "/overview", label: "Overview" },
    { to: "/monitoring", label: "Monitoring" },
    { to: "/controls", label: "Controls" },
    { to: "/history", label: "History" },
  ];

  return (
    <div className="min-vh-100">
      <Navbar device={device} isOnline={Boolean(device?.is_online)} lastUpdated={lastUpdated || reading?.recorded_at} />

      <main className="container-fluid px-3 px-lg-4 py-4">
        <DashboardHeader onRefresh={refreshDashboard} lastUpdated={lastUpdated || reading?.recorded_at} refreshing={refreshing} error={connectionError} isReady={Boolean(reading)} />

        <div className="card dashboard-card mb-4">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to || (item.to === "/overview" && location.pathname === "/");
                return (
                  <NavLink key={item.to} to={item.to} className={`btn btn-sm ${isActive ? "btn-primary" : "btn-outline-secondary"}`}>
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        {loading && !reading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-3 text-muted">Loading the latest operating theatre data…</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage device={device} reading={reading} alerts={alerts} onRefresh={refreshDashboard} refreshing={refreshing} connectionError={connectionError} sensorCards={sensorCards} />} />
            <Route path="/monitoring" element={<MonitoringPage chartData={chartData} chartSeries={chartSeries} gasSeries={gasSeries} particulateSeries={particulateSeries} riskSeries={riskSeries} sensorCards={sensorCards} />} />
            <Route path="/controls" element={<ControlsPage reading={reading} alerts={alerts} onCommandSent={refreshDashboard} />} />
            <Route path="/history" element={<HistoryPage commands={commands} history={history} historyLimit={historyLimit} setHistoryLimit={setHistoryLimit} />} />
          </Routes>
        )}

        <Footer />
      </main>
    </div>
  );
}

export default Dashboard;