"use client";

import "../landing/FeatureShowcase.css";
import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import {
  ScanFace,
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  FileText,
  GraduationCap,
  Users,
  Sparkles,
} from "lucide-react";

export default function TeacherFeatures() {
  const [screenshots, setScreenshots] = useState([
    "/images/featureScreenshots/appscr2.png",
    "/images/featureScreenshots/appscr4.png",
    "/images/featureScreenshots/appscr3.png",
    "/images/featureScreenshots/appscr1.png",
  ]);

  const [direction, setDirection] = useState("right");
  const [animating, setAnimating] = useState(false);

  const nextSlide = () => {
    if (animating) return;

    setAnimating(true);
    setDirection("right");

    setTimeout(() => {
      setScreenshots((prev) => {
        const updated = [...prev];
        const first = updated.shift();

        return [...updated, first];
      });

      setAnimating(false);
    }, 250);
  };

  const prevSlide = () => {
    if (animating) return;

    setAnimating(true);
    setDirection("left");

    setTimeout(() => {
      setScreenshots((prev) => {
        const updated = [...prev];

        const last = updated.pop();

        return [last, ...updated];
      });

      setAnimating(false);
    }, 250);
  };

  return (
    <section className="teacherShowcase">
      <div className="teacherHeader">
        <span className="pss-teach">
          <Sparkles size={14} />
          TEACHER EXPERIENCE
        </span>

        <h2>
          Built For
          <span> Modern Educators</span>
        </h2>

        <p>
          Everything teachers need to automate attendance, manage classrooms,
          monitor engagement and gain powerful insights from a single
          intelligent platform.
        </p>
      </div>

      <div className="teacherContent">
        {/* LEFT SIDE */}

        <div className="featureColumn">
          <div className="glassCard blueCard">
            <Clock3 size={32} />
            <h4>Save Hours Weekly</h4>
            <p>Eliminate manual attendance and classroom paperwork.</p>
          </div>

          <div className="teacherGraphic">
            <div className="orbit orbit1"></div>
            <div className="orbit orbit2"></div>

            <div className="graphicCenter">
              <GraduationCap size={40} />
            </div>

            <div className="graphicIcon icon1">
              <CalendarDays size={20} />
            </div>

            <div className="graphicIcon icon2">
              <BarChart3 size={20} />
            </div>

            <div className="graphicIcon icon3">
              <FileText size={20} />
            </div>
          </div>

          <div className="glassCard purpleCard">
            <Users size={32} />
            <h4>Manage Classes</h4>
            <p>Organize batches, records and attendance effortlessly.</p>
          </div>
        </div>

        {/* CENTER SCREENSHOTS */}

        <div className="screenshotsShowcase">
          <div className="showcaseFrame">
            <div className="mainScreenshot">
              <button className="carouselArrow leftArrow" onClick={prevSlide}>
                <ChevronLeft size={28} />
              </button>

              <img
                key={screenshots[0]}
                src={screenshots[0]}
                alt=""
                className={direction === "right" ? "slideRight" : "slideLeft"}
              />

              <button className="carouselArrow rightArrow" onClick={nextSlide}>
                <ChevronRight size={28} />
              </button>
            </div>

            <div className="secondaryGrid">
              {screenshots.slice(1).map((img, index) => (
                <div className="thumbnailCard" key={index}>
                  <img src={img} alt="" />
                </div>
              ))}
            </div>
          </div>

          <div className="glowOrb orb1"></div>
          <div className="glowOrb orb2"></div>
        </div>

        {/* RIGHT SIDE */}

        <div className="featureColumn">
          <div className="glassCard orangeCard">
            <ScanFace size={32} />
            <h4>AI Face Recognition</h4>
            <p>Highly accurate attendance with real-time recognition.</p>
          </div>

          <div className="glassCard greyCard">
            <BookOpen size={32} />
            <h4>AI Lesson Planner</h4>
            <p>Generate teaching plans and topics in seconds.</p>
          </div>

          <div className="glassCard greenCard">
            <BarChart3 size={32} />
            <h4>Advanced Analytics</h4>
            <p>Discover trends and student attendance patterns instantly.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
