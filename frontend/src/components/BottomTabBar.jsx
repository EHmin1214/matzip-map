// src/components/BottomTabBar.jsx
export default function BottomTabBar({ activeTab, onTabChange, unreadCount = 0 }) {
  const tabs = [
    { id: "map",     icon: "🗺️",  label: "지도" },
    { id: "search",  icon: "🔍",  label: "검색" },
    { id: "feed",    icon: "📰",  label: "피드" },
    { id: "follow",  icon: "👥",  label: "팔로우" },
    { id: "notify",  icon: "🔔",  label: "알림" },
    { id: "profile", icon: "👤",  label: "프로필" },
  ];

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: 60, background: "white",
      borderTop: "1px solid #f0f0f0",
      display: "flex", zIndex: 50,
      boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            border: "none", background: "none", cursor: "pointer",
            padding: "6px 0", position: "relative",
            color: activeTab === tab.id ? "#E8593C" : "#aaa",
            transition: "color 0.2s",
          }}
        >
          <span style={{ fontSize: 18 }}>{tab.icon}</span>
          <span style={{ fontSize: 9, fontWeight: activeTab === tab.id ? 700 : 400, marginTop: 1 }}>
            {tab.label}
          </span>
          {tab.id === "notify" && unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 4, right: "calc(50% - 16px)",
              background: "#E8593C", color: "white",
              borderRadius: "50%", width: 14, height: 14,
              fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {activeTab === tab.id && (
            <div style={{
              position: "absolute", bottom: 0, left: "50%",
              transform: "translateX(-50%)",
              width: 16, height: 3,
              background: "#E8593C", borderRadius: "3px 3px 0 0",
            }} />
          )}
        </button>
      ))}
    </div>
  );
}
