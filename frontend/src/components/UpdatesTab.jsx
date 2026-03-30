// src/components/UpdatesTab.jsx
// 피드 + 알림 합친 탭 — 서브탭으로 전환
import { useState } from "react";
import ActivityFeed from "./ActivityFeed";
import NotificationTab from "./NotificationTab";

const FL = "'Manrope', -apple-system, sans-serif";
const FH = "'Noto Serif', Georgia, serif";
const C = { primary: "#655d54", primaryContainer: "#ede0d5", bg: "#faf9f6", container: "#edeeea" };

const isMobile = () => window.innerWidth <= 768;

export default function UpdatesTab({ onPlaceClick, onUnreadChange, unreadCount = 0 }) {
  const mobile = isMobile();
  const [sub, setSub] = useState("feed"); // "feed" | "notify"

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      minHeight: "100vh", background: C.bg,
      paddingBottom: mobile ? 64 : 0,
    }}>
      {/* 헤더 + 서브탭 */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(250,249,246,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.container}`,
        padding: mobile ? "16px 20px 0" : "20px 40px 0",
      }}>
        {/* 에디토리얼 헤더 */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "baseline", marginBottom: 16,
          flexWrap: "wrap", gap: 8,
        }}>
          <h2 style={{
            fontFamily: FH, fontSize: mobile ? 28 : 36,
            fontWeight: 400, color: "#2f3430",
            margin: 0, letterSpacing: "-0.02em",
          }}>
            Updates
          </h2>
          <span style={{
            fontFamily: FL, fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.2em",
            color: "#a8a29e",
          }}>
            {new Date().toLocaleDateString("ko-KR")}
          </span>
        </div>

        {/* 서브탭 바 */}
        <div style={{ display: "flex", gap: 0 }}>
          {[
            { id: "feed",   label: "피드" },
            { id: "notify", label: "알림", badge: unreadCount },
          ].map((t) => {
            const isActive = sub === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSub(t.id)}
                style={{
                  padding: "10px 20px",
                  border: "none", background: "none",
                  fontFamily: FL, fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.primary : "#a8a29e",
                  cursor: "pointer",
                  borderBottom: `2px solid ${isActive ? C.primary : "transparent"}`,
                  transition: "all 0.15s",
                  position: "relative",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {t.label}
                {t.badge > 0 && (
                  <span style={{
                    marginLeft: 6,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 16, height: 16, borderRadius: "50%",
                    background: "#9e422c", color: "white",
                    fontFamily: FL, fontSize: 9, fontWeight: 700,
                    verticalAlign: "middle",
                  }}>
                    {t.badge > 9 ? "9+" : t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {sub === "feed" ? (
          <ActivityFeed onPlaceClick={onPlaceClick} noHeader />
        ) : (
          <NotificationTab onUnreadChange={onUnreadChange} noHeader />
        )}
      </div>
    </div>
  );
}
