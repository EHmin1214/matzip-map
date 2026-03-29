// src/components/ProfilePage.jsx
import { useState } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

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
      updateUser({
        nickname: res.data.nickname,
        instagram_url: res.data.instagram_url,
        blog_url: res.data.blog_url,
        is_public: res.data.is_public,
      });
      setEditing(false);
      setSuccessMsg("저장됐어요!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (e) {
      setError(e.response?.data?.detail || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handlePublicToggle = async () => {
    const newVal = !isPublic;
    setIsPublic(newVal);
    try {
      await axios.patch(`${API_BASE}/users/${user.user_id}`, { is_public: newVal });
      updateUser({ is_public: newVal });
    } catch (e) {
      setIsPublic(!newVal);
    }
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
      setShowPinChange(false);
      setCurrentPin(""); setNewPin("");
      setSuccessMsg("PIN이 변경됐어요!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (e) {
      setPinError(e.response?.data?.detail || "PIN 변경 실패");
    } finally {
      setPinSaving(false);
    }
  };

  const containerStyle = embedded
    ? { height: "100%", overflowY: "auto", background: "white" }
    : {
        position: "fixed", inset: 0, background: "#f8f8f8",
        overflowY: "auto",
        paddingBottom: mobile ? 80 : 0,
        zIndex: 20,
        WebkitOverflowScrolling: "touch",
      };

  const cardStyle = {
    background: "white",
    borderRadius: 16,
    padding: mobile ? "20px 18px" : "20px 16px",
    marginBottom: 14,
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
  };

  return (
    <div style={containerStyle}>
      {!embedded && (
        <div style={{
          background: "white", padding: "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#222" }}>내 프로필</h2>
        </div>
      )}

      <div style={{ padding: embedded ? "16px 12px" : mobile ? "16px" : "20px 16px" }}>

        {/* 프로필 카드 */}
        <div style={cardStyle}>
          {/* 아바타 + 닉네임 */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{
              width: mobile ? 64 : 56, height: mobile ? 64 : 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #E8593C, #ff8a65)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: mobile ? 28 : 24, color: "white", fontWeight: 800, flexShrink: 0,
            }}>
              {user.nickname?.[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: mobile ? 20 : 18, fontWeight: 800, color: "#1a1a1a" }}>
                {user.nickname}
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                {user.instagram_url && (
                  <a href={user.instagram_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: "#E8593C", textDecoration: "none" }}>
                    📷 Instagram
                  </a>
                )}
                {user.blog_url && (
                  <a href={user.blog_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: "#3B8BD4", textDecoration: "none" }}>
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
            borderTop: "1px solid #f5f5f5", borderBottom: "1px solid #f5f5f5",
            marginBottom: 16,
          }}>
            <div>
              <p style={{ margin: 0, fontSize: mobile ? 15 : 14, fontWeight: 700, color: "#333" }}>내 지도 공개</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#aaa" }}>
                {isPublic ? "누구나 내 맛집을 팔로우할 수 있어요" : "비공개 — 팔로우 요청으로만 볼 수 있어요"}
              </p>
            </div>
            <Toggle value={isPublic} onChange={handlePublicToggle} />
          </div>

          {/* 수정 */}
          {!editing ? (
            <button
              onClick={() => {
                setNickname(user.nickname);
                setInstagramUrl(user.instagram_url || "");
                setBlogUrl(user.blog_url || "");
                setEditing(true);
              }}
              style={{
                width: "100%", padding: mobile ? "13px" : "10px",
                border: "1.5px solid #E8593C", borderRadius: 12,
                background: "white", color: "#E8593C",
                fontSize: mobile ? 15 : 14, fontWeight: 700, cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              프로필 수정
            </button>
          ) : (
            <div>
              <Label>닉네임</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} mobile={mobile} />

              <Label style={{ marginTop: 12 }}>인스타그램 링크</Label>
              <Input
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/your_id"
                mobile={mobile}
              />

              <Label style={{ marginTop: 12 }}>블로그 링크</Label>
              <Input
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
                placeholder="https://blog.naver.com/your_id"
                mobile={mobile}
              />

              {error && <p style={{ color: "#E8593C", fontSize: 13, marginTop: 8 }}>{error}</p>}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => { setEditing(false); setError(""); }}
                  style={{
                    flex: 1, padding: mobile ? "13px" : "10px",
                    border: "1px solid #ddd", borderRadius: 12,
                    background: "white", color: "#888",
                    fontSize: mobile ? 15 : 13, cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >취소</button>
                <button
                  onClick={handleSave} disabled={saving}
                  style={{
                    flex: 1, padding: mobile ? "13px" : "10px",
                    border: "none", borderRadius: 12,
                    background: saving ? "#ccc" : "#E8593C", color: "white",
                    fontSize: mobile ? 15 : 13, fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >{saving ? "저장 중..." : "저장"}</button>
              </div>
            </div>
          )}

          {successMsg && (
            <p style={{ color: "#1D9E75", fontSize: 14, textAlign: "center", marginTop: 12 }}>
              ✓ {successMsg}
            </p>
          )}
        </div>

        {/* PIN 변경 */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: mobile ? 15 : 14, fontWeight: 700, color: "#333" }}>PIN 번호 변경</p>
            <button
              onClick={() => { setShowPinChange(!showPinChange); setPinError(""); }}
              style={{
                padding: "8px 14px", minHeight: 40,
                border: "1px solid #ddd", borderRadius: 10,
                background: "white", fontSize: 13, color: "#888", cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >{showPinChange ? "취소" : "변경"}</button>
          </div>

          {showPinChange && (
            <div style={{ marginTop: 16 }}>
              <Label>현재 PIN</Label>
              <input
                type="password" inputMode="numeric" maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="현재 PIN 4자리"
                style={{ ...inputBaseStyle(mobile), textAlign: "center", letterSpacing: 10 }}
              />
              <Label style={{ marginTop: 12 }}>새 PIN</Label>
              <input
                type="password" inputMode="numeric" maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="새 PIN 4자리"
                style={{ ...inputBaseStyle(mobile), textAlign: "center", letterSpacing: 10 }}
              />
              {pinError && <p style={{ color: "#E8593C", fontSize: 13, marginTop: 8 }}>{pinError}</p>}
              <button
                onClick={handlePinChange} disabled={pinSaving}
                style={{
                  width: "100%", marginTop: 14,
                  padding: mobile ? "13px" : "10px",
                  border: "none", borderRadius: 12,
                  background: pinSaving ? "#ccc" : "#E8593C",
                  color: "white", fontSize: mobile ? 15 : 13, fontWeight: 700,
                  cursor: pinSaving ? "not-allowed" : "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >{pinSaving ? "변경 중..." : "PIN 변경"}</button>
            </div>
          )}
        </div>

        {/* 로그아웃 */}
        <button
          onClick={() => { if (window.confirm("로그아웃 할까요?")) logout(); }}
          style={{
            width: "100%", padding: mobile ? "15px" : "14px",
            border: "1.5px solid #ffcdd2", borderRadius: 14,
            background: "white", color: "#e53935",
            fontSize: mobile ? 16 : 14, fontWeight: 700, cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >로그아웃</button>

        <p style={{ fontSize: 12, color: "#ddd", textAlign: "center", marginTop: 16 }}>맛집 지도 v2.0</p>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={onChange} style={{
      width: 52, height: 30, borderRadius: 15,
      background: value ? "#E8593C" : "#ddd",
      position: "relative", cursor: "pointer",
      transition: "background 0.2s", flexShrink: 0,
      WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{
        position: "absolute", top: 3,
        left: value ? 25 : 3,
        width: 24, height: 24, borderRadius: "50%",
        background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

function Label({ children, style }) {
  return (
    <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#888", ...style }}>
      {children}
    </p>
  );
}

function Input({ value, onChange, placeholder, mobile }) {
  return (
    <input
      value={value} onChange={onChange} placeholder={placeholder}
      style={inputBaseStyle(mobile)}
      onFocus={(e) => e.target.style.borderColor = "#E8593C"}
      onBlur={(e) => e.target.style.borderColor = "#f0f0f0"}
    />
  );
}

const inputBaseStyle = (mobile) => ({
  width: "100%", padding: mobile ? "13px 14px" : "10px 12px",
  border: "1.5px solid #f0f0f0", borderRadius: 12,
  fontSize: mobile ? 15 : 13, outline: "none",
  boxSizing: "border-box", WebkitAppearance: "none",
});
