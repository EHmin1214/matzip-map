// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

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
  { id: "map",     icon: "map",          label: "홈" },
  { id: "search",  icon: "search",       label: "검색" },
  { id: "feed",          icon: "auto_stories",  label: "피드" },
  { id: "notifications", icon: "notifications", label: "알림" },
];

const FOLLOWING_COLORS = ["#3B8BD4","#1D9E75","#BA7517","#7F77DD","#D4537E","#0F6E56"];
const getFollowingColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

const statusEmoji = (s) => ({ want_to_go: "🔖", visited: "✅", want_revisit: "❤️" }[s] || "📍");

function SectionLabel({ children }) {
  return (
    <p style={{
      fontFamily: FL, fontSize: 9, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.18em",
      color: C.outlineVariant, margin: "0 0 6px 2px",
    }}>
      {children}
    </p>
  );
}

export default function Sidebar({
  activeTab, onTabChange,
  personalPlaces, onDeletePersonalPlace,
  unreadCount,
  selectedFollowingIds, onToggleFollowing,
  followingList = [],
  onFollowChange,
  sidebarWidth = 240,
  onPlaceSelect,
}) {
  const { user } = useUser();
  const [folders, setFolders] = useState([]);
  const [placeFilter, setPlaceFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/folders/?user_id=${user.user_id}`)
      .then((res) => setFolders(res.data)).catch(() => {});
  }, [user]);

  const getFolderColor = (folderId) => {
    if (!folderId) return C.outlineVariant;
    const f = folders.find((x) => x.id === folderId);
    return f?.color || C.outlineVariant;
  };

  return (
    <aside style={{
      width: sidebarWidth,
      height: "100vh",
      position: "fixed",
      left: 0, top: 0,
      zIndex: 40,
      background: C.bg,
      display: "flex",
      flexDirection: "column",
      padding: "18px 16px 14px",
      overflowY: "hidden",
      overflowX: "hidden",
      boxSizing: "border-box",
      boxShadow: "1px 0 0 rgba(101,93,84,0.07)",
    }}>

      {/* ── 브랜드 ─────────────────────────────────────────── */}
      <div style={{ padding: "0 6px", marginBottom: 14, flexShrink: 0 }}>
        <h1 style={{
          fontFamily: FH, fontStyle: "italic",
          fontSize: 18, color: C.primary,
          margin: "0 0 2px", letterSpacing: "-0.02em",
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
      <nav style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 10, flexShrink: 0 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const hasUnread = item.id === "notifications" && unreadCount > 0;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 10px",
                border: "none", cursor: "pointer",
                borderRadius: 7,
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
          flex: 1, display: "flex", flexDirection: "column",
          paddingTop: 4, minHeight: 0, gap: 4,
        }}>
          {/* 내 공간 섹션 */}
          <div style={{
            flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
          }}>
            <SectionLabel>내 공간 ({personalPlaces.length})</SectionLabel>
            {personalPlaces.length > 5 && (
              <div style={{ position: "relative", marginBottom: 6, flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{
                  position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
                  fontSize: 12, color: C.outlineVariant, pointerEvents: "none",
                }}>search</span>
                <input
                  value={placeFilter}
                  onChange={(e) => setPlaceFilter(e.target.value)}
                  placeholder="내 공간 검색..."
                  style={{
                    width: "100%", padding: "4px 6px 4px 22px",
                    background: C.surfaceLow, border: "none", borderRadius: 5,
                    fontFamily: FL, fontSize: 8, color: C.onSurface,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            )}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {personalPlaces
                .filter((p) => !placeFilter || p.name.toLowerCase().includes(placeFilter.toLowerCase()))
                .slice(0, 50).map((p) => (
                <div key={p.id}
                  onClick={() => onPlaceSelect && onPlaceSelect(p)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 4px", borderRadius: 6,
                    cursor: "pointer", transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceLow}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{
                    width: 3, height: 18, borderRadius: 2,
                    background: getFolderColor(p.folder_id), flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 11 }}>{statusEmoji(p.status)}</span>
                  <p style={{
                    margin: 0, fontFamily: FL, fontSize: 11, fontWeight: 600,
                    color: C.onSurface, flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.name}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeletePersonalPlace(p.id); }}
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
              {personalPlaces.length === 0 && (
                <p style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant, margin: "8px 4px" }}>
                  아직 저장된 공간이 없어요
                </p>
              )}
            </div>
          </div>

          {/* 구분선 */}
          {followingList.length > 0 && (
            <div style={{ height: 1, background: "rgba(101,93,84,0.08)", margin: "4px 0", flexShrink: 0 }} />
          )}

          {/* 팔로잉 레이어 */}
          {followingList.length > 0 && (
            <div style={{
              flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
            }}>
              <SectionLabel>팔로잉</SectionLabel>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {followingList.map((f, idx) => {
                  const color = getFollowingColor(idx);
                  const isSelected = selectedFollowingIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => onToggleFollowing(f.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 8px", cursor: "pointer",
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
            </div>
          )}
        </div>
      )}

      {/* ── 하단 유저 카드 ─────────────────────────────────── */}
      <div style={{ marginTop: "auto", paddingTop: 10, flexShrink: 0 }}>
        {user ? (
          <div
            onClick={() => onTabChange("profile")}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px",
              background: activeTab === "profile" ? C.primaryContainer : C.surfaceLow,
              borderRadius: 8,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { if (activeTab !== "profile") e.currentTarget.style.background = C.container; }}
            onMouseLeave={(e) => { if (activeTab !== "profile") e.currentTarget.style.background = C.surfaceLow; }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
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
                color: activeTab === "profile" ? C.primary : C.onSurface,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user.nickname}
              </p>
              <p style={{ margin: 0, fontFamily: FL, fontSize: 9, color: C.outlineVariant }}>
                Personal Curator
              </p>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: C.outlineVariant }}>
              chevron_right
            </span>
          </div>
        ) : (
          <div
            onClick={() => onTabChange("profile")}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              background: C.primaryContainer,
              borderRadius: 8,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#e5d6c9"}
            onMouseLeave={(e) => e.currentTarget.style.background = C.primaryContainer}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: 18, color: C.primary,
              fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
            }}>
              login
            </span>
            <span style={{
              fontFamily: FL, fontSize: 12, fontWeight: 700,
              color: C.primary,
            }}>
              로그인 / 회원가입
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
