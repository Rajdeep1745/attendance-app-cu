import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import AuthContext from "../../context/auth/AuthContext";

const StudentDashboard = () => {
  const backendUrl = "http://localhost:5000/";
  const { batchId } = useParams();
  const { user } = useContext(AuthContext);

  const [stats, setStats] = useState({
    percentage: 0,
    totalClasses: 0,
    attended: 0,
  });
      useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const res = await fetch(
          `${backendUrl}api/attendance/${batchId}/student/${user.id}`
        );
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    };
fetchStats();
  }, [batchId, user]);

    return (
    <div className="container-fluid">
      <h2>My Dashboard</h2>

      <div className="row mt-4">
        <div className="col-md-4">
          <div className="card p-3">
            <h5>Attendance %</h5>
            <h2>{stats.percentage}%</h2>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card p-3">
            <h5>Total Classes</h5>
            <h2>{stats.totalClasses}</h2>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card p-3">
            <h5>Classes Attended</h5>
            <h2>{stats.attended}</h2>
          </div>
        </div>
      </div>
    </div>
    );
    };

export default StudentDashboard;