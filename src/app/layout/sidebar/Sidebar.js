import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Sidebar.css";

const Sidebar = ({ isOpen }) => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState(null);

  const batches = [
    { id: "cs101", name: "CS101 - Intro to Programming" },
    { id: "cs202", name: "CS202 - Data Structures" },
  ];

  /* close menu on outside click */
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

                {openMenuId === batch.id && (
                  <div className="batch-dropdown">
                    <button
                      onClick={() => {
                        console.log("Rename", batch.id);
                        setOpenMenuId(null);
                      }}
                    >
                      <i className="fa-solid fa-pen"></i> Rename
                    </button>

                    <button
                      className="danger"
                      onClick={() => {
                        console.log("Delete", batch.id);
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
        <button className="btn w-100 addBatchButton">+ Add New Batch</button>
      </div>
    </aside>
  );
};

export default Sidebar;
