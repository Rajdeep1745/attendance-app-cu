const supabase = require("../config/supabaseClient");

const buildInlineImageUrl = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

// GET current logged in user
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // 1. Get user
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, department, institution, avatar")
      .eq("id", userId)
      .single();

    if (error) throw error;

    // 2. If teacher → get preferences
    if (role === "teacher") {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("default_mode, default_threshold")
        .eq("teacher_id", userId)
        .single();

      return res.json({
        ...user,
        default_mode: teacher?.default_mode,
        default_threshold: teacher?.default_threshold,
      });
    }

    if (role === "student") {
      const { data: student } = await supabase
        .from("students")
        .select("student_id, alert_threshold, preferred_view, face_registered")
        .eq("user_id", userId)
        .single();

      return res.json({
        ...user,
        student_id: student?.student_id,
        alert_threshold: student?.alert_threshold,
        preferred_view: student?.preferred_view,
        face_registered: student?.face_registered,
      });
    }

    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

// UPDATE profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const {
      name,
      department,
      institution,
      avatar,
      defaultMode,
      defaultThreshold,
    } = req.body;

    const userUpdates = {
      name,
      department,
      institution,
    };

    if (avatar !== undefined) {
      userUpdates.avatar = avatar;
    }

    // 1. Update users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update(userUpdates)
      .eq("id", userId)
      .select()
      .single();

    if (userError) throw userError;

    // 2. If teacher → update teachers table
    if (role === "teacher") {
      const { error: teacherError } = await supabase
        .from("teachers")
        .update({
          default_mode: defaultMode,
          default_threshold: defaultThreshold,
        })
        .eq("teacher_id", userId);

      if (teacherError) throw teacherError;
    }

    if (role === "student") {
      await supabase
        .from("students")
        .update({
          alert_threshold: defaultThreshold,
        })
        .eq("user_id", userId);
    }

    res.json(userData);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

exports.updateTeacherAvatar = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can update teacher profile photos" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No profile photo provided" });
    }

    const avatar = buildInlineImageUrl(req.file);

    const { data: userData, error } = await supabase
      .from("users")
      .update({ avatar })
      .eq("id", req.user.id)
      .select("id, name, email, role, department, institution, avatar")
      .single();

    if (error) throw error;

    res.json(userData);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to update teacher profile photo" });
  }
};
