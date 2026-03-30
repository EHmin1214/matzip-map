// src/components/BottomTabBar.jsx
const FL = "'Manrope', -apple-system, sans-serif";

// 5개 탭 — 알림+피드 → updates 하나로
const TABS = [
  { id: "map",     icon: "map",           label: "지도" },
  { id: "search",  icon: "search",        label: "검색" },
  { id: "follow",  icon: "group",         label: "팔로우" },
  { id: "updates", icon: "auto_stories",  label: "업데이트" },
  { id: "profile", icon: "person_pin",    label: "프로필" },
];

export default function BottomTabBar({ activeTab, onTabChange, unreadCount = 0 }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(250,249,246,0.90)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(101,93,84,0.07)",
      boxShadow: "0 -8px 32px rgba(47,52,48,0.05)",
      borderRadius: "20px 20px 0 0",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      paddingTop: 6,
      paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      zIndex: 50,
    }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasUnread = tab.id === "updates" && unreadCount > 0;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              border: "none", background: "none",
              padding: "5px 2px", cursor: "pointer",
              position: "relative", color: isActive ? "#655d54" : "rgba(47,52,48,0.35)",
              transition: "color 0.2s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* 알림 배지 */}
            {hasUnread && (
              <div style={{
                position: "absolute", top: 2, right: "calc(50% - 20px)",
                width: 7, height: 7, borderRadius: "50%",
                background: "#9e422c", border: "1.5px solid rgba(250,249,246,0.9)",
              }} />
            )}

            {/* 아이콘 */}
            <span className="material-symbols-outlined" style={{
              fontSize: 22, marginBottom: 2,
              fontVariationSettings: isActive
                ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
            }}>
              {tab.icon}
            </span>

            {/* 라벨 */}
            <span style={{
              fontFamily: FL, fontSize: 9,
              fontWeight: isActive ? 700 : 400,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
