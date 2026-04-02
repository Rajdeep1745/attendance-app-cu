import { useState, useContext } from "react";
import AuthContext from "../../context/auth/AuthContext";

const JoinBatch = () => {
  const backendUrl = "http://localhost:5000/";
  const [code, setCode] = useState("");
  const { user } = useContext(AuthContext);

  const handleJoin = async () => {
    try {
      const res = await fetch(`${backendUrl}api/batches/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          studentId: user.id,
        }),
      });
        
      const data = await res.json();
      console.log(data);
      alert("Joined successfully!");
    } catch (err) {
      console.error(err);
    }
    };
    
    return (
    <div className="container mt-4">
      <h2>Join a Batch</h2>

      <input
        type="text"
        className="form-control mt-3"
        placeholder="Enter batch code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button className="btn btn-primary mt-3" onClick={handleJoin}>
        Join
      </button>
    </div>
  );
};

export default JoinBatch;