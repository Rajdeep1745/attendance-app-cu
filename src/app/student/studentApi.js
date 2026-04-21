const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
};

export const getMyJoinedBatches = () => apiFetch("api/students/me/batches");

export const joinBatchByCode = (batchCode) =>
  apiFetch("api/students/me/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ batchCode }),
  });

export const leaveBatch = (batchId) =>
  apiFetch(`api/students/me/batches/${batchId}`, {
    method: "DELETE",
  });

export const getStudentOverview = (batchId) =>
  apiFetch(`api/students/me/batches/${batchId}/overview`);

export const getStudentRoster = (batchId) =>
  apiFetch(`api/students/${batchId}`);

export const getStudentReports = (batchId) =>
  apiFetch(`api/students/me/batches/${batchId}/reports`);

export const getStudentAttendanceByDate = (date) =>
  apiFetch(`api/students/me/attendance?date=${date}`);

export const getStudentCurriculum = (batchId) =>
  apiFetch(`api/lectures/curriculum/${batchId}`);

export const getStudentPlan = (batchId) =>
  apiFetch(`api/lectures/plan/${batchId}`);

export const getBatchAttendanceStats = (batchId) =>
  apiFetch(`api/attendance/${batchId}/stats`);
