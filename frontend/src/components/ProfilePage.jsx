// src/components/ProfilePage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import { subscribePush, unsubscribePush, isPushSubscribed } from "../utils/pushNotifications";
import CuratedLists from "./CuratedLists";
import BestPickerModal from "./BestPickerModal";
import { STATUS_LABEL, STATUS_COLOR, STATUS_EMOJI, FRONTEND_URL, BEST_CATEGORIES } from "../constants";
import { shareProfileCard } from "../utils/generateShareCard";

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
  outlineVariant:   "#8a8e8a",
  error:            "#9e422c",
};

const isMobile = () => window.innerWidth <= 768;
const KAKAO_KEY = process.env.REACT_APP_KAKAO_JS_KEY || "";

function initKakao() {
  if (!window.Kakao) return false;
  if (!window.Kakao.isInitialized() && KAKAO_KEY) window.Kakao.init(KAKAO_KEY);
  return window.Kakao.isInitialized();
}

function shareKakao({ title, description, imageUrl, linkUrl }) {
  if (!initKakao()) { alert("카카오 SDK 로딩 실패"); return; }
  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl: imageUrl || `${FRONTEND_URL}/og-image.png`,
      link: { mobileWebUrl: linkUrl, webUrl: linkUrl },
    },
    buttons: [{ title: "지도 보기", link: { mobileWebUrl: linkUrl, webUrl: linkUrl } }],
  });
}

// ── 입력 필드 ────────────────────────────────────────────────
function ProfileInput({ label, style: extraStyle = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: "block", fontFamily: FL,
        fontSize: 9, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.15em",
        color: C.outlineVariant, marginBottom: 6,
      }}>
        {label}
      </label>
      <input
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: "100%", padding: "10px 12px",
          background: focused ? C.container : C.surfaceLow,
          border: "none", borderRadius: 8,
          fontFamily: FL, fontSize: 13, color: C.onSurface,
          outline: "none", boxSizing: "border-box",
          WebkitAppearance: "none",
          transition: "background 0.15s",
          ...extraStyle,
        }}
      />
    </div>
  );
}

// ── 토글 스위치 ──────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? C.primary : C.container,
        position: "relative", cursor: "pointer", flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: value ? 22 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: value ? "#fff6ef" : C.outlineVariant,
        boxShadow: "0 1px 4px rgba(47,52,48,0.15)",
        transition: "left 0.2s, background 0.2s",
      }} />
    </div>
  );
}

// ── 섹션 카드 (No-Line Rule: tonal surface, no border) ───────
function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.surfaceLowest,
      borderRadius: 10, padding: "14px 16px",
      marginBottom: 10,
      boxShadow: "0 1px 8px rgba(47,52,48,0.05)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── 미니 맵 ─────────────────────────────────────────────────
function MiniMapInline({ places, onViewMap }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;
    const check = setInterval(() => {
      if (window.naver?.maps) {
        clearInterval(check);
        const bounds = new window.naver.maps.LatLngBounds();
        places.forEach((p) => bounds.extend(new window.naver.maps.LatLng(p.lat, p.lng)));
        mapInstance.current = new window.naver.maps.Map(mapRef.current, {
          center: bounds.getCenter(), zoom: 12,
          mapTypeControl: false, scaleControl: false, logoControl: false,
          mapDataControl: false, zoomControl: false, draggable: false,
          scrollWheel: false, keyboardShortcuts: false,
          disableDoubleTapZoom: true, disableDoubleClickZoom: true, disableTwoFingerTapZoom: true,
        });
        if (places.length > 1) mapInstance.current.fitBounds(bounds, { padding: 30 });
        else mapInstance.current.setZoom(14);
        const STATUS_DOT = { want_to_go: "#BA7517", visited: "#1D9E75", want_revisit: "#D4537E" };
        places.forEach((p) => {
          const color = STATUS_DOT[p.status] || "#655d54";
          new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(p.lat, p.lng),
            map: mapInstance.current,
            icon: {
              content: `<div style="width:8px;height:8px;border-radius:50%;background:${color};border:1.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
              anchor: new window.naver.maps.Point(4, 4),
            },
          });
        });
      }
    }, 100);
    return () => { clearInterval(check); if (mapInstance.current) mapInstance.current.destroy(); };
  }, [places]);

  const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️" };
  const counts = {};
  places.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });

  if (places.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div ref={mapRef} style={{
        width: "100%", aspectRatio: "4/3", borderRadius: 10,
        overflow: "hidden", background: C.surfaceLow, marginBottom: 8,
      }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {Object.entries(counts).map(([status, count]) => (
          <span key={status} style={{
            fontFamily: FL, fontSize: 11, color: C.onSurfaceVariant,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {STATUS_EMOJI[status] || "📍"} {count}
          </span>
        ))}
        <button onClick={onViewMap} style={{
          marginLeft: "auto", padding: "4px 10px",
          border: "1px solid rgba(101,93,84,0.15)", borderRadius: 6,
          background: "none", fontFamily: FL, fontSize: 10, fontWeight: 600,
          color: C.primary, cursor: "pointer",
        }}>
          지도에서 보기
        </button>
      </div>
    </div>
  );
}

function MiniMap({ places, onViewMap }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;
    const check = setInterval(() => {
      if (window.naver?.maps) {
        clearInterval(check);
        const bounds = new window.naver.maps.LatLngBounds();
        places.forEach((p) => bounds.extend(new window.naver.maps.LatLng(p.lat, p.lng)));

        mapInstance.current = new window.naver.maps.Map(mapRef.current, {
          center: bounds.getCenter(),
          zoom: 12,
          mapTypeControl: false,
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false,
          draggable: false,
          scrollWheel: false,
          keyboardShortcuts: false,
          disableDoubleTapZoom: true,
          disableDoubleClickZoom: true,
          disableTwoFingerTapZoom: true,
        });

        if (places.length > 1) {
          mapInstance.current.fitBounds(bounds, { padding: 30 });
        } else {
          mapInstance.current.setZoom(14);
        }

        const STATUS_DOT = {
          want_to_go: "#BA7517", visited: "#1D9E75",
          want_revisit: "#D4537E",
        };

        places.forEach((p) => {
          const color = STATUS_DOT[p.status] || "#655d54";
          new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(p.lat, p.lng),
            map: mapInstance.current,
            icon: {
              content: `<div style="width:8px;height:8px;border-radius:50%;background:${color};border:1.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
              anchor: new window.naver.maps.Point(4, 4),
            },
          });
        });
      }
    }, 100);
    return () => {
      clearInterval(check);
      if (mapInstance.current) mapInstance.current.destroy();
    };
  }, [places]);

  const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️" };
  const counts = {};
  places.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });

  return (
    <Card>
      <p style={{
        margin: "0 0 12px", fontFamily: FL, fontSize: 9, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant,
      }}>
        나의 공간 지도
      </p>

      {places.length > 0 ? (
        <>
          <div
            id="profile-minimap"
            ref={mapRef}
            style={{
              width: "100%", aspectRatio: "4/5", borderRadius: 10,
              overflow: "hidden", background: C.surfaceLow, marginBottom: 12,
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
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
        </>
      ) : (
        <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 13, color: C.outlineVariant, margin: "0 0 12px" }}>
          아직 저장된 공간이 없어요
        </p>
      )}

      <button
        onClick={onViewMap}
        style={{
          width: "100%", padding: "10px",
          border: "1px solid rgba(101,93,84,0.15)",
          borderRadius: 8, background: "none",
          fontFamily: FL, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: C.primary, cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = C.primaryContainer}
        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
      >
        지도에서 보기
      </button>
    </Card>
  );
}


