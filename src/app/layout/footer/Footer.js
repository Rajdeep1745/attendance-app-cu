import "./Footer.css";

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-bottom">
        © {new Date().getFullYear()} Smart Attendance • Developed by Rajdeep
        Sarkar & Jinea Saha
      </div>
    </footer>
  );
}
