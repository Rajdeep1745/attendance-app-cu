import { AVAILABLE_STUDENT_BATCHES } from "./mockStudentData";

const batchDirectory = AVAILABLE_STUDENT_BATCHES.reduce((acc, batch) => {
  acc[batch.id] = batch;
  return acc;
}, {});

const dashboardByBatchId = {
  b_101: {
    totalStudents: 62,
    avgAttendance: 84,
    myAttendance: 88,
    threshold: 75,
    joinedOn: "12 Jan 2026",
    thresholdNote: "Stay above this mark to avoid low-attendance warnings.",
    currentStanding: "13% above threshold",
  },
  b_102: {
    totalStudents: 34,
    avgAttendance: 79,
    myAttendance: 91,
    threshold: 80,
    joinedOn: "04 Feb 2026",
    thresholdNote: "Labs usually have stricter attendance monitoring.",
    currentStanding: "11% above threshold",
  },
  b_103: {
    totalStudents: 48,
    avgAttendance: 86,
    myAttendance: 82,
    threshold: 78,
    joinedOn: "20 Jan 2026",
    thresholdNote: "Threshold is reviewed at the end of each unit.",
    currentStanding: "4% above threshold",
  },
  b_104: {
    totalStudents: 41,
    avgAttendance: 81,
    myAttendance: 89,
    threshold: 75,
    joinedOn: "14 Feb 2026",
    thresholdNote: "Keep tracking practical sessions to stay comfortably above threshold.",
    currentStanding: "14% above threshold",
  },
};

const rosterByBatchId = {
  b_101: [
    { id: "st-1", name: "Ananya Gupta", roll: "22CS014", attendance: 92, faceRegistered: true },
    { id: "st-2", name: "Rohan Mehta", roll: "22CS021", attendance: 87, faceRegistered: true },
    { id: "st-3", name: "Sara Ali", roll: "22CS033", attendance: 81, faceRegistered: false },
    { id: "st-4", name: "Vikram Nair", roll: "22CS044", attendance: 76, faceRegistered: true },
  ],
  b_102: [
    { id: "st-5", name: "Ishita Roy", roll: "22CS009", attendance: 94, faceRegistered: true },
    { id: "st-6", name: "Kabir Das", roll: "22CS018", attendance: 85, faceRegistered: true },
    { id: "st-7", name: "Neha Thomas", roll: "22CS026", attendance: 79, faceRegistered: false },
  ],
  b_103: [
    { id: "st-8", name: "Arjun Sen", roll: "22CS005", attendance: 88, faceRegistered: true },
    { id: "st-9", name: "Mira Joseph", roll: "22CS029", attendance: 90, faceRegistered: true },
    { id: "st-10", name: "Tanya Kapoor", roll: "22CS041", attendance: 83, faceRegistered: false },
  ],
  b_104: [
    { id: "st-11", name: "Dev Patel", roll: "22CS017", attendance: 89, faceRegistered: true },
    { id: "st-12", name: "Ritika Jain", roll: "22CS024", attendance: 84, faceRegistered: true },
  ],
};

const reportsByBatchId = {
  b_101: {
    myAttendance: 88,
    batchAverage: 84,
    totalClasses: 25,
    attendedClasses: 22,
    threshold: 75,
    recentAttendance: [
      { date: "2026-04-03", status: "Present" },
      { date: "2026-04-02", status: "Present" },
      { date: "2026-04-01", status: "Absent" },
      { date: "2026-03-31", status: "Present" },
      { date: "2026-03-30", status: "No Class" },
    ],
  },
  b_102: {
    myAttendance: 91,
    batchAverage: 79,
    totalClasses: 22,
    attendedClasses: 20,
    threshold: 80,
    recentAttendance: [
      { date: "2026-04-03", status: "Absent" },
      { date: "2026-04-02", status: "Present" },
      { date: "2026-04-01", status: "Present" },
      { date: "2026-03-31", status: "No Class" },
      { date: "2026-03-30", status: "Present" },
    ],
  },
  b_103: {
    myAttendance: 82,
    batchAverage: 86,
    totalClasses: 22,
    attendedClasses: 18,
    threshold: 78,
    recentAttendance: [
      { date: "2026-04-03", status: "No Class" },
      { date: "2026-04-02", status: "Present" },
      { date: "2026-04-01", status: "Present" },
      { date: "2026-03-31", status: "Absent" },
      { date: "2026-03-30", status: "Present" },
    ],
  },
  b_104: {
    myAttendance: 89,
    batchAverage: 81,
    totalClasses: 18,
    attendedClasses: 16,
    threshold: 75,
    recentAttendance: [
      { date: "2026-04-03", status: "Present" },
      { date: "2026-04-02", status: "No Class" },
      { date: "2026-04-01", status: "Present" },
      { date: "2026-03-31", status: "Present" },
      { date: "2026-03-30", status: "Absent" },
    ],
  },
};

