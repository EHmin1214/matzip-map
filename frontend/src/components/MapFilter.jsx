// src/components/MapFilter.jsx
const FILTERS = [
  { value: null,              label: "전체",      emoji: "🗺️" },
  { value: "want_to_go",      label: "가고싶어요", emoji: "🔖" },
  { value: "visited",         label: "가봤어요",   emoji: "✅" },
  { value: "want_revisit",    label: "또가고싶어요", emoji: "❤️" },
  { value: "not_recommended", label: "별로였어요", emoji: "👎" },
];

const isMobile = () => window.innerWidth <= 768;

export default function MapFilter({ activeFilter, onFilterChange, sidebarWidth = 0 }) {
  const mobile = isMobile();

  return (
    <div style={{
      position: "fixed",
      top: 16,
      left: mobile ? 8 : sidebarWidth + 60,
      right: mobile ? 8 : 16,
      zIndex: 25,
      display: "flex",
      gap: mobile ? 6 : 6,
      overflowX: "auto",
      paddingBottom: 2,
      // 스크롤바 숨기기
      msOverflowStyle: "none",
      scrollbarWidth: "none",
      WebkitOverflowScrolling: "touch",
    }}>
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.value;
        return (
          <button
            key={String(f.value)}
            onClick={() => onFilterChange(isActive ? null : f.value)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: mobile ? 3 : 4,
              padding: mobile ? "8px 10px" : "7px 12px",
              minHeight: 44, // 터치 최소 크기
              background: isActive ? "#E8593C" : "white",
              color: isActive ? "white" : "#555",
              border: `1.5px solid ${isActive ? "#E8593C" : "#e0e0e0"}`,
              borderRadius: 20,
              fontSize: mobile ? 12 : 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              transition: "all 0.15s",
              flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{ fontSize: mobile ? 14 : 13 }}>{f.emoji}</span>
            {/* 모바일에서 '전체'만 텍스트 표시, 나머지는 이모지만 */}
            {(!mobile || f.value === null) && (
              <span>{f.label}</span>
            )}
          </button>
        );
      })}
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
