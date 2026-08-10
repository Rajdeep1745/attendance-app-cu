import { useState, useCallback } from "react";
import BatchContext from "./BatchContext";
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

const BatchState = ({ children }) => {
  const [activeBatch, setActiveBatch] = useState(null);

  const fetchBatchById = useCallback(async (subjectId) => {
    if (!subjectId) {
      setActiveBatch(null);
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
       * Build ONE normalized activeBatch object.
       *
       * Everything else in the frontend can now simply use:
       *
       * activeBatch.subject_id
       * activeBatch.name
       * activeBatch.threshold
       * activeBatch.total_students
       * activeBatch.programme
       * activeBatch.semester
       * activeBatch.subject
       */
      const enrichedBatch = {
        ...data,

        // Backend identifier
        subject_id: data.subject_id || subjectId,

        // Name comes from programmes.js
        name:
          curriculumSubject?.name ||
          data.name ||
          data.subject_id ||
          subjectId,

        // Curriculum information
        programme: curriculumSubject?.programme || null,

        semester: curriculumSubject?.semester || null,

        subject: curriculumSubject?.subject || null,

        // Temporary value because batch_code no longer exists
        batch_code: "------",
      };

      setActiveBatch(enrichedBatch);

      return enrichedBatch;
    } catch (err) {
      console.error(
        "[BatchState] Error fetching subject:",
        err,
      );

      setActiveBatch(null);

      return null;
    }
  }, []);

  return (
    <BatchContext.Provider
      value={{
        activeBatch,
        setActiveBatch,
        fetchBatchById,
      }}
    >
      {children}
    </BatchContext.Provider>
  );
};

export default BatchState;