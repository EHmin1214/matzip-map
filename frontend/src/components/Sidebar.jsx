// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import SavePlaceModal from "./SavePlaceModal";

const C = {
  primary:          "#655d54",
  primaryDim:       "#595149",
  primaryContainer: "#ede0d5",
  bg:               "#faf9f6",
  surfaceLow:       "#f4f4f0",
  container:        "#edeeea",
  onSurface:        "#2f3430",
  onSurfaceVariant: "#5c605c",
  outlineVariant:   "#afb3ae",
};
const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";

const NAV_ITEMS = [
  { id: "map",     icon: "map",          label: "지도" },
  { id: "search",  icon: "search",       label: "검색" },
  { id: "follow",  icon: "group",        label: "팔로우" },
  { id: "updates", icon: "auto_stories", label: "업데이트" },
  { id: "profile", icon: "person_pin",   label: "프로필" },
];

const FOLLOWING_COLORS = ["#3B8BD4","#1D9E75","#BA7517","#7F77DD","#D4537E","#0F6E56"];
const getFollowingColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

const statusEmoji = (s) => ({ want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎" }[s] || "📍");

function SectionLabel({ children }) {
  return (
    <p style={{
      fontFamily: FL, fontSize: 9, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.18em",
      color: C.outlineVariant, margin: "0 0 10px 2px",
    }}>
      {children}
    </p>
  );
}

export default function Sidebar({
  activeTab, onTabChange,
  apiBase, onAddPersonalPlace,
  personalPlaces, showPersonal, setShowPersonal, onDeletePersonalPlace,
  unreadCount,
  selectedFollowingIds, onToggleFollowing,
  followingList = [],
  onFollowChange,
  sidebarWidth = 240,
}) {
  const { user } = useUser();
  const [pendingPlace, setPendingPlace] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/folders/?user_id=${user.user_id}`)
      .then((res) => setFolders(res.data)).catch(() => {});
  }, [user]);

  const searchPlace = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await axios.get(`${apiBase}/search-place/`, { params: { name: searchQuery.trim() } });
      if (res.data) { setPendingPlace(res.data); setSearchQuery(""); }
      else { setMessage("가게를 찾을 수 없어요"); setTimeout(() => setMessage(""), 2500); }
    } catch (e) { setMessage("검색 실패"); setTimeout(() => setMessage(""), 2500); }
    finally { setSearching(false); }
  };

  const getFolderColor = (folderId) => {
    if (!folderId) return C.outlineVariant;
    const f = folders.find((x) => x.id === folderId);
    return f?.color || C.outlineVariant;
  };

  return (
    <>
      <aside style={{
        width: sidebarWidth,
        height: "100vh",
        position: "fixed",
        left: 0, top: 0,
        zIndex: 40,
        /* No-Line Rule: tonal separation instead of border */
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        padding: "24px 14px 20px",
        overflowY: "auto",
        /* Ambient shadow defines right edge — no border */
        boxShadow: "1px 0 0 rgba(101,93,84,0.07)",
      }}>

        {/* ── 브랜드 ─────────────────────────────────────────── */}
        <div style={{ padding: "0 6px", marginBottom: 28 }}>
          <h1 style={{
            fontFamily: FH, fontStyle: "italic",
            fontSize: 18, color: C.primary,
            margin: "0 0 3px", letterSpacing: "-0.02em",
          }}>
            나의 공간
          </h1>
          <p style={{
            fontFamily: FL, fontSize: 8, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.22em",
            color: C.outlineVariant, margin: 0,
          }}>
            The Curated Archive
          </p>
        </div>

        {/* ── 네비게이션 ─────────────────────────────────────── */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 20 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const hasUnread = item.id === "updates" && unreadCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px",
                  border: "none", cursor: "pointer",
                  borderRadius: 7,
                  /* Active: primaryContainer tonal highlight */
                  background: isActive ? C.primaryContainer : "transparent",
                  color: isActive ? C.primary : C.onSurfaceVariant,
                  fontFamily: FL, fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  transform: isActive ? "translateX(3px)" : "translateX(0)",
                  transition: "all 0.16s ease",
                  position: "relative", textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = C.surfaceLow;
                    e.currentTarget.style.transform = "translateX(3px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: 17, flexShrink: 0,
                  fontVariationSettings: isActive
                    ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                    : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {hasUnread && (
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: "#9e422c", color: "white",
                    fontFamily: FL, fontSize: 8, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── 지도 탭 전용 콘텐츠 ───────────────────────────── */}
        {activeTab === "map" && (
          <div style={{
            flex: 1, overflowY: "auto", paddingTop: 16,
            /* No-Line Rule: tonal shift instead of border */
            background: "transparent",
          }}>
            {/* 장소 추가 */}
            <SectionLabel>장소 추가</SectionLabel>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPlace()}
                placeholder="가게명 검색"
                style={{
                  flex: 1, padding: "8px 10px",
                  background: C.surfaceLow,
                  border: "none", borderRadius: 7,
                  fontFamily: FL, fontSize: 12, color: C.onSurface,
                  outline: "none",
                  transition: "background 0.15s",
                }}
                onFocus={(e) => e.target.style.background = C.container}
                onBlur={(e) => e.target.style.background = C.surfaceLow}
              />
              <button
                onClick={searchPlace}
                disabled={searching}
                style={{
                  padding: "8px 10px",
                  background: searching ? C.container : `linear-gradient(to bottom, ${C.primary}, ${C.primaryDim})`,
                  color: searching ? C.outlineVariant : "#fff6ef",
                  border: "none", borderRadius: 7,
                  fontFamily: FL, fontSize: 11, fontWeight: 600,
                  cursor: searching ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                {searching ? "…" : "검색"}
              </button>
            </div>
            {message && (
              <p style={{ fontFamily: FL, fontSize: 11, color: "#9e422c", marginBottom: 8, paddingLeft: 2 }}>
                {message}
              </p>
            )}

            {/* 내 맛집 토글 */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px 10px", cursor: "pointer" }}
              onClick={() => setShowPersonal(!showPersonal)}
            >
              {/* No-Line Rule: custom checkbox with tonal fill */}
              <div style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                background: showPersonal ? C.primary : C.container,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}>
                {showPersonal && (
                  <span style={{ color: "#fff6ef", fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>
                )}
              </div>
              <span style={{
                fontFamily: FL, fontSize: 10, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: C.primary,
              }}>
                내 맛집 ({personalPlaces.length})
              </span>
            </div>

            {/* 내 맛집 목록 — Rule of Silence: spacing instead of dividers */}
            {showPersonal && (
              <div style={{ marginBottom: 16, maxHeight: 180, overflowY: "auto" }}>
                {personalPlaces.slice(0, 20).map((p) => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "5px 4px",
                    /* No divider lines — use vertical spacing only */
                  }}>
                    <div style={{
                      width: 3, height: 18, borderRadius: 2,
                      background: getFolderColor(p.folder_id), flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11 }}>{statusEmoji(p.status)}</span>
                    <p style={{
                      margin: 0, fontFamily: FH, fontSize: 11, fontWeight: 600,
                      color: C.onSurface, flex: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {p.name}
                    </p>
                    <button
                      onClick={() => onDeletePersonalPlace(p.id)}
                      style={{
                        background: "none", border: "none",
                        fontFamily: FL, fontSize: 9, color: C.outlineVariant,
                        cursor: "pointer", padding: "2px 4px",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#9e422c"}
                      onMouseLeave={(e) => e.currentTarget.style.color = C.outlineVariant}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 팔로잉 레이어 */}
            {followingList.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <SectionLabel>팔로잉</SectionLabel>
                {followingList.map((f, idx) => {
                  const color = getFollowingColor(idx);
                  const isSelected = selectedFollowingIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => onToggleFollowing(f.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 8px", cursor: "pointer",
                        borderRadius: 7,
                        background: isSelected ? `${color}14` : "transparent",
                        marginBottom: 2,
                        transition: "background 0.15s",
                      }}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                        background: isSelected ? color : C.container,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.15s",
                      }}>
                        {isSelected && <span style={{ color: "white", fontSize: 9, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: color, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: FL, fontSize: 9, color: "white", fontWeight: 700,
                      }}>
                        {f.nickname?.[0]?.toUpperCase()}
                      </div>
                      <span style={{
                        fontFamily: FL, fontSize: 11, color: C.onSurface,
                        flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {f.nickname}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 하단 ─────────────────────────────────────────── */}
        <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* New Entry CTA — gradient as per design spec */}
          <button
            onClick={() => onTabChange("search")}
            style={{
              width: "100%", padding: "10px",
              background: `linear-gradient(to bottom, ${C.primary}, ${C.primaryDim})`,
              color: "#fff6ef",
              border: "none", borderRadius: 7,
              fontFamily: FL, fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.12em",
              cursor: "pointer",
              transition: "opacity 0.15s",
              boxShadow: "0 2px 12px rgba(101,93,84,0.20)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            + New Entry
          </button>

          {/* 유저 카드 — tonal surface instead of border */}
          {user && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              background: C.surfaceLow,
              borderRadius: 8,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FH, fontStyle: "italic",
                fontSize: 13, color: "#fff6ef", fontWeight: 700, flexShrink: 0,
              }}>
                {user.nickname?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontFamily: FL, fontSize: 11, fontWeight: 600,
                  color: C.onSurface, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user.nickname}
                </p>
                <p style={{ margin: 0, fontFamily: FL, fontSize: 9, color: C.outlineVariant }}>
                  Personal Curator
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {pendingPlace && (
        <SavePlaceModal place={pendingPlace} onSave={onAddPersonalPlace} onClose={() => setPendingPlace(null)} />
      )}
    </>
  );
}
