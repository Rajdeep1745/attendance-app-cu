import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Sidebar.css";
import BatchModal from "../../../components/BatchModal/BatchModal";

const Sidebar = ({ isOpen }) => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null); // "add" | "rename"
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Sample batches
  const [batches, setBatches] = useState([
    { id: "cs101", name: "CS101 - Intro to Programming" },
    { id: "cs202", name: "CS202 - Data Structures" },
  ]);

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

  // ADD batch
  const handleAddBatch = (name) => {
    const newBatch = {
      id: Date.now().toString(),
      name,
    };

    setBatches((prev) => [...prev, newBatch]);
    setIsModalOpen(false);
  };

  // RENAME batch
  const handleRenameBatch = (name) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === selectedBatch.id ? { ...b, name } : b))
    );
    setIsModalOpen(false);
  };

  // Delete batch
  const handleDeleteBatch = (id) => {
    setBatches((prev) => prev.filter((b) => b.id !== id));
    setIsModalOpen(false);

    // If deleted batch was active → redirect safely
    if (id === batchId) {
      navigate("/");
    }
  };

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
                onClick={() => navigate(`/user/${batch.id}/dashboard`)}
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
