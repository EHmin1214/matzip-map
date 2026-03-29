// src/components/AuthScreen.jsx
import { useState } from "react";
import { useUser } from "../context/UserContext";

export default function AuthScreen() {
  const { login, register } = useUser();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (nickname.trim().length < 2) {
      setError("닉네임은 2자 이상이어야 해요");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN은 숫자 4자리여야 해요");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(nickname.trim(), pin);
      } else {
        await register(nickname.trim(), pin);
      }
    } catch (e) {
      const msg = e.response?.data?.detail;
      if (msg) setError(msg);
      else setError("다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(135deg, #fff5f3 0%, #fff 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 24,
    }}>
      <div style={{
        background: "white", borderRadius: 20,
        padding: "40px 32px", width: "100%", maxWidth: 360,
        boxShadow: "0 8px 40px rgba(232,89,60,0.12)",
      }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8593C", margin: 0 }}>
            맛집 지도
          </h1>
          <p style={{ fontSize: 13, color: "#999", marginTop: 6 }}>
            내가 신뢰하는 사람의 맛집을 지도로
          </p>
        </div>

        {/* 탭 */}
        <div style={{
          display: "flex", background: "#f5f5f5",
          borderRadius: 10, padding: 4, marginBottom: 24,
        }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1, padding: "8px 0", border: "none", cursor: "pointer",
                borderRadius: 8, fontSize: 14, fontWeight: 600, transition: "all 0.2s",
                background: mode === m ? "white" : "transparent",
                color: mode === m ? "#E8593C" : "#999",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}>
              {m === "login" ? "로그인" : "시작하기"}
            </button>
          ))}
        </div>

        {/* 닉네임 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>
            닉네임
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="2자 이상"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "12px 14px", border: "1.5px solid #eee",
              borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#E8593C"}
            onBlur={(e) => e.target.style.borderColor = "#eee"}
          />
        </div>

        {/* PIN */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>
            PIN 번호
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="숫자 4자리"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "12px 14px", border: "1.5px solid #eee",
              borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box",
              letterSpacing: 8, textAlign: "center",
            }}
            onFocus={(e) => e.target.style.borderColor = "#E8593C"}
            onBlur={(e) => e.target.style.borderColor = "#eee"}
          />
        </div>

        {/* 에러 */}
        {error && (
          <p style={{ color: "#E8593C", fontSize: 13, textAlign: "center", marginBottom: 16, margin: "-8px 0 16px" }}>
            {error}
          </p>
        )}

        {/* 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "14px 0",
            background: loading ? "#ccc" : "#E8593C",
            color: "white", border: "none", borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "시작하기"}
        </button>

        {mode === "login" && (
          <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 16 }}>
            처음이라면 '시작하기'를 눌러주세요
          </p>
        )}
      </div>
    </div>
  );
}
