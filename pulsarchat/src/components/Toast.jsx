import styles from "../App.module.css";

export default function Toast({ message }) {
  return (
    <div className={`${styles.toast} ${message ? styles.toastShow : ""}`}>
      {message}
    </div>
  );
}
