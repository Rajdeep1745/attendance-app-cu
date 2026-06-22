import { useState, useContext } from "react";
import { Link } from "react-router-dom";
import AlertContext from "../../context/alert/AlertContext";
import "./Auth.css";

const LoginForm = ({ switchToSignup }) => {
  const { showAlert } = useContext(AlertContext);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/auth/login`,
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

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      showAlert("Logged In", "Successfully logged in", "success");

      window.location.href = `/${data.user.id}`;
    } catch (err) {
      showAlert("Error", err.message, "danger");
    }
  };

  return (
  <form className="premium-auth-form" onSubmit={handleLogin}>
    <h2>Welcome Back</h2>

    <p>Login to continue</p>

    <input
      type="email"
      name="email"
      placeholder="Email Address"
      value={form.email}
      onChange={handleChange}
      required
    />

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
      Login
    </button>

    <div className="auth-switch">
      New here?

      <span onClick={switchToSignup}>
        Create Account
      </span>
    </div>
  </form>
);
};

export default LoginForm;
