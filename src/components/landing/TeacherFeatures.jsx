"use client";

import "../landing/FeatureShowcase.css";
import {
  Camera,
  BarChart3,
  BookOpen,
  ScanFace,
} from "lucide-react";

export default function TeacherFeatures() {
  return (
    <section className="teacherShowcase">

      <div className="teacherLeft">

        <span className="featureTag">
          TEACHER DASHBOARD
        </span>

        <h2>
          Built for
          <span> Modern Educators</span>
        </h2>

        <p>
          Powerful AI tools to automate attendance,
          manage classrooms and generate actionable
          insights in real time.
        </p>

        <div className="benefitList">

          <div className="benefitItem">
            <ScanFace />
            <div>
              <h4>Save Time</h4>
              <p>Automate attendance and reduce manual work.</p>
            </div>
          </div>

          <div className="benefitItem">
            <Camera />
            <div>
              <h4>Increase Accuracy</h4>
              <p>99%+ face recognition precision.</p>
            </div>
          </div>

          <div className="benefitItem">
            <BarChart3 />
            <div>
              <h4>Better Insights</h4>
              <p>Attendance trends and performance analytics.</p>
            </div>
          </div>

        </div>

      </div>

      <div className="teacherCenter">

  <div className="dashboardGlass">

    <div className="dashboardSidebar">

      <div className="sideLogo">
        Attendify
      </div>

      <div className="sideMenu">
        <span>Dashboard</span>
        <span>Attendance</span>
        <span>Students</span>
        <span>Reports</span>
        <span>AI Planner</span>
      </div>

    </div>

    <div className="dashboardMain">

      <div className="dashboardHeader">
        <h3>Good Morning, Professor 👋</h3>
        <span>CS-4A</span>
      </div>

      <div className="dashboardGrid">

        <div className="attendanceCard">
          <div className="circle92">
            <span>92%</span>
          </div>

          <div>
            <h4>97 Present</h4>
            <p>5 Absent</p>
          </div>
        </div>

        <div className="liveCard">

          <div className="liveBadge">
            LIVE
          </div>

          <h4>Face Recognition</h4>

          <div className="avatars">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <strong>99.6%</strong>

        </div>

        <div className="chartCard">
          <h4>Weekly Overview</h4>
          <div className="chartLine"></div>
        </div>

        <div className="insightsCard">
          <h4>Top Insights</h4>

          <ul>
            <li>3 students below 75%</li>
            <li>Highest attendance in CS-4A</li>
            <li>2 AI lecture plans generated</li>
          </ul>
        </div>

      </div>

    </div>

  </div>

</div>


      <div className="teacherRight">

        <div className="floatingPanel blue">
          <ScanFace size={32}/>
          <h4>AI Face Recognition</h4>
          <p>99% Accuracy</p>
        </div>

        <div className="floatingPanel purple">
          <BarChart3 size={32}/>
          <h4>Analytics</h4>
          <p>Smart Insights</p>
        </div>

        <div className="floatingPanel green">
          <BookOpen size={32}/>
          <h4>AI Planner</h4>
          <p>18 Topics Generated</p>
        </div>

      </div>

    </section>
  );
}