// src/components/MobileMapControls.jsx
// 모바일 지도탭 전용 - 팔로잉 레이어 선택 + 새로고침 버튼

export default function MobileMapControls({
  followingList = [],
  selectedFollowingIds = [],
  onToggleFollowing,
  showPersonal,
  onTogglePersonal,
  onRefresh,
  refreshing = false,
}) {
  const FOLLOWING_COLORS = ["#3B8BD4", "#1D9E75", "#BA7517", "#7F77DD", "#D4537E", "#0F6E56"];
  const getColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

  return (
    <div style={{
      position: "fixed",
      bottom: 120, // 탭바 + 여유
      left: 0, right: 0,
      zIndex: 24,
      padding: "0 12px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none", // 지도 터치 통과
    }}>
      {/* 팔로잉 + 내 맛집 레이어 선택 */}
      {(followingList.length > 0 || true) && (
        <div style={{
          pointerEvents: "auto",
          background: "rgba(255,255,255,0.95)",
          borderRadius: 16,
          padding: "10px 12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          backdropFilter: "blur(8px)",
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#888" }}>
            지도 레이어
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {/* 내 맛집 토글 */}
            <button
              onClick={onTogglePersonal}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", minHeight: 36,
                background: showPersonal ? "#E8593C" : "white",
                color: showPersonal ? "white" : "#888",
                border: `1.5px solid ${showPersonal ? "#E8593C" : "#ddd"}`,
                borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer", WebkitTapHighlightColor: "transparent",
              }}
            >
              {showPersonal ? "✓" : ""} 내 맛집
            </button>

            {/* 팔로잉 토글 */}
            {followingList.map((f, idx) => {
              const color = getColor(idx);
              const isSelected = selectedFollowingIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => onToggleFollowing(f.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", minHeight: 36,
                    background: isSelected ? color : "white",
                    color: isSelected ? "white" : "#666",
                    border: `1.5px solid ${isSelected ? color : "#ddd"}`,
                    borderRadius: 20, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", WebkitTapHighlightColor: "transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: isSelected ? "rgba(255,255,255,0.3)" : color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "white", fontWeight: 800, flexShrink: 0,
                  }}>
                    {f.nickname?.[0]?.toUpperCase()}
                  </div>
                  {f.nickname}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
