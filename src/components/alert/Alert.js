import { useContext } from "react";
import AlertContext from "../../context/alert/AlertContext";
import "./Alert.css";

export default function Alert() {
  const { alert } = useContext(AlertContext);

  const alertType = (word) => {
    if (!word) return "";
    if (word === "danger") return "Error";
    if (word === "success") return "Success";
  };

  if (!alert) return null;

  return (
    <div className={`toast-alert toast-${alert.type}`}>
      <strong>{alertType(alert.type)} </strong> {alert.msg}
    </div>
  );
}
