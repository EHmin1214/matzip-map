// src/components/ProfilePage.jsx
import { useState } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const C = {
  primary:    "#655d54",
  primaryDim: "#595149",
  primaryContainer: "#ede0d5",
  bg:         "#faf9f6",
  container:  "#f4f4f0",
  containerHigh: "#edeeea",
  onSurface:  "#2f3430",
  variant:    "#5c605c",
  outline:    "#afb3ae",
  outlineFaint: "rgba(101,93,84,0.08)",
  error:      "#9e422c",
};
const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";

const isMobile = () => window.innerWidth <= 768;

export default function ProfilePage({ embedded = false }) {
  const { user, updateUser, logout } = useUser();
  const mobile = isMobile();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [instagramUrl, setInstagramUrl] = useState(user?.instagram_url || "");
  const [blogUrl, setBlogUrl] = useState(user?.blog_url || "");
  const [isPublic, setIsPublic] = useState(user?.is_public || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

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
      updateUser({ nickname: res.data.nickname, instagram_url: res.data.instagram_url, blog_url: res.data.blog_url, is_public: res.data.is_public });
      setEditing(false);
      setSuccessMsg("저장됐어요!");
      setTimeout(() => setSuccessMsg(""), 2000);
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
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (e) {
      setPinError(e.response?.data?.detail || "PIN 변경 실패");
    } finally { setPinSaving(false); }
  };

  const containerStyle = embedded
    ? { height: "100%", overflowY: "auto", background: C.bg, fontFamily: FL }
    : {
        position: "fixed", inset: 0, background: C.bg,
        overflowY: "auto", paddingBottom: mobile ? 80 : 0,
        zIndex: 20, fontFamily: FL,
        WebkitOverflowScrolling: "touch",
      };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>
      <div style={containerStyle}>
        {!embedded && (
          <div style={{
            background: C.bg, padding: "16px 20px",
            borderBottom: `1px solid ${C.outlineFaint}`,
            position: "sticky", top: 0, zIndex: 10,
          }}>
            <h2 style={{ margin: 0, fontFamily: FH, fontSize: 18, fontWeight: 700, color: C.onSurface }}>내 프로필</h2>
          </div>
        )}

        <div style={{ padding: embedded ? "16px 12px" : mobile ? "16px" : "20px" }}>

          {/* 프로필 카드 */}
          <div style={{
            background: C.bg,
            border: `1px solid ${C.outlineFaint}`,
            borderRadius: 16, padding: "20px",
            marginBottom: 14,
          }}>
            {/* 아바타 + 이름 */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FH, fontStyle: "italic",
                fontSize: 22, color: "#fff6ef", fontWeight: 700, flexShrink: 0,
              }}>
                {user.nickname?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 style={{ margin: 0, fontFamily: FH, fontSize: 20, fontWeight: 700, color: C.onSurface }}>
                  {user.nickname}
                </h2>
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  {user.instagram_url && (
                    <a href={user.instagram_url} target="_blank" rel="noreferrer"
                      style={{ fontFamily: FL, fontSize: 11, color: C.primary, textDecoration: "none", fontWeight: 600 }}>
                      📷 Instagram
                    </a>
                  )}
                  {user.blog_url && (
                    <a href={user.blog_url} target="_blank" rel="noreferrer"
                      style={{ fontFamily: FL, fontSize: 11, color: "#3B8BD4", textDecoration: "none", fontWeight: 600 }}>
                      ✍️ 블로그
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* 공개 설정 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 0",
              borderTop: `1px solid ${C.outlineFaint}`,
              borderBottom: `1px solid ${C.outlineFaint}`,
              marginBottom: 16,
            }}>
              <div>
                <p style={{ margin: 0, fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.onSurface }}>내 지도 공개</p>
                <p style={{ margin: "3px 0 0", fontFamily: FL, fontSize: 11, color: C.outline, fontStyle: "italic" }}>
                  {isPublic ? "누구나 팔로우할 수 있어요" : "비공개 — 요청으로만 볼 수 있어요"}
                </p>
              </div>
              <Toggle value={isPublic} onChange={handlePublicToggle} />
            </div>

            {/* 수정 폼 */}
            {!editing ? (
              <button
                onClick={() => { setNickname(user.nickname); setInstagramUrl(user.instagram_url || ""); setBlogUrl(user.blog_url || ""); setEditing(true); }}
                style={{
                  width: "100%", padding: "11px",
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 10, background: "none",
                  fontFamily: FL, fontSize: 13, fontWeight: 700,
                  color: C.primary, cursor: "pointer",
                }}
              >
                프로필 수정
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <ProfileInput label="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                <ProfileInput label="인스타그램" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/your_id" />
                <ProfileInput label="블로그" value={blogUrl} onChange={(e) => setBlogUrl(e.target.value)} placeholder="https://blog.naver.com/your_id" />
                {error && <p style={{ fontFamily: FL, fontSize: 12, color: C.error, margin: 0 }}>{error}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => { setEditing(false); setError(""); }} style={{
                    flex: 1, padding: "11px", border: `1px solid ${C.outlineFaint}`,
                    borderRadius: 10, background: "none",
                    fontFamily: FL, fontSize: 13, color: C.variant, cursor: "pointer",
                  }}>취소</button>
                  <button onClick={handleSave} disabled={saving} style={{
                    flex: 1, padding: "11px", border: "none", borderRadius: 10,
                    background: saving ? C.outline : C.primary,
                    color: "#fff6ef",
                    fontFamily: FL, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>{saving ? "저장 중..." : "저장"}</button>
                </div>
              </div>
            )}

            {successMsg && (
              <p style={{ fontFamily: FL, fontSize: 12, color: "#1D9E75", textAlign: "center", marginTop: 12 }}>
                ✓ {successMsg}
              </p>
            )}
          </div>

          {/* PIN 변경 */}
          <div style={{
            background: C.bg, border: `1px solid ${C.outlineFaint}`,
            borderRadius: 16, padding: "16px 20px", marginBottom: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontFamily: FL, fontSize: 13, fontWeight: 600, color: C.onSurface }}>PIN 번호 변경</p>
              <button onClick={() => { setShowPinChange(!showPinChange); setPinError(""); }} style={{
                padding: "6px 12px", border: `1px solid ${C.outlineFaint}`,
                borderRadius: 8, background: "none",
                fontFamily: FL, fontSize: 11, color: C.variant, cursor: "pointer",
              }}>{showPinChange ? "취소" : "변경"}</button>
            </div>
            {showPinChange && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <ProfileInput label="현재 PIN" type="password" inputMode="numeric" maxLength={4} value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4자리" style={{ textAlign: "center", letterSpacing: 8 }} />
                <ProfileInput label="새 PIN" type="password" inputMode="numeric" maxLength={4} value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4자리" style={{ textAlign: "center", letterSpacing: 8 }} />
                {pinError && <p style={{ fontFamily: FL, fontSize: 12, color: C.error, margin: 0 }}>{pinError}</p>}
                <button onClick={handlePinChange} disabled={pinSaving} style={{
                  width: "100%", padding: "11px", border: "none", borderRadius: 10,
                  background: pinSaving ? C.outline : C.primary,
                  color: "#fff6ef",
                  fontFamily: FL, fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>{pinSaving ? "변경 중..." : "PIN 변경"}</button>
              </div>
            )}
          </div>

          {/* 로그아웃 */}
          <button
            onClick={() => { if (window.confirm("로그아웃 할까요?")) logout(); }}
            style={{
              width: "100%", padding: "14px",
              border: `1px solid rgba(158,66,44,0.2)`, borderRadius: 12,
              background: "none", color: C.error,
              fontFamily: FL, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >로그아웃</button>

          <p style={{ fontFamily: FL, fontSize: 10, color: C.outline, textAlign: "center", marginTop: 16, letterSpacing: "0.1em" }}>
            나의 맛집 지도 v2.0
          </p>
        </div>
      </div>
    </>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={onChange} style={{
      width: 46, height: 26, borderRadius: 13,
      background: value ? "#655d54" : "#afb3ae",
      position: "relative", cursor: "pointer",
      transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 3, left: value ? 23 : 3,
        width: 20, height: 20, borderRadius: "50%",
        background: "white",
        boxShadow: "0 1px 4px rgba(47,52,48,0.2)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

function ProfileInput({ label, style: extraStyle = {}, ...props }) {
  return (
    <div>
      <label style={{
        display: "block", fontFamily: "'Manrope', sans-serif",
        fontSize: 10, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.15em",
        color: "#5c605c", marginBottom: 6,
      }}>
        {label}
      </label>
      <input
        {...props}
        style={{
          width: "100%", padding: "10px 12px",
          background: "#f4f4f0", border: "none", borderRadius: 8,
          fontFamily: "'Manrope', sans-serif",
          fontSize: 13, color: "#2f3430",
          outline: "none", boxSizing: "border-box",
          WebkitAppearance: "none",
          ...extraStyle,
        }}
      />
    </div>
  );
}
