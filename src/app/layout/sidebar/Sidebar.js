import { useParams, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = ({ isOpen }) => {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const batches = [
    { id: "cs101", name: "CS101 - Intro to Programming" },
    { id: "cs202", name: "CS202 - Data Structures" },
  ];

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-content">
        <h6 className="fw-bold mb-1">My Batches</h6>
        <small className="text-muted">Select a batch to manage</small>

        <div className="list-group list-group-flush mt-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className={`list-group-item ${
                batch.id === batchId ? "active" : ""
              }`}
              onClick={() => navigate(`/user/${batch.id}/dashboard`)}
            >
              {batch.name}
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
