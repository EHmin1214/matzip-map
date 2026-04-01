// src/components/NewsTab.jsx
// 모바일 전용 — 피드 + 알림을 하나의 탭으로 합침
import { useState } from "react";
import FeedTab from "./FeedTab";
import NotificationTab from "./NotificationTab";

const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54",
  bg: "#faf9f6",
  outlineVariant: "#8a8e8a",
};

export default function NewsTab({
  personalPlaces,
  onPlaceClick,
  onDataChange,
  onNavigate,
  onUnreadChange,
  onNotificationPlaceClick,
}) {
  const [subTab, setSubTab] = useState("feed"); // "feed" | "notifications"

  return (
    <div style={{ background: C.bg, minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* 상단 세그먼트 토글 */}
      <div style={{
        display: "flex", gap: 0,
        padding: "14px 16px 0",
        background: C.bg,
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{
          display: "flex", gap: 0, width: "100%",
          background: "rgba(237,238,234,0.6)",
          borderRadius: 10, padding: 3,
        }}>
          {[
            { key: "feed", label: "피드" },
            { key: "notifications", label: "알림" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              style={{
                flex: 1, padding: "8px 0",
                background: subTab === t.key ? "#ffffff" : "transparent",
                border: "none", borderRadius: 8,
                fontFamily: FL, fontSize: 13, fontWeight: subTab === t.key ? 700 : 500,
                color: subTab === t.key ? C.primary : C.outlineVariant,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: subTab === t.key ? "0 1px 4px rgba(47,52,48,0.08)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {subTab === "feed" ? (
          <FeedTab
            personalPlaces={personalPlaces}
            onPlaceClick={onPlaceClick}
            onDataChange={onDataChange}
            onNavigate={onNavigate}
          />
        ) : (
          <NotificationTab
            onUnreadChange={onUnreadChange}
            onPlaceClick={onNotificationPlaceClick}
          />
        )}
      </div>
    </div>
  );
}
