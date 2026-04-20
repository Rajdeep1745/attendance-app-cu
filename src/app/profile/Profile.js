import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BatchContext from "../../context/batch/BatchContext";
import AlertContext from "../../context/alert/AlertContext";
import { LAST_ACTIVE_BATCH_ID_KEY } from "../student/studentStorage";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { activeBatch } = useContext(BatchContext);
  const { showAlert } = useContext(AlertContext);
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const isTeacher = storedUser?.role === "teacher";

  const [activeTab, setActiveTab] = useState("profile");
  const [preferences, setPreferences] = useState({
    defaultMode: "manual",
    threshold: 75,
  });

  const [profile, setProfile] = useState({
    name: storedUser?.name || "",
    email: storedUser?.email || "",
    department: storedUser?.department || "",
    institution: storedUser?.institution || "",
    role: storedUser?.role
      ? `${storedUser.role.charAt(0).toUpperCase()}${storedUser.role.slice(1)}`
      : "User",
    avatar: storedUser?.avatar || "https://i.pravatar.cc/150",
  });

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/users/me`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: profile.name,
            department: profile.department,
            institution: profile.institution,
            avatar: profile.avatar,
            defaultMode: preferences.defaultMode,
            defaultThreshold: preferences.threshold,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // update localStorage user
      const storedUser = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({ ...storedUser, ...data }));

      showAlert("Updated", "Your profile has been updated", "primary");
    } catch (err) {
      console.error(err);
      showAlert("Failed", "Failed to update your profile", "danger");
    }
  };

  const handleBackToDashboard = () => {
    const activeBatchId =
      activeBatch?.id || localStorage.getItem(LAST_ACTIVE_BATCH_ID_KEY);

    if (activeBatchId && storedUser?.id) {
      navigate(`/${storedUser.id}/${activeBatchId}/dashboard`);
    } else {
      navigate(storedUser?.id ? `/${storedUser.id}` : "/");
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setProfile({
          name: data.name || "",
          email: data.email || "",
          department: data.department || "",
          institution: data.institution || "",
          role: data.role,
          avatar: data.avatar || "https://i.pravatar.cc/150",
        });

        // ADD THIS
        setPreferences({
          defaultMode: data.default_mode || "manual",
          threshold: data.default_threshold || 75,
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="container-fluid profile-page">
      <div className="profile-layout">
        {/* SIDE PANEL */}
        <aside className="profile-sidebar">
          <button
            className={activeTab === "profile" ? "active" : ""}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>

          <button
            className={activeTab === "preferences" ? "active" : ""}
            onClick={() => setActiveTab("preferences")}
          >
            Preferences
          </button>

          <button
            className={activeTab === "activity" ? "active" : ""}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
        </aside>

        {/* CONTENT */}
        <section className="profile-content">
          {activeTab === "profile" && (
            <>
              <h2>My Profile</h2>
              <p className="text-muted">
                Review and update your personal information.
              </p>

              <div className="avatar-section">
                <img src={profile.avatar} alt="profile" />
                <label className="avatar-upload-btn">
                  Change Photo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setProfile((p) => ({
                        ...p,
                        avatar: URL.createObjectURL(file),
                      }));
                    }}
                  />
                </label>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input value={profile.email} disabled />
              </div>

              <div className="form-group">
                <label>Role</label>
                <input value={profile.role} disabled />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  value={profile.department}
                  onChange={(e) =>
                    setProfile({ ...profile, department: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Institution</label>
                <input
                  value={profile.institution}
                  onChange={(e) =>
                    setProfile({ ...profile, institution: e.target.value })
                  }
                />
              </div>

              <button
                className="btn btn-outline-secondary mx-2"
                onClick={handleBackToDashboard}
              >
                Back to dashboard
              </button>
              <button className="btn btn-primary mx-2" onClick={handleSave}>
                Save Changes
              </button>
            </>
          )}

          {activeTab === "preferences" && (
            <>
              <h2>Preferences</h2>
              <p className="text-muted">
                {isTeacher
                  ? "Default settings for your classroom workflow."
                  : "Personal viewing preferences for your attendance dashboard."}
              </p>

              {isTeacher && (
                <div className="form-group">
                  <label>Default Attendance Mode</label>
                  <select
                    value={preferences.defaultMode}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        defaultMode: e.target.value,
                      })
                    }
                  >
                    <option value="manual">Manual</option>
                    <option value="auto">Automatic</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>
                  {isTeacher
                    ? "Attendance Warning Threshold (%)"
                    : "Attendance Alert Threshold (%)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={preferences.threshold}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      threshold: Number(e.target.value),
                    })
                  }
                />
              </div>

              <button
                className="btn btn-outline-secondary mx-2"
                onClick={handleBackToDashboard}
              >
                Back to dashboard
              </button>

              <button className="btn btn-primary" onClick={handleSave}>
                Save Preferences
              </button>
            </>
          )}

          {activeTab === "activity" && (
            <>
              <h2>Activity</h2>
              <p className="text-muted">A quick summary of your account.</p>

              <div className="activity-card">
                <p>
                  <strong>Last Active Batch:</strong>{" "}
                  {activeBatch ? activeBatch.name : "None"}
                </p>
                <p>
                  <strong>Account Type:</strong> {profile.role}
                </p>
                <p>
                  <strong>Email:</strong> {profile.email || "Not available"}
                </p>
                <p>
                  <strong>Department:</strong>{" "}
                  {profile.department || "Not provided"}
                </p>
              </div>

              <button
                className="btn btn-outline-secondary mx-2"
                onClick={handleBackToDashboard}
              >
                Back to dashboard
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Profile;
