// src/components/RefreshButton.jsx
import { useState } from "react";

const isMobile = () => window.innerWidth <= 768;

export default function RefreshButton({ onRefresh }) {
  const [spinning, setSpinning] = useState(false);
  const mobile = isMobile();

  const handleRefresh = async () => {
    if (spinning) return;
    setSpinning(true);
    try { await onRefresh(); }
    finally { setTimeout(() => setSpinning(false), 600); }
  };

  return (
    <>
      <button
        onClick={handleRefresh}
        title="새로고침"
        style={{
          position: "absolute",
          top: 14, right: 14,
          zIndex: 26,
          width: 38, height: 38,
          borderRadius: "50%",
          background: "rgba(250,249,246,0.94)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "none",
          boxShadow: "0 2px 16px rgba(101,93,84,0.10)",
          cursor: spinning ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#655d54",
          WebkitTapHighlightColor: "transparent",
          transition: "box-shadow 0.15s, opacity 0.15s",
          opacity: spinning ? 0.6 : 1,
        }}
        onMouseEnter={(e) => !spinning && (e.currentTarget.style.boxShadow = "0 4px 20px rgba(101,93,84,0.16)")}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 16px rgba(101,93,84,0.10)"}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 17,
            display: "inline-block",
            animation: spinning ? "spin 0.6s linear" : "none",
          }}
        >
          refresh
        </span>
      </button>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
