// src/components/SharedPlacesList.jsx
// 모바일 "우리의 공간" 하단 인기 장소 리스트 시트
import { useState, useRef, useEffect } from "react";
import { BEST_CATEGORIES, SHARED_CAT_COLOR } from "../constants";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";

const CAT_LABELS = Object.fromEntries(
  [{ key: "all", label: "전체" }, ...BEST_CATEGORIES].map((c) => [c.key, c.label])
);

const PEEK_H = 195;
const FULL_H_VH = 65;

export default function SharedPlacesList({ sharedPlaces, sharedCategory, onPlaceSelect }) {
  const [mode, setMode] = useState("peek"); // "peek" | "full"
  const listRef = useRef(null);
  const touchY = useRef(0);

  // 카테고리 변경 시 peek으로 리셋 + 스크롤 초기화
  useEffect(() => {
    setMode("peek");
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [sharedCategory]);

  const toggle = () => setMode((m) => (m === "peek" ? "full" : "peek"));

  const handleTouchStart = (e) => { touchY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    const dy = e.changedTouches[0].clientY - touchY.current;
    if (dy < -40 && mode === "peek") setMode("full");
    if (dy > 40 && mode === "full" && listRef.current?.scrollTop <= 0) setMode("peek");
  };

  const catKey = sharedCategory || "all";
  const catColor = catKey === "all" ? "#8a8e8a" : (SHARED_CAT_COLOR[catKey] || "#655d54");

  // 정렬: pick_count 내림차순, 같은 숫자면 가나다순
  const sorted = [...sharedPlaces].sort(
    (a, b) => b.pick_count - a.pick_count || a.name.localeCompare(b.name, "ko")
  );

  const height = mode === "full" ? `${FULL_H_VH}vh` : PEEK_H;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed",
        left: 0, right: 0, bottom: 64,
        zIndex: 30,
        height,
        background: "#fff",
        borderRadius: "18px 18px 0 0",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        transition: "height 0.35s cubic-bezier(0.16,1,0.3,1)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 드래그 핸들 */}
      <div onClick={toggle} style={{
        display: "flex", justifyContent: "center",
        padding: "10px 0 6px", flexShrink: 0, cursor: "grab",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d4d1c7" }} />
      </div>

      {/* 헤더 */}
      <div style={{
        padding: "0 20px 6px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <p style={{
          fontFamily: FH, fontStyle: "italic", fontSize: 16, fontWeight: 700,
          color: "#1c1c1e", margin: 0,
        }}>
          인기 장소{" "}
          <span style={{ fontSize: 16, fontWeight: 700, color: catColor }}>
            · {CAT_LABELS[catKey]}
          </span>
        </p>
        <span
          className="material-symbols-outlined"
          onClick={toggle}
          style={{ fontSize: 20, color: "#8a8e8a", cursor: "pointer" }}
        >
          {mode === "full" ? "expand_more" : "expand_less"}
        </span>
      </div>

      {/* 리스트 */}
      <div ref={listRef} style={{
        flex: 1, overflowY: "auto", padding: "0 16px 16px", minHeight: 0,
      }}>
        {sorted.length === 0 ? (
          <p style={{
            fontFamily: FL, fontSize: 11, color: "#8a8e8a",
            margin: "8px 4px", fontStyle: "italic",
          }}>
            아직 베스트로 선정된 장소가 없어요
          </p>
        ) : (
          sorted.map((p, i) => {
            const color = SHARED_CAT_COLOR[p.category] || "#655d54";
            return (
              <div
                key={`${p.naver_place_id || i}_${p.category}`}
                onClick={() => onPlaceSelect(p)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 6px", borderRadius: 8,
                  cursor: "pointer", transition: "background 0.12s",
                }}
              >
                <span style={{
                  fontFamily: FL, fontSize: 12, fontWeight: 800,
                  color, flexShrink: 0, minWidth: 28,
                }}>({p.pick_count})</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontFamily: FL, fontSize: 12, fontWeight: 600,
                    color: "#2f3430", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{p.name}</p>
                  {p.address && (
                    <p style={{
                      margin: 0, fontFamily: FL, fontSize: 10, color: "#8a8e8a",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{p.address}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
