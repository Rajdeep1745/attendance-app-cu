const supabase = require("../config/supabaseClient");

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
        .select("alert_threshold, preferred_view")
        .eq("user_id", userId)
        .single();

      return res.json({
        ...user,
        alert_threshold: student?.alert_threshold,
        preferred_view: student?.preferred_view,
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

    // 1. Update users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({
        name,
        department,
        institution,
        avatar,
      })
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
