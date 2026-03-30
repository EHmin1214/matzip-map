// src/components/ProfilePage.jsx
import { useState, useEffect, useRef } from "react";
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

const isMobile = () => window.innerWidth <= 768;

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
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.surfaceLowest,
      borderRadius: 12, padding: "18px 20px",
      marginBottom: 12,
      boxShadow: "0 1px 8px rgba(47,52,48,0.05)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── 미니 맵 ─────────────────────────────────────────────────
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
          want_revisit: "#D4537E", not_recommended: "#afb3ae",
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

  const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎" };
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
            ref={mapRef}
            style={{
              width: "100%", height: 160, borderRadius: 10,
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

export default function ProfilePage({ personalPlaces = [], onViewMap }) {
  const { user, updateUser, logout } = useUser();
  const mobile = isMobile();
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
        maxWidth: 520,
        margin: "0 auto",
        padding: mobile ? "28px 18px" : "36px 28px",
      }}>

        {/* ── Archival Header ────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h2 style={{
              fontFamily: FH, fontStyle: "italic",
              fontSize: mobile ? 28 : 36, fontWeight: 400,
              color: C.onSurface, margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}>
              Profile
            </h2>
            <div style={{ width: 28, height: 1.5, background: C.primaryContainer }} />
          </div>
        </div>

        {/* ── 프로필 카드 ─────────────────────────────────── */}
        <Card>
          {/* 아바타 + 이름 */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FH, fontStyle: "italic",
              fontSize: 22, color: "#fff6ef", fontWeight: 700, flexShrink: 0,
            }}>
              {user.nickname?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px", fontFamily: FH, fontSize: 19, fontWeight: 700, color: C.onSurface }}>
                {user.nickname}
              </h2>
              <p style={{ margin: 0, fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
                Personal Curator
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
                {user.instagram_url && (
                  <a href={user.instagram_url} target="_blank" rel="noreferrer"
                    style={{ fontFamily: FL, fontSize: 11, color: C.primary, textDecoration: "none", fontWeight: 600 }}>
                    Instagram
                  </a>
                )}
                {user.blog_url && (
                  <a href={user.blog_url} target="_blank" rel="noreferrer"
                    style={{ fontFamily: FL, fontSize: 11, color: "#3B8BD4", textDecoration: "none", fontWeight: 600 }}>
                    블로그
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 공개 설정 — Rule of Silence: padding separation */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 0",
            /* Tonal separation: slightly different bg instead of border */
            background: C.surfaceLow,
            borderRadius: 8, padding: "12px 14px",
            marginBottom: 16,
          }}>
            <div>
              <p style={{ margin: 0, fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.onSurface }}>
                내 지도 공개
              </p>
              <p style={{ margin: "3px 0 0", fontFamily: FL, fontSize: 11, color: C.outlineVariant, fontStyle: "italic" }}>
                {isPublic ? "누구나 팔로우할 수 있어요" : "요청으로만 볼 수 있어요"}
              </p>
            </div>
            <Toggle value={isPublic} onChange={handlePublicToggle} />
          </div>

          {/* 수정 폼 */}
          {!editing ? (
            <button
              onClick={() => {
                setNickname(user.nickname);
                setInstagramUrl(user.instagram_url || "");
                setBlogUrl(user.blog_url || "");
                setEditing(true);
              }}
              style={{
                width: "100%", padding: "11px",
                /* Ghost Border Fallback at 15% */
                border: "1px solid rgba(101,93,84,0.15)",
                borderRadius: 8, background: "none",
                fontFamily: FL, fontSize: 12, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                color: C.primary, cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.primaryContainer}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
            >
              프로필 수정
            </button>
          ) : (
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

        {/* ── 미니 맵 ──────────────────────────────────────── */}
        <MiniMap places={personalPlaces} onViewMap={onViewMap} />

        {/* ── PIN 변경 ─────────────────────────────────────── */}
        <Card>
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
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceLow}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
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
