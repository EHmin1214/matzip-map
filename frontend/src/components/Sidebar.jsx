// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import FollowTab from "./FollowTab";
import SavePlaceModal from "./SavePlaceModal";
import ProfilePage from "./ProfilePage";
import NotificationTab from "./NotificationTab";
import ActivityFeed from "./ActivityFeed";

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

  const statusEmoji = (status) => {
    if (status === "want_to_go") return "🔖";
    if (status === "visited") return "✅";
    if (status === "want_revisit") return "❤️";
    if (status === "not_recommended") return "👎";
    return "📍";
  };

  const toggleFolder = (key) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const getFolderInfo = (folderId) => {
    if (!folderId) return { name: "미분류", color: "#aaa" };
    const f = folders.find((f) => f.id === folderId);
    return f ? { name: f.name, color: f.color } : { name: `폴더 ${folderId}`, color: "#888" };
  };

  const folderGroups = {};
  personalPlaces.forEach((p) => {
    const key = p.folder_id ? String(p.folder_id) : "none";
    if (!folderGroups[key]) folderGroups[key] = [];
    folderGroups[key].push(p);
  });
  const folderOrder = [
    ...Object.keys(folderGroups).filter((k) => k !== "none"),
    ...(folderGroups["none"] ? ["none"] : []),
  ];
  const hasMultipleFolders = folderOrder.length > 1;

  const FOLLOWING_COLORS = ["#3B8BD4", "#1D9E75", "#BA7517", "#7F77DD", "#D4537E", "#0F6E56"];
  const getFollowingColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

  return (
    <>
      <div style={{
        width: 280, height: "100vh", background: "white",
        boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column",
        zIndex: 10, position: "relative",
      }}>
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #f0f0f0" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#1a1a1a" }}>🍽 맛집 지도</h1>
        </div>

        {/* 탭바 */}
        <div style={{ display: "flex", background: "#f8f8f8", borderBottom: "1px solid #f0f0f0", padding: "6px", gap: 3 }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setSidebarTab(tab.id)} style={{
              flex: 1, padding: "7px 0",
              border: "none", borderRadius: 8,
              fontSize: 10, fontWeight: 600, cursor: "pointer",
              background: sidebarTab === tab.id ? "white" : "transparent",
              color: sidebarTab === tab.id ? "#E8593C" : "#888",
              boxShadow: sidebarTab === tab.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              position: "relative",
            }}>
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  position: "absolute", top: 1, right: 2,
                  background: "#E8593C", color: "white",
                  borderRadius: "50%", width: 12, height: 12,
                  fontSize: 8, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {sidebarTab === "feed" && <div style={{ flex: 1, overflow: "hidden" }}><ActivityFeed embedded onPlaceClick={onActivityPlaceClick} /></div>}
        {sidebarTab === "follow" && <div style={{ flex: 1, overflow: "hidden" }}><FollowTab onViewMap={() => {}} embedded onFollowChange={onFollowChange} /></div>}
        {sidebarTab === "notify" && <div style={{ flex: 1, overflow: "hidden" }}><NotificationTab embedded onUnreadChange={onUnreadChange} /></div>}
        {sidebarTab === "profile" && <div style={{ flex: 1, overflow: "hidden" }}><ProfilePage embedded /></div>}

        {sidebarTab === "my" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* 가게 검색 */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>가게 검색</p>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchPlace()}
                  placeholder="가게명 검색"
                  style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                />
                <button onClick={searchPlace} disabled={searching} style={{
                  padding: "7px 12px", background: searching ? "#f5f5f5" : "#1a1a1a",
                  color: searching ? "#888" : "white", border: "none", borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                }}>
                  {searching ? "..." : "검색"}
                </button>
              </div>
              {message && <p style={{ fontSize: 12, color: "#E8593C", margin: "6px 0 0" }}>{message}</p>}
            </div>

            {/* 내 맛집 — 체크박스로 지도 표시/숨김 */}
            <div style={{ borderBottom: "1px solid #f0f0f0" }}>
              <div
                style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 8 }}
              >
                {/* 체크박스 */}
                <div
                  onClick={() => setShowPersonal(!showPersonal)}
                  style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${showPersonal ? "#E8593C" : "#ddd"}`,
                    background: showPersonal ? "#E8593C" : "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {showPersonal && <span style={{ color: "white", fontSize: 11 }}>✓</span>}
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, cursor: "pointer" }}
                  onClick={() => setShowPersonal(!showPersonal)}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E8593C", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>내 맛집</span>
                  <span style={{ fontSize: 11, color: "#888" }}>({personalPlaces.length})</span>
                </div>

                {/* 접기 화살표 */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    // 폴더 전체 토글
                    if (collapsedFolders.size > 0) setCollapsedFolders(new Set());
                    else setCollapsedFolders(new Set(folderOrder));
                  }}
                  style={{ fontSize: 11, color: "#aaa", cursor: "pointer" }}
                >
                  {collapsedFolders.size > 0 ? "▼" : "▲"}
                </span>
              </div>

              {/* 폴더별 맛집 */}
              {collapsedFolders.size === 0 && (
                <div style={{ paddingBottom: 8 }}>
                  {personalPlaces.length === 0 && (
                    <p style={{ fontSize: 12, color: "#bbb", padding: "0 16px 8px" }}>가게를 검색해서 추가해보세요</p>
                  )}
                  {folderOrder.map((key) => {
                    const places = folderGroups[key] || [];
                    const isNone = key === "none";
                    const folderInfo = isNone ? { name: "미분류", color: "#aaa" } : getFolderInfo(Number(key));
                    const isCollapsed = collapsedFolders.has(key);

                    return (
                      <div key={key}>
                        {hasMultipleFolders && (
                          <div
                            onClick={() => toggleFolder(key)}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px 4px", cursor: "pointer", background: "#fafafa" }}
                          >
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: folderInfo.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#555" }}>{folderInfo.name}</span>
                            <span style={{ fontSize: 10, color: "#bbb" }}>({places.length})</span>
                            <span style={{ fontSize: 10, color: "#ccc", marginLeft: "auto" }}>{isCollapsed ? "▼" : "▲"}</span>
                          </div>
                        )}
                        {!isCollapsed && places.map((place) => (
                          <div key={place.id} style={{
                            display: "flex", alignItems: "center",
                            padding: hasMultipleFolders ? "6px 16px 6px 26px" : "6px 16px", gap: 8,
                          }}>
                            {!isNone && hasMultipleFolders && (
                              <div style={{ width: 3, height: 30, borderRadius: 2, background: folderInfo.color, flexShrink: 0 }} />
                            )}
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{statusEmoji(place.status)}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.name}</p>
                              {place.memo && <p style={{ margin: 0, fontSize: 10, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.memo}</p>}
                            </div>
                            {place.rating > 0 && <span style={{ fontSize: 10, color: "#E8593C", flexShrink: 0 }}>⭐{place.rating}</span>}
                            <button onClick={() => onDeletePersonalPlace(place.id)} style={{
                              fontSize: 11, padding: "3px 8px", border: "1px solid #ddd",
                              borderRadius: 6, background: "white", color: "#888", cursor: "pointer", flexShrink: 0,
                            }}>삭제</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 팔로잉 레이어 */}
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: 12, color: "#888", padding: "4px 16px 8px" }}>팔로잉 맛집 ({followingList.length})</p>
              {followingList.length === 0 ? (
                <p style={{ fontSize: 12, color: "#bbb", padding: "0 16px" }}>팔로우한 사람이 없어요</p>
              ) : (
                followingList.map((f, idx) => {
                  const color = getFollowingColor(idx);
                  const isSelected = selectedFollowingIds.includes(f.id);
                  return (
                    <div key={f.id} style={{
                      display: "flex", alignItems: "center", padding: "8px 16px",
                      background: isSelected ? `${color}12` : "white",
                      borderLeft: `3px solid ${isSelected ? color : "transparent"}`,
                      cursor: "pointer", gap: 10, transition: "all 0.15s",
                    }} onClick={() => onToggleFollowing(f.id)}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 4,
                        border: `1.5px solid ${isSelected ? color : "#ddd"}`,
                        background: isSelected ? color : "white", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isSelected && <span style={{ color: "white", fontSize: 10 }}>✓</span>}
                      </div>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", background: color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, color: "white", fontWeight: 700, flexShrink: 0,
                      }}>
                        {f.nickname?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nickname}</p>
                        {f.place_count !== undefined && <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>맛집 {f.place_count}개</p>}
                      </div>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
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

const inputStyle = {
  width: "100%", padding: "7px 10px",
  border: "1px solid #e0e0e0", borderRadius: 8,
  boxSizing: "border-box", outline: "none",
};
