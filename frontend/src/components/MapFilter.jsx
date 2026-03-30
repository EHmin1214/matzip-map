// src/components/MapFilter.jsx
// 디자인: map.html 중앙 필터 바 — glass pill, 심플함
import { useState, useRef } from "react";

const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary:    "#655d54",
  primaryContainer: "#ede0d5",
  bg:         "#faf9f6",
  container:  "#edeeea",
};

const STATUS_FILTERS = [
  { value: null,              emoji: "🗺️", label: "전체" },
  { value: "want_to_go",      emoji: "🔖", label: "가고싶어요" },
  { value: "visited",         emoji: "✅", label: "가봤어요" },
  { value: "want_revisit",    emoji: "❤️", label: "또가고싶어요" },
  { value: "not_recommended", emoji: "👎", label: "별로" },
];

const FOLLOWING_COLORS = ["#3B8BD4","#1D9E75","#BA7517","#7F77DD","#D4537E","#0F6E56"];
const getColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

const isMobile = () => window.innerWidth <= 768;

export default function MapFilter({
  activeFilter, onFilterChange, sidebarWidth = 0,
  followingList = [], selectedFollowingIds = [], onToggleFollowing,
  showPersonal, onTogglePersonal,
  onReorderFollowing,
}) {
  const mobile = isMobile();

  // 드래그 순서변경
  const [orderedFollowing, setOrderedFollowing] = useState(followingList);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const longPressTimer = useRef(null);

  // followingList sync
  const followIds = followingList.map((f) => f.id).join(",");
  const orderedIds = orderedFollowing.map((f) => f.id).join(",");
  if (followIds !== orderedIds) {
    const existingIds = new Set(orderedFollowing.map((f) => f.id));
    const newOnes = followingList.filter((f) => !existingIds.has(f.id));
    const filtered = orderedFollowing.filter((f) => followingList.some((fl) => fl.id === f.id));
    if (newOnes.length > 0 || filtered.length !== orderedFollowing.length) {
      setOrderedFollowing([...filtered, ...newOnes]);
    }
  }

  const handleLongPressStart = (id) => {
    longPressTimer.current = setTimeout(() => {
      setDraggingId(id);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 400);
  };
  const handleLongPressEnd = () => clearTimeout(longPressTimer.current);

  const handleDrop = (targetId) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    const next = [...orderedFollowing];
    const from = next.findIndex((f) => f.id === draggingId);
    const to = next.findIndex((f) => f.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrderedFollowing(next);
    if (onReorderFollowing) onReorderFollowing(next);
    setDraggingId(null); setDragOverId(null);
  };

  const hasFollowing = orderedFollowing.length > 0;

  return (
    <div style={{
      position: "fixed",
      top: 16,
      left: mobile ? 8 : sidebarWidth + 16,
      right: mobile ? 56 : 64,
      zIndex: 25,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
    }}>
      {/* 상태 필터 필 — map.html 스타일 */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        pointerEvents: "auto",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 2,
          background: "rgba(250,249,246,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: "5px 6px",
          borderRadius: 999,
          boxShadow: "0 4px 20px rgba(101,93,84,0.10)",
          border: "1px solid rgba(101,93,84,0.08)",
          overflowX: "auto",
          msOverflowStyle: "none", scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          maxWidth: "calc(100vw - 80px)",
        }}>
          {STATUS_FILTERS.map((f) => {
            const isActive = activeFilter === f.value;
            return (
              <button
                key={String(f.value)}
                onClick={() => onFilterChange(isActive ? null : f.value)}
                style={{
                  display: "flex", alignItems: "center", gap: mobile ? 3 : 5,
                  padding: mobile ? "5px 8px" : "5px 12px",
                  border: "none", borderRadius: 999,
                  background: isActive ? C.primaryContainer : "transparent",
                  color: isActive ? C.primary : "#78716c",
                  fontFamily: FL, fontSize: 11, fontWeight: isActive ? 700 : 500,
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.15s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span style={{ fontSize: 12 }}>{f.emoji}</span>
                {/* 모바일에서는 전체만 텍스트, 나머지는 이모지만 */}
                {(!mobile || f.value === null) && (
                  <span>{f.label}</span>
                )}
              </button>
            );
          })}

          {/* 구분선 */}
          {(hasFollowing) && (
            <div style={{ width: 1, height: 16, background: "rgba(101,93,84,0.15)", margin: "0 4px", flexShrink: 0 }} />
          )}

          {/* 내 맛집 토글 */}
          <button
            onClick={onTogglePersonal}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", border: "none", borderRadius: 999,
              background: showPersonal ? C.primaryContainer : "transparent",
              color: showPersonal ? C.primary : "#a8a29e",
              fontFamily: FL, fontSize: 11, fontWeight: showPersonal ? 700 : 500,
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              transition: "all 0.15s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{ fontSize: 10 }}>{showPersonal ? "●" : "○"}</span>
            {!mobile && "내 맛집"}
          </button>
        </div>
      </div>

      {/* 팔로잉 선택 (있을 때만) */}
      {hasFollowing && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          pointerEvents: "auto",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "rgba(250,249,246,0.90)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            padding: "4px 6px",
            borderRadius: 999,
            boxShadow: "0 2px 12px rgba(101,93,84,0.08)",
            border: "1px solid rgba(101,93,84,0.06)",
            overflowX: "auto",
            msOverflowStyle: "none", scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            maxWidth: "calc(100vw - 80px)",
          }}>
            {orderedFollowing.map((f) => {
              const color = getColor(orderedFollowing.findIndex((x) => x.id === f.id));
              const isSelected = selectedFollowingIds.includes(f.id);
              const isDragging = draggingId === f.id;
              const isOver = dragOverId === f.id;

              return (
                <button
                  key={f.id}
                  data-following-id={f.id}
                  onClick={() => !draggingId && onToggleFollowing(f.id)}
                  onMouseDown={() => handleLongPressStart(f.id)}
                  onMouseUp={() => { handleLongPressEnd(); if (draggingId) handleDrop(f.id); }}
                  onMouseLeave={handleLongPressEnd}
                  onMouseEnter={() => { if (draggingId) setDragOverId(f.id); }}
                  onTouchStart={() => handleLongPressStart(f.id)}
                  onTouchEnd={() => { handleLongPressEnd(); if (draggingId && dragOverId) handleDrop(dragOverId); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 9px 4px 4px",
                    border: "none", borderRadius: 999,
                    background: isSelected ? color : "transparent",
                    color: isSelected ? "white" : "#78716c",
                    fontFamily: FL, fontSize: 11, fontWeight: isSelected ? 600 : 400,
                    cursor: isDragging ? "grabbing" : "pointer",
                    whiteSpace: "nowrap", flexShrink: 0,
                    opacity: isDragging ? 0.4 : 1,
                    transform: isOver && !isDragging ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.1s",
                    WebkitTapHighlightColor: "transparent",
                    userSelect: "none",
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: isSelected ? "rgba(255,255,255,0.25)" : color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, color: "white", fontWeight: 800, flexShrink: 0,
                    fontFamily: FL,
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
