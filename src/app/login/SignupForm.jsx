import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AlertContext from "../../context/alert/AlertContext";
import { PROGRAMMES } from "../../data/programmes";
import "./signupForm.css";

const SignupForm = ({ switchToLogin }) => {
  const { showAlert } = useContext(AlertContext);

  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    role: "student",
    program: "",
    semester: "",
  });

  // -------------------------------------------------------
  // PROGRAMME OPTIONS
  // -------------------------------------------------------

  const programmeOptions = Object.keys(PROGRAMMES);

  // -------------------------------------------------------
  // SEMESTER OPTIONS
  //
  // Derived from the selected programme.
  // -------------------------------------------------------

  const semesterOptions = form.program
    ? Object.keys(PROGRAMMES[form.program].semesters)
    : [];

  // -------------------------------------------------------
  // HANDLE CHANGE
  // -------------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      };

      // When programme changes,
      // reset semester because the old semester
      // may not exist in the new programme.
      if (name === "program") {
        updated.semester = "";
      }

      return updated;
    });
  };

  // -------------------------------------------------------
  // SIGNUP
  // -------------------------------------------------------

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,

        // These fields are irrelevant for teachers.
        ...(form.role === "teacher"
          ? {
              program: undefined,
              semester: undefined,
            }
          : {}),
      };

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/auth/signup`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      showAlert("Signed Up", "Account created!", "success");

      navigate("/login");
    } catch (err) {
      showAlert("Error", err.message, "danger");
    }
  };

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (
    <form className="premium-auth-form" onSubmit={handleSignup}>
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

      <select name="role" value={form.role} onChange={handleChange}>
        <option value="student">Student</option>

        <option value="teacher">Teacher</option>
      </select>

      {/* -------------------------------------------------
          STUDENT ACADEMIC INFORMATION
          ------------------------------------------------- */}

      {form.role === "student" && (
        <>
          <select
            name="program"
            value={form.program}
            onChange={handleChange}
            required
          >
            <option value="">Select Program</option>

            {programmeOptions.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>

          <select
            name="semester"
            value={form.semester}
            onChange={handleChange}
            disabled={!form.program}
            required
          >
            <option value="">Select Semester</option>

            {semesterOptions.map((semester) => (
              <option key={semester} value={semester}>
                Semester {semester}
              </option>
            ))}
          </select>
        </>
      )}

      <input
        type="password"
        name="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
        required
      />

      <button type="submit" className="auth-submit-btn">
        Create Account
      </button>

      <div className="auth-switch">
        Already have an account?
        <span onClick={switchToLogin}>Login</span>
      </div>
    </form>
  );
};

export default SignupForm;
