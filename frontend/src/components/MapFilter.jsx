// src/components/MapFilter.jsx
import { useState, useRef, useCallback } from "react";

const FILTERS = [
  { value: null,              label: "전체",      emoji: "🗺️" },
  { value: "want_to_go",      label: "가고싶어요", emoji: "🔖" },
  { value: "visited",         label: "가봤어요",   emoji: "✅" },
  { value: "want_revisit",    label: "또가고싶어요", emoji: "❤️" },
  { value: "not_recommended", label: "별로였어요", emoji: "👎" },
];

const FOLLOWING_COLORS = [
  "#3B8BD4", "#1D9E75", "#BA7517",
  "#7F77DD", "#D4537E", "#0F6E56",
];

const isMobile = () => window.innerWidth <= 768;

export default function MapFilter({
  activeFilter, onFilterChange, sidebarWidth = 0,
  // 팔로잉 레이어
  followingList = [],
  selectedFollowingIds = [],
  onToggleFollowing,
  showPersonal,
  onTogglePersonal,
  // 팔로잉 순서 변경
  onReorderFollowing,
}) {
  const mobile = isMobile();
  const scrollRef = useRef(null);

  // 드래그 리오더 상태
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const longPressTimer = useRef(null);
  const [orderedFollowing, setOrderedFollowing] = useState(followingList);

  // followingList 변경 시 순서 동기화
  if (followingList.length !== orderedFollowing.length ||
    followingList.some((f, i) => orderedFollowing[i]?.id !== f.id)) {
    // 새 팔로잉만 추가 (기존 순서 유지)
    const existingIds = new Set(orderedFollowing.map(f => f.id));
    const newOnes = followingList.filter(f => !existingIds.has(f.id));
    const filtered = orderedFollowing.filter(f => followingList.some(fl => fl.id === f.id));
    if (newOnes.length > 0 || filtered.length !== orderedFollowing.length) {
      setOrderedFollowing([...filtered, ...newOnes]);
    }
  }

  const getColor = (userId) => {
    const idx = orderedFollowing.findIndex(f => f.id === userId);
    return FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];
  };

  // 길게 누르기 시작
  const handleLongPressStart = (id) => {
    longPressTimer.current = setTimeout(() => {
      setDraggingId(id);
      if (navigator.vibrate) navigator.vibrate(50); // 햅틱
    }, 400);
  };

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  // 드래그 오버
  const handleDragOver = (id) => {
    if (!draggingId || draggingId === id) return;
    setDragOverId(id);
  };

  // 드롭 — 순서 변경
  const handleDrop = (targetId) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null); setDragOverId(null); return;
    }
    const newOrder = [...orderedFollowing];
    const fromIdx = newOrder.findIndex(f => f.id === draggingId);
    const toIdx = newOrder.findIndex(f => f.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setOrderedFollowing(newOrder);
    if (onReorderFollowing) onReorderFollowing(newOrder);
    setDraggingId(null); setDragOverId(null);
  };

  // 터치 드래그 (모바일)
  const touchStartX = useRef(null);
  const touchDragId = useRef(null);

  const handleTouchMove = useCallback((e) => {
    if (!draggingId) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const id = el?.getAttribute("data-following-id");
    if (id) setDragOverId(Number(id));
  }, [draggingId]);

  const handleTouchEnd = useCallback((e) => {
    if (!draggingId || !dragOverId) { setDraggingId(null); setDragOverId(null); return; }
    handleDrop(dragOverId);
  }, [draggingId, dragOverId]);

  return (
    <div style={{
      position: "fixed",
      top: 16,
      left: mobile ? 8 : sidebarWidth + 60,
      right: mobile ? 56 : 16, // 오른쪽 새로고침 버튼 공간
      zIndex: 25,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>

      {/* 1행: 상태 필터 */}
      <div
        ref={scrollRef}
        style={{
          display: "flex", gap: 6,
          overflowX: "auto", paddingBottom: 2,
          msOverflowStyle: "none", scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.value;
          return (
            <button
              key={String(f.value)}
              onClick={() => onFilterChange(isActive ? null : f.value)}
              style={{
                display: "flex", alignItems: "center", gap: mobile ? 3 : 4,
                padding: mobile ? "7px 10px" : "7px 12px",
                minHeight: 36,
                background: isActive ? "#E8593C" : "white",
                color: isActive ? "white" : "#555",
                border: `1.5px solid ${isActive ? "#E8593C" : "#e0e0e0"}`,
                borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                transition: "all 0.15s", flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ fontSize: mobile ? 13 : 13 }}>{f.emoji}</span>
              {(!mobile || f.value === null) && <span>{f.label}</span>}
            </button>
          );
        })}
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
      </div>

      {/* 2행: 내 맛집 + 팔로잉 레이어 (팔로잉이 있을 때만) */}
      {(followingList.length > 0 || true) && (
        <div
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: "flex", gap: 6,
            overflowX: "auto", paddingBottom: 2,
            msOverflowStyle: "none", scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* 내 맛집 토글 */}
          <button
            onClick={onTogglePersonal}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", minHeight: 32,
              background: showPersonal ? "#E8593C" : "white",
              color: showPersonal ? "white" : "#888",
              border: `1.5px solid ${showPersonal ? "#E8593C" : "#ddd"}`,
              borderRadius: 16, fontSize: 11, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
              flexShrink: 0, WebkitTapHighlightColor: "transparent",
            }}
          >
            {showPersonal ? "✓" : "○"} 내 맛집
          </button>

          {/* 팔로잉 선택 — 드래그 가능 */}
          {orderedFollowing.map((f) => {
            const color = getColor(f.id);
            const isSelected = selectedFollowingIds.includes(f.id);
            const isDragging = draggingId === f.id;
            const isDragOver = dragOverId === f.id;

            return (
              <button
                key={f.id}
                data-following-id={f.id}
                onClick={() => !draggingId && onToggleFollowing(f.id)}
                onMouseDown={() => handleLongPressStart(f.id)}
                onMouseUp={() => { handleLongPressEnd(); if (draggingId) handleDrop(f.id); }}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(f.id)}
                onTouchEnd={() => { handleLongPressEnd(); }}
                onMouseEnter={() => handleDragOver(f.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", minHeight: 32,
                  background: isSelected ? color : "white",
                  color: isSelected ? "white" : "#666",
                  border: `1.5px solid ${isDragOver ? "#333" : isSelected ? color : "#ddd"}`,
                  borderRadius: 16, fontSize: 11, fontWeight: 600,
                  cursor: isDragging ? "grabbing" : "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: isDragging
                    ? "0 6px 20px rgba(0,0,0,0.2)"
                    : "0 1px 6px rgba(0,0,0,0.08)",
                  flexShrink: 0,
                  opacity: isDragging ? 0.5 : 1,
                  transform: isDragOver && !isDragging ? "scale(1.05)" : "scale(1)",
                  transition: "transform 0.1s, opacity 0.1s",
                  WebkitTapHighlightColor: "transparent",
                  userSelect: "none",
                }}
              >
                {/* 아바타 */}
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: isSelected ? "rgba(255,255,255,0.3)" : color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "white", fontWeight: 800, flexShrink: 0,
                }}>
                  {f.nickname?.[0]?.toUpperCase()}
                </div>
                {f.nickname}
                {/* 드래그 핸들 표시 */}
                {draggingId && (
                  <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 2 }}>⠿</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
