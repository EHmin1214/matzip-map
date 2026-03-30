// src/components/UserProfileView.jsx
// 앱 내에서 다른 사용자의 프로필을 보는 오버레이
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import CuratedLists from "./CuratedLists";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54", primaryDim: "#595149",
  primaryContainer: "#ede0d5",
  bg: "#faf9f6", surfaceLow: "#f4f4f0",
  surfaceLowest: "#ffffff",
  container: "#edeeea",
  onSurface: "#2f3430", onSurfaceVariant: "#5c605c",
  outlineVariant: "#afb3ae", error: "#9e422c",
};

const STATUS_LABEL = { want_to_go: "가고 싶어요", visited: "가봤어요", want_revisit: "또 가고 싶어요" };
const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️" };
const STATUS_COLOR = {
  want_to_go:   { bg: "#FEF3CD", color: "#BA7517" },
  visited:      { bg: "#E0F4EC", color: "#1D9E75" },
  want_revisit: { bg: "#FCE4EE", color: "#D4537E" },
};

export default function UserProfileView({ nickname, onClose }) {
  const { user } = useUser();
  const [profile, setProfile] = useState(null);
  const [places, setPlaces] = useState([]);
  const [curatedLists, setCuratedLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const isMobile = window.innerWidth <= 768;

  const [isPrivateNoAccess, setIsPrivateNoAccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    setIsPrivateNoAccess(false);
    Promise.all([
      axios.get(`${API_BASE}/users/${nickname}`),
      axios.get(`${API_BASE}/users/${nickname}/public-places${user ? `?viewer_id=${user.user_id}` : ""}`).catch((e) => {
        if (e.response?.status === 403) setIsPrivateNoAccess(true);
        return { data: [] };
      }),
      axios.get(`${API_BASE}/lists/public/${nickname}`).catch(() => ({ data: [] })),
    ])
      .then(([profileRes, placesRes, listsRes]) => {
        setProfile(profileRes.data);
        setPlaces(placesRes.data);
        setCuratedLists(listsRes.data);
      })
      .catch(() => {
        setError("프로필을 찾을 수 없어요");
      })
      .finally(() => setLoading(false));
  }, [nickname]); // eslint-disable-line

  // 팔로우 상태 확인
  useEffect(() => {
    if (!user || !profile) return;
    axios.get(`${API_BASE}/follows/${user.user_id}/following`)
      .then((res) => {
        setIsFollowing(res.data.some((f) => (f.id || f.user_id) === profile.id));
      })
      .catch(() => {});
  }, [user, profile]);

  // 지도 초기화
  useEffect(() => {
    if (!places.length || !mapContainerRef.current || !window.naver?.maps) return;
    if (mapRef.current) return;

    const bounds = new window.naver.maps.LatLngBounds();
    places.forEach((p) => bounds.extend(new window.naver.maps.LatLng(p.lat, p.lng)));

    const map = new window.naver.maps.Map(mapContainerRef.current, {
      center: bounds.getCenter(),
      zoom: 13,
      mapTypeControl: false, scaleControl: false, logoControl: false, mapDataControl: false,
      zoomControl: false, draggable: false, scrollWheel: false,
      disableDoubleTapZoom: true, disableDoubleClickZoom: true,
    });
    if (places.length > 1) map.fitBounds(bounds, { padding: 30 });
    else map.setZoom(14);

    places.forEach((p) => {
      const color = STATUS_COLOR[p.status]?.color || C.primary;
      new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.lat, p.lng),
        map,
        icon: {
          content: `<div style="width:8px;height:8px;border-radius:50%;background:${color};border:1.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
          anchor: new window.naver.maps.Point(4, 4),
        },
      });
    });
    mapRef.current = map;
  }, [places]);

  const handleFollow = async () => {
    if (!user || !profile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await axios.delete(`${API_BASE}/follows/${profile.id}?follower_id=${user.user_id}`);
        setIsFollowing(false);
      } else {
        await axios.post(`${API_BASE}/follows/${profile.id}?follower_id=${user.user_id}`);
        setIsFollowing(true);
      }
    } catch {} finally { setFollowLoading(false); }
  };

  const counts = {};
  places.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: C.bg, overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      <div style={{
        maxWidth: 520, margin: "0 auto",
        padding: isMobile ? "0 0 100px" : "0 28px 60px",
      }}>
        {/* 상단 헤더 */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(250,249,246,0.92)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          padding: isMobile ? "16px 18px" : "20px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={onClose} style={{
            display: "flex", alignItems: "center", gap: 4,
            border: "none", background: "none", cursor: "pointer",
            fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.primary, padding: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            돌아가기
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: FL, fontSize: 12, color: C.outlineVariant }}>불러오는 중...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 16, color: C.outlineVariant }}>{error}</p>
          </div>
        )}

        {profile && !error && (
          <>
            {/* 프로필 카드 */}
            <div style={{
              background: C.surfaceLowest, borderRadius: 12, padding: "18px 20px",
              marginBottom: 12, boxShadow: "0 1px 8px rgba(47,52,48,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                  background: profile.profile_photo_url
                    ? `url(${profile.profile_photo_url}) center/cover`
                    : `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FH, fontStyle: "italic",
                  fontSize: 22, color: "#fff6ef", fontWeight: 700,
                }}>
                  {!profile.profile_photo_url && profile.nickname?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 4px", fontFamily: FH, fontSize: 19, fontWeight: 700, color: C.onSurface }}>
                    {profile.nickname}
                  </h2>
                  <div style={{ display: "flex", gap: 12, fontFamily: FL, fontSize: 11, color: C.onSurfaceVariant }}>
                    <span>{profile.place_count}곳</span>
                    <span>팔로워 {profile.follower_count}</span>
                    <span>팔로잉 {profile.following_count}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
                    {profile.instagram_url && (
                      <a href={profile.instagram_url} target="_blank" rel="noreferrer"
                        style={{ fontFamily: FL, fontSize: 11, color: "#E1306C", textDecoration: "none", fontWeight: 600 }}>
                        Instagram
                      </a>
                    )}
                    {profile.blog_url && (
                      <a href={profile.blog_url} target="_blank" rel="noreferrer"
                        style={{ fontFamily: FL, fontSize: 11, color: "#3B8BD4", textDecoration: "none", fontWeight: 600 }}>
                        블로그
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* 팔로우 버튼 */}
              {user && profile.id !== user.user_id && (
                <button onClick={handleFollow} disabled={followLoading}
                  style={{
                    width: "100%", padding: "11px", border: "none", borderRadius: 8,
                    background: isFollowing ? "none" : C.primary,
                    color: isFollowing ? C.outlineVariant : "#fff6ef",
                    borderWidth: isFollowing ? 1 : 0,
                    borderStyle: "solid",
                    borderColor: "rgba(101,93,84,0.15)",
                    fontFamily: FL, fontSize: 12, fontWeight: 700,
                    cursor: followLoading ? "not-allowed" : "pointer",
                    opacity: followLoading ? 0.6 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {isFollowing ? "팔로잉" : "팔로우"}
                </button>
              )}
            </div>

            {/* 미니 맵 */}
            {places.length > 0 && (
              <div style={{
                background: C.surfaceLowest, borderRadius: 12, padding: "18px 20px",
                marginBottom: 12, boxShadow: "0 1px 8px rgba(47,52,48,0.05)",
              }}>
                <p style={{
                  margin: "0 0 12px", fontFamily: FL, fontSize: 9, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant,
                }}>
                  {profile.nickname}의 공간 지도
                </p>
                <div ref={mapContainerRef} style={{
                  width: "100%", height: 160, borderRadius: 10,
                  overflow: "hidden", background: C.surfaceLow, marginBottom: 12,
                }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(counts).map(([status, count]) => (
                    <span key={status} style={{
                      fontFamily: FL, fontSize: 11, color: C.onSurfaceVariant,
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      {STATUS_EMOJI[status] || "📍"} {count}
                    </span>
                  ))}
                  <span style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>
                    총 {places.length}곳
                  </span>
                </div>
              </div>
            )}

            {/* 큐레이션 리스트 */}
            {curatedLists.length > 0 && (
              <div style={{
                background: C.surfaceLowest, borderRadius: 12, padding: "18px 20px",
                marginBottom: 12, boxShadow: "0 1px 8px rgba(47,52,48,0.05)",
              }}>
                <p style={{
                  margin: "0 0 12px", fontFamily: FL, fontSize: 9, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant,
                }}>
                  큐레이션 리스트
                </p>
                {curatedLists.map((cl) => (
                  <a key={cl.id} href={`/list/${cl.id}`} target="_blank" rel="noreferrer"
                    style={{
                      display: "block", padding: "10px 12px",
                      borderRadius: 8, background: C.surfaceLow,
                      marginBottom: 6, textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                  >
                    <p style={{ margin: 0, fontFamily: FH, fontSize: 14, fontWeight: 600, color: C.onSurface }}>
                      {cl.title}
                    </p>
                    <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
                      {cl.item_count}곳 {cl.description ? `· ${cl.description}` : ""}
                    </p>
                  </a>
                ))}
              </div>
            )}

            {/* 기록 (장소 카드) */}
            {places.length > 0 && (
              <div style={{
                background: C.surfaceLowest, borderRadius: 12, padding: "18px 20px",
                marginBottom: 12, boxShadow: "0 1px 8px rgba(47,52,48,0.05)",
              }}>
                <p style={{
                  margin: "0 0 12px", fontFamily: FL, fontSize: 9, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant,
                }}>
                  {profile.nickname}의 기록 — {places.length}곳
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {places.map((p) => {
                    const sc = STATUS_COLOR[p.status];
                    const photo = p.photo_url;
                    return (
                      <div key={p.id} style={{
                        borderRadius: 10, overflow: "hidden",
                        background: C.surfaceLow,
                      }}>
                        {photo && (
                          <div style={{ width: "100%", aspectRatio: "5/4", overflow: "hidden", background: "#f0efec" }}>
                            <img src={photo} alt={p.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          </div>
                        )}
                        <div style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: p.memo ? 6 : 0 }}>
                            <span style={{
                              fontFamily: FL, fontSize: 10, fontWeight: 600,
                              padding: "2px 7px", borderRadius: 4,
                              background: sc?.bg || C.surfaceLow, color: sc?.color || C.onSurfaceVariant,
                            }}>
                              {STATUS_EMOJI[p.status]} {STATUS_LABEL[p.status]}
                            </span>
                            {p.rating > 0 && (
                              <span style={{
                                fontFamily: FL, fontSize: 10, padding: "2px 7px",
                                background: C.primaryContainer, color: C.primary,
                                borderRadius: 4, fontWeight: 600,
                              }}>
                                {"★".repeat(p.rating)}{"☆".repeat(5 - p.rating)}
                              </span>
                            )}
                            <span style={{ fontFamily: FH, fontSize: 13, fontWeight: 600, color: C.onSurface }}>
                              {p.name}
                            </span>
                          </div>
                          {p.memo && (
                            <p style={{
                              margin: "4px 0 0", fontFamily: FH, fontStyle: "italic",
                              fontSize: 12, color: C.onSurfaceVariant, lineHeight: 1.6,
                            }}>
                              "{p.memo}"
                            </p>
                          )}
                          {p.address && (
                            <p style={{
                              margin: "4px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant,
                              display: "flex", alignItems: "center", gap: 3,
                            }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>location_on</span>
                              {p.address}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {places.length === 0 && !error && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: C.outlineVariant }}>
                  {isPrivateNoAccess ? "lock" : "location_on"}
                </span>
                <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 16, color: C.onSurfaceVariant, marginTop: 12 }}>
                  {isPrivateNoAccess ? "비공개 계정이에요" : "아직 공개된 공간이 없어요"}
                </p>
                {isPrivateNoAccess && (
                  <p style={{ fontFamily: FL, fontSize: 12, color: C.outlineVariant, marginTop: 4 }}>
                    팔로우 요청을 보내보세요
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
