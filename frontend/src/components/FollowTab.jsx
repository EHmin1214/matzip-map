// src/components/FollowTab.jsx
// 디자인: The Curated Archive — 에디토리얼 레이아웃
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = { primary: "#655d54", primaryDim: "#595149", primaryContainer: "#ede0d5", bg: "#faf9f6", container: "#edeeea", containerLow: "#f4f4f0", containerLowest: "#ffffff", onSurface: "#2f3430" };

const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎" };
const isMobile = () => window.innerWidth <= 768;

// ── 프로필 바텀 시트 (모바일) / 모달 (데스크탑) ──────────────────
function ProfileSheet({ userData, onClose, followStatus, onFollowToggle, loadingFollow }) {
  const { user } = useUser();
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    if (!userData) return;
    if (userData.is_public || followStatus === "accepted") {
      axios.get(`${API_BASE}/personal-places/?user_id=${userData.id}`)
        .then((res) => setPlaces(res.data.slice(0, 8))).catch(() => {});
    }
  }, [userData, followStatus]);

  if (!userData) return null;
  const mobile = isMobile();

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(47,52,48,0.3)", backdropFilter: "blur(4px)",
      zIndex: 200, display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center",
    }}>
      <div style={{
        background: C.bg,
        borderRadius: mobile ? "20px 20px 0 0" : 16,
        width: mobile ? "100%" : 440,
        maxHeight: mobile ? "80vh" : "80vh",
        overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(47,52,48,0.12)",
      }}>
        {/* 핸들 */}
        {mobile && <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}><div style={{ width: 32, height: 3, background: "#d6d3d1", borderRadius: 2 }} /></div>}

        <div style={{ padding: mobile ? "12px 24px 32px" : "28px 32px" }}>
          {/* 닫기 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#a8a29e", cursor: "pointer", padding: 4 }}>×</button>
          </div>

          {/* 프로필 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: `linear-gradient(135deg, #595149, #655d54)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FH, fontStyle: "italic", fontSize: 22, color: "#fff6ef", fontWeight: 700, flexShrink: 0,
            }}>
              {userData.nickname?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 4px", fontFamily: FH, fontSize: 22, fontWeight: 700, color: C.onSurface }}>{userData.nickname}</h3>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontFamily: FL, fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600, background: userData.is_public ? "#e8f5e9" : C.containerLow, color: userData.is_public ? "#2e7d32" : "#a8a29e" }}>
                  {userData.is_public ? "공개" : "비공개"}
                </span>
                <span style={{ fontFamily: FL, fontSize: 11, color: "#a8a29e" }}>팔로워 {userData.follower_count || 0}</span>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                {userData.instagram_url && <a href={userData.instagram_url} target="_blank" rel="noreferrer" style={{ fontFamily: FL, fontSize: 11, color: C.primary, textDecoration: "none", fontWeight: 600 }}>📷 Instagram</a>}
                {userData.blog_url && <a href={userData.blog_url} target="_blank" rel="noreferrer" style={{ fontFamily: FL, fontSize: 11, color: "#3B8BD4", textDecoration: "none", fontWeight: 600 }}>✍️ 블로그</a>}
              </div>
            </div>
          </div>

          {/* 팔로우/언팔 버튼 */}
          {userData.id !== user?.user_id && (
            <button onClick={() => onFollowToggle(userData.id)} disabled={loadingFollow} style={{
              width: "100%", padding: "11px",
              background: followStatus === "accepted" ? "none" : C.primary,
              border: followStatus === "accepted" ? `1.5px solid rgba(175,179,174,0.4)` : "none",
              borderRadius: 6, fontFamily: FL, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: followStatus === "accepted" ? "#9e422c" : "#fff6ef",
              cursor: loadingFollow ? "not-allowed" : "pointer", marginBottom: 20,
            }}>
              {followStatus === "accepted" ? "언팔로우" : followStatus === "pending" ? "신청됨" : "팔로우"}
            </button>
          )}

          {/* 맛집 그리드 */}
          {(userData.is_public || followStatus === "accepted") && places.length > 0 ? (
            <div>
              <p style={{ fontFamily: FL, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a8a29e", margin: "0 0 12px" }}>최근 맛집</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {places.map((p) => (
                  <div key={p.id} style={{ background: C.containerLow, borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ margin: 0, fontFamily: FH, fontSize: 12, fontWeight: 700, color: C.onSurface }}>{STATUS_EMOJI[p.status] || "📍"} {p.name}</p>
                    {p.memo && <p style={{ margin: "4px 0 0", fontFamily: FL, fontSize: 10, color: "#a8a29e", fontStyle: "italic" }}>{p.memo}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : !userData.is_public && followStatus !== "accepted" ? (
            <div style={{ background: C.containerLow, borderRadius: 10, padding: "20px", textAlign: "center" }}>
              <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 15, color: "#a8a29e", margin: "0 0 6px" }}>비공개 계정이에요</p>
              <p style={{ fontFamily: FL, fontSize: 11, color: "#c7c4bf", margin: 0 }}>팔로우 수락 후 맛집을 볼 수 있어요</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── 메인 팔로우 탭 ────────────────────────────────────────────────
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
  const [profileSheet, setProfileSheet] = useState(null);

  const loadFollowing = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/follows/${user.user_id}/following`).then((res) => setFollowing(res.data)).catch(() => {});
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
        axios.get(`${API_BASE}/personal-places/?user_id=${res.data.id}`).then((r) => setSearchPlaces(r.data.slice(0, 6))).catch(() => {});
      }
    } catch (e) {
      setSearchError(e.response?.status === 404 ? "존재하지 않는 닉네임이에요" : "검색 중 오류가 발생했어요");
    } finally { setSearching(false); }
  };

  const getFollowStatus = (targetId) => {
    const f = following.find((f) => f.id === targetId);
    return f ? (f.status || "accepted") : "none";
  };

  const handleFollowToggle = async (targetId) => {
    if (!user) return;
    setLoadingFollow(true);
    const status = getFollowStatus(targetId);
    try {
      if (status !== "none") {
        if (status === "accepted" && !window.confirm("언팔로우 할까요?")) return;
        await axios.delete(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
        setFollowing((prev) => prev.filter((f) => f.id !== targetId));
        if (searchResult?.id === targetId) setSearchResult((prev) => ({ ...prev, follower_count: Math.max(0, prev.follower_count - 1) }));
      } else {
        const res = await axios.post(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
        if (searchResult?.id === targetId && res.data.status === "accepted") setSearchResult((prev) => ({ ...prev, follower_count: prev.follower_count + 1 }));
        loadFollowing();
      }
      if (onFollowChange) onFollowChange();
      // 프로필 시트도 업데이트
      if (profileSheet?.id === targetId) setProfileSheet((p) => ({ ...p }));
    } catch (e) { alert(e.response?.data?.detail || "오류가 발생했어요"); }
    finally { setLoadingFollow(false); }
  };

  const acceptedFollowing = following.filter((f) => f.status === "accepted");
  const pendingFollowing = following.filter((f) => f.status === "pending");

  return (
    <>
      <div style={{
        flex: 1, minHeight: "100vh", background: C.bg, overflowY: "auto",
        paddingBottom: mobile ? 64 : 0,
        WebkitOverflowScrolling: "touch",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: mobile ? "24px 20px" : "40px 40px" }}>

          {/* 에디토리얼 헤더 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: FH, fontSize: mobile ? 32 : 48, fontWeight: 400, color: C.onSurface, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
                Following
              </h2>
              <div style={{ width: 32, height: 2, background: C.primaryContainer }} />
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: FL, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: C.primary, display: "block" }}>
                {acceptedFollowing.length} Curators
              </span>
            </div>
          </div>

          {/* 검색 */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ position: "relative" }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#a8a29e" }}>search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="닉네임으로 검색"
                style={{
                  width: "100%", padding: "14px 14px 14px 46px",
                  background: C.containerLow, border: "none", borderRadius: 8,
                  fontFamily: FL, fontSize: 14, color: C.onSurface,
                  outline: "none", boxSizing: "border-box",
                  transition: "background 0.2s",
                }}
                onFocus={(e) => e.target.style.background = C.container}
                onBlur={(e) => e.target.style.background = C.containerLow}
              />
              <button onClick={handleSearch} disabled={searching} style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                padding: "7px 14px", background: searching ? C.container : C.primary,
                color: searching ? "#a8a29e" : "#fff6ef", border: "none", borderRadius: 6,
                fontFamily: FL, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                cursor: "pointer",
              }}>
                {searching ? "..." : "검색"}
              </button>
            </div>

            {searchError && <p style={{ fontFamily: FL, fontSize: 12, color: "#9e422c", margin: "8px 0 0" }}>{searchError}</p>}

            {/* 검색 결과 */}
            {searchResult && (
              <div style={{ marginTop: 12, background: C.containerLowest, borderRadius: 10, padding: mobile ? "16px" : "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* 아바타 — 클릭하면 프로필 */}
                  <div onClick={() => setProfileSheet(searchResult)} style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: `linear-gradient(135deg, #595149, #655d54)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FH, fontStyle: "italic", fontSize: 20, color: "#fff6ef", flexShrink: 0, cursor: "pointer",
                  }}>
                    {searchResult.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span onClick={() => setProfileSheet(searchResult)} style={{ fontFamily: FH, fontSize: 18, fontWeight: 700, color: C.onSurface, cursor: "pointer" }}>
                        {searchResult.nickname}
                      </span>
                      <span style={{ fontFamily: FL, fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600, background: searchResult.is_public ? "#e8f5e9" : C.containerLow, color: searchResult.is_public ? "#2e7d32" : "#a8a29e" }}>
                        {searchResult.is_public ? "공개" : "비공개"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
                      <span style={{ fontFamily: FL, fontSize: 11, color: "#a8a29e" }}>팔로워 <b style={{ color: "#78716c" }}>{searchResult.follower_count}</b></span>
                      {searchResult.is_public && <span style={{ fontFamily: FL, fontSize: 11, color: "#a8a29e" }}>맛집 <b style={{ color: "#78716c" }}>{searchResult.place_count}</b></span>}
                    </div>
                  </div>
                  {searchResult.id !== user?.user_id && (
                    <button onClick={() => handleFollowToggle(searchResult.id)} disabled={loadingFollow} style={{
                      padding: "8px 16px", border: getFollowStatus(searchResult.id) !== "none" ? "1px solid rgba(175,179,174,0.3)" : "none",
                      borderRadius: 6, background: getFollowStatus(searchResult.id) !== "none" ? "none" : C.primary,
                      fontFamily: FL, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                      color: getFollowStatus(searchResult.id) !== "none" ? "#78716c" : "#fff6ef",
                      cursor: loadingFollow ? "not-allowed" : "pointer",
                    }}>
                      {getFollowStatus(searchResult.id) === "accepted" ? "언팔로우" : getFollowStatus(searchResult.id) === "pending" ? "신청됨" : "팔로우"}
                    </button>
                  )}
                </div>

                {!searchResult.is_public && (
                  <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 13, color: "#a8a29e", margin: "14px 0 0" }}>
                    🔒 비공개 계정 — 팔로우 수락 후 맛집을 볼 수 있어요
                  </p>
                )}

                {searchResult.is_public && searchPlaces.length > 0 && (
                  <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {searchPlaces.map((p) => (
                      <span key={p.id} style={{ fontFamily: FL, fontSize: 11, padding: "4px 10px", background: C.containerLow, borderRadius: 4, color: "#78716c" }}>
                        {STATUS_EMOJI[p.status] || "📍"} {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 요청 대기 */}
          {pendingFollowing.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <p style={{ fontFamily: FL, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e", margin: "0 0 14px" }}>신청 대기 중</p>
              {pendingFollowing.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", opacity: 0.65, borderBottom: `1px solid ${C.container}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#d6d3d1", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FH, fontStyle: "italic", fontSize: 16, color: "#78716c", flexShrink: 0 }}>
                    {f.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontFamily: FH, fontSize: 15, color: "#78716c" }}>{f.nickname}</p>
                    <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: "#c7c4bf", letterSpacing: "0.08em" }}>팔로우 신청됨</p>
                  </div>
                  <button onClick={() => handleFollowToggle(f.id)} style={{ padding: "6px 12px", border: "1px solid rgba(175,179,174,0.3)", borderRadius: 6, background: "none", fontFamily: FL, fontSize: 10, color: "#a8a29e", cursor: "pointer" }}>취소</button>
                </div>
              ))}
            </section>
          )}

          {/* 팔로잉 목록 */}
          {acceptedFollowing.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 18, color: "#a8a29e", margin: "0 0 8px" }}>아직 팔로우한 사람이 없어요</p>
              <p style={{ fontFamily: FL, fontSize: 11, color: "#c7c4bf" }}>닉네임으로 검색해보세요</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {acceptedFollowing.map((f) => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 0", borderBottom: `1px solid ${C.container}`,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                  onClick={() => setProfileSheet(f)}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: `linear-gradient(135deg, #595149, #655d54)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FH, fontStyle: "italic", fontSize: 18, color: "#fff6ef", flexShrink: 0,
                  }}>
                    {f.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: FH, fontSize: 16, fontWeight: 700, color: C.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nickname}</p>
                    {f.place_count !== undefined && (
                      <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: "#a8a29e" }}>{f.place_count} places</p>
                    )}
                  </div>
                  {/* 언팔 버튼 */}
                  <button onClick={(e) => { e.stopPropagation(); handleFollowToggle(f.id); }} disabled={loadingFollow}
                    style={{ padding: "6px 12px", border: "1px solid rgba(158,66,44,0.2)", borderRadius: 6, background: "none", fontFamily: FL, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9e422c", cursor: "pointer" }}>
                    언팔로우
                  </button>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#d6d3d1" }}>chevron_right</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 프로필 시트 */}
      {profileSheet && (
        <ProfileSheet
          userData={profileSheet}
          onClose={() => setProfileSheet(null)}
          followStatus={getFollowStatus(profileSheet.id)}
          onFollowToggle={handleFollowToggle}
          loadingFollow={loadingFollow}
        />
      )}
    </>
  );
}
