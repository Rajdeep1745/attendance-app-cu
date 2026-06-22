import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import AlertContext from "../../context/alert/AlertContext";
import "./Auth.css";

const SignupForm = ({ switchToLogin }) => {
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
  <form
    className="premium-auth-form"
    onSubmit={handleSignup}
  >
    <h2>Create Account</h2>

    <p>Join the platform</p>

    <input
      type="text"
      name="name"
      placeholder="Full Name"
      value={form.name}
      onChange={handleChange}
      required
    />

    <input
      type="email"
      name="email"
      placeholder="Email"
      value={form.email}
      onChange={handleChange}
      required
    />

    <input
      type="text"
      name="department"
      placeholder="Department"
      value={form.department}
      onChange={handleChange}
    />

    <select
      name="role"
      value={form.role}
      onChange={handleChange}
    >
      <option value="student">
        Student
      </option>

      <option value="teacher">
        Teacher
      </option>
    </select>

    <input
      type="password"
      name="password"
      placeholder="Password"
      value={form.password}
      onChange={handleChange}
      required
    />

    <button
      type="submit"
      className="auth-submit-btn"
    >
      Create Account
    </button>

    <div className="auth-switch">
      Already have an account?

      <span onClick={switchToLogin}>
        Login
      </span>
    </div>
  </form>
);
};

export default SignupForm;
