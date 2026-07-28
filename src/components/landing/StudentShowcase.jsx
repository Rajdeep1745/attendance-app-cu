"use client";

import { useEffect, useRef, useState } from "react";
import "../landing/StudentShowcase.css";
import {
  CalendarCheck,
  BellRing,
  TrendingUp,
  Shield,
  BookOpen,
  Sparkles,
  ArrowRight,
  Clock,
  BarChart3,
  GraduationCap,
  Award,
} from "lucide-react";

const studentFeatures = [
  {
    icon: CalendarCheck,
    title: "Real-Time Attendance",
    desc: "Watch your attendance update live after every class — no more guessing, no more waiting for end-of-semester surprises.",
    gradient: "linear-gradient(135deg, #f48bfa, #8d4975)",
    glow: "rgb(159 56 85 / 45%)",
    accent: "#9b7c98",
  },
  {
    icon: TrendingUp,
    title: "Attendance Analytics",
    desc: "Beautiful charts that visualize your progress across every subject — spot trends before they become problems.",
    gradient: "linear-gradient(135deg,#000000, #a147b9)",
    glow: "rgba(168,85,247,.45)",
    accent: "#c4b5fd",
  },
  {
    icon: BellRing,
    title: "Smart Alerts",
    desc: "Proactive shortage warnings and gentle nudges so you never accidentally cross the danger line.",
    gradient: "linear-gradient(135deg,#fb923c,#f43f5e)",
    glow: "rgba(251,146,60,.45)",
    accent: "#fdba74",
  },
  {
    icon: BookOpen,
    title: "Lecture Topics",
    desc: "Access every class plan, topic, and resource instantly — your entire syllabus, always in your pocket.",
    gradient: "linear-gradient(135deg,#34d399,#06b6d4)",
    glow: "rgba(52,211,153,.45)",
    accent: "#6ee7b7",
  },
];

