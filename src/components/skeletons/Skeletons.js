import "./Skeletons.css";

export const SkeletonBlock = ({
  className = "",
  width,
  height,
  radius,
  style = {},
}) => (
  <span
    className={`skeleton-block ${className}`}
    style={{
      width,
      height,
      borderRadius: radius,
      ...style,
    }}
  />
);

export const SkeletonText = ({
  lines = 1,
  widths = ["100%"],
  className = "",
}) => (
  <div className={`skeleton-text ${className}`} aria-hidden="true">
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonBlock
        key={index}
        className="skeleton-line"
        width={widths[index] || widths[widths.length - 1] || "100%"}
      />
    ))}
  </div>
);

export const SkeletonMetricCard = ({ className = "" }) => (
  <div className={`card skeleton-card h-100 ${className}`}>
    <div className="card-body skeleton-metric-card">
      <SkeletonText lines={1} widths={["48%"]} />
      <SkeletonBlock className="skeleton-metric-value" width="78px" height="42px" />
      <SkeletonBlock className="skeleton-icon" width="50px" height="44px" radius="12px" />
    </div>
  </div>
);

export const SkeletonCard = ({
  className = "",
  bodyClassName = "",
  children,
  lines = 3,
}) => (
  <div className={`card skeleton-card ${className}`}>
    <div className={`card-body ${bodyClassName}`}>
      {children || <SkeletonText lines={lines} widths={["45%", "90%", "65%"]} />}
    </div>
  </div>
);

export const SkeletonTable = ({
  rows = 5,
  columns = 4,
  avatar = false,
  actions = false,
  className = "",
}) => (
  <div className={`skeleton-table ${className}`} aria-hidden="true">
    <div
      className="skeleton-table-header"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr)) ${actions ? "40px" : ""}` }}
    >
      {Array.from({ length: columns + (actions ? 1 : 0) }).map((_, index) => (
        <SkeletonBlock key={index} height="12px" width={index === 0 ? "54%" : "42%"} />
      ))}
    </div>

    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className="skeleton-table-row"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr)) ${actions ? "40px" : ""}` }}
      >
        {Array.from({ length: columns }).map((_, columnIndex) => (
          <div key={columnIndex} className="skeleton-table-cell">
            {avatar && columnIndex === 0 && (
              <SkeletonBlock width="36px" height="36px" radius="50%" />
            )}
            <SkeletonBlock width={columnIndex === 0 ? "72%" : "52%"} height="14px" />
          </div>
        ))}
        {actions && (
          <div className="skeleton-table-cell">
            <SkeletonBlock width="18px" height="18px" radius="50%" />
          </div>
        )}
      </div>
    ))}
  </div>
);

export const SkeletonList = ({ rows = 5, className = "" }) => (
  <div className={`skeleton-list ${className}`} aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="skeleton-list-row">
        <div className="skeleton-list-copy">
          <SkeletonBlock width="42%" height="15px" />
          <SkeletonBlock width="25%" height="12px" />
        </div>
        <div className="skeleton-list-meta">
          <SkeletonBlock width="50px" height="15px" />
          <SkeletonBlock width="86px" height="30px" radius="999px" />
        </div>
      </div>
    ))}
  </div>
);

export const TeacherDashboardSkeleton = () => (
  <div className="container-fluid dashboard skeleton-page" aria-busy="true">
    <div className="mb-4 skeleton-page-header">
      <SkeletonBlock width="210px" height="22px" />
      <SkeletonBlock width="170px" height="34px" />
      <SkeletonBlock width="250px" height="17px" />
    </div>

    <div className="row g-4 mb-4">
      <div className="col">
        <SkeletonMetricCard />
      </div>
      <div className="col">
        <SkeletonMetricCard />
      </div>
    </div>

    <div className="row g-4">
      <div className="col-md-6">
        <SkeletonCard className="dashboard-card h-100">
          <SkeletonText lines={2} widths={["45%", "70%"]} />
          <SkeletonBlock className="mt-3" width="100%" height="40px" radius="10px" />
          <SkeletonBlock className="mt-3" width="88px" height="40px" radius="10px" />
        </SkeletonCard>
      </div>
      <div className="col-md-6">
        <SkeletonCard className="dashboard-card h-100">
          <SkeletonText lines={2} widths={["58%", "88%"]} />
          <div className="skeleton-control-row mt-4">
            <SkeletonBlock width="100%" height="10px" radius="999px" />
            <SkeletonBlock width="90px" height="40px" radius="10px" />
          </div>
          <SkeletonBlock className="mt-4" width="78px" height="40px" radius="10px" />
        </SkeletonCard>
      </div>
    </div>

    <div className="row mt-4">
      <div className="col-12">
        <SkeletonCard className="dashboard-card attendance-mode-card">
          <SkeletonText lines={2} widths={["190px", "360px"]} />
          <div className="skeleton-mode-grid mt-4">
            <SkeletonBlock height="88px" radius="16px" />
            <SkeletonBlock height="88px" radius="16px" />
          </div>
          <SkeletonTable rows={4} columns={4} actions className="mt-4" />
        </SkeletonCard>
      </div>
    </div>
  </div>
);

