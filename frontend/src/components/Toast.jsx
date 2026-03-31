// src/components/Toast.jsx
import { useEffect, useState } from "react";

const FL = "'Manrope', -apple-system, sans-serif";

export default function Toast({ message, onClose }) {
  const [visible, setVisible] = useState(false);
  const mobile = window.innerWidth <= 768;

  useEffect(() => {
    if (!message) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(), 200);
    }, 2000);
    return () => clearTimeout(t);
  }, [message]); // eslint-disable-line

  if (!message) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: mobile ? 80 : 32,
      left: "50%",
      transform: `translateX(-50%) translateY(${visible ? "0" : "8px"})`,
      opacity: visible ? 1 : 0,
      transition: "opacity 0.2s ease, transform 0.25s ease-out",
      background: "#655d54",
      color: "#fff6ef",
      padding: "10px 20px",
      borderRadius: 999,
      fontFamily: FL,
      fontSize: 13,
      fontWeight: 600,
      boxShadow: "0 4px 16px rgba(47,52,48,0.15)",
      zIndex: 9000,
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      {message}
    </div>
  );
}
