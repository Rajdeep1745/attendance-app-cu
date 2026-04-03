import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import AlertContext from "../../context/alert/AlertContext";
import "./Auth.css";

const Signup = () => {
  const { showAlert } = useContext(AlertContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    role: "student",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      showAlert("Signed Up", "Account created!", "success");
      navigate("/login");
    } catch (err) {
      showAlert("Error", err.message, "danger");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSignup}>
        {/* HEADER */}
        <div className="auth-header">
          <h2 className="brand-title">Smart Attendance</h2>
          <p className="brand-subtitle">Create your account</p>
        </div>

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="department"
          placeholder="Department"
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
        />

        <select name="role" onChange={handleChange} value={form.role}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>

        <button type="submit">Create Account</button>

        <p className="switch-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Signup;