const lectureDataByBatchId = {
  b_101: {
    curriculum: [
      {
        id: "unit-1",
        name: "Unit 1: Frontend Foundations",
        topics: [
          { id: "t-1", name: "HTML Structure and Semantic Tags" },
          { id: "t-2", name: "CSS Layouts and Flexbox" },
          { id: "t-3", name: "Responsive Design Basics" },
        ],
      },
      {
        id: "unit-2",
        name: "Unit 2: JavaScript and React",
        topics: [
          { id: "t-4", name: "ES6 Syntax and Array Methods" },
          { id: "t-5", name: "React Components and Props" },
          { id: "t-6", name: "State, Events and Forms" },
        ],
      },
    ],
    plan: [
      {
        id: "w-1",
        week: 1,
        topics: [
          {
            id: "p-1",
            title: "HTML Structure and Semantic Tags",
            objectives: "Understand page structure, semantic sections, and clean markup practices.",
            classes: 2,
          },
          {
            id: "p-2",
            title: "CSS Layouts and Flexbox",
            objectives: "Build flexible layouts and align content using flexbox utilities.",
            classes: 2,
          },
        ],
      },
      {
        id: "w-2",
        week: 2,
        topics: [
          {
            id: "p-3",
            title: "Responsive Design Basics",
            objectives: "Use breakpoints and fluid spacing to adapt layouts for mobile and desktop screens.",
            classes: 2,
          },
        ],
      },
      {
        id: "w-3",
        week: 3,
        topics: [
          {
            id: "p-4",
            title: "React Components and Props",
            objectives: "Create reusable UI pieces and pass structured data through props.",
            classes: 3,
          },
        ],
      },
    ],
  },
  b_102: {
    curriculum: [
      {
        id: "unit-3",
        name: "Unit 1: Database Concepts",
        topics: [
          { id: "t-7", name: "ER Modelling" },
          { id: "t-8", name: "Normalization" },
        ],
      },
      {
        id: "unit-4",
        name: "Unit 2: SQL Practice",
        topics: [
          { id: "t-9", name: "Joins and Subqueries" },
          { id: "t-10", name: "Views and Procedures" },
        ],
      },
    ],
    plan: [
      {
        id: "w-4",
        week: 1,
        topics: [
          {
            id: "p-5",
            title: "ER Modelling",
            objectives: "Model entities, attributes, and relations for real-world systems.",
            classes: 2,
          },
        ],
      },
      {
        id: "w-5",
        week: 2,
        topics: [
          {
            id: "p-6",
            title: "Normalization",
            objectives: "Reduce redundancy and identify normal forms in database tables.",
            classes: 2,
          },
          {
            id: "p-7",
            title: "Joins and Subqueries",
            objectives: "Write queries to combine and filter related data sets effectively.",
            classes: 2,
          },
        ],
      },
    ],
  },
  b_103: {
    curriculum: [
      {
        id: "unit-5",
        name: "Unit 1: AI Basics",
        topics: [
          { id: "t-11", name: "Introduction to AI Systems" },
          { id: "t-12", name: "Search and State Space" },
        ],
      },
      {
        id: "unit-6",
        name: "Unit 2: Learning Methods",
        topics: [
          { id: "t-13", name: "Supervised Learning Overview" },
          { id: "t-14", name: "Evaluation Metrics" },
        ],
      },
    ],
    plan: [
      {
        id: "w-6",
        week: 1,
        topics: [
          {
            id: "p-8",
            title: "Introduction to AI Systems",
            objectives: "Understand the scope of AI, core terminology, and common real-world applications.",
            classes: 2,
          },
        ],
      },
      {
        id: "w-7",
        week: 2,
        topics: [
          {
            id: "p-9",
            title: "Search and State Space",
            objectives: "Explore basic search strategies and state-space representation.",
            classes: 2,
          },
          {
            id: "p-10",
            title: "Supervised Learning Overview",
            objectives: "Recognize the core supervised learning workflow and typical problem setups.",
            classes: 2,
          },
        ],
      },
    ],
  },
  b_104: {
    curriculum: [
      {
        id: "unit-7",
        name: "Unit 1: Cloud Basics",
        topics: [
          { id: "t-15", name: "Service Models" },
          { id: "t-16", name: "Deployment Models" },
        ],
      },
    ],
    plan: [
      {
        id: "w-8",
        week: 1,
        topics: [
          {
            id: "p-11",
            title: "Service Models",
            objectives: "Differentiate IaaS, PaaS, and SaaS with practical use cases.",
            classes: 2,
          },
          {
            id: "p-12",
            title: "Deployment Models",
            objectives: "Compare public, private, and hybrid cloud deployment strategies.",
            classes: 2,
          },
        ],
      },
    ],
  },
};

