// src/components/OnboardingGuide.jsx
// 첫 사용자 온보딩 — 장소가 0개일 때 3단계 가이드
import { useState } from "react";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54", primaryDim: "#595149",
  bg: "#faf9f6", container: "#edeeea",
  containerLowest: "#ffffff", onSurface: "#2f3430",
  outlineVariant: "#afb3ae", primaryContainer: "#ede0d5",
};

const STEPS = [
  {
    icon: "search",
    title: "장소를 검색하세요",
    desc: "가게 이름으로 검색하면 위치와 정보를 자동으로 불러와요.",
  },
  {
    icon: "bookmark_add",
    title: "나만의 기록을 남기세요",
    desc: "가고 싶은 곳, 가본 곳, 또 가고 싶은 곳으로 분류하고 별점과 메모를 남겨요.",
  },
  {
    icon: "map",
    title: "지도에서 한눈에 보세요",
    desc: "저장한 모든 장소가 지도에 표시돼요. 친구를 팔로우하면 그 친구의 장소도 함께!",
  },
];

export default function OnboardingGuide({ onStart, onDismiss }) {
  const [step, setStep] = useState(0);
  const mobile = window.innerWidth <= 768;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(47,52,48,0.4)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        width: mobile ? "calc(100% - 40px)" : 420,
        background: C.containerLowest, borderRadius: 20,
        overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
      }}>
        {/* 상단 그라데이션 */}
        <div style={{
          padding: "36px 32px 28px",
          background: `linear-gradient(135deg, ${C.primaryDim}18, ${C.primary}10)`,
          textAlign: "center",
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: 48, color: C.primary, marginBottom: 16, display: "block",
            fontVariationSettings: "'FILL' 0, 'wght' 200",
          }}>
            {STEPS[step].icon}
          </span>
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
            <button onClick={onStart} style={{
              width: "100%", padding: "14px", border: "none", borderRadius: 10,
              background: C.primary, fontFamily: FL, fontSize: 13,
              fontWeight: 700, color: "#fff6ef", cursor: "pointer",
            }}>
              첫 장소 검색하러 가기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
