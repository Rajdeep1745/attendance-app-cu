const express = require("express");
const router = express.Router();
const { getAcademicOptions } = require("../controllers/academicController");
router.get("/options", getAcademicOptions);
module.exports = router;