export const TeacherAttendanceSkeleton = () => (
  <div className="container-fluid attendance-page skeleton-page" aria-busy="true">
    <div className="mb-4 skeleton-page-heading-left">
      <SkeletonBlock width="260px" height="34px" />
      <SkeletonBlock width="320px" height="18px" />
    </div>

    <div className="row g-4 mb-4">
      <div className="col-md-6">
        <SkeletonCard className="attendance-card h-100">
          <SkeletonBlock width="100%" height="350px" radius="24px" />
        </SkeletonCard>
      </div>
      <div className="col-md-6">
        <SkeletonCard className="attendance-card h-100">
          <div className="skeleton-summary-grid">
            <div>
              <SkeletonText lines={3} widths={["150px", "110px", "170px"]} />
            </div>
            <div className="skeleton-side-stats">
              <SkeletonBlock width="90px" height="88px" radius="10px" />
              <SkeletonBlock width="90px" height="88px" radius="10px" />
            </div>
          </div>
          <SkeletonBlock className="mt-4" width="100%" height="10px" radius="999px" />
        </SkeletonCard>
      </div>
    </div>

    <SkeletonCard className="attendance-card">
      <SkeletonText lines={1} widths={["90px"]} />
      <SkeletonList rows={6} className="mt-3" />
    </SkeletonCard>
  </div>
);

export const TeacherStudentsSkeleton = () => (
  <div className="container-fluid students-page skeleton-page" aria-busy="true">
    <div className="mb-4 skeleton-page-heading-left">
      <SkeletonBlock width="150px" height="34px" />
      <SkeletonBlock width="260px" height="16px" />
    </div>

    <SkeletonCard className="students-card mb-4">
      <SkeletonText lines={2} widths={["210px", "450px"]} />
      <div className="skeleton-stats-row mt-4">
        <SkeletonText lines={2} widths={["56px", "110px"]} />
        <SkeletonText lines={2} widths={["56px", "130px"]} />
        <SkeletonText lines={2} widths={["56px", "96px"]} />
      </div>
      <SkeletonBlock className="mt-3" width="102px" height="38px" radius="10px" />
    </SkeletonCard>

    <SkeletonCard className="students-card">
      <div className="skeleton-card-toolbar">
        <SkeletonText lines={2} widths={["260px", "430px"]} />
        <SkeletonBlock width="132px" height="40px" radius="10px" />
      </div>
      <SkeletonTable rows={6} columns={4} avatar actions className="mt-4" />
    </SkeletonCard>
  </div>
);

export const TeacherReportsSkeleton = () => (
  <div className="container-fluid reports-page skeleton-page" aria-busy="true">
    <div className="mb-4 skeleton-page-heading-left">
      <SkeletonBlock width="145px" height="34px" />
      <SkeletonBlock width="270px" height="18px" />
    </div>

    <div className="row g-4 mb-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="col-md-6 col-xl-3">
          <SkeletonCard className="reports-card h-100">
            <SkeletonText lines={3} widths={["70%", "45%", "82%"]} />
          </SkeletonCard>
        </div>
      ))}
    </div>

    <div className="row g-4 mb-4">
      <div className="col-12">
        <SkeletonCard className="reports-card">
          <div className="skeleton-card-toolbar">
            <SkeletonText lines={2} widths={["230px", "310px"]} />
            <SkeletonBlock width="300px" height="38px" radius="10px" />
          </div>
          <div className="skeleton-chart mt-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton-chart-bar">
                <SkeletonBlock height={`${70 + ((index * 23) % 120)}px`} radius="10px" />
                <SkeletonBlock width="34px" height="13px" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>

    <div className="row g-4">
      <div className="col-lg-6">
        <SkeletonCard className="reports-card h-100">
          <SkeletonText lines={2} widths={["210px", "310px"]} />
          <SkeletonList rows={4} className="mt-3" />
        </SkeletonCard>
      </div>
      <div className="col-lg-6">
        <SkeletonCard className="reports-card h-100">
          <SkeletonText lines={2} widths={["210px", "290px"]} />
          <SkeletonList rows={4} className="mt-3" />
        </SkeletonCard>
      </div>
    </div>
  </div>
);

