// src/components/BestPickerModal.jsx
// 내 장소 중에서 베스트를 선택하는 피커 모달
import { useState } from "react";
import { createPortal } from "react-dom";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54", primaryContainer: "#ede0d5",
  bg: "#faf9f6", surfaceLow: "#f4f4f0", container: "#edeeea",
  onSurface: "#2f3430", onSurfaceVariant: "#5c605c",
  outlineVariant: "#8a8e8a",
};

export default function BestPickerModal({ category, categoryLabel, personalPlaces, myBestPicks, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const mobile = window.innerWidth <= 768;

  // 이미 베스트에 등록된 장소 ID 수집
  const pickedIds = new Set();
  const pickedNaverIds = new Set();
  Object.values(myBestPicks).flat().forEach((p) => {
    if (p.personal_place_id) pickedIds.add(p.personal_place_id);
    if (p.naver_place_id) pickedNaverIds.add(p.naver_place_id);
  });

  const filtered = personalPlaces
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const isPicked = (p) => pickedIds.has(p.id) || (p.naver_place_id && pickedNaverIds.has(p.naver_place_id));

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center",
        background: "rgba(47,52,48,0.4)", backdropFilter: "blur(4px)",
      }}
    >
      <div style={{
        width: mobile ? "100%" : 400,
        maxHeight: mobile ? "85vh" : "70vh",
        background: C.bg,
        borderRadius: mobile ? "18px 18px 0 0" : 16,
        display: "flex", flexDirection: "column",
        boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "16px 20px 12px",
          borderBottom: `1px solid ${C.container}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ margin: 0, fontFamily: FL, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant }}>
              베스트 추가
            </p>
            <h3 style={{ margin: "2px 0 0", fontFamily: FH, fontSize: 16, fontWeight: 400, color: C.onSurface }}>
              {categoryLabel}
            </h3>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, background: C.surfaceLow, border: "none",
            borderRadius: "50%", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: C.onSurfaceVariant }}>close</span>
          </button>
        </div>

        {/* 검색 */}
        <div style={{ padding: "10px 20px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="장소 검색..."
            style={{
              width: "100%", padding: "8px 12px",
              background: C.surfaceLow, border: "none", borderRadius: 8,
              fontFamily: FL, fontSize: 13, color: C.onSurface,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* 장소 리스트 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
          {filtered.length === 0 && (
            <p style={{ fontFamily: FL, fontSize: 12, color: C.outlineVariant, textAlign: "center", padding: 20, fontStyle: "italic" }}>
              {personalPlaces.length === 0 ? "아직 저장된 장소가 없어요" : "검색 결과가 없어요"}
            </p>
          )}
          {filtered.map((p) => {
            const picked = isPicked(p);
            return (
              <button
                key={p.id}
                disabled={picked}
                onClick={() => onSelect({
                  category,
                  name: p.name, address: p.address,
                  lat: p.lat, lng: p.lng,
                  naver_place_id: p.naver_place_id,
                  naver_place_url: p.naver_place_url,
                  personal_place_id: p.id,
                })}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", border: "none", borderRadius: 8,
                  background: "transparent", cursor: picked ? "default" : "pointer",
                  opacity: picked ? 0.45 : 1,
                  textAlign: "left", transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { if (!picked) e.currentTarget.style.background = C.surfaceLow; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.onSurface,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{p.name}</p>
                  {p.address && (
                    <p style={{
                      margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{p.address}</p>
                  )}
                </div>
                {picked && (
                  <span style={{
                    fontFamily: FL, fontSize: 9, fontWeight: 700, color: C.primary,
                    background: C.primaryContainer, padding: "2px 8px", borderRadius: 4,
                    flexShrink: 0,
                  }}>등록됨</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
