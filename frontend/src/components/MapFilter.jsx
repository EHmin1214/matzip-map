// src/components/MapFilter.jsx

const FILTERS = [
  { value: null,              label: "전체",   emoji: "🗺️" },
  { value: "want_to_go",      label: "가고싶어요", emoji: "🔖" },
  { value: "visited",         label: "가봤어요",  emoji: "✅" },
  { value: "want_revisit",    label: "또가고싶어요", emoji: "❤️" },
  { value: "not_recommended", label: "별로였어요", emoji: "👎" },
];

export default function MapFilter({ activeFilter, onFilterChange, sidebarWidth = 0 }) {
  return (
    <div style={{
      position: "fixed",
      top: 16,
      left: sidebarWidth + 60, // 사이드바 + 토글 버튼 공간
      right: 16,
      zIndex: 25,
      display: "flex",
      gap: 6,
      overflowX: "auto",
      paddingBottom: 2,
      // 스크롤바 숨기기
      msOverflowStyle: "none",
      scrollbarWidth: "none",
    }}>
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.value;
        return (
          <button
            key={String(f.value)}
            onClick={() => onFilterChange(isActive ? null : f.value)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "7px 12px",
              background: isActive ? "#E8593C" : "white",
              color: isActive ? "white" : "#555",
              border: `1.5px solid ${isActive ? "#E8593C" : "#e0e0e0"}`,
              borderRadius: 20,
              fontSize: 12, fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            <span>{f.emoji}</span>
            <span>{f.label}</span>
          </button>
        );
      })}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
