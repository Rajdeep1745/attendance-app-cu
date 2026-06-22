import { useState } from "react";
import "./Auth.css";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import TeacherFeatures from "../../components/landing/TeacherFeatures";
import StudentFeatures from "../../components/landing/StudentFeatures";
import logo from "../layout/navbar/assets/logoTransparent.png"
import {
  ScanFace,
  BookOpen,
    Users,
  BarChart3,
  UserRound,
  FileText,
  GraduationCap,
  UserPlus,
} from "lucide-react";


export default function LandingPage() {
  const [authMode, setAuthMode] = useState(null);

  return (
    <div className="landing-page">

      {/* Animated Background */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <section className="hero-section">

 

  <div className="hero-glow-left"></div>

<div className="hero-orbit">

  <div className="orbit-center">
    <BarChart3 size={28} />
  </div>

  <div className="orbit-ring ring-1"></div>
  <div className="orbit-ring ring-2"></div>
  <div className="orbit-ring ring-3"></div>

  <div className="orbit-dots">
    <span style={{ top: "8%", left: "50%" }}></span>
    <span style={{ top: "25%", right: "12%" }}></span>
    <span style={{ bottom: "25%", right: "18%" }}></span>
    <span style={{ bottom: "8%", left: "30%" }}></span>
    <span style={{ top: "50%", left: "8%" }}></span>
  </div>

  <div className="orbit-icon icon-top">
    <UserRound size={18}/>
  </div>

  <div className="orbit-icon icon-left">
    <GraduationCap size={18}/>
  </div>

  <div className="orbit-icon icon-bottom-right">
    <Users size={18}/>
  </div>

</div>

 
  <div className="hero-dot-grid bottom-left"></div>

  <div className="hero-content">

    <h1 className="hero-title">
     <div className="title-line-1">

  <span className="logo-letter">
    <img src={logo} alt="" />
  </span>

  <span className="attendance-rest">
    ttendify
  </span>
</div>

<span className="hero-gradient-line">
  Smarter Attendance For Modern Classrooms
</span>
    </h1>

    <p className="hero-subtitle">
      Intelligent attendance tracking,
      AI-assisted teaching workflows, real-time analytics,
      and face-recognition powered classroom automation.
    </p>

    <div className="hero-buttons">

      <button
        className="primary-btn"
        onClick={() => setAuthMode("login")}
      >
        <GraduationCap size={20}/>
        Login
      </button>

      <button
        className="secondary-btn"
        onClick={() => setAuthMode("signup")}
      >
        <UserPlus size={20}/>
        Create Account
      </button>

    </div>

    <div className="hero-feature-grid">

      <div className="feature-card">
        <div className="feature-icon">
          <ScanFace size={28}/>
        </div>
        <h4>Face Recognition</h4>
      </div>

      <div className="feature-card">
        <div className="feature-icon">
          <BookOpen size={28}/>
        </div>
        <h4>AI Teaching Plans</h4>
      </div>

      <div className="feature-card">
        <div className="feature-icon">
          <BarChart3 size={28}/>
        </div>
        <h4>Attendance Analytics</h4>
      </div>

      <div className="feature-card">
        <div className="feature-icon">
          <UserRound size={28}/>
        </div>
        <h4>Student Insights</h4>
      </div>

      <div className="feature-card">
        <div className="feature-icon">
          <FileText size={28}/>
        </div>
        <h4>Classroom Automation</h4>
      </div>

    </div>

  </div>

  <svg
    className="hero-wave"
    viewBox="0 0 1440 220"
    preserveAspectRatio="none"
  >
    <path
      d="M0,128L80,138.7C160,149,320,171,480,181.3C640,192,800,192,960,170.7C1120,149,1280,107,1360,85.3L1440,64L1440,320L0,320Z"
      fill="url(#waveGradient)"
    />

    <defs>
      <linearGradient
        id="waveGradient"
        x1="0%"
        y1="0%"
        x2="100%"
        y2="0%"
      >
        <stop offset="0%" stopColor="#4f7df8" />
        <stop offset="100%" stopColor="#6d5cff" />
      </linearGradient>
    </defs>
  </svg>

</section>


     <TeacherFeatures />
<StudentFeatures />

      {/* DEVELOPERS */}
      <section className="developers-section">

        <h2>Meet The Developers</h2>

        <div className="developer-grid">

          <div className="developer-card">
            <div className="developer-avatar">
              JS
            </div>

            <h3>Jinea Saha</h3>

            <p>
              Frontend Architecture, UI/UX,
              Attendance Workflows and System Design
            </p>
          </div>

          <div className="developer-card">
            <div className="developer-avatar">
              RS
            </div>

            <h3>Rajdeep Sarkar</h3>

            <p>
              Backend APIs, Database Architecture,
              Authentication & Face Recognition
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">

        <h3>Attendance App CU</h3>

        <p>
          AI-Powered Attendance Management Platform
        </p>

        <span>
          Built with React • Node.js • Supabase • Python • Gemini AI
        </span>

      </footer>

      {/* Modal Placeholder */}
      {authMode && (
  <div
    className="auth-modal-backdrop"
    onClick={() => setAuthMode(null)}
  >

    <div
      className="auth-modal-panel"
      onClick={(e) => e.stopPropagation()}
    >

      <button
        className="auth-close"
        onClick={() => setAuthMode(null)}
      >
        ×
      </button>

      <div className="auth-side">
        <div className="auth-side-content">

  <div className="auth-brand">

    <div className="auth-logo-wrapper">
  <img
    src={logo}
    alt="Attendify Logo"
    className="auth-brand-logo"
  />
</div>

    <h2 className="auth-brand-title">
      ATTENDIFY
    </h2>

    <p className="auth-brand-tagline">
      The Modern Way To Manage Attendance, Analytics And Learning.
    </p>

  </div>

</div>
      </div>

      <div className="auth-form-side">

        {authMode === "login" ? (
  <LoginForm
    switchToSignup={() =>
      setAuthMode("signup")
    }
  />
) : (
  <SignupForm
    switchToLogin={() =>
      setAuthMode("login")
    }
  />
)}

      </div>

    </div>

  </div>
)}

    </div>
  );
}