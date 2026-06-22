"use client";

import "../landing/FeatureShowcase.css";

import {
  CalendarCheck,
  BellRing,
  TrendingUp,
  Shield,
  BookOpen,
} from "lucide-react";

export default function StudentFeatures() {
  return (
    <section className="studentShowcase">

      <div className="studentInfo">

        <span className="featureTag pink">
          STUDENT EXPERIENCE
        </span>

        <h2>
          Everything
          <span> Students Need</span>
        </h2>

        <p>
          Stay informed, track attendance and
          receive real-time academic insights.
        </p>

        <div className="privacyCard">
          <Shield />
          <div>
            <h4>Your Data Is Safe</h4>
            <p>End-to-end protected.</p>
          </div>
        </div>

      </div>

      <div className="phoneMockup">

        <div className="phoneScreen">

          <h4>Hello, Student 👋</h4>

          <div className="phoneAttendance">

            <div className="phoneCircle">
              92%
            </div>

            <p>Overall Attendance</p>

          </div>

          <div className="subjectRow">
            <span>Data Structures</span>
            <span>92%</span>
          </div>

          <div className="subjectRow">
            <span>Operating Systems</span>
            <span>88%</span>
          </div>

          <div className="subjectRow">
            <span>Database Systems</span>
            <span>95%</span>
          </div>

        </div>

      </div>

      <div className="timelineFeatures">

        <div className="timelineItem">
          <CalendarCheck />
          <div>
            <h4>Real-Time Attendance</h4>
            <p>Updated after every class.</p>
          </div>
        </div>

        <div className="timelineItem">
          <TrendingUp />
          <div>
            <h4>Attendance Analytics</h4>
            <p>Visualize your progress.</p>
          </div>
        </div>

        <div className="timelineItem">
          <BellRing />
          <div>
            <h4>Smart Alerts</h4>
            <p>Receive shortage warnings.</p>
          </div>
        </div>

        <div className="timelineItem">
          <BookOpen />
          <div>
            <h4>Lecture Topics</h4>
            <p>Access class plans instantly.</p>
          </div>
        </div>

      </div>

      <div className="successCard">
        <h3>You're Doing Great!</h3>
        <div className="successCircle">
          ✓
        </div>
      </div>

    </section>
  );
}