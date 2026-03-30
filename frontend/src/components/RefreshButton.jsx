// src/components/RefreshButton.jsx
// 디자인: map.html 우측 컨트롤 — 깔끔한 원형 버튼
import { useState } from "react";

export default function RefreshButton({ onRefresh }) {
  const [spinning, setSpinning] = useState(false);

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
          position: "fixed",
          top: 16, right: 16,
          zIndex: 26,
          width: 40, height: 40,
          borderRadius: "50%",
          background: "rgba(250,249,246,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "none",
          boxShadow: "0 4px 20px rgba(101,93,84,0.12)",
          cursor: spinning ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#655d54",
          WebkitTapHighlightColor: "transparent",
          transition: "box-shadow 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 24px rgba(101,93,84,0.18)"}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 4px 20px rgba(101,93,84,0.12)"}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 18,
            animation: spinning ? "spin 0.6s linear" : "none",
            display: "inline-block",
          }}
        >
          refresh
        </span>
      </button>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
