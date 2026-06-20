import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AlertContext from "../../../context/alert/AlertContext";
import JoinClassModal from "../../../components/joinClassModal/JoinClassModal";

import "./Sidebar.css";

const LAST_ACTIVE_BATCH_ID_KEY = "lastActiveBatchId";

const studentRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.REACT_APP_BACKEND_URL}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    },
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
};

const StudentSidebar = ({ isOpen }) => {
  const { userId, batchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useContext(AlertContext);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [joinedBatches, setJoinedBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentPage = location.pathname.split("/")[3] || "dashboard";

  useEffect(() => {
    let ignore = false;

    const loadJoinedBatches = async () => {
      setLoading(true);
      try {
        const data = await studentRequest("api/students/me/batches");
        if (!ignore) {
          setJoinedBatches(data);
        }
      } catch (error) {
        console.error("Failed to load joined batches", error);
        if (!ignore) {
          setJoinedBatches([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadJoinedBatches();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest(".batch-menu")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!loading && !batchId && joinedBatches.length > 0 && userId) {
      const preferredBatchId =
        joinedBatches.find(
          (batch) => batch.id === localStorage.getItem(LAST_ACTIVE_BATCH_ID_KEY),
        )?.id || joinedBatches[0].id;

      navigate(`/${userId}/${preferredBatchId}/dashboard`, { replace: true });
      return;
    }

    if (
      !loading &&
      batchId &&
      joinedBatches.length > 0 &&
      !joinedBatches.some((batch) => batch.id === batchId)
    ) {
      const fallbackBatchId = joinedBatches[0].id;
      navigate(`/${userId}/${fallbackBatchId}/${currentPage}`, { replace: true });
    }
  }, [batchId, currentPage, joinedBatches, loading, navigate, userId]);

  const handleJoinClass = async (batchCode) => {
    try {
      const data = await studentRequest("api/students/me/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchCode }),
      });
      const joinedBatch = data.batch;
      const alreadyJoined = joinedBatches.some((batch) => batch.id === joinedBatch.id);

      if (!alreadyJoined) {
        setJoinedBatches((prev) => [joinedBatch, ...prev]);
      }

      setIsJoinModalOpen(false);
      showAlert(
        alreadyJoined ? "Joined" : "Success",
        data.message,
        alreadyJoined ? "primary" : "success",
      );
      navigate(`/${userId}/${joinedBatch.id}/dashboard`);
    } catch (error) {
      showAlert("Error", error.message, "danger");
      return;
    }
  };

  const handleLeaveBatch = async (batchToLeave) => {
    try {
      await studentRequest(`api/students/me/batches/${batchToLeave.id}`, {
        method: "DELETE",
      });
      const remainingBatches = joinedBatches.filter(
        (batch) => batch.id !== batchToLeave.id,
      );
      setJoinedBatches(remainingBatches);
      setOpenMenuId(null);
      showAlert("Left", `You left ${batchToLeave.name}`, "danger");

      if (batchId === batchToLeave.id) {
        if (remainingBatches.length > 0) {
          navigate(`/${userId}/${remainingBatches[0].id}/dashboard`);
        } else {
          navigate(`/${userId}`);
        }
      }
    } catch (error) {
      showAlert("Error", error.message, "danger");
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-content">
        <h6 className="fw-bold mb-1">Joined Batches</h6>
        <p className="sidebar-subtitle mb-0">Select a batch to continue</p>

        <div className="list-group list-group-flush mt-3">
          {loading ? (
            <div className="sidebar-empty-state text-muted">
              <span className="spinner-border spinner-border-sm me-2"></span>
              Loading your batches...
            </div>
          ) : joinedBatches.length === 0 ? (
            <div className="sidebar-empty-state">
              <strong>No joined batches yet</strong>
              <small>
                Enter a valid batch code to join your first class.
              </small>
            </div>
          ) : (
            joinedBatches.map((batch) => (
              <div
                key={batch.id}
                className={`list-group-item batch-item batch-card text-start ${
                  batch.id === batchId ? "active" : ""
                }`}
              >
                <div className="batch-card-main">
                  <div
                    className="batch-name"
                    onClick={() => navigate(`/${userId}/${batch.id}/${currentPage}`)}
                  >
                    {batch.name}
                  </div>
                  <small className="text-muted d-block mt-1">{batch.teacher}</small>
                </div>

                <div className="batch-menu" onClick={(e) => e.stopPropagation()}>
                  <i
                    className="fa-solid fa-ellipsis-vertical"
                    onClick={() =>
                      setOpenMenuId(openMenuId === batch.id ? null : batch.id)
                    }
                  ></i>

                  {openMenuId === batch.id && (
                    <div className="batch-dropdown">
                      <button
                        className="danger"
                        onClick={() => handleLeaveBatch(batch)}
                      >
                        <i className="fa-solid fa-right-from-bracket"></i> Leave Batch
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <button
          className="btn w-100 addBatchButton"
          onClick={() => setIsJoinModalOpen(true)}
        >
          + Join Class
        </button>
      </div>

      <JoinClassModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSubmit={handleJoinClass}
      />
    </aside>
  );
};

export default StudentSidebar;
