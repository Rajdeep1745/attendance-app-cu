import { useState, useContext, useEffect } from "react";
import BatchContext from "../../context/batch/BatchContext";

import "./Dashboard.css";

const Dashboard = () => {
  const { activeBatch } = useContext(BatchContext);

  // Attendance code
  const [code, setCode] = useState("");

  // Threshold
  const [threshold, setThreshold] = useState(75);

  // Mode
  const [mode, setMode] = useState("manual");
  const [image, setImage] = useState(null);

  const generateCode = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCode(newCode);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    alert("Attendance code copied!");
  };

  const batchName = activeBatch ? activeBatch.name : "";

  useEffect(() => {
    if (code !== "") return;

    generateCode();
    //eslint-disable-next-line
  }, []);

  return (
    <div className="container-fluid">
      {/* PAGE TITLE */}
      <div className="mb-4">
        <h3 className="text-center fw-semibold mb-1">{batchName}</h3>

        <h2 className="dashboard-title mt-3 mb-2">Dashboard</h2>

        <p className="text-muted mb-0">Configure attendance for this batch</p>
      </div>

      {/* TOP ROW */}
      <div className="row g-4">
        {/* CODE GENERATOR */}
        <div className="col-md-6">
          <div className="card dashboard-card d-flex flex-column h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">Batch Join Code</h5>
              <p className="text-muted small">
                Generate a unique code for students
              </p>

              <input
                type="text"
                className="form-control mb-3 text-center fw-bold"
                value={code}
                readOnly
                placeholder="Click generate"
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
              <p className="text-muted small mb-4">
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
                  disabled={threshold === 75}
                  onClick={() => setThreshold(75)}
                >
                  Reset
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
              <p className="text-muted small">
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

              {mode === "manual" && (
                <div className="alert alert-info mb-0">
                  Teacher will manually mark attendance.
                </div>
              )}

              {mode === "auto" && (
                <div>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files[0])}
                  />

                  {image && (
                    <div className="alert alert-success mt-3">
                      Image selected: <strong>{image.name}</strong>
                    </div>
                  )}
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
