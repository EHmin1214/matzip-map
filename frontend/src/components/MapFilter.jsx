// src/components/MapFilter.jsx
// 지도 우측 세로 컨트롤 — 이모지 상태 필터 + 팔로잉 선택
import { useState, useRef } from "react";
import { FOLLOWING_COLORS, getFollowingColor } from "../constants";

const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary:          "#655d54",
  primaryContainer: "#ede0d5",
  bg:               "rgba(250,249,246,0.94)",
  outlineVariant:   "#8a8e8a",
};

const STATUS_FILTERS = [
  { value: "want_to_go",      emoji: "🔖" },
  { value: "visited",         emoji: "✅" },
  { value: "want_revisit",    emoji: "❤️" },
];

const getColor = getFollowingColor;

const GLASS_BTN = {
  width: 38, height: 38,
  borderRadius: "50%",
  background: C.bg,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "none",
  boxShadow: "0 2px 16px rgba(101,93,84,0.10)",
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  WebkitTapHighlightColor: "transparent",
  flexShrink: 0,
  transition: "box-shadow 0.15s",
};

export default function MapFilter({
  activeFilter, onFilterChange,
  followingList = [], selectedFollowingIds = [], onToggleFollowing,
  showPersonal, onTogglePersonal,
}) {
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

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "flex-end", gap: 8,
    }}>
      {/* 상태 이모지 필터 */}
      {STATUS_FILTERS.map((f) => {
        const isActive = activeFilter === f.value;
        return (
          <button
            key={f.value}
            onClick={() => onFilterChange(isActive ? null : f.value)}
            title={f.value}
            style={{
              ...GLASS_BTN,
              background: isActive ? C.primaryContainer : C.bg,
              boxShadow: isActive
                ? "0 2px 16px rgba(101,93,84,0.18)"
                : "0 2px 16px rgba(101,93,84,0.10)",
              fontSize: 17,
            }}
          >
            {f.emoji}
          </button>
        );
      })}

      {/* 내 맛집 토글 */}
      <button
        onClick={onTogglePersonal}
        title="내 맛집"
        style={{
          ...GLASS_BTN,
          background: showPersonal ? C.primaryContainer : C.bg,
          color: showPersonal ? C.primary : C.outlineVariant,
          boxShadow: showPersonal
            ? "0 2px 16px rgba(101,93,84,0.18)"
            : "0 2px 16px rgba(101,93,84,0.10)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
          person_pin
        </span>
      </button>

      {/* 팔로잉 선택 — 세로 스크롤 */}
      {orderedFollowing.length > 0 && (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "flex-end", gap: 6,
          maxHeight: 200,
          overflowY: "auto",
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
                  padding: "5px 10px 5px 8px",
                  border: "none", borderRadius: 999,
                  background: isSelected ? color : C.bg,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  color: isSelected ? "white" : C.outlineVariant,
                  fontFamily: FL, fontSize: 11,
                  fontWeight: isSelected ? 600 : 400,
                  cursor: isDragging ? "grabbing" : "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                  opacity: isDragging ? 0.4 : 1,
                  transition: "all 0.12s",
                  WebkitTapHighlightColor: "transparent",
                  userSelect: "none",
                  boxShadow: "0 2px 12px rgba(101,93,84,0.08)",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: isSelected ? "rgba(255,255,255,0.7)" : color,
                  flexShrink: 0,
                }} />
                {f.nickname}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