// ── 프로필 피드 카드 ─────────────────────────────────────────
function PlaceFeedCard({ place: p, mobile }) {
  const photos = p.photo_urls?.length ? p.photo_urls : (p.photo_url ? [p.photo_url] : []);
  const [imgIdx, setImgIdx] = useState(0);
  const sc = STATUS_COLOR[p.status];

  return (
    <div style={{
      background: C.surfaceLowest, borderRadius: mobile ? 0 : 12,
      overflow: "hidden",
      boxShadow: mobile ? "none" : "0 1px 6px rgba(47,52,48,0.05)",
    }}>
      {photos.length > 0 ? (
        <div style={{ position: "relative" }}>
          <div style={{ width: "100%", overflow: "hidden", aspectRatio: "5/4", background: "#f0efec" }}>
            <img src={photos[imgIdx]} alt={p.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          {photos.length > 1 && (
            <>
              {imgIdx > 0 && (
                <button onClick={() => setImgIdx((i) => i - 1)} style={{
                  position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
                  width: 26, height: 26, borderRadius: "50%",
                  background: "rgba(0,0,0,0.3)", border: "none", color: "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chevron_left</span>
                </button>
              )}
              {imgIdx < photos.length - 1 && (
                <button onClick={() => setImgIdx((i) => i + 1)} style={{
                  position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                  width: 26, height: 26, borderRadius: "50%",
                  background: "rgba(0,0,0,0.3)", border: "none", color: "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chevron_right</span>
                </button>
              )}
              <div style={{
                position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: 4,
              }}>
                {photos.map((_, i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: i === imgIdx ? "white" : "rgba(255,255,255,0.4)",
                  }} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{
          padding: "28px 16px",
          background: `linear-gradient(135deg, ${C.primaryDim}15, ${C.primary}08)`,
        }}>
          <p style={{ margin: 0, fontFamily: FH, fontStyle: "italic", fontSize: 18, color: C.primary, textAlign: "center" }}>
            {p.name}
          </p>
        </div>
      )}
      <div style={{ padding: "10px 14px 14px" }}>
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
          {photos.length > 0 && (
            <span style={{ fontFamily: FH, fontSize: 12, fontWeight: 600, color: C.onSurface }}>
              {p.name}
            </span>
          )}
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
}

// ── 나의 베스트 섹션 ────────────────────────────────────────
function MyBestSection({ myBestPicks, personalPlaces, onBestPickAdd, onBestPickRemove }) {
  const [pickerCat, setPickerCat] = useState(null);

  return (
    <>
      {BEST_CATEGORIES.map(({ key, emoji, label }) => {
        const picks = myBestPicks[key] || [];
        return (
          <div key={key} style={{ marginBottom: 16 }}>
            <p style={{
              margin: "0 0 8px", fontFamily: FL, fontSize: 11, fontWeight: 600,
              color: C.onSurfaceVariant,
            }}>
              {emoji} {label}
              <span style={{ fontWeight: 400, color: C.outlineVariant, marginLeft: 6, fontSize: 10 }}>
                {picks.length}/5
              </span>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* 채워진 슬롯 */}
              {picks.map((p) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8, background: C.surfaceLow,
                }}>
                  <span style={{
                    flex: 1, fontFamily: FL, fontSize: 12, fontWeight: 600, color: C.onSurface,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.name}
                  </span>
                  {p.address && (
                    <span style={{
                      fontFamily: FL, fontSize: 10, color: C.outlineVariant,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      maxWidth: 120, flexShrink: 1,
                    }}>
                      {p.address}
                    </span>
                  )}
                  <button
                    onClick={() => onBestPickRemove(p.id)}
                    style={{
                      width: 22, height: 22, padding: 0, border: "none",
                      background: "none", cursor: "pointer", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: C.outlineVariant }}>close</span>
                  </button>
                </div>
              ))}

              {/* 빈 슬롯 */}
              {picks.length < 5 && (
                <button
                  onClick={() => setPickerCat({ key, label: `${emoji} ${label}` })}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "9px 10px", borderRadius: 8,
                    border: `1.5px dashed ${C.container}`, background: "none",
                    cursor: "pointer",
                    fontFamily: FL, fontSize: 11, fontStyle: "italic",
                    color: C.outlineVariant,
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = C.surfaceLow; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.container; e.currentTarget.style.background = "none"; }}
                >
                  + 채워보세요
                </button>
              )}
            </div>
          </div>
        );
      })}

      {pickerCat && (
        <BestPickerModal
          category={pickerCat.key}
          categoryLabel={pickerCat.label}
          personalPlaces={personalPlaces}
          myBestPicks={myBestPicks}
          onSelect={(data) => { onBestPickAdd(data); setPickerCat(null); }}
          onClose={() => setPickerCat(null)}
        />
      )}
    </>
  );
}

// ── 접기/펼치기 섹션 헤더 ────────────────────────────────────
function SectionHeader({ title, open, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", marginBottom: open ? 14 : 0,
      }}
    >
      <p style={{
        margin: 0, fontFamily: FL, fontSize: 9, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant,
      }}>
        {title}
      </p>
      <span className="material-symbols-outlined" style={{
        fontSize: 16, color: C.outlineVariant,
        transition: "transform 0.2s",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
      }}>
        expand_more
      </span>
    </div>
  );
}

export default function ProfilePage({ personalPlaces = [], onViewMap, onPlaceClick, onViewUserProfile, myBestPicks = {}, onBestPickAdd, onBestPickReplace, onBestPickRemove, onRefresh, pushNav }) {
  const { user, updateUser, logout } = useUser();
  const mobile = isMobile();
  const [showMyPlaces, setShowMyPlaces] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myFolders, setMyFolders] = useState([]);
  const [openSections, setOpenSections] = useState({ curation: false, best: false, follow: false, pin: false });
  const toggleSection = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    fetchFollowLists();
    setTimeout(() => setRefreshing(false), 600);
  };
  const photoInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing]       = useState(false);
  const [nickname, setNickname]     = useState(user?.nickname || "");
  const [instagramUrl, setInstagramUrl] = useState(user?.instagram_url || "");
  const [blogUrl, setBlogUrl]       = useState(user?.blog_url || "");
  const [isPublic, setIsPublic]     = useState(user?.is_public || false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin]         = useState("");
  const [pinError, setPinError]     = useState("");
  const [pinSaving, setPinSaving]   = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = "PushManager" in window;

  // ── 폴더 로드 ──
  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/folders/?user_id=${user.user_id}`)
      .then((res) => setMyFolders(res.data)).catch(() => {});
  }, [user]);

  // ── 팔로우 관리 state ──
  const [followingList, setFollowingList] = useState([]);
  const [followerList, setFollowerList]   = useState([]);
  const [followSearch, setFollowSearch]   = useState("");
  const [followSearchResults, setFollowSearchResults] = useState([]);
  const [followSearching, setFollowSearching] = useState(false);
  const [followActionLoading, setFollowActionLoading] = useState(null);

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  const [pushError, setPushError] = useState("");

  const handlePushToggle = async () => {
    setPushLoading(true);
    setPushError("");
    try {
      if (pushEnabled) {
        await unsubscribePush(user.user_id);
        setPushEnabled(false);
      } else {
        const ok = await subscribePush(user.user_id);
        if (!ok) {
          setPushError("알림 권한이 거부됐거나 서버 설정이 필요해요");
        }
        setPushEnabled(ok);
      }
    } catch (e) {
      console.error("Push toggle error:", e);
      setPushError(e.message || "알림 설정 중 오류가 발생했어요");
    }
    setPushLoading(false);
  };

  // ── 팔로우 목록 불러오기 ──
  const fetchFollowLists = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/follows/${user.user_id}/following`)
      .then((res) => setFollowingList(res.data)).catch(() => {});
    axios.get(`${API_BASE}/follows/${user.user_id}/followers`)
      .then((res) => setFollowerList(res.data)).catch(() => {});
  }, [user]);

  useEffect(() => { fetchFollowLists(); }, [fetchFollowLists]);

  const handleFollowSearch = async () => {
    if (!followSearch.trim()) return;
    setFollowSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/users/search?q=${encodeURIComponent(followSearch.trim())}`);
      const results = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      setFollowSearchResults(results.filter((u) => u.id !== user.user_id));
    } catch {
      setFollowSearchResults([]);
    } finally { setFollowSearching(false); }
  };

  const handleFollow = async (targetId) => {
    setFollowActionLoading(targetId);
    try {
      await axios.post(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
      fetchFollowLists();
    } catch {} finally { setFollowActionLoading(null); }
  };

  const handleUnfollow = async (targetId) => {
    setFollowActionLoading(targetId);
    try {
      await axios.delete(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
      fetchFollowLists();
    } catch {} finally { setFollowActionLoading(null); }
  };

  if (!user) return null;

  const handleSave = async () => {
    setError("");
    if (nickname.trim().length < 2) { setError("닉네임은 2자 이상이어야 해요"); return; }
    setSaving(true);
    try {
      const res = await axios.patch(`${API_BASE}/users/${user.user_id}`, {
        nickname: nickname.trim(),
        instagram_url: instagramUrl.trim() || null,
        blog_url: blogUrl.trim() || null,
        is_public: isPublic,
      });
      updateUser({
        nickname: res.data.nickname,
        instagram_url: res.data.instagram_url,
        blog_url: res.data.blog_url,
        is_public: res.data.is_public,
      });
      setEditing(false);
      setSuccessMsg("저장됐어요!");
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.detail || "저장 실패");
    } finally { setSaving(false); }
  };

  const handlePublicToggle = async () => {
    const newVal = !isPublic;
    setIsPublic(newVal);
    try {
      await axios.patch(`${API_BASE}/users/${user.user_id}`, { is_public: newVal });
      updateUser({ is_public: newVal });
    } catch (e) { setIsPublic(!newVal); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await axios.post(`${API_BASE}/upload/photo?user_id=${user.user_id}`, form);
      const url = uploadRes.data.url;
      await axios.patch(`${API_BASE}/users/${user.user_id}`, { profile_photo_url: url });
      updateUser({ profile_photo_url: url });
      setSuccessMsg("프로필 사진이 변경됐어요!");
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (err) {
      setError("사진 업로드 실패");
    } finally { setUploadingPhoto(false); }
  };

  const handlePinChange = async () => {
    setPinError("");
    if (!/^\d{4}$/.test(currentPin)) { setPinError("현재 PIN 4자리를 입력해주세요"); return; }
    if (!/^\d{4}$/.test(newPin)) { setPinError("새 PIN 4자리를 입력해주세요"); return; }
    if (currentPin === newPin) { setPinError("현재 PIN과 동일해요"); return; }
    setPinSaving(true);
    try {
      await axios.post(`${API_BASE}/users/login`, { nickname: user.nickname, pin: currentPin });
      await axios.patch(`${API_BASE}/users/${user.user_id}`, { pin: newPin });
      setShowPinChange(false); setCurrentPin(""); setNewPin("");
      setSuccessMsg("PIN이 변경됐어요!");
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (e) {
      setPinError(e.response?.data?.detail || "PIN 변경 실패");
    } finally { setPinSaving(false); }
  };

  return (
    <div style={{
      flex: 1, minHeight: "100%",
      background: C.bg,
      paddingBottom: mobile ? 80 : 48,
    }}>
      <div style={{
        margin: "0 auto",
        padding: mobile ? "28px 16px" : "36px 18px",
      }}>

        {/* ── 프로필 카드 ─────────────────────────────────── */}
        <Card>
          {/* 아바타 + 이름 */}
          <div style={{ marginBottom: 16 }}>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={handlePhotoUpload} />
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: user.profile_photo_url
                    ? `url(${user.profile_photo_url}) center/cover`
                    : `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FH, fontStyle: "italic",
                  fontSize: 16, color: "#fff6ef", fontWeight: 700, flexShrink: 0,
                  cursor: "pointer", position: "relative",
                  opacity: uploadingPhoto ? 0.5 : 1, transition: "opacity 0.2s",
                }}
              >
                {!user.profile_photo_url && user.nickname?.[0]?.toUpperCase()}
                <div style={{
                  position: "absolute", bottom: -2, right: -2,
                  width: 14, height: 14, borderRadius: "50%",
                  background: C.primaryContainer, border: `1.5px solid ${C.surfaceLowest}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 8, color: C.primary }}>edit</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h2 style={{ margin: 0, fontFamily: FH, fontSize: 22, fontWeight: 700, color: C.onSurface }}>
                  {user.nickname}
                </h2>
                {!editing && (
                  <button
                    onClick={() => {
                      setNickname(user.nickname);
                      setInstagramUrl(user.instagram_url || "");
                      setBlogUrl(user.blog_url || "");
                      setEditing(true);
                    }}
                    style={{
                      border: "none", background: "none", cursor: "pointer", padding: 3,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.outlineVariant, borderRadius: 6,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                  </button>
                )}
              </div>
            </div>
            <div>
              <div style={{ display: "flex", gap: 5, marginTop: 5, position: "relative" }}>
                {user.instagram_url && (
                  <a href={user.instagram_url} target="_blank" rel="noreferrer"
                    style={{ flex: 1, fontFamily: FL, fontSize: 10, color: "#E1306C", textDecoration: "none", fontWeight: 600, padding: "6px 0", background: "#fce4ec", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                    Instagram
                  </a>
                )}
                {user.blog_url && (
                  <a href={user.blog_url} target="_blank" rel="noreferrer"
                    style={{ flex: 1, fontFamily: FL, fontSize: 10, color: "#03C75A", textDecoration: "none", fontWeight: 600, padding: "6px 0", background: "#e6f9ee", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                    블로그
                  </a>
                )}
                {isPublic && (
                  <div style={{ flex: 1, position: "relative" }}>
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      style={{
                        width: "100%", background: C.surfaceLow, border: "none", padding: "6px 0", borderRadius: 6, cursor: "pointer",
                        fontFamily: FL, fontSize: 10, fontWeight: 600, color: C.primary,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>share</span>
                      공유
                    </button>
                    {showShareMenu && (
                      <>
                        <div onClick={() => setShowShareMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                        <div style={{
                          position: "absolute", top: "100%", right: 0, marginTop: 4, width: 220, zIndex: 50,
                          background: C.surfaceLowest, borderRadius: 12, overflow: "hidden",
                          boxShadow: "0 4px 20px rgba(47,52,48,0.12)",
                        }}>
                          <button
                            onClick={() => {
                              const url = `${API_BASE}/og/@${user.nickname}`;
                              navigator.clipboard.writeText(url).then(() => {
                                setSuccessMsg("프로필 링크가 복사됐어요!");
                                setTimeout(() => setSuccessMsg(""), 2500);
                              });
                              setShowShareMenu(false);
                            }}
                            style={{
                              width: "100%", padding: "13px 16px", border: "none", background: "none",
                              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                              fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.onSurface,
                              borderBottom: `1px solid ${C.container}`,
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.primary }}>link</span>
                            링크 복사
                          </button>
                          <button
                            onClick={async () => {
                              setShowShareMenu(false);
                              try {
                                const result = await shareProfileCard(
                                  { nickname: user.nickname, profile_photo_url: user.profile_photo_url },
                                  personalPlaces,
                                  "kakao",
                                );
                                if (result === "kakao_fallback") {
                                  shareKakao({
                                    title: `${user.nickname}의 공간`,
                                    description: `${user.nickname}님이 아끼는 공간을 구경해보세요!`,
                                    linkUrl: `${API_BASE}/og/@${user.nickname}`,
                                  });
                                }
                              } catch {
                                shareKakao({
                                  title: `${user.nickname}의 공간`,
                                  description: `${user.nickname}님이 아끼는 공간을 구경해보세요!`,
                                  linkUrl: `${API_BASE}/og/@${user.nickname}`,
                                });
                              }
                            }}
                            style={{
                              width: "100%", padding: "13px 16px", border: "none", background: "none",
                              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                              fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.onSurface,
                              borderBottom: `1px solid ${C.container}`,
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#191919" d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18l-.93 3.44c-.08.3.26.54.52.37l4.12-2.74c.21.02.43.03.65.03 4.42 0 8-2.79 8-6.28S13.42 1 9 1z"/></svg>
                            카카오톡
                          </button>
                          <button
                            onClick={async () => {
                              setShowShareMenu(false);
                              try {
                                await shareProfileCard(
                                  { nickname: user.nickname, profile_photo_url: user.profile_photo_url },
                                  personalPlaces,
                                );
                              } catch {
                                setSuccessMsg("카드 생성에 실패했어요");
                                setTimeout(() => setSuccessMsg(""), 2500);
                              }
                            }}
                            style={{
                              width: "100%", padding: "13px 16px", border: "none", background: "none",
                              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                              fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.onSurface,
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z" stroke="#E1306C" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="#E1306C" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1" fill="#E1306C"/></svg>
                            인스타그램
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 공개 설정 — Rule of Silence: padding separation */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.surfaceLow,
            borderRadius: 6, padding: "10px 12px",
            marginBottom: 6,
          }}>
            <div>
              <p style={{ margin: 0, fontFamily: FL, fontSize: 11, fontWeight: 600, color: C.onSurface }}>
                내 지도 공개
              </p>
              <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 9, color: C.outlineVariant, fontStyle: "italic" }}>
                {isPublic ? "누구나 팔로우할 수 있어요" : "요청으로만 볼 수 있어요"}
              </p>
            </div>
            <Toggle value={isPublic} onChange={handlePublicToggle} />
          </div>

          {/* 푸시 알림 설정 */}
          {pushSupported && (
            <>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: C.surfaceLow, borderRadius: 6, padding: "10px 12px",
                marginBottom: pushError ? 4 : 14, opacity: pushLoading ? 0.6 : 1,
              }}>
                <div>
                  <p style={{ margin: 0, fontFamily: FL, fontSize: 11, fontWeight: 600, color: C.onSurface }}>
                    푸시 알림
                  </p>
                  <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 9, color: C.outlineVariant, fontStyle: "italic" }}>
                    {pushEnabled ? "좋아요, 댓글, 팔로우 알림" : "알림 받기를 켜보세요"}
                  </p>
                </div>
                <Toggle value={pushEnabled} onChange={handlePushToggle} />
              </div>
              {pushError && (
                <p style={{ margin: "0 0 12px", fontFamily: FL, fontSize: 11, color: C.error, padding: "0 14px" }}>
                  {pushError}
                </p>
              )}
            </>
          )}

          {/* 수정 폼 */}
          {editing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ProfileInput
                label="닉네임"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <ProfileInput
                label="인스타그램"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/your_id"
              />
              <ProfileInput
                label="블로그"
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
                placeholder="https://blog.naver.com/your_id"
              />
              {error && (
                <p style={{ fontFamily: FL, fontSize: 12, color: C.error, margin: 0 }}>{error}</p>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setEditing(false); setError(""); }}
                  style={{
                    flex: 1, padding: "11px",
                    border: "1px solid rgba(101,93,84,0.12)",
                    borderRadius: 8, background: "none",
                    fontFamily: FL, fontSize: 12, color: C.onSurfaceVariant, cursor: "pointer",
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "11px", border: "none", borderRadius: 8,
                    background: saving ? C.container : `linear-gradient(to bottom, ${C.primary}, ${C.primaryDim})`,
                    color: saving ? C.outlineVariant : "#fff6ef",
                    fontFamily: FL, fontSize: 12, fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "opacity 0.15s",
                  }}
                >
                  {saving ? "저장 중…" : "저장"}
                </button>
              </div>
            </div>
          )}

          {successMsg && (
            <p style={{ fontFamily: FL, fontSize: 12, color: "#1D9E75", textAlign: "center", marginTop: 12 }}>
              {successMsg}
            </p>
          )}
        </Card>

        {/* ── 나의 기록 (공간지도 포함) ─────────────────── */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => { if (pushNav) pushNav({ extra: () => setShowMyPlaces(false) }); setShowMyPlaces(true); }}>
            <div>
              <p style={{
                margin: "0 0 6px", fontFamily: FL, fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant,
              }}>
                나의 기록
              </p>
              <p style={{ margin: 0, fontFamily: FH, fontSize: 20, fontWeight: 700, color: C.onSurface }}>
                {personalPlaces.length}<span style={{ fontFamily: FL, fontSize: 12, fontWeight: 400, color: C.onSurfaceVariant }}>곳</span>
              </p>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: C.outlineVariant }}>
              chevron_right
            </span>
          </div>

          {/* 미니 맵 */}
          <MiniMapInline places={personalPlaces} onViewMap={onViewMap} />

          {personalPlaces.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", cursor: "pointer" }} onClick={() => { if (pushNav) pushNav({ extra: () => setShowMyPlaces(false) }); setShowMyPlaces(true); }}>
              {personalPlaces.slice(0, 5).map((p) => {
                const thumb = p.photo_urls?.[0] || p.photo_url;
                return (
                  <div key={p.id} style={{
                    width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                    background: thumb ? `url(${thumb}) center/cover` : `linear-gradient(135deg, ${C.primaryDim}20, ${C.primary}10)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {!thumb && (
                      <span style={{ fontFamily: FH, fontStyle: "italic", fontSize: 10, color: C.outlineVariant }}>
                        {p.name?.[0]}
                      </span>
                    )}
                  </div>
                );
              })}
              {personalPlaces.length > 5 && (
                <div style={{
                  width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                  background: C.surfaceLow,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant, fontWeight: 600 }}>
                    +{personalPlaces.length - 5}
                  </span>
                </div>
              )}
            </div>
          )}
          {personalPlaces.length === 0 && (
            <p style={{
              margin: "8px 0 0", fontFamily: FH, fontStyle: "italic",
              fontSize: 12, color: C.outlineVariant,
            }}>
              첫 장소를 추가해보세요
            </p>
          )}
        </Card>

        {/* ── 큐레이션 리스트 (접기/펼치기) ────────────────── */}
        <Card>
          <SectionHeader title="큐레이션 리스트" open={openSections.curation} onToggle={() => toggleSection("curation")} />
          {openSections.curation && <CuratedLists personalPlaces={personalPlaces} />}
        </Card>

        {/* ── 나의 베스트 (접기/펼치기) ───────────────────── */}
        {user && (
          <Card>
            <SectionHeader title="나의 베스트" open={openSections.best} onToggle={() => toggleSection("best")} />
            {openSections.best && (
              <MyBestSection
                myBestPicks={myBestPicks}
                personalPlaces={personalPlaces}
                onBestPickAdd={onBestPickAdd}
                onBestPickRemove={onBestPickRemove}
              />
            )}
          </Card>
        )}

        {/* ── 팔로우 관리 (접기/펼치기) — 데스크톱만, 모바일은 친구 탭 사용 ── */}
        {!mobile && (
          <Card>
            <SectionHeader
              title={`팔로우 — ${followingList.length} 팔로잉 · ${followerList.length} 팔로워`}
              open={openSections.follow}
              onToggle={() => toggleSection("follow")}
            />
            {openSections.follow && (
              <>
                {/* 팔로잉 · 팔로워 좌우 한 줄씩 */}
                {(followingList.length > 0 || followerList.length > 0) && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    {/* 팔로잉 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 8px", fontFamily: FL, fontSize: 10, fontWeight: 600, color: C.onSurfaceVariant }}>
                        팔로잉 {followingList.length}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {followingList.map((u) => (
                          <div key={u.id || u.user_id} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 8px", borderRadius: 8, background: C.surfaceLow,
                          }}>
                            <div
                              onClick={() => onViewUserProfile?.(u.nickname)}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                flex: 1, minWidth: 0, cursor: "pointer",
                              }}
                            >
                              <div style={{
                                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                                background: u.profile_photo_url
                                  ? `url(${u.profile_photo_url}) center/cover`
                                  : `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontFamily: FH, fontStyle: "italic", fontSize: 11, color: "#fff6ef", fontWeight: 700,
                              }}>
                                {!u.profile_photo_url && u.nickname?.[0]?.toUpperCase()}
                              </div>
                              <span style={{
                                fontFamily: FL, fontSize: 12, fontWeight: 600, color: C.onSurface,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {u.nickname}
                              </span>
                            </div>
                            <button
                              onClick={() => handleUnfollow(u.id || u.user_id)}
                              disabled={followActionLoading === (u.id || u.user_id)}
                              style={{
                                padding: "3px 8px", border: "1px solid rgba(158,66,44,0.15)",
                                borderRadius: 5, background: "none",
                                color: C.error, fontFamily: FL, fontSize: 10, fontWeight: 600,
                                cursor: "pointer", flexShrink: 0,
                                opacity: followActionLoading === (u.id || u.user_id) ? 0.5 : 1,
                              }}
                            >
                              해제
                            </button>
                          </div>
                        ))}
                        {followingList.length === 0 && (
                          <p style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant, fontStyle: "italic", margin: 0 }}>없음</p>
                        )}
                      </div>
                    </div>

                    {/* 팔로워 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 8px", fontFamily: FL, fontSize: 10, fontWeight: 600, color: C.onSurfaceVariant }}>
                        팔로워 {followerList.length}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {followerList.map((u) => (
                          <div key={u.id || u.user_id}
                            onClick={() => onViewUserProfile?.(u.nickname)}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "6px 8px", borderRadius: 8, background: C.surfaceLow,
                              cursor: "pointer",
                            }}
                          >
                            <div style={{
                              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                              background: u.profile_photo_url
                                ? `url(${u.profile_photo_url}) center/cover`
                                : `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontFamily: FH, fontStyle: "italic", fontSize: 11, color: "#fff6ef", fontWeight: 700,
                            }}>
                              {!u.profile_photo_url && u.nickname?.[0]?.toUpperCase()}
                            </div>
                            <span style={{
                              fontFamily: FL, fontSize: 12, fontWeight: 600, color: C.onSurface,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {u.nickname}
                            </span>
                          </div>
                        ))}
                        {followerList.length === 0 && (
                          <p style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant, fontStyle: "italic", margin: 0 }}>없음</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {followingList.length === 0 && followerList.length === 0 && (
                  <p style={{
                    fontFamily: FH, fontStyle: "italic", fontSize: 13,
                    color: C.outlineVariant, margin: "0 0 14px", textAlign: "center",
                  }}>
                    검색 탭에서 사람을 찾아 팔로우해보세요
                  </p>
                )}

                {/* 카카오톡으로 초대 */}
                <button
                  onClick={() => shareKakao({
                    title: `${user.nickname}님이 초대합니다`,
                    description: `${user.nickname}님이 아끼는 공간을 구경해보세요!`,
                    linkUrl: `${API_BASE}/og/@${user.nickname}`,
                  })}
                  style={{
                    width: "100%", padding: "10px 14px",
                    background: "#FEE500", border: "none", borderRadius: 8,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontFamily: FL, fontSize: 11, fontWeight: 700, color: "#191919",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 18 18"><path fill="#191919" d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18l-.93 3.44c-.08.3.26.54.52.37l4.12-2.74c.21.02.43.03.65.03 4.42 0 8-2.79 8-6.28S13.42 1 9 1z"/></svg>
                  카카오톡으로 친구 초대
                </button>
              </>
            )}
          </Card>
        )}

        {/* ── 나의 기록 상세 오버레이 (인스타 그리드) — Portal로 body에 렌더 ── */}
        {showMyPlaces && createPortal((() => {
          const grouped = {};
          personalPlaces.forEach((p) => {
            const fid = p.folder_id || 0;
            (grouped[fid] = grouped[fid] || []).push(p);
          });
          const orderedFids = myFolders.map((f) => f.id).filter((id) => grouped[id]);
          if (grouped[0]) orderedFids.push(0);

          return (
            <div style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: C.bg,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}>
              <div style={{
                maxWidth: 520, margin: "0 auto",
                padding: mobile ? "0 0 100px" : "0 18px 60px",
              }}>
                {/* 상단 헤더 */}
                <div style={{
                  position: "sticky", top: 0, zIndex: 10,
                  background: "rgba(250,249,246,0.92)",
                  backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                  padding: mobile ? "16px 18px" : "20px 18px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <button
                    onClick={() => { window.history.back(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      border: "none", background: "none", cursor: "pointer",
                      fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.primary,
                      padding: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                    돌아가기
                  </button>
                  <p style={{
                    margin: 0, fontFamily: FL, fontSize: 9, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant,
                  }}>
                    나의 기록 — {personalPlaces.length}곳
                  </p>
                </div>

                {/* 컬렉션별 그리드 */}
                {orderedFids.map((fid) => {
                  const folder = myFolders.find((f) => f.id === fid);
                  const color = folder?.color || C.outlineVariant;
                  const name = folder?.name || "미분류";
                  const items = grouped[fid];
                  return (
                    <div key={fid} style={{ marginBottom: 24 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: mobile ? "0 16px 8px" : "0 0 8px",
                      }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <p style={{
                          margin: 0, fontFamily: FL, fontSize: 11, fontWeight: 700,
                          color: C.onSurfaceVariant,
                        }}>{name} <span style={{ fontWeight: 500, color: C.outlineVariant }}>({items.length})</span></p>
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 2,
                      }}>
                        {items.map((p) => {
                          const photo = p.photo_urls?.[0] || p.photo_url;
                          const sc = STATUS_COLOR[p.status];
                          return (
                            <div
                              key={p.id}
                              onClick={() => onPlaceClick?.(p)}
                              style={{
                                position: "relative", aspectRatio: "1", overflow: "hidden",
                                background: photo ? "#f0efec" : `linear-gradient(135deg, ${C.primaryDim}18, ${C.primary}0a)`,
                                cursor: onPlaceClick ? "pointer" : "default",
                              }}
                            >
                              {photo ? (
                                <img src={photo} alt={p.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              ) : (
                                <div style={{
                                  width: "100%", height: "100%",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  flexDirection: "column", gap: 4,
                                }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: C.outlineVariant }}>add_a_photo</span>
                                  <p style={{ margin: 0, fontFamily: FL, fontSize: 9, color: C.outlineVariant, fontWeight: 600 }}>사진 등록</p>
                                </div>
                              )}
                              <div style={{
                                position: "absolute", bottom: 0, left: 0, right: 0,
                                background: photo ? "linear-gradient(transparent, rgba(0,0,0,0.55))" : "none",
                                padding: "16px 6px 5px",
                              }}>
                                <p style={{
                                  margin: 0, fontFamily: FL, fontSize: 10, fontWeight: 700,
                                  color: photo ? "#fff" : C.onSurface, lineHeight: 1.3, textAlign: "center",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{p.name}</p>
                              </div>
                              <div style={{
                                position: "absolute", top: 4, left: 4,
                                width: 8, height: 8, borderRadius: "50%",
                                background: sc?.color || C.outlineVariant,
                                border: "1.5px solid rgba(255,255,255,0.8)",
                              }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {personalPlaces.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: C.outlineVariant, marginBottom: 12 }}>
                      add_location
                    </span>
                    <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 16, color: C.onSurfaceVariant }}>
                      아직 저장된 장소가 없어요
                    </p>
                    <p style={{ fontFamily: FL, fontSize: 12, color: C.outlineVariant }}>
                      지도에서 장소를 검색하고 저장해보세요
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })(), document.body)}

        {/* ── 설정 (접기/펼치기) ─────────────────────────── */}
        <Card>
          <SectionHeader title="설정" open={openSections.pin} onToggle={() => toggleSection("pin")} />
          {openSections.pin && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.onSurface }}>
                    PIN 번호 변경
                  </p>
                  <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>
                    4자리 숫자 PIN
                  </p>
                </div>
                <button
                  onClick={() => { setShowPinChange(!showPinChange); setPinError(""); }}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid rgba(101,93,84,0.12)",
                    borderRadius: 7, background: "none",
                    fontFamily: FL, fontSize: 11, color: C.onSurfaceVariant, cursor: "pointer",
                  }}
                >
                  {showPinChange ? "취소" : "변경"}
                </button>
              </div>

              {showPinChange && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <ProfileInput
                    label="현재 PIN" type="password" inputMode="numeric" maxLength={4}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="4자리" style={{ textAlign: "center", letterSpacing: 10, fontSize: 20 }}
                  />
                  <ProfileInput
                    label="새 PIN" type="password" inputMode="numeric" maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="4자리" style={{ textAlign: "center", letterSpacing: 10, fontSize: 20 }}
                  />
                  {pinError && (
                    <p style={{ fontFamily: FL, fontSize: 12, color: C.error, margin: 0 }}>{pinError}</p>
                  )}
                  <button
                    onClick={handlePinChange}
                    disabled={pinSaving}
                    style={{
                      width: "100%", padding: "11px", border: "none", borderRadius: 8,
                      background: pinSaving
                        ? C.container
                        : `linear-gradient(to bottom, ${C.primary}, ${C.primaryDim})`,
                      color: pinSaving ? C.outlineVariant : "#fff6ef",
                      fontFamily: FL, fontSize: 12, fontWeight: 700,
                      cursor: pinSaving ? "not-allowed" : "pointer",
                    }}
                  >
                    {pinSaving ? "변경 중…" : "PIN 변경"}
                  </button>
                </div>
              )}
            </>
          )}
        </Card>

        {/* ── 로그아웃 ─────────────────────────────────────── */}
        <button
          onClick={() => { if (window.confirm("로그아웃 할까요?")) logout(); }}
          style={{
            width: "100%", padding: "13px",
            /* Ghost Border at 20% for danger action */
            border: "1px solid rgba(158,66,44,0.2)",
            borderRadius: 10, background: "none",
            color: C.error,
            fontFamily: FL, fontSize: 12, fontWeight: 700,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(158,66,44,0.05)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "none"}
        >
          로그아웃
        </button>

        <button
          onClick={() => {
            if (window.confirm("정말 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.")) {
              axios.delete(`${API_BASE}/users/${user.user_id}/account`)
                .then(() => { alert("탈퇴가 완료되었습니다."); logout(); })
                .catch(() => alert("탈퇴 처리 중 오류가 발생했습니다."));
            }
          }}
          style={{
            width: "100%", padding: "13px", marginTop: 8,
            border: "none", borderRadius: 10,
            background: "none",
            color: C.outlineVariant,
            fontFamily: FL, fontSize: 11, fontWeight: 500,
            cursor: "pointer",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = C.error}
          onMouseLeave={(e) => e.currentTarget.style.color = C.outlineVariant}
        >
          계정 삭제
        </button>

        <p style={{
          fontFamily: FL, fontSize: 9, color: C.outlineVariant,
          textAlign: "center", marginTop: 20, letterSpacing: "0.12em",
        }}>
          나의 공간 v2.0
        </p>
      </div>
    </div>
  );
}
