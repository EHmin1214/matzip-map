// src/components/BottomTabBar.jsx
// 디자인: desktopsearch.html 모바일 하단 네비게이션

const FL = "'Manrope', -apple-system, sans-serif";

const TABS = [
  { id: "map",     icon: "map",           label: "지도" },
  { id: "search",  icon: "search",        label: "검색" },
  { id: "feed",    icon: "auto_stories",  label: "피드" },
  { id: "follow",  icon: "group",         label: "팔로우" },
  { id: "notify",  icon: "notifications", label: "알림" },
  { id: "profile", icon: "person_pin",    label: "프로필" },
];

export default function BottomTabBar({ activeTab, onTabChange, unreadCount = 0 }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(250,249,246,0.88)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(101,93,84,0.08)",
      boxShadow: "0 -10px 40px rgba(101,93,84,0.06)",
      borderRadius: "24px 24px 0 0",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      paddingTop: 8, paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      zIndex: 50,
    }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasUnread = tab.id === "notify" && unreadCount > 0;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              border: "none", background: "none",
              padding: "6px 4px", cursor: "pointer",
              position: "relative",
              color: isActive ? "#655d54" : "rgba(47,52,48,0.4)",
              transition: "all 0.2s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* 배지 */}
            {hasUnread && (
              <div style={{
                position: "absolute", top: 2, right: "calc(50% - 18px)",
                width: 7, height: 7, borderRadius: "50%",
                background: "#9e422c",
                border: "1.5px solid rgba(250,249,246,0.9)",
              }} />
            )}

            {/* 아이콘 */}
            <span className="material-symbols-outlined" style={{
              fontSize: 22,
              fontVariationSettings: isActive
                ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
              marginBottom: 3,
            }}>
              {tab.icon}
            </span>

            {/* 라벨 */}
            <span style={{
              fontFamily: FL, fontSize: 9, fontWeight: isActive ? 600 : 400,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
