import { useState, useCallback } from "react";
import SubjectContext from "./SubjectContext";
import { PROGRAMMES } from "../../data/programmes";

const findSubjectDetails = (subjectId) => {
  if (!subjectId) {
    return null;
  }

  for (const [programme, programmeData] of Object.entries(PROGRAMMES)) {
    for (const [semester, subjects] of Object.entries(
      programmeData.semesters,
    )) {
      const subject = subjects.find(
        (item) => String(item.id) === String(subjectId),
      );

      if (subject) {
        return {
          name: subject.name,
          programme,
          semester,
          subject,
        };
      }
    }
  }

  return null;
};

const SubjectState = ({ children }) => {
  const [activeSubject, setActiveSubject] = useState(null);

  const fetchSubjectById = useCallback(async (subjectId) => {
    if (!subjectId) {
      setActiveSubject(null);
      return null;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}api/subject/${subjectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to fetch subject",
        );
      }

      /*
       * The backend gives us the database subject data.
       *
       * The frontend programmes.js gives us the display name,
       * programme, semester and curriculum subject information.
       *
       * Match them using subject_id.
       */
      const curriculumSubject = findSubjectDetails(
        data.subject_id || subjectId,
      );

      /*
       * Build ONE normalized activeSubject object.
       *
       * Everything else in the frontend can now simply use:
       *
       * activeSubject.subject_id
       * activeSubject.name
       * activeSubject.threshold
       * activeSubject.total_students
       * activeSubject.programme
       * activeSubject.semester
       * activeSubject.subject
       */
      const enrichedSubject = {
  ...data,

  subject_id:
    data.subject_id || subjectId,

  name:
    curriculumSubject?.name ||
    data.name ||
    data.subject_id ||
    subjectId,

  programme:
    curriculumSubject?.programme ||
    null,

  semester:
    curriculumSubject?.semester ||
    null,

  subject:
    curriculumSubject?.subject ||
    null,
};

      setActiveSubject(enrichedSubject);

      return enrichedSubject;
    } catch (err) {
      console.error(
        "[SubjectState] Error fetching subject:",
        err,
      );

      setActiveSubject(null);

      return null;
    }
  }, []);

  return (
    <SubjectContext.Provider
      value={{
        activeSubject,
        setActiveSubject,
        fetchSubjectById,
      }}
    >
      {children}
    </SubjectContext.Provider>
  );
};

export default SubjectState;