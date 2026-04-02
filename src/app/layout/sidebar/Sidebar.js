import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import AlertContext from "../../../context/alert/AlertContext";
import BatchContext from "../../../context/batch/BatchContext";

import "./Sidebar.css";
import BatchModal from "../../../components/BatchModal/BatchModal";

const Sidebar = ({ isOpen }) => {
  const backendUrl = "http://localhost:5000/";
  const { userId, batchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Alert
  const { showAlert } = useContext(AlertContext);
  const { setActiveBatch } = useContext(BatchContext);

  const [openMenuId, setOpenMenuId] = useState(null);

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [batches, setBatches] = useState([]);

  // close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      // if click is NOT inside any batch-menu
      if (!e.target.closest(".batch-menu")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Add batch
  const handleAddBatch = async (name) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}api/batches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to add batch");
      }

      // update UI
      setBatches((prev) => [...prev, data]);

      setIsModalOpen(false);
      showAlert("Added", "New batch added successfully", "success");
    } catch (error) {
      console.error(error);
      showAlert("Error", error.message, "danger");
    }
  };

  // Rename batch
  const handleRenameBatch = async (name, id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}api/batches/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const updated = await res.json();

      if (!res.ok) {
        throw new Error(updated?.error?.message || "Rename failed");
      }

      // update frontend state
      setBatches((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b)),
      );

      setIsModalOpen(false);
      showAlert("Updated", "Batch renamed successfully", "success");
    } catch (err) {
      console.error("Rename failed", err);
      showAlert("Error", err.message, "danger");
    }
  };

  // Delete batch
  const handleDeleteBatch = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}api/batches/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || "Delete failed");
      }

      setIsModalOpen(false);

      // remove from UI
      setBatches((prev) => prev.filter((b) => b.id !== id));

      // if deleted batch is active → go home
      if (id === batchId) {
        setActiveBatch(null);
        navigate(`/${userId}`);
      }

      showAlert("Deleted", "Batch deleted successfully", "danger");
    } catch (error) {
      console.error(error);
      showAlert("Error", error.message, "danger");
    }
  };

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}api/batches`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      // If unauthorized → redirect to login
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      // Ensure array
      if (!Array.isArray(data)) {
        console.error("Expected array but got:", data);
        return;
      }

      setBatches(data);
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-content">
        <h6 className="fw-bold mb-1">My Batches</h6>
        <small className="text-muted">Select a batch to manage</small>

        <div className="list-group list-group-flush mt-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className={`list-group-item batch-item ${
                batch.id === batchId ? "active" : ""
              }`}
            >
              {/* Batch name */}
              <span
                className="batch-name"
                onClick={() => {
                  const parts = location.pathname.split("/");
                  const currentPage = parts[4] || "dashboard";
                  navigate(`/${userId}/${batch.id}/${currentPage}`);
                }}
              >
                {batch.name}
              </span>

              {/* 3-dot menu */}
              <div className="batch-menu" onClick={(e) => e.stopPropagation()}>
                <i
                  className="fa-solid fa-ellipsis-vertical"
                  onClick={() =>
                    setOpenMenuId(openMenuId === batch.id ? null : batch.id)
                  }
                ></i>

                {/* Rename*/}
                {openMenuId === batch.id && (
                  <div className="batch-dropdown">
                    <button
                      onClick={() => {
                        setSelectedBatch(batch);
                        setModalMode("rename");
                        setIsModalOpen(true);
                        setOpenMenuId(null);
                      }}
                    >
                      <i className="fa-solid fa-pen"></i> Rename
                    </button>

                    {/* Delete*/}
                    <button
                      className="danger"
                      onClick={() => {
                        setSelectedBatch(batch);
                        setModalMode("delete");
                        setIsModalOpen(true);
                        setOpenMenuId(null);
                      }}
                    >
                      <i className="fa-solid fa-trash-can"></i> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <button
          className="btn w-100 addBatchButton"
          onClick={() => {
            setSelectedBatch(null);
            setModalMode("add");
            setIsModalOpen(true);
          }}
        >
          + Add New Batch
        </button>
      </div>
      <BatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        batch={selectedBatch}
        onSubmit={
          modalMode === "add"
            ? handleAddBatch
            : modalMode === "rename"
              ? handleRenameBatch
              : handleDeleteBatch
        }
      />
    </aside>
  );
};

export default Sidebar;
