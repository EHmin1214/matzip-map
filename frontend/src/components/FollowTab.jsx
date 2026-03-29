// src/components/FollowTab.jsx
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const STATUS_EMOJI = {
  want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎",
};

const isMobile = () => window.innerWidth <= 768;

// ── 프로필 보기 모달 ──────────────────────────────────────────
function ProfileModal({ userData, onClose, onFollowToggle, followStatus, loadingFollow }) {
  const { user } = useUser();
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    if (!userData) return;
    if (userData.is_public || followStatus === "accepted") {
      axios.get(`${API_BASE}/personal-places/?user_id=${userData.id}`)
        .then((res) => setPlaces(res.data.slice(0, 8)))
        .catch(() => {});
    }
  }, [userData, followStatus]);

  if (!userData) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 200,
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div style={{
        background: "white",
        borderRadius: "20px 20px 0 0",
        width: "100%",
        maxHeight: "80vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {/* 핸들 */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2 }} />
        </div>

        <div style={{ padding: "12px 20px 32px" }}>
          {/* 닫기 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={onClose} style={{
              background: "none", border: "none", fontSize: 22, color: "#aaa", cursor: "pointer", padding: 4,
            }}>×</button>
          </div>

          {/* 프로필 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg, #E8593C, #ff8a65)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, color: "white", fontWeight: 800, flexShrink: 0,
            }}>
              {userData.nickname?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a" }}>{userData.nickname}</span>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600,
                  background: userData.is_public ? "#e8f5e9" : "#f5f5f5",
                  color: userData.is_public ? "#2e7d32" : "#888",
                }}>
                  {userData.is_public ? "🌐 공개" : "🔒 비공개"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                <span style={{ fontSize: 13, color: "#aaa" }}>팔로워 <b style={{ color: "#555" }}>{userData.follower_count || 0}</b></span>
                <span style={{ fontSize: 13, color: "#aaa" }}>맛집 <b style={{ color: "#555" }}>{userData.place_count || 0}</b></span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                {userData.instagram_url && (
                  <a href={userData.instagram_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: "#E8593C", textDecoration: "none" }}>📷 Instagram</a>
                )}
                {userData.blog_url && (
                  <a href={userData.blog_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: "#3B8BD4", textDecoration: "none" }}>✍️ 블로그</a>
                )}
              </div>
            </div>
          </div>

          {/* 팔로우/언팔로우 버튼 */}
          {userData.id !== user?.user_id && (
            <button
              onClick={() => onFollowToggle(userData.id)}
              disabled={loadingFollow}
              style={{
                width: "100%", padding: "13px",
                background: followStatus !== "none" ? "white" : "#E8593C",
                border: followStatus !== "none" ? "1.5px solid #ddd" : "none",
                borderRadius: 14, fontSize: 15, fontWeight: 700,
                color: followStatus !== "none" ? "#888" : "white",
                cursor: loadingFollow ? "not-allowed" : "pointer",
                marginBottom: 20,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {followStatus === "accepted" ? "언팔로우"
                : followStatus === "pending" ? "신청됨"
                : "팔로우"}
            </button>
          )}

          {/* 맛집 목록 */}
          {(userData.is_public || followStatus === "accepted") && places.length > 0 ? (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#888", margin: "0 0 12px" }}>
                최근 맛집
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {places.map((p) => (
                  <div key={p.id} style={{
                    background: "#f8f8f8", borderRadius: 12,
                    padding: "10px 12px",
                  }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                      {STATUS_EMOJI[p.status] || "📍"} {p.name}
                    </p>
                    {p.memo && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#aaa" }}>{p.memo}</p>}
                    {p.rating > 0 && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#E8593C" }}>{"⭐".repeat(p.rating)}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : !userData.is_public && followStatus !== "accepted" ? (
            <div style={{
              background: "#f8f8f8", borderRadius: 14, padding: "20px",
              textAlign: "center", color: "#aaa",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
              <p style={{ fontSize: 14, margin: 0 }}>비공개 계정이에요</p>
              <p style={{ fontSize: 12, margin: "6px 0 0" }}>팔로우 수락 후 맛집을 볼 수 있어요</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── 메인 팔로우 탭 ────────────────────────────────────────────
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
  const [profileModal, setProfileModal] = useState(null); // 프로필 모달 대상 유저

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
        if (currentStatus === "accepted" && !window.confirm("언팔로우 할까요?")) return;
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
        position: "fixed", inset: 0, background: "#f8f8f8",
        overflowY: "auto", paddingBottom: mobile ? 80 : 0,
        zIndex: 20, WebkitOverflowScrolling: "touch",
      };

  // 팔로우 버튼 텍스트
  const getFollowButtonLabel = (status) => {
    if (status === "accepted") return "언팔로우";
    if (status === "pending") return "신청됨";
    return "팔로우";
  };

  const getFollowButtonStyle = (status) => ({
    padding: "9px 14px", minHeight: 40,
    background: status === "accepted" ? "white"
      : status === "pending" ? "#f5f5f5" : "#E8593C",
    border: status !== "none" ? "1.5px solid #ddd" : "none",
    borderRadius: 10, fontSize: 13, fontWeight: 700,
    color: status === "accepted" ? "#E8593C"
      : status === "pending" ? "#aaa" : "white",
    cursor: loadingFollow ? "not-allowed" : "pointer",
    flexShrink: 0,
    WebkitTapHighlightColor: "transparent",
  });

  return (
    <>
      <div style={containerStyle}>
        {!embedded && (
          <div style={{ background: "white", padding: "16px 20px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#222" }}>팔로우</h2>
          </div>
        )}

        <div style={{ padding: embedded ? "12px" : mobile ? "16px" : "20px 16px" }}>

          {/* 검색 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="닉네임으로 검색"
                style={{
                  flex: 1, padding: mobile ? "12px 16px" : "10px 14px",
                  border: "1.5px solid #eee", borderRadius: 12,
                  fontSize: 16, // ← 줌인 방지
                  outline: "none", WebkitAppearance: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#E8593C"}
                onBlur={(e) => e.target.style.borderColor = "#eee"}
              />
              <button onClick={handleSearch} disabled={searching} style={{
                padding: mobile ? "12px 18px" : "10px 16px", minHeight: 44,
                background: "#E8593C", color: "white", border: "none",
                borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}>
                {searching ? "..." : "검색"}
              </button>
            </div>

            {searchError && <p style={{ color: "#E8593C", fontSize: 13, marginTop: 8 }}>{searchError}</p>}

            {searchResult && (
              <div style={{
                background: "white", borderRadius: 16, padding: 16,
                marginTop: 12, border: "1px solid #f0f0f0",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* 아바타 — 클릭하면 프로필 모달 */}
                  <div
                    onClick={() => setProfileModal(searchResult)}
                    style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: "linear-gradient(135deg, #E8593C, #ff8a65)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, color: "white", fontWeight: 700, flexShrink: 0,
                      cursor: "pointer",
                    }}
                  >
                    {searchResult.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span
                        onClick={() => setProfileModal(searchResult)}
                        style={{ fontWeight: 700, fontSize: 16, color: "#222", cursor: "pointer" }}
                      >
                        {searchResult.nickname}
                      </span>
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
                      style={getFollowButtonStyle(getFollowStatus(searchResult.id))}
                    >
                      {getFollowButtonLabel(getFollowStatus(searchResult.id))}
                    </button>
                  )}
                </div>

                {searchResult.is_public && searchPlaces.length > 0 && (
                  <div style={{ marginTop: 12 }}>
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
                  <div style={{ background: "#f8f8f8", borderRadius: 12, padding: "14px", marginTop: 12, textAlign: "center", color: "#aaa", fontSize: 14 }}>
                    🔒 비공개 계정 — 팔로우 수락 후 맛집을 볼 수 있어요
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 팔로잉 목록 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 10 }}>
              팔로우 중{" "}
              {following.filter(f => f.status === "accepted").length > 0 && (
                <span style={{ color: "#E8593C" }}>{following.filter(f => f.status === "accepted").length}</span>
              )}
            </p>

            {/* 요청 대기 */}
            {following.filter(f => f.status === "pending").map((f) => (
              <div key={f.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 4px", opacity: 0.7,
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
                  <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>팔로우 신청됨</p>
                </div>
                <button onClick={() => handleFollowToggle(f.id)} style={{
                  padding: "8px 14px", minHeight: 40,
                  background: "#f5f5f5", border: "1.5px solid #ddd",
                  borderRadius: 10, fontSize: 13, color: "#aaa", cursor: "pointer",
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
                    border: "1px solid #f0f0f0",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    {/* 아바타 — 클릭하면 프로필 모달 */}
                    <div
                      onClick={() => setProfileModal(f)}
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "linear-gradient(135deg, #E8593C, #ff8a65)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, color: "white", fontWeight: 700, flexShrink: 0,
                        cursor: "pointer",
                      }}
                    >
                      {f.nickname?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        onClick={() => setProfileModal(f)}
                        style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#222", cursor: "pointer" }}
                      >
                        {f.nickname}
                      </p>
                      {f.place_count !== undefined && (
                        <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>맛집 {f.place_count}개</p>
                      )}
                    </div>
                    {/* 언팔로우 버튼 */}
                    <button
                      onClick={() => handleFollowToggle(f.id)}
                      disabled={loadingFollow}
                      style={{
                        padding: "9px 14px", minHeight: 40,
                        background: "white",
                        border: "1.5px solid #ffcdd2",
                        borderRadius: 10, fontSize: 13, fontWeight: 700,
                        color: "#e53935",
                        cursor: loadingFollow ? "not-allowed" : "pointer",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      언팔로우
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 프로필 모달 */}
      {profileModal && (
        <ProfileModal
          userData={profileModal}
          onClose={() => setProfileModal(null)}
          onFollowToggle={handleFollowToggle}
          followStatus={getFollowStatus(profileModal.id)}
          loadingFollow={loadingFollow}
        />
      )}
    </>
  );
}
