// src/components/AuthScreen.jsx
import { useState } from "react";
import { useUser } from "../context/UserContext";

const C = {
  primary:    "#655d54",
  primaryDim: "#595149",
  bg:         "#faf9f6",
  surface:    "#ffffff",
  container:  "#f4f4f0",
  onSurface:  "#2f3430",
  variant:    "#5c605c",
  outline:    "#8a8e8a",
  error:      "#9e422c",
};

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";

const KAKAO_KEY = process.env.REACT_APP_KAKAO_JS_KEY || "";

export default function AuthScreen({ embedded = false }) {
  const { login, register, kakaoLogin } = useUser();
  const [mode, setMode] = useState("login");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleKakaoLogin = () => {
    if (!window.Kakao) { setError("카카오 SDK 로딩 실패"); return; }
    if (!window.Kakao.isInitialized() && KAKAO_KEY) {
      window.Kakao.init(KAKAO_KEY);
    }
    if (!window.Kakao.isInitialized()) { setError("카카오 앱 키가 설정되지 않았어요"); return; }
    setLoading(true);
    window.Kakao.Auth.login({
      success: async (authObj) => {
        try {
          await kakaoLogin(authObj.access_token);
        } catch (e) {
          setError(e.response?.data?.detail || "카카오 로그인 실패");
        } finally { setLoading(false); }
      },
      fail: () => { setError("카카오 로그인이 취소됐어요"); setLoading(false); },
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (nickname.trim().length < 2) { setError("닉네임은 2자 이상이어야 해요"); return; }
    if (!/^\d{4}$/.test(pin)) { setError("PIN은 숫자 4자리여야 해요"); return; }
    setLoading(true);
    try {
      if (mode === "login") await login(nickname.trim(), pin);
      else await register(nickname.trim(), pin);
    } catch (e) {
      setError(e.response?.data?.detail || "다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      ...(embedded ? {} : { position: "fixed", inset: 0, zIndex: 1000 }),
      background: C.bg,
      display: "flex",
      fontFamily: FL,
    }}>
      {/* 왼쪽 — 비주얼 패널 (PC, 전체 화면 모드에서만) */}
      {!embedded && <div style={{
        display: "none",
        width: "50%", position: "relative", overflow: "hidden",
        background: `linear-gradient(160deg, ${C.primaryDim} 0%, ${C.primary} 60%, #877a6f 100%)`,
      }}
        className="auth-left"
      >
        {/* 패턴 오버레이 */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle at 30% 70%, rgba(255,246,239,0.08) 0%, transparent 60%),
                            radial-gradient(circle at 80% 20%, rgba(255,246,239,0.06) 0%, transparent 50%)`,
        }} />
        {/* 텍스트 */}
        <div style={{ position: "absolute", bottom: 48, left: 48, zIndex: 10 }}>
          <h1 style={{
            fontFamily: FH, fontStyle: "italic",
            fontSize: 40, fontWeight: 700, color: "#fff6ef",
            margin: "0 0 8px", letterSpacing: "-0.5px",
          }}>
            나의 공간
          </h1>
          <p style={{
            fontFamily: FL, fontSize: 11,
            textTransform: "uppercase", letterSpacing: "0.3em",
            color: "rgba(255,246,239,0.6)", margin: 0,
          }}>
            The Curated Archive
          </p>
        </div>
        {/* 장식 원 */}
        <div style={{
          position: "absolute", top: -80, right: -80,
          width: 300, height: 300, borderRadius: "50%",
          border: "1px solid rgba(255,246,239,0.1)",
        }} />
        <div style={{
          position: "absolute", top: 40, right: 40,
          width: 180, height: 180, borderRadius: "50%",
          border: "1px solid rgba(255,246,239,0.08)",
        }} />
      </div>}

      {/* 오른쪽 — 입력 패널 */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "40px 24px",
        background: C.bg,
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* 모바일 브랜드 */}
          <div style={{ marginBottom: 12 }}>
            <h1 style={{
              fontFamily: FH, fontStyle: "italic",
              fontSize: 28, fontWeight: 700, color: C.primary,
              margin: 0,
            }}>
              나의 공간
            </h1>
            <div style={{
              width: 32, height: 2,
              background: C.outline, marginTop: 12, opacity: 0.4,
            }} />
          </div>

          {/* 모드 탭 */}
          <div style={{
            display: "flex", gap: 0, marginBottom: 28,
            background: C.container, borderRadius: 10, padding: 3,
          }}>
            {[
              { key: "login", label: "로그인" },
              { key: "register", label: "회원가입" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setMode(tab.key); setError(""); }}
                style={{
                  flex: 1, padding: "10px 0",
                  background: mode === tab.key ? C.surface : "transparent",
                  border: "none", borderRadius: 8,
                  fontFamily: FL, fontSize: 13, fontWeight: mode === tab.key ? 700 : 500,
                  color: mode === tab.key ? C.onSurface : C.outline,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: mode === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 헤더 */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{
              fontFamily: FH, fontSize: 28, fontWeight: 700,
              color: C.onSurface, margin: "0 0 6px", letterSpacing: "-0.5px",
            }}>
              {mode === "login" ? "다시 오셨군요" : "처음 오셨군요"}
            </h2>
            <p style={{
              fontFamily: FL, fontSize: 13,
              color: C.variant, lineHeight: 1.6, margin: 0,
            }}>
              {mode === "login"
                ? "닉네임과 PIN으로 나의 공간을 열어보세요"
                : "닉네임과 PIN을 설정하고 나의 공간을 시작해보세요"}
            </p>
          </div>

          {/* 입력 필드 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 28 }}>
            <Field
              label="닉네임"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2자 이상 입력"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <Field
              label="PIN 번호"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="숫자 4자리"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ textAlign: "center", letterSpacing: 12, fontSize: 18 }}
            />
          </div>

          {/* 에러 */}
          {error && (
            <p style={{
              fontFamily: FL, fontSize: 12,
              color: C.error, marginBottom: 16,
              padding: "10px 14px", background: "#fef0ec",
              borderRadius: 8, margin: "0 0 20px",
            }}>
              {error}
            </p>
          )}

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "16px",
              background: loading ? C.outline : C.primary,
              color: "#fff6ef", border: "none",
              borderRadius: 12,
              fontFamily: FL, fontSize: 14, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
              transition: "background 0.2s, transform 0.1s",
              boxShadow: loading ? "none" : "0 4px 16px rgba(101,93,84,0.2)",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = C.primaryDim; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = C.primary; }}
          >
            {loading ? "처리 중..." : mode === "login" ? "시작하기" : "계정 만들기"}
          </button>

          {/* 카카오 로그인 — 현재 비활성, KAKAO_KEY 설정 시 자동 노출 */}
          {KAKAO_KEY && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
                <div style={{ flex: 1, height: 1, background: `${C.outline}33` }} />
                <span style={{ fontFamily: FL, fontSize: 11, color: C.outline }}>또는</span>
                <div style={{ flex: 1, height: 1, background: `${C.outline}33` }} />
              </div>
              <button
                onClick={handleKakaoLogin}
                disabled={loading}
                style={{
                  width: "100%", padding: "14px",
                  background: "#FEE500", color: "#191919",
                  border: "none", borderRadius: 12,
                  fontFamily: FL, fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "opacity 0.15s",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#191919" d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18l-.93 3.44c-.08.3.26.54.52.37l4.12-2.74c.21.02.43.03.65.03 4.42 0 8-2.79 8-6.28S13.42 1 9 1z"/></svg>
                카카오로 시작하기
              </button>
            </>
          )}

        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .auth-left { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, style: extraStyle = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: "block", fontFamily: FL,
        fontSize: 10, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.15em",
        color: "#5c605c", marginBottom: 8,
      }}>
        {label}
      </label>
      <input
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: "100%", padding: "14px 16px",
          background: "#f4f4f0", border: "none",
          borderRadius: 12,
          outline: focused ? `2px solid #655d54` : "2px solid transparent",
          fontFamily: FL,
          fontSize: 15, color: "#2f3430",
          boxSizing: "border-box",
          transition: "outline 0.15s",
          WebkitAppearance: "none",
          ...extraStyle,
        }}
      />
    </div>
  );
}
