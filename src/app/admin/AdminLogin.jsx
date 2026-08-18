import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

import AlertContext from "../../context/alert/AlertContext";

import "./Admin.css";

const AdminLogin = () => {
  const { showAlert } = useContext(AlertContext);

  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/admin/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(form),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Admin login failed");
      }

      // ---------------------------------------------------
      // Store admin session separately
      // ---------------------------------------------------

      localStorage.setItem("adminToken", data.token);

      localStorage.setItem("adminUser", JSON.stringify(data.user));

      showAlert("Welcome", "Admin login successful", "success");

      navigate("/admin");
    } catch (err) {
      showAlert("Login Failed", err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-badge">A</div>

          <h1>Admin Portal</h1>

          <p>Manage your attendance system</p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-field">
            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Admin email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="admin-field">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Admin password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="admin-login-button"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="admin-login-footer">
          Restricted administrative access
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