export const StudentDashboardSkeleton = () => (
  <div className="container-fluid dashboard student-dashboard skeleton-page" aria-busy="true">
    <div className="mb-4 skeleton-page-header">
      <SkeletonBlock width="220px" height="22px" />
      <SkeletonBlock width="170px" height="34px" />
      <SkeletonBlock width="560px" height="17px" />
    </div>

    <div className="row g-4 mb-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="col-md-4">
          <SkeletonMetricCard />
        </div>
      ))}
    </div>

    <div className="row g-4">
      <div className="col-md-6">
        <SkeletonCard className="dashboard-card h-100">
          <SkeletonText lines={2} widths={["180px", "260px"]} />
          <SkeletonBlock className="mt-3" width="100%" height="40px" radius="10px" />
          <div className="student-card-meta mt-4">
            <SkeletonText lines={2} widths={["100%", "92%"]} />
          </div>
        </SkeletonCard>
      </div>
      <div className="col-md-6">
        <SkeletonCard className="dashboard-card h-100">
          <SkeletonText lines={2} widths={["260px", "430px"]} />
          <div className="skeleton-control-row mt-4">
            <SkeletonBlock width="100%" height="10px" radius="999px" />
            <SkeletonBlock width="90px" height="40px" radius="10px" />
          </div>
          <SkeletonBlock className="mt-4" width="100%" height="70px" radius="12px" />
        </SkeletonCard>
      </div>
    </div>
  </div>
);

export const StudentAttendanceSkeleton = () => (
  <div className="container-fluid attendance-page student-attendance-page skeleton-page" aria-busy="true">
    <div className="mb-4 skeleton-page-heading-left">
      <SkeletonBlock width="170px" height="34px" />
      <SkeletonBlock width="520px" height="18px" />
    </div>

    <SkeletonCard className="attendance-card mb-4">
      <div className="student-date-card">
        <div className="student-calendar-shell">
          <SkeletonBlock width="100%" height="350px" radius="24px" />
        </div>
        <div className="student-date-copy">
          <SkeletonBlock width="160px" height="42px" radius="14px" />
          <SkeletonText className="mt-3" lines={2} widths={["260px", "460px"]} />
          <div className="student-date-stats">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} width="126px" height="86px" radius="16px" />
            ))}
          </div>
          <SkeletonBlock className="mt-4" width="100%" height="58px" radius="16px" />
        </div>
      </div>
    </SkeletonCard>

    <SkeletonCard className="attendance-card">
      <SkeletonText lines={2} widths={["320px", "440px"]} />
      <SkeletonTable rows={5} columns={3} className="mt-4" />
    </SkeletonCard>
  </div>
);

export const StudentStudentsSkeleton = () => (
  <div className="container-fluid student-roster-page skeleton-page" aria-busy="true">
    <div className="mb-4 skeleton-page-heading-left">
      <SkeletonBlock width="150px" height="34px" />
      <SkeletonBlock width="300px" height="18px" />
    </div>

    <SkeletonCard className="student-roster-card mb-4">
      <div className="student-roster-summary">
        <SkeletonText lines={3} widths={["90px", "220px", "260px"]} />
        <div className="student-summary-metrics">
          <SkeletonBlock width="150px" height="82px" radius="16px" />
          <SkeletonBlock width="150px" height="82px" radius="16px" />
        </div>
      </div>
    </SkeletonCard>

    <SkeletonCard className="student-roster-card">
      <SkeletonTable rows={7} columns={4} avatar />
    </SkeletonCard>
  </div>
);

export const StudentReportsSkeleton = () => (
  <div className="container-fluid student-reports-page skeleton-page" aria-busy="true">
    <div className="mb-4 skeleton-page-heading-left">
      <SkeletonBlock width="145px" height="34px" />
      <SkeletonBlock width="330px" height="18px" />
    </div>

    <div className="row g-4 mb-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="col-md-6 col-xl-3">
          <SkeletonCard className="student-reports-card h-100">
            <SkeletonText lines={2} widths={["72%", "48%"]} />
          </SkeletonCard>
        </div>
      ))}
    </div>

    <div className="row g-4">
      <div className="col-12">
        <SkeletonCard className="student-reports-card h-100">
          <SkeletonText lines={2} widths={["260px", "520px"]} />
          <div className="student-breakdown-grid mt-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} height="82px" radius="16px" />
            ))}
          </div>
        </SkeletonCard>
      </div>
      <div className="col-12">
        <SkeletonCard className="student-reports-card h-100">
          <SkeletonText lines={2} widths={["220px", "520px"]} />
          <SkeletonList rows={6} className="mt-4" />
        </SkeletonCard>
      </div>
    </div>
  </div>
);
