// src/components/RefreshButton.jsx
import { useState } from "react";

export default function RefreshButton({ onRefresh, sidebarWidth = 0 }) {
  const [spinning, setSpinning] = useState(false);
  const isMobile = window.innerWidth <= 768;

  const handleRefresh = async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setSpinning(false), 600);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      title="새로고침"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 26,
        width: 40, height: 40,
        borderRadius: "50%",
        background: "white",
        border: "none",
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        cursor: spinning ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
        WebkitTapHighlightColor: "transparent",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { if (!spinning) e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.15)"; }}
    >
      <span style={{
        display: "inline-block",
        animation: spinning ? "spin 0.6s linear" : "none",
        fontSize: 18,
      }}>🔄</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