export default function StudentShowcase() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="premiumStudentShowcase" ref={sectionRef}>
      {/* Ambient background orbs */}
      <div className="pss-orb pss-orb-1" />
      <div className="pss-orb pss-orb-2" />
      <div className="pss-orb pss-orb-3" />
      <div className="pss-grid" />

      {/* Floating particles */}
      <div className="pss-particles">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="pss-particle"
            style={{
              "--x": `${Math.random() * 100}%`,
              "--y": `${Math.random() * 100}%`,
              "--d": `${Math.random() * 8 + 4}s`,
              "--delay": `${Math.random() * 5}s`,
              "--size": `${Math.random() * 3 + 2}px`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className={`pss-header ${visible ? "is-visible" : ""}`}>
        <span className="pss-tag">
          <Sparkles size={14} />
          STUDENT EXPERIENCE
        </span>
        <h2 className="pss-title">
          Your Academic Life,
          <span className="pss-title-gradient"> Beautifully Simplified</span>
        </h2>
        <p className="pss-subtitle">
          Stay informed, track every class, and receive real-time academic
          insights — all from one elegant dashboard designed around your success.
        </p>
      </div>

      {/* Main content grid */}
      <div className="pss-content">
        {/* Left: Feature cards */}
        <div className="pss-features">
          {studentFeatures.map((feature, i) => (
            <div
              key={feature.title}
              className={`pss-feature-card ${visible ? "is-visible" : ""}`}
              style={{
                "--card-gradient": feature.gradient,
                "--card-glow": feature.glow,
                "--card-accent": feature.accent,
                transitionDelay: `${300 + i * 140}ms`,
              }}
            >
              <div className="pss-feature-top">
                <div className="pss-feature-icon">
                  <feature.icon size={26} />
                </div>
                <ArrowRight size={18} className="pss-feature-arrow" />
              </div>
              <h4 className="pss-feature-title">{feature.title}</h4>
              <p className="pss-feature-desc">{feature.desc}</p>
              <div className="pss-feature-shine" />
            </div>
          ))}
        </div>

        {/* Center: Premium phone mockup */}
        <div className={`pss-mockup-wrapper ${visible ? "is-visible" : ""}`}>
          <div className="pss-mockup-glow" />
          <div className="pss-mockup">
            <div className="pss-mockup-notch" />
            <div className="pss-mockup-screen">
              <div className="pss-mockup-status">
                <span>9:41</span>
                <div className="pss-mockup-dots">
                  <span /> <span /> <span />
                </div>
              </div>

              <div className="pss-mockup-greeting">
                <div className="pss-mockup-avatar">S</div>
                <div>
                  <p className="pss-mockup-hi">Hello, Student</p>
                  <p className="pss-mockup-wave">👋</p>
                </div>
              </div>

              <div className="pss-mockup-circle">
                <svg viewBox="0 0 120 120" className="pss-mockup-ring">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="rgba(255,255,255,.08)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#grad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${0.92 * 327} 327`}
                    transform="rotate(-90 60 60)"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="pss-mockup-circle-text">
                  <span className="pss-mockup-percent">92%</span>
                  <span className="pss-mockup-label">Overall</span>
                </div>
              </div>

              <div className="pss-mockup-subjects">
                <div className="pss-mockup-subject">
                  <div className="pss-mockup-subject-info">
                    <span className="pss-mockup-dot ds" />
                    <span>Data Structures</span>
                  </div>
                  <span className="pss-mockup-subject-pct">92%</span>
                </div>
                <div className="pss-mockup-subject">
                  <div className="pss-mockup-subject-info">
                    <span className="pss-mockup-dot os" />
                    <span>Operating Systems</span>
                  </div>
                  <span className="pss-mockup-subject-pct">88%</span>
                </div>
                <div className="pss-mockup-subject">
                  <div className="pss-mockup-subject-info">
                    <span className="pss-mockup-dot db" />
                    <span>Database Systems</span>
                  </div>
                  <span className="pss-mockup-subject-pct">95%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges around phone */}
          <div className="pss-float-badge pss-float-1">
            <BellRing size={16} />
            <span>Shortage Alert</span>
          </div>
          <div className="pss-float-badge pss-float-2">
            <TrendingUp size={16} />
            <span>+5% this week</span>
          </div>
          <div className="pss-float-badge pss-float-3">
            <Clock size={16} />
            <span>Live updates</span>
          </div>
        </div>

        {/* Right: Premium info panel */}
        <div className="pss-info-panel">
          <div className={`pss-info-card ${visible ? "is-visible" : ""}`}>
            <div className="pss-info-icon">
              <Shield size={28} />
            </div>
            <h3>Your Data, Protected</h3>
            <p>
              End-to-end encryption keeps your academic records private and
              secure. Only you and your institution ever see your data.
            </p>
            <div className="pss-info-footer">
              <span className="pss-info-badge">SOC-2</span>
              <span className="pss-info-badge">GDPR</span>
              <span className="pss-info-badge">E2E</span>
            </div>
          </div>

          <div className={`pss-info-card pss-info-success ${visible ? "is-visible" : ""}`}>
            <div className="pss-info-icon">
              <Award size={28} />
            </div>
            <h3>You're Doing Great!</h3>
            <p>
              Students using Attendify maintain 15% higher attendance on average.
              Keep up the momentum.
            </p>
            <div className="pss-progress-bar">
              <div className="pss-progress-fill" />
            </div>
          </div>

          <div className={`pss-info-card pss-info-analytics ${visible ? "is-visible" : ""}`}>
            <div className="pss-info-icon">
              <BarChart3 size={28} />
            </div>
            <h3>Insights That Matter</h3>
            <p>
              Understand your patterns — know exactly which subjects need more
              attention before exams arrive.
            </p>
            <div className="pss-mini-chart">
              {[40, 65, 50, 80, 70, 90, 85].map((h, i) => (
                <span
                  key={i}
                  className="pss-chart-bar"
                  style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
