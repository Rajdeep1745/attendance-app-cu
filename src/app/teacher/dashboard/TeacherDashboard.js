import { useState, useContext, useEffect } from "react";
import AlertContext from "../../../context/alert/AlertContext";
import BatchContext from "../../../context/batch/BatchContext";
import { useParams } from "react-router-dom";

import "./TeacherDashboard.css";

const Dashboard = () => {
  const { showAlert } = useContext(AlertContext);
  const { activeBatch, fetchBatchById } = useContext(BatchContext);
  const { batchId } = useParams();

  // Average attendance
  const [avgAttendance, setAvgAttendance] = useState(0);

  // Attendance code
  const code = activeBatch?.batch_code;

  // Students in batch
  const students = activeBatch?.total_students ?? 0;

  // Threshold
  const [threshold, setThreshold] = useState(0);
  const [savedThreshold, setSavedThreshold] = useState(0);

  // Mode
  const [mode, setMode] = useState("manual");

  // Image
  //eslint-disable-next-line
  const [image, setImage] = useState(null);

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);

    showAlert("Copied", "Copied successfully", "success");
  };

  // Batch name
  const batchName = activeBatch?.name || "Loading...";

  // Save new threshold
  const saveThreshold = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/batches/${batchId}/threshold`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ threshold }),
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSavedThreshold(threshold);
      await fetchBatchById(batchId);
      showAlert("Saved", "Threshold updated", "success");
    } catch (err) {
      showAlert("Error", err.message, "danger");
    }
  };

  // Fetch Average Attendance
  const fetchAverageAttendance = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/attendance/${id}/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to fetch stats");
      }

      setAvgAttendance(data.avgAttendance);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!batchId) return;

    fetchAverageAttendance(batchId);
  }, [batchId]);

  useEffect(() => {
    if (activeBatch?.threshold !== undefined) {
      setThreshold(activeBatch.threshold);
      setSavedThreshold(activeBatch.threshold);
    }
  }, [activeBatch]);

  return (
    <div className="container-fluid dashboard">
      {/* PAGE TITLE */}
      <div className="mb-4">
        <h3 className="text-center fw-semibold mb-1">{batchName}</h3>

        <h2 className="dashboard-title mt-3 mb-2">Dashboard</h2>

        <p className="dashboard-subtitle mb-0">
          Configure attendance for this batch
        </p>
      </div>

      {/* STATS ROW */}
      <div className="row g-4 mb-4">
        {/* Students in batch */}
        <div className="col">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">Students in Batch</p>
              <h2 className="stats-value">{students || 0}</h2>
              <i className="fa-solid fa-users stats-icon"></i>
            </div>
          </div>
        </div>

        {/* Average attendance */}
        <div className="col">
          <div className="card dashboard-card h-100">
            <div className="card-body stats-card-body">
              <p className="stats-title">Average Attendance</p>
              <h2 className="stats-value">{avgAttendance}%</h2>
              <i className="fa-solid fa-percent stats-icon"></i>
            </div>
          </div>
        </div>
      </div>

      {/* TOP ROW */}
      <div className="row g-4">
        {/* CODE GENERATOR */}
        <div className="col-md-6">
          <div className="card dashboard-card d-flex flex-column h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">Batch Join Code</h5>
              <p className="dashboard-subtitle small">
                Generate a unique code for students
              </p>

              <input
                type="text"
                className="form-control mb-3 text-center fw-bold"
                value={code || "Loading..."}
                readOnly
              />
              <div className="d-flex gap-2 card-actions">
                <button
                  className="btn btn-primary"
                  disabled={!code}
                  onClick={copyCode}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* THRESHOLD */}
        <div className="col-md-6">
          <div className="card dashboard-card h-100">
            <div className="card-body">
              <h5 className="card-title">Attendance Warning Threshold</h5>
              <p className="dashboard-subtitle small mb-4">
                Set the minimum required attendance percentage. Students below
                this threshold will be flagged.
              </p>

              {/* Slider + Input */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <input
                  type="range"
                  className="form-range flex-grow-1"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) => {
                    setThreshold(Number(e.target.value));
                  }}
                />

                <div className="threshold-input-wrapper">
                  <input
                    type="number"
                    className="form-control text-center"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => {
                      setThreshold(Number(e.target.value));
                    }}
                  />
                  <span className="percent-sign">%</span>
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex gap-2 card-actions">
                <button
                  className="btn btn-primary"
                  disabled={threshold === savedThreshold}
                  onClick={saveThreshold}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODE SELECTOR */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Attendance Mode</h5>
              <p className="dashboard-subtitle small">
                Choose how attendance will be taken
              </p>

              <div className="d-flex gap-4 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="mode"
                    checked={mode === "manual"}
                    onChange={() => setMode("manual")}
                  />
                  <label className="form-check-label">Manual</label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="mode"
                    checked={mode === "auto"}
                    onChange={() => setMode("auto")}
                  />
                  <label className="form-check-label">Automatic</label>
                </div>
              </div>

              {mode === "auto" && (
                <div>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files[0])}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
