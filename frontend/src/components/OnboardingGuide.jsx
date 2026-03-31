// src/components/OnboardingGuide.jsx
// 첫 사용자 온보딩 — 장소가 0개일 때 3단계 가이드
import { useState, useEffect } from "react";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54", primaryDim: "#595149",
  bg: "#faf9f6", container: "#edeeea",
  containerLowest: "#ffffff", onSurface: "#2f3430",
  outlineVariant: "#8a8e8a", primaryContainer: "#ede0d5",
};

const STEPS = [
  {
    icon: "bookmark_add",
    title: "좋아하는 장소를 저장하세요",
    desc: "맛집, 카페, 여행지 — 흩어진 장소들을 한 곳에 모아 나만의 지도를 만들어요.",
  },
  {
    icon: "group",
    title: "친구의 공간도 구경해요",
    desc: "팔로우하면 친구의 장소가 내 지도에 함께 표시돼요. 서로의 취향을 공유해보세요.",
  },
  {
    icon: "share",
    title: "링크 하나로 공유하세요",
    desc: "내 프로필 링크를 인스타 바이오나 카카오톡에 걸면 누구나 내 지도를 볼 수 있어요.",
  },
];

export default function OnboardingGuide({ onStart, onDismiss }) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const mobile = window.innerWidth <= 768;

  useEffect(() => {
    if (closing) {
      const t = setTimeout(() => onStart(), 300);
      return () => clearTimeout(t);
    }
  }, [closing]); // eslint-disable-line

  const handleStart = () => { setClosing(true); };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(47,52,48,0.4)", backdropFilter: "blur(6px)",
      opacity: closing ? 0 : 1, transition: "opacity 0.3s ease",
    }}>
      <div style={{
        width: mobile ? "calc(100% - 40px)" : 420,
        background: C.containerLowest, borderRadius: 20,
        overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
      }}>
        {/* 상단 */}
        <div key={step} style={{
          animation: "fadeUp 0.25s ease-out",
          padding: "36px 32px 28px",
          background: `linear-gradient(135deg, ${C.primaryDim}18, ${C.primary}10)`,
          textAlign: "center",
        }}>
          {step === 0 && (
            <img src="/logo.svg" alt="" style={{ width: 48, height: 48, marginBottom: 12 }} />
          )}
          {step !== 0 && (
            <span className="material-symbols-outlined" style={{
              fontSize: 48, color: C.primary, marginBottom: 16, display: "block",
              fontVariationSettings: "'FILL' 0, 'wght' 300",
            }}>
              {STEPS[step].icon}
            </span>
          )}
          <h2 style={{
            fontFamily: FH, fontSize: mobile ? 22 : 24, fontWeight: 400,
            color: C.onSurface, margin: "0 0 10px", letterSpacing: "-0.02em",
          }}>
            {STEPS[step].title}
          </h2>
          <p style={{
            fontFamily: FH, fontStyle: "italic", fontSize: 14,
            color: C.outlineVariant, lineHeight: 1.6, margin: 0,
          }}>
            {STEPS[step].desc}
          </p>
        </div>

        {/* 하단 */}
        <div style={{ padding: "20px 32px 28px" }}>
          {/* 인디케이터 */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                background: i === step ? C.primary : C.container,
                transition: "all 0.2s",
              }} />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onDismiss} style={{
                flex: 1, padding: "14px", border: "none", borderRadius: 10,
                background: C.container, fontFamily: FL, fontSize: 13,
                fontWeight: 600, color: C.outlineVariant, cursor: "pointer",
              }}>
                건너뛰기
              </button>
              <button onClick={() => setStep(step + 1)} style={{
                flex: 2, padding: "14px", border: "none", borderRadius: 10,
                background: C.primary, fontFamily: FL, fontSize: 13,
                fontWeight: 700, color: "#fff6ef", cursor: "pointer",
              }}>
                다음
              </button>
            </div>
          ) : (
            <button onClick={handleStart} style={{
              width: "100%", padding: "14px", border: "none", borderRadius: 10,
              background: C.primary, fontFamily: FL, fontSize: 14,
              fontWeight: 700, color: "#fff6ef", cursor: "pointer",
            }}>
              첫 장소 검색하러 가기 →
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
