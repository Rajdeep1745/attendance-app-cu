import { useState, useCallback } from "react";
import SubjectContext from "./SubjectContext";

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
      const subjectName = data.name || data.subject_name || data.subject_id || subjectId;

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

  name: subjectName,
  programme: data.program || null,
  semester: data.semester || null,
  subject: null,
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