// src/components/OnboardingGuide.jsx
// 온보딩 가이드 — 4단계 (장소 저장 → 친구 → 우리의 공간 → 베스트)
import { useState, useEffect } from "react";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54", primaryDim: "#595149",
  bg: "#faf9f6", container: "#edeeea",
  containerLowest: "#ffffff", onSurface: "#2f3430",
  outlineVariant: "#8a8e8a", variant: "#5c605c",
};

const STEPS = [
  {
    icon: "bookmark_add",
    iconBg: "#f0efec",
    iconColor: "#655d54",
    title: "좋아하는 장소를\n저장하세요",
    desc: (
      <>
        내가 발견한 맛집, 카페, 가게를{"\n"}
        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, background: "#fef3e0", color: "#BA7517", fontWeight: 700, fontSize: 12 }}>가고 싶어요</span>{" "}
        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, background: "#e6f5ee", color: "#1D9E75", fontWeight: 700, fontSize: 12 }}>가봤어요</span>{" "}
        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, background: "#fce4ec", color: "#D4537E", fontWeight: 700, fontSize: 12 }}>또 가고 싶어요</span>{"\n"}
        상태로 기록하고 나만의 지도를 만들어보세요.
      </>
    ),
  },
  {
    icon: "group",
    iconBg: "#eef0f8",
    iconColor: "#5c6bc0",
    title: "친구의 공간도\n구경해요",
    desc: "친구를 팔로우하면 지도 위에서 서로의 장소를 함께 볼 수 있어요. 링크 하나로 내 지도를 공유해보세요.",
  },
  {
    icon: "public",
    iconBg: "#fef3e0",
    iconColor: "#e6a817",
    title: "우리의 공간을\n탐험하세요",
    desc: "우리의 공간은 모든 유저가 엄선한 베스트 장소가 모인 공유 지도예요. 지도 상단에서 모드를 전환할 수 있어요.",
    tip: {
      label: "어떻게 보나요?",
      text: <>사이드바 또는 상단의 <b>"우리의 공간"</b>을 누르면 전체 유저의 베스트 장소가 카테고리별로 나타나요.</>,
    },
  },
  {
    icon: "trophy",
    iconBg: "#fce4ec",
    iconColor: "#D4537E",
    title: "나만의 베스트를\n등록하세요",
    desc: (<>음식점, 카페, 바, 잡화점 — 각 카테고리에 <b>딱 5곳</b>만 등록할 수 있어요.</>),
    tip: {
      label: "왜 5곳만?",
      text: "수백 곳 중에서 진짜 최고만 고르는 거예요. 제한이 있으니까 한 자리 한 자리가 의미 있고, 그래서 모두가 믿을 수 있는 추천이 됩니다.",
    },
    tip2: {
      label: "등록 방법",
      text: (<>내 장소 상세에서 <b>"베스트에 추가"</b> 버튼을 누르거나, 프로필의 <b>"나의 베스트"</b> 섹션에서 빈 슬롯을 눌러 등록하세요.</>),
    },
  },
];

export default function OnboardingGuide({ onStart, onDismiss }) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const mobile = window.innerWidth <= 768;

  useEffect(() => {
    if (closing) {
      const t = setTimeout(() => {
        if (dontShowAgain) localStorage.setItem("onboarding_dismissed", "1");
        onStart();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [closing]); // eslint-disable-line

  const handleFinish = () => { setClosing(true); };
  const handleSkip = () => {
    if (dontShowAgain) localStorage.setItem("onboarding_dismissed", "1");
    onDismiss();
  };

  const s = STEPS[step];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(47,52,48,0.4)", backdropFilter: "blur(4px)",
      opacity: closing ? 0 : 1, transition: "opacity 0.3s ease",
    }}>
      <div style={{
        width: mobile ? "calc(100% - 40px)" : 380,
        maxHeight: "85vh", overflowY: "auto",
        background: C.containerLowest, borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        {/* 슬라이드 콘텐츠 */}
        <div key={step} style={{
          animation: "fadeUp 0.25s ease-out",
          padding: "32px 28px 24px",
          textAlign: "center",
        }}>
          {/* 인디케이터 */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                background: i === step ? C.primary : C.container,
                transition: "all 0.3s",
              }} />
            ))}
          </div>

          {/* 아이콘 */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: s.iconColor }}>
              {s.icon}
            </span>
          </div>

          {/* 제목 */}
          <h2 style={{
            fontFamily: FH, fontSize: 20, fontWeight: 700,
            color: "#1c1c1e", marginBottom: 10, lineHeight: 1.4,
            whiteSpace: "pre-line",
          }}>
            {s.title}
          </h2>

          {/* 설명 */}
          <p style={{
            fontFamily: FL, fontSize: 13, color: C.variant,
            lineHeight: 1.7, margin: 0,
          }}>
            {s.desc}
          </p>

          {/* 팁 박스 */}
          {s.tip && (
            <div style={{
              background: "#f8f7f4", borderRadius: 12,
              padding: "14px 16px", marginTop: 16, textAlign: "left",
            }}>
              <span style={{
                fontFamily: FL, fontWeight: 700, fontSize: 11,
                color: C.primary, textTransform: "uppercase",
                letterSpacing: "0.1em", marginBottom: 6, display: "block",
              }}>{s.tip.label}</span>
              <p style={{ fontFamily: FL, fontSize: 12, color: C.primary, lineHeight: 1.6, margin: 0 }}>
                {s.tip.text}
              </p>
            </div>
          )}
          {s.tip2 && (
            <div style={{
              background: "#f8f7f4", borderRadius: 12,
              padding: "14px 16px", marginTop: 10, textAlign: "left",
            }}>
              <span style={{
                fontFamily: FL, fontWeight: 700, fontSize: 11,
                color: C.primary, textTransform: "uppercase",
                letterSpacing: "0.1em", marginBottom: 6, display: "block",
              }}>{s.tip2.label}</span>
              <p style={{ fontFamily: FL, fontSize: 12, color: C.primary, lineHeight: 1.6, margin: 0 }}>
                {s.tip2.text}
              </p>
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div style={{ padding: "0 28px 20px", display: "flex", gap: 10 }}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} style={{
              padding: "14px 18px", background: "#f4f4f0", color: C.primary,
              border: "none", borderRadius: 12, fontFamily: FL, fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}>이전</button>
          ) : (
            <button onClick={handleSkip} style={{
              padding: "14px 18px", background: "#f4f4f0", color: C.outlineVariant,
              border: "none", borderRadius: 12, fontFamily: FL, fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}>건너뛰기</button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} style={{
              flex: 1, padding: "14px", background: C.primary, color: "#fff6ef",
              border: "none", borderRadius: 12, fontFamily: FL, fontSize: 14,
              fontWeight: 700, cursor: "pointer",
            }}>다음</button>
          ) : (
            <button onClick={handleFinish} style={{
              flex: 1, padding: "14px", background: C.primary, color: "#fff6ef",
              border: "none", borderRadius: 12, fontFamily: FL, fontSize: 14,
              fontWeight: 700, cursor: "pointer",
            }}>시작하기</button>
          )}
        </div>

        {/* 다시 보지 않기 */}
        <div style={{
          padding: "8px 28px 24px", display: "flex",
          alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <input
            type="checkbox" id="onb-noshow"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            style={{ accentColor: C.primary }}
          />
          <label htmlFor="onb-noshow" style={{
            fontFamily: FL, fontSize: 11, color: C.outlineVariant, cursor: "pointer",
          }}>다시 보지 않기</label>
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
