// src/components/SearchTab.jsx
// 디자인: desktopsearch.html (Discovery/Search) 기반
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import SavePlaceModal from "./SavePlaceModal";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary:    "#655d54",
  primaryDim: "#595149",
  primaryContainer: "#ede0d5",
  bg:         "#faf9f6",
  container:  "#edeeea",
  containerLow: "#f4f4f0",
  containerLowest: "#ffffff",
  onSurface:  "#2f3430",
  outlineVariant: "#8a8e8a",
};

const isMobile = () => window.innerWidth <= 768;

const SUGGESTIONS = ["에임즈커피로스터스", "신세계 양꼬치 첨단점", "하바티 홍대", "하나샤부정"];

export default function SearchTab({ onPlaceAdded, personalPlaces = [], onViewUserProfile }) {
  const { user } = useUser();
  const mobile = isMobile();
  const savedPlaceIds = new Set(personalPlaces.map((p) => p.naver_place_id).filter(Boolean));
  const [searchMode, setSearchMode] = useState("place"); // "place" | "person"
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [followActionLoading, setFollowActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [pendingPlace, setPendingPlace] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");

  // 팔로잉 목록 로드
  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/follows/${user.user_id}/following`)
      .then((res) => setFollowingIds(new Set(res.data.map((f) => f.id || f.user_id))))
      .catch(() => {});
  }, [user]);

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setError(""); setResults([]); setUserResults([]);
    setSearching(true);
    try {
      if (searchMode === "place") {
        const res = await axios.get(`${API_BASE}/search-place/`, { params: { name: q.trim() } });
        if (res.data && res.data.length > 0) setResults(res.data);
        else setError("공간을 찾을 수 없어요");
      } else {
        const res = await axios.get(`${API_BASE}/users/search?q=${encodeURIComponent(q.trim())}`);
        const filtered = Array.isArray(res.data) ? res.data.filter((u) => u.id !== user?.user_id) : [];
        if (filtered.length > 0) setUserResults(filtered);
        else setError("사용자를 찾을 수 없어요");
      }
    } catch (e) {
      setError("검색 실패. 다시 시도해주세요");
    } finally { setSearching(false); }
  };

  const handleFollow = async (targetId) => {
    if (!user) return;
    setFollowActionLoading(targetId);
    try {
      await axios.post(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
      setFollowingIds((prev) => new Set([...prev, targetId]));
    } catch {} finally { setFollowActionLoading(null); }
  };

  const handleUnfollow = async (targetId) => {
    if (!user) return;
    setFollowActionLoading(targetId);
    try {
      await axios.delete(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
      setFollowingIds((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
    } catch {} finally { setFollowActionLoading(null); }
  };

  const handleSave = async (place) => {
    const payload = {
      name: place.name, address: place.address, lat: place.lat, lng: place.lng,
      category: place.category, naver_place_id: place.naver_place_id,
      naver_place_url: place.naver_place_url,
      folder_id: place.folder_id || null, status: place.status || "want_to_go",
      rating: place.rating || null, memo: place.memo || null,
      photo_url: place.photo_url || null,
      photo_urls: place.photo_urls || null,
      instagram_post_url: place.instagram_post_url || null,
    };
    const url = user
      ? `${API_BASE}/personal-places/?user_id=${user.user_id}`
      : `${API_BASE}/personal-places/`;
    const res = await axios.post(url, payload);
    if (onPlaceAdded) onPlaceAdded(res.data);
    setSavedMsg(`'${place.name}' 기록됐어요!`);
    setResults([]); setQuery("");
    setTimeout(() => setSavedMsg(""), 3000);
  };

  return (
    <div style={{
      flex: 1, minHeight: "100vh", background: C.bg, overflowY: "auto",
      paddingBottom: mobile ? 80 : 48,
    }}>
      {/* 상단 헤더 (PC) */}
      {!mobile && (
        <header style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(250,249,246,0.85)", backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.container}`,
          padding: "18px 22px 14px",
        }}>
          <h1 style={{ fontFamily: FH, fontStyle: "italic", fontSize: 18, color: C.primary, margin: "0 0 2px", letterSpacing: "-0.02em" }}>Discovery</h1>
        </header>
      )}

      <main style={{ maxWidth: 960, margin: "0 auto", padding: mobile ? "20px 16px" : "16px 18px" }}>

        {/* 검색 모드 토글 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[
            { key: "place", label: "공간", icon: "location_on" },
            { key: "person", label: "사람", icon: "person_search" },
          ].map((m) => (
            <button key={m.key}
              onClick={() => { setSearchMode(m.key); setResults([]); setUserResults([]); setError(""); }}
              style={{
                flex: 1, padding: "8px 12px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                background: searchMode === m.key ? C.primary : C.containerLow,
                color: searchMode === m.key ? "#fff6ef" : "#78716c",
                border: "none", borderRadius: 8, cursor: "pointer",
                fontFamily: FL, fontSize: 11, fontWeight: 700,
                transition: "all 0.15s",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* 검색창 */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              pointerEvents: "none",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: searching ? C.primary : "#a8a29e", transition: "color 0.2s" }}>search</span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={searchMode === "place" ? "가게 이름 + 지역명 (예: 스타벅스 강남)" : "닉네임으로 검색..."}
              autoFocus={!mobile}
              style={{
                width: "100%", padding: "10px 12px 10px 32px",
                background: C.containerLow, border: "none",
                borderRadius: 8, outline: "none",
                fontFamily: FL, color: C.onSurface,
                boxSizing: "border-box", transition: "background 0.2s",
              }}
              ref={(el) => { if (el) el.style.setProperty("font-size", "12px", "important"); }}
              onFocus={(e) => e.target.style.background = C.container}
              onBlur={(e) => e.target.style.background = C.containerLow}
            />
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
              {searching ? (
                <span style={{ fontFamily: FL, fontSize: 9, color: "#a8a29e" }}>검색 중...</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#c7c4bf", cursor: "pointer" }}
                  onClick={() => handleSearch()}>tune</span>
              )}
            </div>
          </div>

          {/* 추천 태그 (장소 모드만) */}
          {searchMode === "place" && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: FL, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e", marginRight: 2 }}>
                Suggested:
              </span>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => { setQuery(s); handleSearch(s); }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999, border: "none",
                    background: C.containerLow,
                    fontFamily: FL, fontSize: 9, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    color: "#78716c", cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryContainer; e.currentTarget.style.color = C.primary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.containerLow; e.currentTarget.style.color = "#78716c"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 저장 성공 메시지 */}
        {savedMsg && (
          <div style={{
            padding: "10px 14px", background: C.containerLowest,
            borderLeft: `3px solid ${C.primary}`,
            borderRadius: 6, marginBottom: 16,
            fontFamily: FH, fontStyle: "italic", fontSize: 12, color: C.onSurface,
          }}>
            ✓ {savedMsg}
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div style={{
            padding: "10px 14px", background: "#fef0ec",
            borderLeft: "3px solid #9e422c",
            borderRadius: 6, marginBottom: 16,
            fontFamily: FH, fontStyle: "italic", fontSize: 12, color: "#9e422c",
          }}>
            {error}
          </div>
        )}

        {/* 사람 검색 결과 */}
        {userResults.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{
              fontFamily: FL, fontSize: 8, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.2em",
              color: C.primary, padding: "0 4px",
            }}>
              검색된 사람
            </span>
            {userResults.map((u) => {
              const isFollowing = followingIds.has(u.id);
              return (
                <div key={u.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 10,
                  background: C.containerLowest, transition: "background 0.2s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = C.bg}
                  onMouseLeave={(e) => e.currentTarget.style.background = C.containerLowest}
                >
                  <div
                    onClick={() => onViewUserProfile?.(u.nickname)}
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: u.profile_photo_url
                        ? `url(${u.profile_photo_url}) center/cover`
                        : `linear-gradient(135deg, #595149, #655d54)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: FH, fontStyle: "italic",
                      fontSize: 13, color: "#fff6ef", fontWeight: 700,
                    }}>
                      {!u.profile_photo_url && u.nickname?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontFamily: FL, fontSize: 12, fontWeight: 600, color: C.onSurface }}>
                        {u.nickname}
                      </p>
                      {u.instagram_url && (
                        <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: "#E1306C" }}>
                          Instagram
                        </p>
                      )}
                    </div>
                  </div>
                  {isFollowing ? (
                    <button
                      onClick={() => handleUnfollow(u.id)}
                      disabled={followActionLoading === u.id}
                      style={{
                        padding: "6px 14px",
                        border: "1px solid rgba(101,93,84,0.15)",
                        borderRadius: 8, background: "none",
                        fontFamily: FL, fontSize: 11, fontWeight: 600,
                        color: C.outlineVariant, cursor: "pointer",
                        opacity: followActionLoading === u.id ? 0.5 : 1,
                      }}
                    >
                      팔로잉
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFollow(u.id)}
                      disabled={followActionLoading === u.id}
                      style={{
                        padding: "6px 14px", border: "none", borderRadius: 8,
                        background: C.primary, color: "#fff6ef",
                        fontFamily: FL, fontSize: 11, fontWeight: 700,
                        cursor: "pointer",
                        opacity: followActionLoading === u.id ? 0.5 : 1,
                      }}
                    >
                      팔로우
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* 장소 검색 결과 */}
        {results.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map((place, idx) => (
              <div
                key={place.naver_place_id || idx}
                style={{
                  background: C.containerLowest, borderRadius: 10,
                  overflow: "hidden", transition: "background 0.3s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.bg}
                onMouseLeave={(e) => e.currentTarget.style.background = C.containerLowest}
              >
                {idx === 0 && (
                  <div style={{ padding: "14px 16px 0" }}>
                    <span style={{
                      fontFamily: FL, fontSize: 9, fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.2em",
                      color: C.primary,
                    }}>
                      발견된 공간
                    </span>
                  </div>
                )}

                <div style={{ padding: mobile ? "12px" : idx === 0 ? "12px 16px 16px" : "10px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      {place.category && (
                        <p style={{ margin: "0 0 6px", fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e" }}>
                          {place.category}
                        </p>
                      )}
                      <h3 style={{
                        margin: "0 0 4px", fontFamily: FH,
                        fontSize: idx === 0 ? (mobile ? 18 : 17) : (mobile ? 14 : 14),
                        fontWeight: 400, color: C.onSurface, letterSpacing: "-0.01em",
                      }}>
                        {place.name}
                      </h3>
                      {place.address && (
                        <p style={{
                          margin: "0 0 8px", fontFamily: FH, fontStyle: "italic",
                          fontSize: 11, color: "#78716c",
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, flexShrink: 0 }}>location_on</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.address}</span>
                        </p>
                      )}
                      {(place.naver_place_id || place.naver_place_url) && (
                        <a
                          href={place.naver_place_id && /^\d+$/.test(place.naver_place_id)
                            ? `https://map.naver.com/v5/entry/place/${place.naver_place_id}`
                            : place.naver_place_url || `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`}
                          target="_blank" rel="noreferrer" style={{
                          padding: "5px 12px", background: C.container,
                          borderRadius: 4, fontFamily: FL, fontSize: 9,
                          fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
                          color: "#78716c", textDecoration: "none",
                        }}>
                          Naver Map
                        </a>
                      )}
                    </div>

                    {place.naver_place_id && savedPlaceIds.has(place.naver_place_id) ? (
                      <span style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "10px 18px",
                        background: "none",
                        border: "1px solid rgba(101,93,84,0.15)",
                        borderRadius: 8,
                        fontFamily: FL, fontSize: 12, fontWeight: 600,
                        color: C.outlineVariant,
                        width: "100%", boxSizing: "border-box",
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check_circle</span>
                        추가된 공간
                      </span>
                    ) : (
                      <button
                        onClick={() => setPendingPlace(place)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "9px 16px",
                          background: C.primary, color: "#fff6ef",
                          border: "none", borderRadius: 7,
                          fontFamily: FL, fontSize: 11, fontWeight: 700,
                          letterSpacing: "0.04em",
                          cursor: "pointer", transition: "background 0.15s",
                          width: "100%",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = C.primaryDim}
                        onMouseLeave={(e) => e.currentTarget.style.background = C.primary}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                        내 공간에 추가
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 초기 상태 — 빈 화면 */}
        {results.length === 0 && userResults.length === 0 && !error && !savedMsg && !searching && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#d6d3d1", display: "block", marginBottom: 14 }}>
              {searchMode === "place" ? "search" : "person_search"}
            </span>
            <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 14, color: "#a8a29e", margin: "0 0 6px" }}>
              {searchMode === "place" ? "내 공간을 만들어보세요" : "닉네임으로 사람을 찾아보세요"}
            </p>
            <p style={{ fontFamily: FL, fontSize: 11, color: "#a8a29e", letterSpacing: "0.1em" }}>
              {searchMode === "place" ? "" : "팔로우하고 서로의 공간을 공유하세요"}
            </p>
          </div>
        )}

      </main>

      {pendingPlace && (
        <SavePlaceModal place={pendingPlace} onSave={handleSave} onClose={() => setPendingPlace(null)} />
      )}
    </div>
  );
}