const attendanceByDate = {
  "2026-04-03": [
    { batchId: "b_101", status: "Present", recordedAt: "09:05 AM" },
    { batchId: "b_102", status: "Absent", recordedAt: "11:20 AM" },
    { batchId: "b_103", status: "No Class", recordedAt: "-" },
  ],
  "2026-04-02": [
    { batchId: "b_101", status: "Present", recordedAt: "09:02 AM" },
    { batchId: "b_102", status: "Present", recordedAt: "11:16 AM" },
    { batchId: "b_103", status: "Present", recordedAt: "02:00 PM" },
  ],
  "2026-04-01": [
    { batchId: "b_101", status: "Present", recordedAt: "09:18 AM" },
    { batchId: "b_102", status: "No Class", recordedAt: "-" },
  ],
};

const getBatch = (batchId) => batchDirectory[batchId] || AVAILABLE_STUDENT_BATCHES[0];

export const getStudentDashboardData = (batchId) => {
  const batch = getBatch(batchId);
  return {
    batchId: batch.id,
    name: batch.name,
    teacher: batch.teacher,
    code: batch.code,
    ...dashboardByBatchId[batch.id],
  };
};

export const getStudentRosterData = (batchId) => {
  const batch = getBatch(batchId);
  return {
    batchId: batch.id,
    batchName: batch.name,
    teacher: batch.teacher,
    students: rosterByBatchId[batch.id] || [],
  };
};

export const getStudentReportsData = (batchId) => {
  const batch = getBatch(batchId);
  return {
    batchId: batch.id,
    batchName: batch.name,
    ...reportsByBatchId[batch.id],
  };
};

export const getStudentLecturesData = (batchId) => {
  const batch = getBatch(batchId);
  return {
    batchId: batch.id,
    batchName: batch.name,
    ...lectureDataByBatchId[batch.id],
  };
};

export const getStudentAttendanceByDate = (dateKey) => {
  return (attendanceByDate[dateKey] || []).map((row) => ({
    ...row,
    batchName: getBatch(row.batchId).name,
  }));
};

/*
Backend handoff note:
Replace the selector implementations in this file with real API calls or query hooks.
The page components already expect these normalized shapes:

getStudentDashboardData(batchId) => {
  batchId, name, teacher, code,
  totalStudents, avgAttendance, myAttendance, threshold,
  joinedOn, thresholdNote, currentStanding
}

getStudentRosterData(batchId) => {
  batchId, batchName, teacher, students: [
    { id, name, roll, attendance, faceRegistered }
  ]
}

getStudentReportsData(batchId) => {
  batchId, batchName, myAttendance, batchAverage,
  totalClasses, attendedClasses, threshold,
  recentAttendance: [{ date, status }]
}

getStudentLecturesData(batchId) => {
  batchId, batchName,
  curriculum: [{ id, name, topics: [{ id, name }] }],
  plan: [{ id, week, topics: [{ id, title, objectives, classes }] }]
}

getStudentAttendanceByDate("YYYY-MM-DD") => [
  { batchId, batchName, status, recordedAt }
]
*/
