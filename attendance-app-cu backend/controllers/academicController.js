const db = require("../config/db");

// Public, read-only options for signup and admin forms.
// Programme and semester choices come only from database tables.
exports.getAcademicOptions = async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT p.program, s.semester
      FROM academic_programmes p
      LEFT JOIN academic_programme_semesters s ON s.program = p.program
      ORDER BY p.program ASC, s.semester ASC
    `);

    const byProgram = new Map();
    for (const row of result.rows) {
      if (!byProgram.has(row.program)) byProgram.set(row.program, []);
      if (row.semester !== null)
        byProgram.get(row.program).push(Number(row.semester));
    }

    return res.json({
      programmes: [...byProgram.entries()].map(([program, semesters]) => ({
        program,
        semesters,
      })),
    });
  } catch (err) {
    console.error("GET ACADEMIC OPTIONS ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch academic options" });
  }
};
