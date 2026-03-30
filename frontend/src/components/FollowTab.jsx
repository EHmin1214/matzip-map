// src/components/FollowTab.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary:          "#655d54",
  primaryDim:       "#595149",
  primaryContainer: "#ede0d5",
  bg:               "#faf9f6",
  surfaceLow:       "#f4f4f0",
  surfaceLowest:    "#ffffff",
  container:        "#edeeea",
  onSurface:        "#2f3430",
  onSurfaceVariant: "#5c605c",
  outlineVariant:   "#afb3ae",
  error:            "#9e422c",
};
const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎" };
const isMobile = () => window.innerWidth <= 768;

// ── 아바타 ────────────────────────────────────────────────────
function Avatar({ nickname, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FH, fontStyle: "italic",
      fontSize: size * 0.4, color: "#fff6ef", fontWeight: 700,
    }}>
      {nickname?.[0]?.toUpperCase()}
    </div>
  );
}

// ── 미니 맵 프리뷰 ────────────────────────────────────────────
function PlaceMiniMap({ places, expanded, onToggle }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const STATUS_DOT = {
    want_to_go: "#BA7517", visited: "#1D9E75",
    want_revisit: "#D4537E", not_recommended: "#afb3ae",
  };

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;
    const check = setInterval(() => {
      if (window.naver?.maps) {
        clearInterval(check);
        const bounds = new window.naver.maps.LatLngBounds();
        places.forEach((p) => bounds.extend(new window.naver.maps.LatLng(p.lat, p.lng)));
        mapInstance.current = new window.naver.maps.Map(mapRef.current, {
          center: bounds.getCenter(), zoom: 12,
          mapTypeControl: false, scaleControl: false,
          logoControl: false, mapDataControl: false,
          zoomControl: false,
          draggable: expanded, scrollWheel: expanded,
          keyboardShortcuts: false,
          disableDoubleTapZoom: !expanded,
          disableDoubleClickZoom: !expanded,
          disableTwoFingerTapZoom: !expanded,
        });
        if (places.length > 1) mapInstance.current.fitBounds(bounds, { padding: 30 });
        else mapInstance.current.setZoom(14);
        places.forEach((p) => {
          const color = STATUS_DOT[p.status] || "#655d54";
          new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(p.lat, p.lng),
            map: mapInstance.current,
            icon: {
              content: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
              anchor: new window.naver.maps.Point(5, 5),
            },
          });
        });
      }
    }, 100);
    return () => {
      clearInterval(check);
      if (mapInstance.current) { mapInstance.current.destroy(); mapInstance.current = null; }
    };
  }, [places, expanded]); // eslint-disable-line

  if (places.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8,
      }}>
        <p style={{
          fontFamily: FL, fontSize: 9, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.15em",
          color: C.outlineVariant, margin: 0,
        }}>
          지도 프리뷰 — {places.length}곳
        </p>
        <button
          onClick={onToggle}
          style={{
            background: "none", border: "none",
            fontFamily: FL, fontSize: 10, fontWeight: 600,
            color: C.primary, cursor: "pointer",
          }}
        >
          {expanded ? "축소" : "확대"}
        </button>
      </div>
      <div
        ref={mapRef}
        onClick={!expanded ? onToggle : undefined}
        style={{
          width: "100%",
          height: expanded ? 280 : 140,
          borderRadius: 10, overflow: "hidden",
          background: C.surfaceLow,
          cursor: expanded ? "default" : "pointer",
          transition: "height 0.3s ease",
        }}
      />
    </div>
  );
}

