// src/components/FollowTab.jsx
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const STATUS_EMOJI = {
  want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎",
};

const isMobile = () => window.innerWidth <= 768;

export default function FollowTab({ onViewMap, embedded = false, onFollowChange }) {
  const { user } = useUser();
  const mobile = isMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchPlaces, setSearchPlaces] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState([]);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const loadFollowing = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/follows/${user.user_id}/following`)
      .then((res) => setFollowing(res.data))
      .catch(() => {});
  }, [user]);

  useEffect(() => { loadFollowing(); }, [loadFollowing]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchError(""); setSearchResult(null); setSearchPlaces([]);
    setSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/users/${searchQuery.trim()}`);
      setSearchResult(res.data);
      if (res.data.is_public) {
        axios.get(`${API_BASE}/personal-places/?user_id=${res.data.id}`)
          .then((r) => setSearchPlaces(r.data.slice(0, 6)))
          .catch(() => {});
      }
    } catch (e) {
      setSearchError(e.response?.status === 404 ? "존재하지 않는 닉네임이에요" : "검색 중 오류가 발생했어요");
    } finally {
      setSearching(false);
    }
  };

  const getFollowStatus = (targetId) => {
    const f = following.find((f) => f.id === targetId);
    if (!f) return "none";
    return f.status || "accepted";
  };

  const handleFollowToggle = async (targetId) => {
    if (!user) return;
    setLoadingFollow(true);
    const currentStatus = getFollowStatus(targetId);
    try {
      if (currentStatus !== "none") {
        await axios.delete(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
        setFollowing((prev) => prev.filter((f) => f.id !== targetId));
        if (searchResult?.id === targetId) {
          setSearchResult((prev) => ({ ...prev, follower_count: Math.max(0, prev.follower_count - 1) }));
        }
      } else {
        const res = await axios.post(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
        if (searchResult?.id === targetId && res.data.status === "accepted") {
          setSearchResult((prev) => ({ ...prev, follower_count: prev.follower_count + 1 }));
        }
        loadFollowing();
      }
      if (onFollowChange) onFollowChange();
    } catch (e) {
      alert(e.response?.data?.detail || "오류가 발생했어요");
    } finally {
      setLoadingFollow(false);
    }
  };

  const containerStyle = embedded
    ? { height: "100%", overflowY: "auto", background: "white" }
    : {
        position: "fixed", inset: 0,
        background: "#f8f8f8", overflowY: "auto",
        paddingBottom: mobile ? 80 : 0, zIndex: 20,
        WebkitOverflowScrolling: "touch",
      };

  return (
    <div style={containerStyle}>
      {!embedded && (
        <div style={{
          background: "white", padding: "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#222" }}>팔로우</h2>
        </div>
      )}

      <div style={{ padding: embedded ? "12px" : mobile ? "16px" : "20px 16px" }}>

        {/* 검색창 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="닉네임으로 검색"
              style={{
                flex: 1,
                padding: mobile ? "12px 16px" : "10px 14px",
                border: "1.5px solid #eee", borderRadius: 12,
                fontSize: 15, outline: "none",
                WebkitAppearance: "none",
              }}
              onFocus={(e) => e.target.style.borderColor = "#E8593C"}
              onBlur={(e) => e.target.style.borderColor = "#eee"}
            />
            <button onClick={handleSearch} disabled={searching} style={{
              padding: mobile ? "12px 18px" : "10px 16px",
              minHeight: 44,
              background: "#E8593C", color: "white",
              border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}>
              {searching ? "..." : "검색"}
            </button>
          </div>

          {searchError && <p style={{ color: "#E8593C", fontSize: 13, marginTop: 8 }}>{searchError}</p>}

          {/* 검색 결과 */}
          {searchResult && (
            <div style={{
              background: "white", borderRadius: 16, padding: 16,
              marginTop: 12, border: "1px solid #f0f0f0",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "linear-gradient(135deg, #E8593C, #ff8a65)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, color: "white", fontWeight: 700, flexShrink: 0,
                }}>
                  {searchResult.nickname?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: "#222" }}>{searchResult.nickname}</span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600,
                      background: searchResult.is_public ? "#e8f5e9" : "#f5f5f5",
                      color: searchResult.is_public ? "#2e7d32" : "#888",
                    }}>
                      {searchResult.is_public ? "🌐 공개" : "🔒 비공개"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>팔로워 <b style={{ color: "#666" }}>{searchResult.follower_count}</b></span>
                    {searchResult.is_public && <span style={{ fontSize: 12, color: "#aaa" }}>맛집 <b style={{ color: "#666" }}>{searchResult.place_count}</b></span>}
                  </div>
                </div>
                {searchResult.id !== user?.user_id && (
                  <button
                    onClick={() => handleFollowToggle(searchResult.id)}
                    disabled={loadingFollow}
                    style={{
                      padding: "10px 16px", minHeight: 44,
                      background: getFollowStatus(searchResult.id) !== "none" ? "white" : "#E8593C",
                      border: getFollowStatus(searchResult.id) !== "none" ? "1.5px solid #ddd" : "none",
                      borderRadius: 12, fontSize: 14, fontWeight: 700,
                      color: getFollowStatus(searchResult.id) !== "none" ? "#888" : "white",
                      cursor: "pointer", flexShrink: 0,
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {getFollowStatus(searchResult.id) === "accepted" ? "팔로잉"
                      : getFollowStatus(searchResult.id) === "pending" ? "요청됨"
                      : "팔로우"}
                  </button>
                )}
              </div>

              {/* 맛집 미리보기 */}
              {searchResult.is_public && searchPlaces.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 8px", fontWeight: 600 }}>최근 맛집</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {searchPlaces.map((p) => (
                      <span key={p.id} style={{
                        fontSize: 12, padding: "6px 10px",
                        background: "#f8f8f8", border: "1px solid #f0f0f0",
                        borderRadius: 8, color: "#555",
                      }}>
                        {STATUS_EMOJI[p.status] || "📍"} {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!searchResult.is_public && (
                <div style={{
                  background: "#f8f8f8", borderRadius: 12, padding: "14px",
                  textAlign: "center", color: "#aaa", fontSize: 14,
                }}>
                  🔒 비공개 계정이에요
                  <br />
                  <span style={{ fontSize: 12 }}>팔로우 요청 후 수락되면 맛집을 볼 수 있어요</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 팔로잉 목록 */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 10 }}>
            팔로우 중 {following.filter(f => f.status === "accepted").length > 0 && (
              <span style={{ color: "#E8593C" }}>{following.filter(f => f.status === "accepted").length}</span>
            )}
          </p>

          {/* 대기 중 */}
          {following.filter(f => f.status === "pending").map((f) => (
            <div key={f.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 4px", opacity: 0.6,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "#ddd",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: "white", fontWeight: 700, flexShrink: 0,
              }}>
                {f.nickname?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#888" }}>{f.nickname}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>요청 대기 중...</p>
              </div>
              <button onClick={() => handleFollowToggle(f.id)} style={{
                padding: "8px 14px", minHeight: 40,
                background: "white", border: "1px solid #ddd",
                borderRadius: 10, fontSize: 13, color: "#888", cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}>취소</button>
            </div>
          ))}

          {/* 팔로잉 */}
          {following.filter(f => f.status === "accepted").length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#bbb" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
              <p style={{ fontSize: 15 }}>아직 팔로우한 사람이 없어요</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {following.filter(f => f.status === "accepted").map((f) => (
                <div key={f.id} style={{
                  background: "white", borderRadius: 14, padding: "14px 16px",
                  border: "1px solid #f0f0f0", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, #E8593C, #ff8a65)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, color: "white", fontWeight: 700, flexShrink: 0,
                  }}>
                    {f.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#222" }}>{f.nickname}</p>
                    {f.place_count !== undefined && (
                      <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>맛집 {f.place_count}개</p>
                    )}
                    {f.instagram_url && (
                      <a href={f.instagram_url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: "#E8593C", textDecoration: "none" }}>
                        📷 Instagram
                      </a>
                    )}
                  </div>
                  <button onClick={() => handleFollowToggle(f.id)} disabled={loadingFollow} style={{
                    padding: "9px 14px", minHeight: 40,
                    background: "white", border: "1.5px solid #ddd",
                    borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#888",
                    cursor: "pointer", WebkitTapHighlightColor: "transparent",
                  }}>팔로잉</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
