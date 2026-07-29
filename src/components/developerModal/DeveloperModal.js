import "./DeveloperModal.css";

export default function DeveloperModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  const rajdeepPic = "/images/developers/rajdeep.png";
  const jineaPic = "/images/developers/jinea.png";

  return (
    <div className="dev-modal-overlay" onClick={onClose}>
      <div className="dev-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dev-modal-header">
          <h3>Development Team</h3>

          <button onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="developers-grid">
          <div className="developer-profile">
            <div className="developer-avatar-modal">
              <img src={rajdeepPic} alt="Rajdeep Sarkar" />
            </div>

            <div className="developer-content">
              <h5>Rajdeep Sarkar</h5>
              <p className="role">Lead Developer</p>

              <div className="contact-row">
                <i className="fa-solid fa-envelope"></i>
                <span>rajdeepsarakr9117@email.com</span>
              </div>

              <div className="contact-row">
                <i className="fa-solid fa-phone"></i>
                <span>+91 91262 19117</span>
              </div>
            </div>
          </div>

          <div className="developer-profile">
            <div className="developer-avatar-modal">
              <img src={jineaPic} alt="Jinea Saha" />
            </div>

            <div className="developer-content">
              <h5>Jinea Saha</h5>
              <p className="role">Lead Developer</p>

              <div className="contact-row">
                <i className="fa-solid fa-envelope"></i>
                <span>jinea05saha@email.com</span>
              </div>

              <div className="contact-row">
                <i className="fa-solid fa-phone"></i>
                <span>+91 94334 74334</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
