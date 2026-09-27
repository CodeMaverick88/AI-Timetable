const API = "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export const getTimetable = () => request("/api/timetable");

export const getConflicts = () => request("/api/conflicts");

export const detectConflicts = () =>
  request("/api/conflicts/detect", {
    method: "POST",
  });

export const runSolver = (scenario = "ORBIT interactive conflict resolution") =>
  request("/api/solver/run", {
    method: "POST",
    body: JSON.stringify({ scenario }),
  });

export const resetDemo = () =>
  request("/api/demo/reset", {
    method: "POST",
  });

export const getDemoEntries = () =>
  request("/api/demo/entries");

export const injectConflict = (payload) =>
  request("/api/demo/inject-conflict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
