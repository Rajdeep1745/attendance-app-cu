import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
};

const formatDisplayDate = (value) => {
  const date = parseLocalDate(value);

  if (!date) {
    return "Select date";
  }

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
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const selectedDate = parseLocalDate(value);
  const maxSelectableDate =
    parseLocalDate(maxDate) || new Date();

  const [isOpen, setIsOpen] = useState(false);

  const [month, setMonth] = useState(
    selectedDate || maxSelectableDate
  );

  const [popoverPosition, setPopoverPosition] = useState({
    top: 0,
    left: 0,
    width: 360,
    placement: "top",
  });

  /*
   * Keep the displayed calendar month synchronized
   * with the selected date / maximum date.
   */
  useEffect(() => {
    setMonth(
      parseLocalDate(value) ||
        parseLocalDate(maxDate) ||
        new Date()
    );
  }, [maxDate, value]);

  /*
   * Calculate the popup position relative to the
   * date input.
   *
   * We intentionally position the calendar ABOVE
   * the input whenever there is enough room.
   */
  const updatePopoverPosition = () => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;

    if (!trigger || !popover) {
      return;
    }

    const rect = trigger.getBoundingClientRect();

    const viewportWidth = window.innerWidth;

    const gap = 12;
    const horizontalPadding = 12;

    /*
     * Keep the popup width responsive.
     */
    const popupWidth = Math.min(
      360,
      viewportWidth - horizontalPadding * 2
    );

    /*
     * Align the popup with the left side of the
     * date input initially.
     */
    let left = rect.left;

    /*
     * Prevent the popup from going outside the
     * left side of the screen.
     */
    left = Math.max(
      horizontalPadding,
      left
    );

    /*
     * Prevent the popup from going outside the
     * right side of the screen.
     */
    if (left + popupWidth > viewportWidth - horizontalPadding) {
      left =
        viewportWidth -
        popupWidth -
        horizontalPadding;
    }

    /*
     * Measure the actual calendar height after
     * it has been rendered.
     */
    const popupHeight = popover.offsetHeight;

    /*
     * Preferred position:
     *
     * ABOVE the date field.
     */
    const topPosition =
      rect.top - popupHeight - gap;

    /*
     * Minimum safe distance from viewport top.
     */
    const minimumTop = horizontalPadding;

    /*
     * If there is enough room above, use ABOVE.
     */
    if (topPosition >= minimumTop) {
      setPopoverPosition({
        top: topPosition,
        left,
        width: popupWidth,
        placement: "top",
      });

      return;
    }

    /*
     * If there isn't enough room above, fall back
     * to below the input.
     *
     * This mainly matters on very small screens.
     */
    const bottomPosition =
      rect.bottom + gap;

    setPopoverPosition({
      top: bottomPosition,
      left,
      width: popupWidth,
      placement: "bottom",
    });
  };

  /*
   * Position the popup immediately after it has
   * been rendered into the DOM.
   */
  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      updatePopoverPosition();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isOpen, month]);

  /*
   * Reposition the calendar while scrolling or
   * resizing the browser.
   */
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleViewportChange = () => {
      updatePopoverPosition();
    };

    window.addEventListener(
      "resize",
      handleViewportChange
    );

    /*
     * Capture scrolling from any scrollable parent,
     * not just window.
     */
    window.addEventListener(
      "scroll",
      handleViewportChange,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleViewportChange
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true
      );
    };
  }, [isOpen]);

  /*
   * Outside click + Escape handling.
   *
   * Because the calendar is rendered through a portal,
   * rootRef alone is not enough. We explicitly check
   * both the trigger/root and the popup.
   */
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const clickedInsideRoot =
        rootRef.current?.contains(event.target);

      const clickedInsidePopover =
        popoverRef.current?.contains(event.target);

      if (
        !clickedInsideRoot &&
        !clickedInsidePopover
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isOpen]);

  const handleSelect = (date) => {
    if (!date) {
      return;
    }

    onChange?.(formatLocalDate(date));

    setIsOpen(false);
  };

  const handleTodayClick = () => {
    onChange?.(
      formatLocalDate(maxSelectableDate)
    );

    setMonth(maxSelectableDate);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen((previous) => !previous);
  };

  const calendarPopover = isOpen
    ? createPortal(
        <div
          ref={popoverRef}
          className={`premium-date-picker-popover ${
            popoverPosition.placement === "top"
              ? "opens-above"
              : "opens-below"
          }`}
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            width: `${popoverPosition.width}px`,
          }}
          role="dialog"
          aria-label="Date picker"
        >
          <div className="premium-date-picker-calendar">
            <DayPicker
              mode="single"
              selected={selectedDate}
              month={month}
              onMonthChange={setMonth}
              onSelect={handleSelect}
              disabled={{
                after: maxSelectableDate,
              }}
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
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        className="premium-date-picker"
        ref={rootRef}
      >
        <label className="form-label small fw-semibold mb-1">
          {label}
        </label>

        <button
          ref={triggerRef}
          type="button"
          className={`premium-date-picker-trigger ${
            isOpen ? "open" : ""
          }`}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <span className="premium-date-picker-value">
            {formatDisplayDate(value)}
          </span>

          <span
            className="premium-date-picker-icon"
            aria-hidden="true"
          >
            <i className="fa fa-calendar"></i>
          </span>
        </button>
      </div>

      {calendarPopover}
    </>
  );
};

export default PremiumDatePicker;