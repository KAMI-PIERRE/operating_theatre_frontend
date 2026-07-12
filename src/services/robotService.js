import api from "../api/api";

const DEVICE_ID = "OT_ROBOT_001";

export async function getLatestData() {
  const response = await api.get("/dashboard/latest", {
    params: {
      device_id: DEVICE_ID,
    },
  });

  return response.data;
}

export async function getSensorHistory(limit = 50) {
  const response = await api.get("/dashboard/history", {
    params: {
      device_id: DEVICE_ID,
      limit,
    },
  });

  return response.data;
}

export async function getAlerts(limit = 50) {
  const response = await api.get("/dashboard/alerts", {
    params: {
      device_id: DEVICE_ID,
      limit,
    },
  });

  return response.data;
}

export async function getCommandHistory(limit = 30) {
  const response = await api.get("/dashboard/commands", {
    params: {
      device_id: DEVICE_ID,
      limit,
    },
  });

  return response.data;
}

export async function sendRobotCommand(command) {
  const response = await api.post("/dashboard/command", {
    device_id: DEVICE_ID,
    command,
  });

  return response.data;
}

export { DEVICE_ID };