// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import FollowTab from "./FollowTab";
import SavePlaceModal from "./SavePlaceModal";
import ProfilePage from "./ProfilePage";
import NotificationTab from "./NotificationTab";
import ActivityFeed from "./ActivityFeed";

const C = {
  primary:    "#655d54",
  primaryDim: "#595149",
  bg:         "#faf9f6",
  container:  "#f4f4f0",
  containerHigh: "#edeeea",
  onSurface:  "#2f3430",
  variant:    "#5c605c",
  outline:    "#afb3ae",
  outlineFaint: "rgba(101,93,84,0.1)",
};
const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";

export default function Sidebar({
  apiBase, onAddPersonalPlace,
  personalPlaces, showPersonal, setShowPersonal, onDeletePersonalPlace,
  unreadCount, onUnreadChange,
  selectedFollowingIds, onToggleFollowing,
  followingList = [],
  onFollowChange,
  onActivityPlaceClick,
}) {
  const { user } = useUser();
  const [sidebarTab, setSidebarTab] = useState("my");
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [pendingPlace, setPendingPlace] = useState(null);
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const [folders, setFolders] = useState([]);

  const TABS = [
    { id: "my",      label: "맛집" },
    { id: "feed",    label: "피드" },
    { id: "follow",  label: "팔로우" },
    { id: "notify",  label: "알림", badge: unreadCount },
    { id: "profile", label: "프로필" },
  ];

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/folders/?user_id=${user.user_id}`)
      .then((res) => setFolders(res.data))
      .catch(() => {});
  }, [user, personalPlaces]);

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

  const statusEmoji = (s) => ({ want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎" }[s] || "📍");

  const getFolderInfo = (folderId) => {
    if (!folderId) return { name: "미분류", color: C.outline };
    const f = folders.find((f) => f.id === folderId);
    return f ? { name: f.name, color: f.color } : { name: `폴더`, color: C.outline };
  };

  const folderGroups = {};
  personalPlaces.forEach((p) => {
    const key = p.folder_id ? String(p.folder_id) : "none";
    if (!folderGroups[key]) folderGroups[key] = [];
    folderGroups[key].push(p);
  });
  const folderOrder = [...Object.keys(folderGroups).filter((k) => k !== "none"), ...(folderGroups["none"] ? ["none"] : [])];
  const hasMultipleFolders = folderOrder.length > 1;

  const FOLLOWING_COLORS = ["#3B8BD4", "#1D9E75", "#BA7517", "#7F77DD", "#D4537E", "#0F6E56"];
  const getFollowingColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>

      <div style={{
        width: 300, height: "100vh", background: C.bg,
        borderRight: `1px solid ${C.outlineFaint}`,
        display: "flex", flexDirection: "column",
        zIndex: 10, position: "relative",
      }}>

        {/* 브랜드 헤더 */}
        <div style={{ padding: "28px 24px 16px" }}>
          <h1 style={{
            fontFamily: FH, fontStyle: "italic",
            fontSize: 22, fontWeight: 700, color: C.primary,
            margin: "0 0 4px",
          }}>
            나의 맛집 지도
          </h1>
          <p style={{
            fontFamily: FL, fontSize: 9, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.2em",
            color: C.outline, margin: 0,
          }}>
            {personalPlaces.length} Saved Places
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div style={{
          display: "flex", padding: "0 16px 12px",
          gap: 2, borderBottom: `1px solid ${C.outlineFaint}`,
        }}>
          {TABS.map((tab) => {
            const isActive = sidebarTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                style={{
                  flex: 1, padding: "7px 4px",
                  border: "none", borderRadius: 6,
                  fontFamily: FL, fontSize: 10, fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.03em",
                  cursor: "pointer",
                  background: isActive ? C.containerHigh : "transparent",
                  color: isActive ? C.primary : C.outline,
                  position: "relative",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span style={{
                    position: "absolute", top: 2, right: 2,
                    background: "#9e422c", color: "white",
                    borderRadius: 999, width: 11, height: 11,
                    fontSize: 7, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 탭 콘텐츠 */}
        {sidebarTab === "feed" && <div style={{ flex: 1, overflow: "hidden" }}><ActivityFeed embedded onPlaceClick={onActivityPlaceClick} /></div>}
        {sidebarTab === "follow" && <div style={{ flex: 1, overflow: "hidden" }}><FollowTab onViewMap={() => {}} embedded onFollowChange={onFollowChange} /></div>}
        {sidebarTab === "notify" && <div style={{ flex: 1, overflow: "hidden" }}><NotificationTab embedded onUnreadChange={onUnreadChange} /></div>}
        {sidebarTab === "profile" && <div style={{ flex: 1, overflow: "hidden" }}><ProfilePage embedded /></div>}

        {/* 맛집 탭 */}
        {sidebarTab === "my" && (
          <div style={{ flex: 1, overflowY: "auto" }}>

            {/* 검색 */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.outlineFaint}` }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchPlace()}
                  placeholder="가게 이름으로 검색"
                  style={{
                    flex: 1, padding: "9px 12px",
                    background: C.container,
                    border: "none", borderRadius: 8,
                    fontFamily: FL, fontSize: 13, color: C.onSurface,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
                <button onClick={searchPlace} disabled={searching} style={{
                  padding: "9px 14px",
                  background: searching ? C.container : C.primary,
                  color: searching ? C.outline : "#fff6ef",
                  border: "none", borderRadius: 8,
                  fontFamily: FL, fontSize: 12, fontWeight: 600,
                  cursor: searching ? "not-allowed" : "pointer",
                }}>
                  {searching ? "..." : "검색"}
                </button>
              </div>
              {message && (
                <p style={{ fontFamily: FL, fontSize: 11, color: "#9e422c", margin: "8px 0 0" }}>{message}</p>
              )}
            </div>

            {/* 내 맛집 */}
            <div style={{ borderBottom: `1px solid ${C.outlineFaint}` }}>
              {/* 섹션 헤더 */}
              <div style={{
                display: "flex", alignItems: "center",
                padding: "12px 20px", cursor: "pointer",
                gap: 10,
              }}
                onClick={() => setShowPersonal(!showPersonal)}
              >
                {/* 체크박스 */}
                <div
                  onClick={(e) => { e.stopPropagation(); setShowPersonal(!showPersonal); }}
                  style={{
                    width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${showPersonal ? C.primary : C.outline}`,
                    background: showPersonal ? C.primary : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {showPersonal && <span style={{ color: "#fff6ef", fontSize: 10 }}>✓</span>}
                </div>

                <span style={{ fontFamily: FH, fontSize: 15, fontWeight: 700, color: C.onSurface, flex: 1 }}>
                  내 맛집
                </span>
                <span style={{ fontFamily: FL, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: C.outline }}>
                  {personalPlaces.length} entries
                </span>
              </div>

              {/* 맛집 목록 */}
              {showPersonal && (
                <div style={{ paddingBottom: 8 }}>
                  {personalPlaces.length === 0 && (
                    <p style={{ fontFamily: FL, fontSize: 12, color: C.outline, padding: "0 20px 12px", fontStyle: "italic" }}>
                      아직 저장된 맛집이 없어요
                    </p>
                  )}

                  {folderOrder.map((key) => {
                    const places = folderGroups[key] || [];
                    const isNone = key === "none";
                    const folderInfo = isNone ? { name: "미분류", color: C.outline } : getFolderInfo(Number(key));
                    const isCollapsed = collapsedFolders.has(key);

                    return (
                      <div key={key}>
                        {hasMultipleFolders && (
                          <div
                            onClick={() => {
                              setCollapsedFolders((prev) => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key); else next.add(key);
                                return next;
                              });
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "6px 20px", cursor: "pointer",
                              background: C.container,
                            }}
                          >
                            <div style={{ width: 6, height: 6, borderRadius: 1, background: folderInfo.color, flexShrink: 0 }} />
                            <span style={{ fontFamily: FL, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.variant, flex: 1 }}>
                              {folderInfo.name}
                            </span>
                            <span style={{ fontFamily: FL, fontSize: 10, color: C.outline }}>
                              {places.length} · {isCollapsed ? "▼" : "▲"}
                            </span>
                          </div>
                        )}

                        {!isCollapsed && places.map((place) => (
                          <div key={place.id} style={{
                            display: "flex", alignItems: "center",
                            padding: hasMultipleFolders ? "8px 20px 8px 32px" : "8px 20px",
                            gap: 10, borderBottom: `1px solid ${C.outlineFaint}`,
                          }}>
                            {!isNone && hasMultipleFolders && (
                              <div style={{ width: 2, height: 28, borderRadius: 1, background: folderInfo.color, flexShrink: 0 }} />
                            )}
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{statusEmoji(place.status)}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                margin: 0, fontFamily: FH, fontSize: 13, fontWeight: 700,
                                color: C.onSurface,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>{place.name}</p>
                              {place.memo && (
                                <p style={{
                                  margin: 0, fontFamily: FL, fontSize: 10, color: C.outline,
                                  fontStyle: "italic",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{place.memo}</p>
                              )}
                            </div>
                            {place.rating > 0 && (
                              <span style={{ fontFamily: FL, fontSize: 10, color: C.primary, flexShrink: 0 }}>
                                ⭐{place.rating}
                              </span>
                            )}
                            <button
                              onClick={() => onDeletePersonalPlace(place.id)}
                              style={{
                                fontFamily: FL, fontSize: 10,
                                padding: "3px 8px",
                                border: `1px solid ${C.outline}44`,
                                borderRadius: 4, background: "none",
                                color: C.outline, cursor: "pointer",
                                flexShrink: 0,
                              }}
                            >삭제</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 팔로잉 레이어 */}
            <div style={{ padding: "12px 0" }}>
              <div style={{ padding: "4px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: FH, fontSize: 15, fontWeight: 700, color: C.onSurface }}>팔로잉 맛집</span>
                <span style={{ fontFamily: FL, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: C.outline }}>
                  {followingList.length} people
                </span>
              </div>
              {followingList.length === 0 ? (
                <p style={{ fontFamily: FL, fontSize: 12, color: C.outline, padding: "0 20px", fontStyle: "italic" }}>
                  팔로우한 사람이 없어요
                </p>
              ) : (
                followingList.map((f, idx) => {
                  const color = getFollowingColor(idx);
                  const isSelected = selectedFollowingIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => onToggleFollowing(f.id)}
                      style={{
                        display: "flex", alignItems: "center", padding: "10px 20px",
                        background: isSelected ? `${color}10` : "transparent",
                        borderLeft: `3px solid ${isSelected ? color : "transparent"}`,
                        cursor: "pointer", gap: 12, transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 3,
                        border: `1.5px solid ${isSelected ? color : C.outline}`,
                        background: isSelected ? color : "transparent",
                        flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isSelected && <span style={{ color: "white", fontSize: 10 }}>✓</span>}
                      </div>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: FL, fontSize: 11, color: "white", fontWeight: 700, flexShrink: 0,
                      }}>
                        {f.nickname?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontFamily: FH, fontSize: 13, fontWeight: 700, color: C.onSurface,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{f.nickname}</p>
                        {f.place_count !== undefined && (
                          <p style={{ margin: 0, fontFamily: FL, fontSize: 10, color: C.outline }}>
                            {f.place_count} places
                          </p>
                        )}
                      </div>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {pendingPlace && (
        <SavePlaceModal place={pendingPlace} onSave={onAddPersonalPlace} onClose={() => setPendingPlace(null)} />
      )}
    </>
  );
}