// ── 프로필 모달 (바텀시트 / 다이얼로그) — createPortal ────────
function ProfileSheet({ userData, onClose, followStatus, onFollowToggle, loadingFollow }) {
  const { user } = useUser();
  const [places, setPlaces] = useState([]);
  const [mapExpanded, setMapExpanded] = useState(false);
  const mobile = isMobile();

  useEffect(() => {
    if (!userData) return;
    if (userData.is_public || followStatus === "accepted") {
      axios.get(`${API_BASE}/personal-places/?user_id=${userData.id}`)
        .then((res) => setPlaces(res.data)).catch(() => {});
    }
  }, [userData, followStatus]);

  if (!userData) return null;

  const canSeePlaces = userData.is_public || followStatus === "accepted";
  const isPending = followStatus === "pending";
  const isFollowing = followStatus === "accepted";

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(47,52,48,0.28)",
        backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
        zIndex: 200,
        display: "flex",
        alignItems: mobile ? "flex-end" : "center",
        justifyContent: "center",
      }}
    >
      <div style={{
        background: C.bg,
        borderRadius: mobile ? "20px 20px 0 0" : 16,
        width: mobile ? "100%" : 480,
        maxHeight: mobile ? "88vh" : "85vh",
        overflowY: "auto",
        boxShadow: mobile
          ? "0 -8px 40px rgba(47,52,48,0.12)"
          : "0 20px 60px rgba(47,52,48,0.18)",
        WebkitOverflowScrolling: "touch",
      }}>
        {mobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
            <div style={{ width: 32, height: 3, background: C.container, borderRadius: 2 }} />
          </div>
        )}

        <div style={{ padding: mobile ? "12px 24px 32px" : "28px 32px 32px" }}>
          {/* 닫기 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <button
              onClick={onClose}
              style={{
                background: C.surfaceLow, border: "none",
                borderRadius: "50%", width: 28, height: 28,
                fontSize: 14, color: C.outlineVariant,
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>

          {/* 프로필 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <Avatar nickname={userData.nickname} size={54} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 6px", fontFamily: FH, fontSize: 20, fontWeight: 700, color: C.onSurface }}>
                {userData.nickname}
              </h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{
                  fontFamily: FL, fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
                  background: userData.is_public ? "#e0f4ec" : C.surfaceLow,
                  color: userData.is_public ? "#1D9E75" : C.outlineVariant,
                }}>
                  {userData.is_public ? "공개" : "비공개"}
                </span>
                <span style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>
                  팔로워 {userData.follower_count || 0}
                </span>
              </div>
              {(userData.instagram_url || userData.blog_url) && (
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  {userData.instagram_url && (
                    <a href={userData.instagram_url} target="_blank" rel="noreferrer"
                      style={{ fontFamily: FL, fontSize: 11, color: C.primary, textDecoration: "none", fontWeight: 600 }}>
                      Instagram
                    </a>
                  )}
                  {userData.blog_url && (
                    <a href={userData.blog_url} target="_blank" rel="noreferrer"
                      style={{ fontFamily: FL, fontSize: 11, color: "#3B8BD4", textDecoration: "none", fontWeight: 600 }}>
                      블로그
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 팔로우 버튼 */}
          {userData.id !== user?.user_id && (
            <button
              onClick={() => onFollowToggle(userData.id)}
              disabled={loadingFollow}
              style={{
                width: "100%", padding: "11px",
                background: isFollowing ? "transparent" : isPending ? "rgba(101,93,84,0.08)" : C.primary,
                border: isFollowing ? "1px solid rgba(158,66,44,0.2)" : isPending ? "1px solid rgba(101,93,84,0.15)" : "none",
                borderRadius: 8,
                fontFamily: FL, fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: isFollowing ? C.error : isPending ? C.outlineVariant : "#fff6ef",
                cursor: loadingFollow ? "not-allowed" : "pointer",
                marginBottom: 20,
                transition: "all 0.35s ease",
              }}
              onMouseEnter={(e) => { if (!loadingFollow) e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              {isFollowing ? "언팔로우" : isPending ? "신청됨" : "팔로우"}
            </button>
          )}

          {/* 미니 맵 프리뷰 */}
          {canSeePlaces && (
            <PlaceMiniMap
              places={places}
              expanded={mapExpanded}
              onToggle={() => setMapExpanded((v) => !v)}
            />
          )}

          {/* 맛집 그리드 */}
          {canSeePlaces && places.length > 0 && (
            <div>
              <p style={{
                fontFamily: FL, fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.15em",
                color: C.outlineVariant, margin: "0 0 12px",
              }}>
                최근 맛집
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {places.slice(0, 8).map((p) => (
                  <div key={p.id} style={{
                    background: C.surfaceLow,
                    borderRadius: 8, padding: "10px 12px",
                  }}>
                    <p style={{ margin: 0, fontFamily: FH, fontSize: 12, fontWeight: 600, color: C.onSurface, lineHeight: 1.4 }}>
                      {STATUS_EMOJI[p.status] || "📍"} {p.name}
                    </p>
                    {p.memo && (
                      <p style={{ margin: "4px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant, fontStyle: "italic" }}>
                        {p.memo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!canSeePlaces && (
            <div style={{ background: C.surfaceLow, borderRadius: 10, padding: "24px", textAlign: "center" }}>
              <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 15, color: C.outlineVariant, margin: "0 0 6px" }}>
                비공개 계정이에요
              </p>
              <p style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant, margin: 0, opacity: 0.7 }}>
                팔로우 수락 후 맛집을 볼 수 있어요
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── 팔로우 아이템 (Rule of Silence: spacing not dividers) ───────
function FollowItem({ f, onOpen, onUnfollow, loadingFollow }) {
  return (
    <div
      onClick={() => onOpen(f)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 14px",
        borderRadius: 10,
        background: C.surfaceLowest,
        cursor: "pointer",
        transition: "background 0.15s",
        /* Elevation: surfaceLowest on surfaceLow background = subtle lift */
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "#f9f8f5"}
      onMouseLeave={(e) => e.currentTarget.style.background = C.surfaceLowest}
    >
      <Avatar nickname={f.nickname} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontFamily: FH, fontSize: 15, fontWeight: 700,
          color: C.onSurface, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {f.nickname}
        </p>
        {f.place_count !== undefined && (
          <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
            {f.place_count} places
          </p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onUnfollow(f.id); }}
        disabled={loadingFollow}
        style={{
          padding: "5px 10px",
          /* Ghost border at 15% opacity */
          border: "1px solid rgba(158,66,44,0.2)",
          borderRadius: 6, background: "none",
          fontFamily: FL, fontSize: 10, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: C.error, cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(158,66,44,0.06)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
      >
        언팔로우
      </button>
    </div>
  );
}

// ── 신청 대기 아이템 ─────────────────────────────────────────
function PendingItem({ f, onCancel, loadingFollow }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 14px",
      borderRadius: 10, background: C.surfaceLowest,
      opacity: 0.7,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: C.container,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FH, fontStyle: "italic", fontSize: 16, color: C.outlineVariant,
      }}>
        {f.nickname?.[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontFamily: FH, fontSize: 15, color: C.onSurface }}>{f.nickname}</p>
        <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant, letterSpacing: "0.08em" }}>
          신청 대기중
        </p>
      </div>
      <button
        onClick={() => onCancel(f.id)}
        disabled={loadingFollow}
        style={{
          padding: "5px 10px",
          border: "1px solid rgba(101,93,84,0.15)",
          borderRadius: 6, background: "none",
          fontFamily: FL, fontSize: 10, color: C.outlineVariant, cursor: "pointer",
        }}
      >
        취소
      </button>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────
export default function FollowTab({ onViewMap, onFollowChange }) {
  const { user } = useUser();
  const mobile = isMobile();
  const [activeSubTab, setActiveSubTab] = useState("팔로잉");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchPlaces, setSearchPlaces] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [profileSheet, setProfileSheet] = useState(null);

  const loadFollowing = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/follows/${user.user_id}/following`)
      .then((res) => setFollowing(res.data)).catch(() => {});
  }, [user]);

  const loadFollowers = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/follows/${user.user_id}/followers`)
      .then((res) => setFollowers(res.data)).catch(() => {});
  }, [user]);

  useEffect(() => { loadFollowing(); loadFollowers(); }, [loadFollowing, loadFollowers]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchError(""); setSearchResult(null); setSearchPlaces([]);
    setSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/users/${searchQuery.trim()}`);
      setSearchResult(res.data);
      if (res.data.is_public) {
        axios.get(`${API_BASE}/personal-places/?user_id=${res.data.id}`)
          .then((r) => setSearchPlaces(r.data.slice(0, 6))).catch(() => {});
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
      if (profileSheet?.id === targetId) setProfileSheet((p) => ({ ...p }));
      loadFollowers();
    } catch (e) {
      alert(e.response?.data?.detail || "오류가 발생했어요");
    } finally { setLoadingFollow(false); }
  };

  const acceptedFollowing = following.filter((f) => f.status === "accepted");
  const pendingFollowing  = following.filter((f) => f.status === "pending");

  return (
    <>
      <div style={{
        flex: 1, minHeight: "100vh",
        background: C.bg, overflowY: "auto",
        paddingBottom: mobile ? 72 : 0,
        WebkitOverflowScrolling: "touch",
      }}>
        <div style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: mobile ? "28px 20px" : "36px 32px",
        }}>

          {/* ── Archival Header ────────────────────────────── */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-end", marginBottom: 28,
          }}>
            <div>
              <h2 style={{
                fontFamily: FH, fontSize: mobile ? 30 : 40,
                fontWeight: 400, fontStyle: "italic",
                color: C.onSurface, margin: "0 0 8px",
                letterSpacing: "-0.02em",
              }}>
                {activeSubTab === "팔로잉" ? "Following" : "Followers"}
              </h2>
              <div style={{ width: 28, height: 1.5, background: C.primaryContainer }} />
            </div>
            <span style={{
              fontFamily: FL, fontSize: 9, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.2em",
              color: C.primary,
            }}>
              {activeSubTab === "팔로잉" ? `${acceptedFollowing.length} Curators` : `${followers.length} Followers`}
            </span>
          </div>

          {/* ── 서브탭 ──────────────────────────────────────── */}
          <div style={{
            display: "flex", gap: 0,
            background: C.surfaceLow,
            borderRadius: 8, padding: 3,
            marginBottom: 28,
          }}>
            {["팔로잉", "팔로워"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                style={{
                  flex: 1, padding: "8px 0",
                  border: "none", borderRadius: 6,
                  background: activeSubTab === tab ? C.bg : "transparent",
                  fontFamily: FL, fontSize: 12, fontWeight: activeSubTab === tab ? 700 : 400,
                  color: activeSubTab === tab ? C.onSurface : C.outlineVariant,
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: activeSubTab === tab ? "0 1px 6px rgba(47,52,48,0.06)" : "none",
                }}
              >
                {tab}
                {tab === "팔로워" && followers.length > 0 && (
                  <span style={{
                    marginLeft: 5, fontFamily: FL, fontSize: 10,
                    color: activeSubTab === tab ? C.primary : C.outlineVariant,
                  }}>
                    {followers.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── 닉네임 검색 ────────────────────────────────── */}
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span className="material-symbols-outlined" style={{
                  position: "absolute", left: 12, top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 17, color: C.outlineVariant,
                  pointerEvents: "none",
                }}>
                  search
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="닉네임으로 검색"
                  style={{
                    width: "100%", padding: "12px 12px 12px 40px",
                    background: C.surfaceLow,
                    border: "none", borderRadius: 8,
                    fontFamily: FL, fontSize: 13, color: C.onSurface,
                    outline: "none", boxSizing: "border-box",
                    transition: "background 0.15s",
                  }}
                  onFocus={(e) => e.target.style.background = C.container}
                  onBlur={(e) => e.target.style.background = C.surfaceLow}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                style={{
                  padding: "12px 18px",
                  background: `linear-gradient(to bottom, ${C.primary}, ${C.primaryDim})`,
                  color: "#fff6ef", border: "none", borderRadius: 8,
                  fontFamily: FL, fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  cursor: searching ? "not-allowed" : "pointer",
                  opacity: searching ? 0.6 : 1,
                  transition: "opacity 0.15s",
                  flexShrink: 0,
                }}
              >
                {searching ? "…" : "검색"}
              </button>
            </div>

            {searchError && (
              <p style={{ fontFamily: FL, fontSize: 12, color: C.error, margin: "8px 0 0" }}>
                {searchError}
              </p>
            )}

            {/* 검색 결과 카드 */}
            {searchResult && (
              <div style={{
                marginTop: 12,
                background: C.surfaceLowest,
                borderRadius: 12, padding: "18px 20px",
                boxShadow: "0 2px 16px rgba(47,52,48,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div onClick={() => setProfileSheet(searchResult)} style={{ cursor: "pointer" }}>
                    <Avatar nickname={searchResult.nickname} size={46} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span
                        onClick={() => setProfileSheet(searchResult)}
                        style={{ fontFamily: FH, fontSize: 17, fontWeight: 700, color: C.onSurface, cursor: "pointer" }}
                      >
                        {searchResult.nickname}
                      </span>
                      <span style={{
                        fontFamily: FL, fontSize: 9, padding: "2px 7px",
                        borderRadius: 4, fontWeight: 700,
                        background: searchResult.is_public ? "#e0f4ec" : C.surfaceLow,
                        color: searchResult.is_public ? "#1D9E75" : C.outlineVariant,
                      }}>
                        {searchResult.is_public ? "공개" : "비공개"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <span style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>
                        팔로워 <b style={{ color: C.onSurfaceVariant }}>{searchResult.follower_count}</b>
                      </span>
                      {searchResult.is_public && (
                        <span style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>
                          맛집 <b style={{ color: C.onSurfaceVariant }}>{searchResult.place_count}</b>
                        </span>
                      )}
                    </div>
                  </div>
                  {searchResult.id !== user?.user_id && (
                    <button
                      onClick={() => handleFollowToggle(searchResult.id)}
                      disabled={loadingFollow}
                      style={{
                        padding: "8px 14px", borderRadius: 7,
                        background: getFollowStatus(searchResult.id) === "accepted" ? "transparent"
                          : getFollowStatus(searchResult.id) === "pending" ? "rgba(101,93,84,0.08)"
                          : C.primary,
                        border: getFollowStatus(searchResult.id) === "accepted" ? "1px solid rgba(158,66,44,0.2)"
                          : getFollowStatus(searchResult.id) === "pending" ? "1px solid rgba(101,93,84,0.15)"
                          : "none",
                        fontFamily: FL, fontSize: 10, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        color: getFollowStatus(searchResult.id) === "accepted" ? C.error
                          : getFollowStatus(searchResult.id) === "pending" ? C.outlineVariant
                          : "#fff6ef",
                        cursor: loadingFollow ? "not-allowed" : "pointer",
                        flexShrink: 0,
                        transition: "all 0.35s ease",
                      }}
                    >
                      {getFollowStatus(searchResult.id) === "accepted" ? "언팔로우"
                        : getFollowStatus(searchResult.id) === "pending" ? "신청됨" : "팔로우"}
                    </button>
                  )}
                </div>

                {!searchResult.is_public && (
                  <p style={{
                    fontFamily: FH, fontStyle: "italic",
                    fontSize: 12, color: C.outlineVariant, margin: "14px 0 0",
                  }}>
                    비공개 계정 — 팔로우 수락 후 맛집을 볼 수 있어요
                  </p>
                )}

                {searchResult.is_public && searchPlaces.length > 0 && (
                  <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {searchPlaces.map((p) => (
                      <span key={p.id} style={{
                        fontFamily: FL, fontSize: 11, padding: "4px 10px",
                        background: C.surfaceLow, borderRadius: 5, color: C.onSurfaceVariant,
                      }}>
                        {STATUS_EMOJI[p.status] || "📍"} {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── 팔로워 탭 ───────────────────────────────────── */}
          {activeSubTab === "팔로워" && (
            followers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "56px 0" }}>
                <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 17, color: C.outlineVariant, margin: "0 0 8px" }}>
                  아직 팔로워가 없어요
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {followers.map((f) => {
                  const isFollowingBack = following.some((fl) => fl.id === f.id && fl.status === "accepted");
                  const isPendingBack = following.some((fl) => fl.id === f.id && fl.status === "pending");
                  return (
                    <div
                      key={f.id}
                      onClick={() => setProfileSheet(f)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "12px 14px", borderRadius: 10,
                        background: C.surfaceLowest, cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f9f8f5"}
                      onMouseLeave={(e) => e.currentTarget.style.background = C.surfaceLowest}
                    >
                      <Avatar nickname={f.nickname} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontFamily: FH, fontSize: 15, fontWeight: 700,
                          color: C.onSurface, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {f.nickname}
                        </p>
                        {isFollowingBack && (
                          <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.primary }}>
                            맞팔로우
                          </p>
                        )}
                      </div>
                      {!isFollowingBack && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFollowToggle(f.id); }}
                          disabled={loadingFollow || isPendingBack}
                          style={{
                            padding: "5px 12px",
                            background: isPendingBack ? "rgba(101,93,84,0.08)" : C.primary,
                            border: isPendingBack ? "1px solid rgba(101,93,84,0.15)" : "none",
                            borderRadius: 6,
                            fontFamily: FL, fontSize: 10, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.08em",
                            color: isPendingBack ? C.outlineVariant : "#fff6ef",
                            cursor: loadingFollow ? "not-allowed" : "pointer",
                            flexShrink: 0,
                            transition: "all 0.35s ease",
                          }}
                        >
                          {isPendingBack ? "신청됨" : "팔로우"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── 신청 대기 ───────────────────────────────────── */}
          {activeSubTab === "팔로잉" && pendingFollowing.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <p style={{
                fontFamily: FL, fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.15em",
                color: C.outlineVariant, margin: "0 0 12px",
              }}>
                신청 대기 중
              </p>
              {/* Rule of Silence: gap instead of border */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pendingFollowing.map((f) => (
                  <PendingItem key={f.id} f={f} onCancel={handleFollowToggle} loadingFollow={loadingFollow} />
                ))}
              </div>
            </section>
          )}

          {/* ── 팔로잉 목록 ─────────────────────────────────── */}
          {activeSubTab === "팔로잉" && (acceptedFollowing.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "56px 0",
            }}>
              <p style={{
                fontFamily: FH, fontStyle: "italic",
                fontSize: 17, color: C.outlineVariant, margin: "0 0 8px",
              }}>
                아직 팔로우한 사람이 없어요
              </p>
              <p style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant, opacity: 0.7 }}>
                닉네임으로 검색해보세요
              </p>
            </div>
          ) : (
            <>
              <p style={{
                fontFamily: FL, fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.15em",
                color: C.outlineVariant, margin: "0 0 12px",
              }}>
                팔로잉
              </p>
              {/* Rule of Silence: gap spacing, no borders */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {acceptedFollowing.map((f) => (
                  <FollowItem
                    key={f.id}
                    f={f}
                    onOpen={setProfileSheet}
                    onUnfollow={handleFollowToggle}
                    loadingFollow={loadingFollow}
                  />
                ))}
              </div>
            </>
          ))}
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
