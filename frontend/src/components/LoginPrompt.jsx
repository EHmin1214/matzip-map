// src/components/LoginPrompt.jsx
// 비로그인 사용자가 기능 사용 시 표시되는 로그인 유도 모달
import AuthScreen from "./AuthScreen";

const FL = "'Manrope', -apple-system, sans-serif";

export default function LoginPrompt({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(47,52,48,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(420px, 92vw)",
          maxHeight: "90vh",
          background: "#faf9f6",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            width: 32, height: 32, borderRadius: "50%",
            border: "none", background: "rgba(0,0,0,0.06)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FL, fontSize: 16, color: "#655d54",
          }}
        >
          &times;
        </button>
        <AuthScreen embedded />
      </div>
    </div>
  );
}
