// src/components/Sidebar.jsx
// 디자인: "The Curated Archive" — desktop_2/3/search HTML 기반
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import SavePlaceModal from "./SavePlaceModal";

const C = {
  primary:    "#655d54",
  primaryDim: "#595149",
  primaryContainer: "#ede0d5",
  bg:         "#faf9f6",
  container:  "#edeeea",
  containerLow: "#f4f4f0",
  onSurface:  "#2f3430",
  outline:    "#777c77",
  outlineFaint: "#edeeea",
};
const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";

// 사이드바 탭 정의 — HTML의 nav 아이콘/라벨과 동일
const NAV_ITEMS = [
  { id: "map",     icon: "map",           label: "지도" },
  { id: "feed",    icon: "auto_stories",  label: "피드" },
  { id: "search",  icon: "search",        label: "검색" },
  { id: "follow",  icon: "group",         label: "팔로우" },
  { id: "notify",  icon: "notifications", label: "알림" },
  { id: "profile", icon: "person_pin",    label: "프로필" },
];

export default function Sidebar({
  activeTab, onTabChange,
  apiBase, onAddPersonalPlace,
  personalPlaces, showPersonal, setShowPersonal, onDeletePersonalPlace,
  unreadCount, onUnreadChange,
  selectedFollowingIds, onToggleFollowing,
  followingList = [],
  onFollowChange,
  onActivityPlaceClick,
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
      .then((res) => setFolders(res.data))
      .catch(() => {});
  }, [user]);

  const searchPlace = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await axios.get(`${apiBase}/search-place/`, { params: { name: searchQuery.trim() } });
      if (res.data) { setPendingPlace(res.data); setSearchQuery(""); }
      else { setMessage("가게를 찾을 수 없어요"); setTimeout(() => setMessage(""), 2500); }
    } catch (e) {
      setMessage("검색 실패"); setTimeout(() => setMessage(""), 2500);
    } finally { setSearching(false); }
  };

  const getFolderInfo = (folderId) => {
    if (!folderId) return { name: "미분류", color: C.outline };
    const f = folders.find((f) => f.id === folderId);
    return f ? { name: f.name, color: f.color } : { name: "폴더", color: C.outline };
  };

  const statusEmoji = (s) => ({ want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎" }[s] || "📍");

  const FOLLOWING_COLORS = ["#3B8BD4", "#1D9E75", "#BA7517", "#7F77DD", "#D4537E", "#0F6E56"];
  const getColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

  return (
    <>
      <aside style={{
        width: 256, height: "100vh", position: "fixed",
        left: 0, top: 0, zIndex: 40,
        background: C.bg,
        borderRight: `1px solid ${C.outlineFaint}`,
        display: "flex", flexDirection: "column",
        padding: "24px 16px",
        gap: 32,
        overflowY: "auto",
      }}>
        {/* 브랜드 */}
        <div>
          <h1 style={{
            fontFamily: FH, fontStyle: "italic",
            fontSize: 20, color: C.primary,
            margin: "0 0 4px", letterSpacing: "-0.02em",
          }}>
            나의 공간
          </h1>
          <p style={{
            fontFamily: FL, fontSize: 9, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.2em",
            color: "#a8a29e", margin: 0,
          }}>
            The Curated Archive
          </p>
        </div>

        {/* 네비게이션 */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const hasUnread = item.id === "notify" && unreadCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px",
                  border: "none", cursor: "pointer",
                  borderRadius: 6,
                  background: isActive ? C.primaryContainer : "transparent",
                  color: isActive ? C.primary : "#78716c",
                  fontFamily: FL, fontSize: 11, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  transform: isActive ? "translateX(4px)" : "translateX(0)",
                  transition: "all 0.2s ease",
                  position: "relative", textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#f5f5f4";
                    e.currentTarget.style.transform = "translateX(4px)";
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
                  fontSize: 20,
                  fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {hasUnread && (
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: "#9e422c", color: "white",
                    fontFamily: FL, fontSize: 9, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* 내 맛집 패널 — 지도 탭 활성 시만 노출 */}
          {activeTab === "map" && (
            <div style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${C.outlineFaint}`,
            }}>
              {/* 가게 검색 */}
              <p style={{
                fontFamily: FL, fontSize: 9, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.15em",
                color: "#a8a29e", margin: "0 0 10px 4px",
              }}>장소 추가</p>
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchPlace()}
                  placeholder="가게명 검색"
                  style={{
                    flex: 1, padding: "8px 10px",
                    background: C.containerLow, border: "none", borderRadius: 6,
                    fontFamily: FL, fontSize: 12, color: C.onSurface,
                    outline: "none",
                  }}
                />
                <button onClick={searchPlace} disabled={searching} style={{
                  padding: "8px 12px", background: searching ? C.container : C.primary,
                  color: searching ? C.outline : "#fff6ef",
                  border: "none", borderRadius: 6,
                  fontFamily: FL, fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>
                  {searching ? "..." : "검색"}
                </button>
              </div>
              {message && <p style={{ fontFamily: FL, fontSize: 11, color: "#9e422c", marginBottom: 8 }}>{message}</p>}

              {/* 내 맛집 섹션 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 4px 10px", cursor: "pointer" }}
                onClick={() => setShowPersonal(!showPersonal)}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${showPersonal ? C.primary : "#a8a29e"}`,
                  background: showPersonal ? C.primary : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {showPersonal && <span style={{ color: "#fff6ef", fontSize: 9 }}>✓</span>}
                </div>
                <span style={{ fontFamily: FL, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.primary }}>
                  내 맛집 ({personalPlaces.length})
                </span>
              </div>

              {showPersonal && personalPlaces.length > 0 && (
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {personalPlaces.slice(0, 15).map((p) => {
                    const folderInfo = getFolderInfo(p.folder_id);
                    return (
                      <div key={p.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 4px",
                        borderBottom: `1px solid ${C.outlineFaint}`,
                      }}>
                        <span style={{ fontSize: 12 }}>{statusEmoji(p.status)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0, fontFamily: FH, fontSize: 12, fontWeight: 700,
                            color: C.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{p.name}</p>
                        </div>
                        <button onClick={() => onDeletePersonalPlace(p.id)} style={{
                          background: "none", border: "none", fontFamily: FL,
                          fontSize: 9, color: "#a8a29e", cursor: "pointer",
                          padding: "2px 4px",
                        }}>삭제</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 팔로잉 레이어 */}
              {followingList.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{
                    fontFamily: FL, fontSize: 9, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    color: "#a8a29e", margin: "0 0 8px 4px",
                  }}>팔로잉 맛집</p>
                  {followingList.map((f, idx) => {
                    const color = getColor(idx);
                    const isSelected = selectedFollowingIds.includes(f.id);
                    return (
                      <div key={f.id} onClick={() => onToggleFollowing(f.id)} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 8px", cursor: "pointer", borderRadius: 6,
                        background: isSelected ? `${color}15` : "transparent",
                        borderLeft: `2px solid ${isSelected ? color : "transparent"}`,
                        transition: "all 0.15s", marginBottom: 2,
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                          border: `1.5px solid ${isSelected ? color : "#a8a29e"}`,
                          background: isSelected ? color : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {isSelected && <span style={{ color: "white", fontSize: 9 }}>✓</span>}
                        </div>
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%", background: color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: FL, fontSize: 10, color: "white", fontWeight: 700, flexShrink: 0,
                        }}>
                          {f.nickname?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontFamily: FL, fontSize: 11, color: C.onSurface, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.nickname}
                        </span>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* 새 장소 추가 버튼 */}
        <button
          onClick={() => onTabChange("search")}
          style={{
            width: "100%", padding: "11px",
            background: C.primary, color: "#fff6ef",
            border: "none", borderRadius: 6,
            fontFamily: FL, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.1em",
            cursor: "pointer", transition: "background 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = C.primaryDim}
          onMouseLeave={(e) => e.currentTarget.style.background = C.primary}
        >
          + New Entry
        </button>

        {/* 유저 카드 */}
        {user && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", background: C.containerLow, borderRadius: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FH, fontStyle: "italic",
              fontSize: 14, color: "#fff6ef", fontWeight: 700, flexShrink: 0,
            }}>
              {user.nickname?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: FL, fontSize: 11, fontWeight: 600, color: C.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.nickname}
              </p>
              <p style={{ margin: 0, fontFamily: FL, fontSize: 9, color: "#a8a29e" }}>Personal Curator</p>
            </div>
          </div>
        )}
      </aside>

      {pendingPlace && (
        <SavePlaceModal place={pendingPlace} onSave={onAddPersonalPlace} onClose={() => setPendingPlace(null)} />
      )}
    </>
  );
}
