import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import "./PremiumDatePicker.css";

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value) => {
  if (!value) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
};

const formatDisplayDate = (value) => {
  const date = parseLocalDate(value);
  if (!date) return "Select date";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const PremiumDatePicker = ({
  label = "Date",
  value,
  onChange,
  maxDate,
}) => {
  const rootRef = useRef(null);
  const selectedDate = parseLocalDate(value);
  const maxSelectableDate = parseLocalDate(maxDate) || new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(selectedDate || maxSelectableDate);

  useEffect(() => {
    setMonth(parseLocalDate(value) || parseLocalDate(maxDate) || new Date());
  }, [maxDate, value]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (date) => {
    if (!date) return;

    onChange?.(formatLocalDate(date));
    setIsOpen(false);
  };

  const handleTodayClick = () => {
    onChange?.(formatLocalDate(maxSelectableDate));
    setMonth(maxSelectableDate);
    setIsOpen(false);
  };

  return (
    <div className="premium-date-picker" ref={rootRef}>
      <label className="form-label small fw-semibold mb-1">{label}</label>

      <button
        type="button"
        className={`premium-date-picker-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="premium-date-picker-value">
          {formatDisplayDate(value)}
        </span>
        <span className="premium-date-picker-icon" aria-hidden="true">
          <i className="fa fa-calendar"></i>
        </span>
      </button>

      {isOpen && (
        <div className="premium-date-picker-popover">
          <div className="premium-date-picker-calendar">
            <DayPicker
              mode="single"
              selected={selectedDate}
              month={month}
              onMonthChange={setMonth}
              onSelect={handleSelect}
              disabled={{ after: maxSelectableDate }}
              showOutsideDays
            />
          </div>

          <div className="premium-date-picker-footer">
            <button
              type="button"
              className="premium-date-picker-footer-btn subtle"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="premium-date-picker-footer-btn primary"
              onClick={handleTodayClick}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumDatePicker;
