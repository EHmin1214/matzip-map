// src/components/BottomTabBar.jsx
const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";

const TABS = [
  { id: "map",     icon: "map",           label: "홈" },
  { id: "search",  icon: "search",        label: "검색" },
  { id: "feed",          icon: "auto_stories",  label: "피드" },
  { id: "notifications", icon: "notifications", label: "알림" },
  { id: "profile", icon: null,            label: "프로필" },
];

export default function BottomTabBar({ activeTab, onTabChange, unreadCount = 0, userNickname }) {
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
        const hasUnread = tab.id === "notifications" && unreadCount > 0;
        const isProfile = tab.id === "profile";
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
            {hasUnread && (
              <div style={{
                position: "absolute", top: 2, right: "calc(50% - 20px)",
                width: 7, height: 7, borderRadius: "50%",
                background: "#9e422c", border: "1.5px solid rgba(250,249,246,0.9)",
              }} />
            )}

            {isProfile && !userNickname ? (
              <span className="material-symbols-outlined" style={{
                fontSize: 22, marginBottom: 2,
                fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
              }}>
                login
              </span>
            ) : isProfile ? (
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: isActive
                  ? "linear-gradient(135deg, #595149, #655d54)"
                  : "rgba(47,52,48,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FH, fontStyle: "italic",
                fontSize: 11, color: isActive ? "#fff6ef" : "rgba(47,52,48,0.45)",
                fontWeight: 700, marginBottom: 2,
                border: isActive ? "2px solid #655d54" : "2px solid transparent",
                transition: "all 0.2s",
              }}>
                {userNickname?.[0]?.toUpperCase()}
              </div>
            ) : (
              <span className="material-symbols-outlined" style={{
                fontSize: 22, marginBottom: 2,
                fontVariationSettings: isActive
                  ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                  : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
              }}>
                {tab.icon}
              </span>
            )}

            <span style={{
              fontFamily: FL, fontSize: 9,
              fontWeight: isActive ? 700 : 400,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              {isProfile && !userNickname ? "로그인" : tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
