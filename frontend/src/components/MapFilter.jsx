// src/components/MapFilter.jsx
// 지도 상단 필터 바 — 미니멀 텍스트 pill
import { useState, useRef } from "react";

const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary:          "#655d54",
  primaryContainer: "#ede0d5",
  bg:               "#faf9f6",
  surfaceLow:       "#f4f4f0",
  container:        "#edeeea",
  outlineVariant:   "#afb3ae",
};

const STATUS_FILTERS = [
  { value: null,              label: "전체" },
  { value: "want_to_go",      label: "가고싶어요" },
  { value: "visited",         label: "가봤어요" },
  { value: "want_revisit",    label: "또 가고싶어요" },
  { value: "not_recommended", label: "별로" },
];

const FOLLOWING_COLORS = ["#3B8BD4","#1D9E75","#BA7517","#7F77DD","#D4537E","#0F6E56"];
const getColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

const isMobile = () => window.innerWidth <= 768;

export default function MapFilter({
  activeFilter, onFilterChange, sidebarWidth = 0,
  followingList = [], selectedFollowingIds = [], onToggleFollowing,
  showPersonal, onTogglePersonal,
}) {
  const mobile = isMobile();
  const [orderedFollowing, setOrderedFollowing] = useState(followingList);
  const longPressTimer = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

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
    setDraggingId(null); setDragOverId(null);
  };

  const hasFollowing = orderedFollowing.length > 0;

  return (
    <div style={{
      position: "fixed",
      top: 14,
      left: mobile ? 8 : sidebarWidth + 14,
      right: mobile ? 52 : 60,
      zIndex: 25,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      pointerEvents: "none",
    }}>
      {/* ── 상태 필터 pill ────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "center", pointerEvents: "auto" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 2,
          background: "rgba(250,249,246,0.94)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: "4px 5px",
          borderRadius: 999,
          boxShadow: "0 4px 20px rgba(101,93,84,0.08)",
          maxWidth: "calc(100vw - 80px)",
          overflowX: "auto",
          msOverflowStyle: "none", scrollbarWidth: "none",
        }}>
          {STATUS_FILTERS.map((f) => {
            const isActive = activeFilter === f.value;
            return (
              <button
                key={String(f.value)}
                onClick={() => onFilterChange(isActive ? null : f.value)}
                style={{
                  padding: mobile ? "5px 9px" : "5px 12px",
                  border: "none", borderRadius: 999,
                  background: isActive ? C.primaryContainer : "transparent",
                  color: isActive ? C.primary : C.outlineVariant,
                  fontFamily: FL, fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.15s",
                  WebkitTapHighlightColor: "transparent",
                  letterSpacing: "0.01em",
                }}
              >
                {/* 모바일: 첫 글자만 */}
                {mobile && f.value !== null
                  ? f.label.slice(0, 2)
                  : f.label
                }
              </button>
            );
          })}

          {/* 내 맛집 토글 */}
          {(hasFollowing || !mobile) && (
            <>
              <div style={{ width: 1, height: 14, background: "rgba(101,93,84,0.12)", margin: "0 3px", flexShrink: 0 }} />
              <button
                onClick={onTogglePersonal}
                style={{
                  padding: "5px 10px",
                  border: "none", borderRadius: 999,
                  background: showPersonal ? C.primaryContainer : "transparent",
                  color: showPersonal ? C.primary : C.outlineVariant,
                  fontFamily: FL, fontSize: 11,
                  fontWeight: showPersonal ? 700 : 500,
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.15s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {mobile ? "나" : "내 맛집"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 팔로잉 선택 ───────────────────────────────── */}
      {hasFollowing && (
        <div style={{ display: "flex", justifyContent: "center", pointerEvents: "auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            background: "rgba(250,249,246,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            padding: "4px 5px",
            borderRadius: 999,
            boxShadow: "0 2px 12px rgba(101,93,84,0.07)",
            maxWidth: "calc(100vw - 80px)",
            overflowX: "auto",
            msOverflowStyle: "none", scrollbarWidth: "none",
          }}>
            {orderedFollowing.map((f) => {
              const color = getColor(orderedFollowing.findIndex((x) => x.id === f.id));
              const isSelected = selectedFollowingIds.includes(f.id);
              const isDragging = draggingId === f.id;

              return (
                <button
                  key={f.id}
                  onClick={() => !draggingId && onToggleFollowing(f.id)}
                  onMouseDown={() => handleLongPressStart(f.id)}
                  onMouseUp={() => { handleLongPressEnd(); if (draggingId) handleDrop(f.id); }}
                  onMouseLeave={handleLongPressEnd}
                  onMouseEnter={() => { if (draggingId) setDragOverId(f.id); }}
                  onTouchStart={() => handleLongPressStart(f.id)}
                  onTouchEnd={() => { handleLongPressEnd(); if (draggingId && dragOverId) handleDrop(dragOverId); }}
                  style={{
                    padding: "5px 10px",
                    border: "none", borderRadius: 999,
                    background: isSelected ? color : "transparent",
                    color: isSelected ? "white" : C.outlineVariant,
                    fontFamily: FL, fontSize: 11,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: isDragging ? "grabbing" : "pointer",
                    whiteSpace: "nowrap", flexShrink: 0,
                    opacity: isDragging ? 0.4 : 1,
                    transition: "all 0.12s",
                    WebkitTapHighlightColor: "transparent",
                    userSelect: "none",
                  }}
                >
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
