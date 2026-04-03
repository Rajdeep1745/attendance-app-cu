import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AlertContext from "../../../context/alert/AlertContext";
import JoinClassModal from "../../../components/joinClassModal/JoinClassModal";
import {
  AVAILABLE_STUDENT_BATCHES,
  DEFAULT_JOINED_BATCH_IDS,
  STUDENT_JOINED_BATCHES_KEY,
} from "../../student/mockStudentData";

import "./Sidebar.css";

const getStoredJoinedBatches = () => {
  try {
    const storedIds = JSON.parse(
      localStorage.getItem(STUDENT_JOINED_BATCHES_KEY) || "null"
    );

    if (!Array.isArray(storedIds) || storedIds.length === 0) {
      return AVAILABLE_STUDENT_BATCHES.filter((batch) =>
        DEFAULT_JOINED_BATCH_IDS.includes(batch.id)
      );
    }

    return AVAILABLE_STUDENT_BATCHES.filter((batch) =>
      storedIds.includes(batch.id)
    );
  } catch (error) {
    console.error("Failed to read joined batches", error);
    return AVAILABLE_STUDENT_BATCHES.filter((batch) =>
      DEFAULT_JOINED_BATCH_IDS.includes(batch.id)
    );
  }
};

const StudentSidebar = ({ isOpen }) => {
  const { userId, batchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useContext(AlertContext);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [joinedBatches, setJoinedBatches] = useState(() => getStoredJoinedBatches());

  const currentPage = location.pathname.split("/")[3] || "dashboard";

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
    localStorage.setItem(
      STUDENT_JOINED_BATCHES_KEY,
      JSON.stringify(joinedBatches.map((batch) => batch.id))
    );
  }, [joinedBatches]);

  const handleJoinClass = (batchCode) => {
    const matchedBatch = AVAILABLE_STUDENT_BATCHES.find(
      (batch) => batch.code === batchCode
    );

    if (!matchedBatch) {
      showAlert("Error", "Invalid batch code", "danger");
      return;
    }

    const alreadyJoined = joinedBatches.some((batch) => batch.id === matchedBatch.id);

    if (alreadyJoined) {
      showAlert("Joined", "You have already joined this class", "primary");
      setIsJoinModalOpen(false);
      return;
    }

    setJoinedBatches((prev) => [...prev, matchedBatch]);
    setIsJoinModalOpen(false);
    showAlert("Success", "Class joined successfully", "success");
    navigate(`/${userId}/${matchedBatch.id}/dashboard`);
  };

  const handleLeaveBatch = (batchToLeave) => {
    setJoinedBatches((prev) => prev.filter((batch) => batch.id !== batchToLeave.id));
    setOpenMenuId(null);
    showAlert("Left", `You left ${batchToLeave.name}`, "danger");

    if (batchId === batchToLeave.id) {
      navigate(`/${userId}`);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-content">
        <h6 className="fw-bold mb-1">Joined Batches</h6>
        <p className="sidebar-subtitle mb-0">Select a batch to continue</p>

        <div className="list-group list-group-flush mt-3">
          {joinedBatches.map((batch) => (
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
          ))}
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
