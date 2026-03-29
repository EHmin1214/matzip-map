// src/components/BottomTabBar.jsx

const FONT_LABEL = "'Manrope', -apple-system, sans-serif";

const TABS = [
  { id: "map",     icon: "🗺️",  label: "지도" },
  { id: "search",  icon: "🔍",  label: "검색" },
  { id: "feed",    icon: "📰",  label: "피드" },
  { id: "follow",  icon: "👥",  label: "팔로우" },
  { id: "notify",  icon: "🔔",  label: "알림" },
  { id: "profile", icon: "👤",  label: "프로필" },
];

export default function BottomTabBar({ activeTab, onTabChange, unreadCount = 0 }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: 64,
        background: "rgba(250,249,246,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(101,93,84,0.1)",
        boxShadow: "0 -4px 24px rgba(47,52,48,0.05)",
        display: "flex",
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                border: "none", background: "none",
                cursor: "pointer", padding: "6px 0",
                position: "relative",
                WebkitTapHighlightColor: "transparent",
                transition: "opacity 0.15s",
              }}
            >
              {/* 활성 표시 — 상단 라인 */}
              {isActive && (
                <div style={{
                  position: "absolute", top: 0, left: "50%",
                  transform: "translateX(-50%)",
                  width: 20, height: 2,
                  background: "#655d54",
                  borderRadius: "0 0 2px 2px",
                }} />
              )}

              {/* 아이콘 */}
              <span style={{
                fontSize: 18,
                opacity: isActive ? 1 : 0.4,
                transition: "opacity 0.2s",
              }}>
                {tab.icon}
              </span>

              {/* 라벨 */}
              <span style={{
                fontFamily: FONT_LABEL,
                fontSize: 9,
                fontWeight: isActive ? 700 : 400,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: isActive ? "#655d54" : "#777c77",
                marginTop: 2,
                transition: "color 0.2s, font-weight 0.2s",
              }}>
                {tab.label}
              </span>

              {/* 알림 배지 */}
              {tab.id === "notify" && unreadCount > 0 && (
                <div style={{
                  position: "absolute", top: 6, right: "calc(50% - 16px)",
                  background: "#9e422c",
                  color: "white", borderRadius: 999,
                  width: 14, height: 14,
                  fontFamily: FONT_LABEL, fontSize: 8, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1.5px solid #faf9f6",
                }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
