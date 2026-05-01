import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BatchContext from "../../context/batch/BatchContext";
import AlertContext from "../../context/alert/AlertContext";
import AuthContext from "../../context/auth/AuthContext";
import FaceRegisterModal from "../../components/faceRegisterModal/FaceRegisterModal";
import { LAST_ACTIVE_BATCH_ID_KEY } from "../student/studentStorage";
import "./Profile.css";

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read the selected image"));
    reader.readAsDataURL(file);
  });

const Profile = () => {
  const navigate = useNavigate();
  const { activeBatch } = useContext(BatchContext);
  const { showAlert } = useContext(AlertContext);
  const { user: storedUser, setUser } = useContext(AuthContext);
  const isTeacher = storedUser?.role === "teacher";

  const [activeTab, setActiveTab] = useState("profile");
  const [showFaceRegister, setShowFaceRegister] = useState(false);
  const [studentFaceRegistered, setStudentFaceRegistered] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
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

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (isTeacher) {
      const previewUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, avatar: previewUrl }));
      setAvatarUploading(true);

      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("avatar", file);

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}api/users/me/avatar`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update photo");

        setProfile((prev) => ({
          ...prev,
          avatar: data.avatar || prev.avatar,
        }));
        setUser({ ...(storedUser || {}), ...data });
        showAlert("Updated", "Teacher profile photo updated", "success");
      } catch (err) {
        console.error(err);
        setProfile((prev) => ({
          ...prev,
          avatar: storedUser?.avatar || "https://i.pravatar.cc/150",
        }));
        showAlert("Failed", err.message || "Failed to update profile photo", "danger");
      } finally {
        URL.revokeObjectURL(previewUrl);
        setAvatarUploading(false);
      }

      return;
    }

    try {
      const nextAvatar = await readFileAsDataUrl(file);
      setProfile((prev) => ({
        ...prev,
        avatar: nextAvatar,
      }));
    } catch (err) {
      showAlert("Error", err.message, "danger");
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          department: profile.department,
          institution: profile.institution,
          avatar: isTeacher ? undefined : profile.avatar,
          defaultMode: preferences.defaultMode,
          defaultThreshold: preferences.threshold,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser({ ...(storedUser || {}), ...data });
      setProfile((prev) => ({
        ...prev,
        avatar: data.avatar || prev.avatar,
      }));

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

        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

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
        setStudentFaceRegistered(Boolean(data.face_registered));
        setPreferences({
          defaultMode: data.default_mode || "manual",
          threshold: data.default_threshold || 75,
        });
        setUser({ ...(storedUser || {}), ...data });
      } catch (err) {
        console.error(err);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-fluid profile-page">
      <div className="profile-layout">
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

        <section className="profile-content">
          {activeTab === "profile" && (
            <>
              <h2>My Profile</h2>
              <p className="text-muted">
                Review and update your personal information.
              </p>

              <div className="avatar-section">
                <img src={profile.avatar} alt="profile" />
                <label
                  className={`avatar-upload-btn ${
                    avatarUploading ? "avatar-upload-btn-disabled" : ""
                  }`}
                >
                  {avatarUploading ? "Uploading..." : "Change Photo"}
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,image/webp"
                    disabled={avatarUploading}
                    onChange={handleAvatarChange}
                  />
                </label>
                {!isTeacher && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-primary mt-3"
                      onClick={() => setShowFaceRegister(true)}
                    >
                      <i className="fa-solid fa-camera me-2"></i>
                      {studentFaceRegistered ? "Update Registered Face" : "Register Face"}
                    </button>
                    <p className="text-muted small mt-2 mb-0">
                      Your registered face photo is also used as your profile picture
                      across roster and attendance views.
                    </p>
                  </>
                )}
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

      {!isTeacher && (
        <FaceRegisterModal
          isOpen={showFaceRegister}
          onClose={() => setShowFaceRegister(false)}
          student={{
            id: storedUser?.student_id || "me",
            name: profile.name || "Student",
          }}
          endpoint={`${process.env.REACT_APP_BACKEND_URL}api/students/me/register-face`}
          title={studentFaceRegistered ? "Update Registered Face" : "Register Face"}
          onSuccess={(payload) => {
            setProfile((prev) => ({ ...prev, avatar: payload.avatar }));
            setStudentFaceRegistered(true);
            setUser({
              ...(storedUser || {}),
              avatar: payload.avatar,
            });
            showAlert("Updated", "Face registered and profile photo updated", "success");
          }}
        />
      )}
    </div>
  );
};

export default Profile;
