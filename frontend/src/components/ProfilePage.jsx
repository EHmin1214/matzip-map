// src/components/ProfilePage.jsx
import { useState } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

export default function ProfilePage({ embedded = false }) {
  const { user, updateUser, logout } = useUser();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [instagramUrl, setInstagramUrl] = useState(user?.instagram_url || "");
  const [isPublic, setIsPublic] = useState(user?.is_public || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // PIN 변경
  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    setError("");
    if (nickname.trim().length < 2) {
      setError("닉네임은 2자 이상이어야 해요");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.patch(`${API_BASE}/users/${user.user_id}`, {
        nickname: nickname.trim(),
        instagram_url: instagramUrl.trim() || null,
        is_public: isPublic,
      });
      updateUser({
        nickname: res.data.nickname,
        instagram_url: res.data.instagram_url,
        is_public: res.data.is_public,
      });
      setEditing(false);
      setSuccessMsg("저장됐어요!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (e) {
      const msg = e.response?.data?.detail;
      setError(msg || "저장 실패. 다시 시도해주세요");
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
      setIsPublic(!newVal); // 실패 시 롤백
    }
  };

  const handlePinChange = async () => {
    setPinError("");
    if (!/^\d{4}$/.test(currentPin)) { setPinError("현재 PIN 4자리를 입력해주세요"); return; }
    if (!/^\d{4}$/.test(newPin)) { setPinError("새 PIN 4자리를 입력해주세요"); return; }
    if (currentPin === newPin) { setPinError("현재 PIN과 동일해요"); return; }

    setPinSaving(true);
    try {
      // 현재 PIN 확인
      await axios.post(`${API_BASE}/users/login`, { nickname: user.nickname, pin: currentPin });
      // 새 PIN 저장
      await axios.patch(`${API_BASE}/users/${user.user_id}`, { pin: newPin });
      setShowPinChange(false);
      setCurrentPin(""); setNewPin("");
      setSuccessMsg("PIN이 변경됐어요!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (e) {
      const msg = e.response?.data?.detail;
      setPinError(msg || "PIN 변경 실패");
    } finally {
      setPinSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("로그아웃 할까요?")) logout();
  };

  const containerStyle = embedded
    ? { height: "100%", overflowY: "auto", background: "white" }
    : {
        position: "fixed", inset: 0,
        background: "#f8f8f8", overflowY: "auto",
        paddingBottom: 80, zIndex: 20,
      };

  return (
    <div style={containerStyle}>
      {/* 헤더 — 전체화면 모드에서만 */}
      {!embedded && (
        <div style={{
          background: "white", padding: "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#222" }}>내 프로필</h2>
        </div>
      )}

      <div style={{ padding: embedded ? "16px 12px" : "20px 16px" }}>

        {/* 프로필 카드 */}
        <div style={{
          background: embedded ? "#f8f8f8" : "white",
          borderRadius: 16, padding: "20px 16px",
          border: embedded ? "1px solid #f0f0f0" : "none",
          boxShadow: embedded ? "none" : "0 1px 8px rgba(0,0,0,0.06)",
          marginBottom: 16,
        }}>
          {/* 아바타 + 이름 */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, #E8593C, #ff8a65)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, color: "white", fontWeight: 800, flexShrink: 0,
            }}>
              {user.nickname?.[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>
                {user.nickname}
              </p>
              {user.instagram_url && (
                <a href={user.instagram_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: "#E8593C", textDecoration: "none" }}>
                  📷 Instagram
                </a>
              )}
            </div>
          </div>

          {/* 공개 설정 토글 */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 0", borderTop: "1px solid #f5f5f5", borderBottom: "1px solid #f5f5f5",
            marginBottom: 16,
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#333" }}>
                내 지도 공개
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa" }}>
                {isPublic ? "누구나 내 맛집을 팔로우할 수 있어요" : "나만 볼 수 있어요"}
              </p>
            </div>
            <Toggle value={isPublic} onChange={handlePublicToggle} />
          </div>

          {/* 수정 버튼 */}
          {!editing ? (
            <button
              onClick={() => {
                setNickname(user.nickname);
                setInstagramUrl(user.instagram_url || "");
                setEditing(true);
              }}
              style={{
                width: "100%", padding: "10px",
                border: "1.5px solid #E8593C", borderRadius: 10,
                background: "white", color: "#E8593C",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              프로필 수정
            </button>
          ) : (
            <div>
              {/* 닉네임 수정 */}
              <label style={{ fontSize: 12, fontWeight: 600, color: "#888", display: "block", marginBottom: 4 }}>
                닉네임
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={inputStyle}
              />

              {/* 인스타 링크 수정 */}
              <label style={{ fontSize: 12, fontWeight: 600, color: "#888", display: "block", margin: "10px 0 4px" }}>
                인스타그램 링크
              </label>
              <input
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/your_id"
                style={inputStyle}
              />

              {error && <p style={{ color: "#E8593C", fontSize: 12, marginTop: 6 }}>{error}</p>}

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => { setEditing(false); setError(""); }}
                  style={{
                    flex: 1, padding: "10px",
                    border: "1px solid #ddd", borderRadius: 10,
                    background: "white", color: "#888",
                    fontSize: 13, cursor: "pointer",
                  }}
                >취소</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "10px",
                    border: "none", borderRadius: 10,
                    background: saving ? "#ccc" : "#E8593C",
                    color: "white", fontSize: 13, fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >{saving ? "저장 중..." : "저장"}</button>
              </div>
            </div>
          )}

          {successMsg && (
            <p style={{ color: "#1D9E75", fontSize: 13, textAlign: "center", marginTop: 10 }}>
              ✓ {successMsg}
            </p>
          )}
        </div>

        {/* PIN 변경 */}
        <div style={{
          background: embedded ? "#f8f8f8" : "white",
          borderRadius: 16, padding: "16px",
          border: embedded ? "1px solid #f0f0f0" : "none",
          boxShadow: embedded ? "none" : "0 1px 8px rgba(0,0,0,0.06)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#333" }}>PIN 번호 변경</p>
            <button
              onClick={() => { setShowPinChange(!showPinChange); setPinError(""); }}
              style={{
                padding: "6px 12px", border: "1px solid #ddd",
                borderRadius: 8, background: "white",
                fontSize: 12, color: "#888", cursor: "pointer",
              }}
            >
              {showPinChange ? "취소" : "변경"}
            </button>
          </div>

          {showPinChange && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#888", display: "block", marginBottom: 4 }}>
                현재 PIN
              </label>
              <input
                type="password" inputMode="numeric" maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="현재 PIN 4자리"
                style={{ ...inputStyle, textAlign: "center", letterSpacing: 8 }}
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#888", display: "block", margin: "10px 0 4px" }}>
                새 PIN
              </label>
              <input
                type="password" inputMode="numeric" maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="새 PIN 4자리"
                style={{ ...inputStyle, textAlign: "center", letterSpacing: 8 }}
              />
              {pinError && <p style={{ color: "#E8593C", fontSize: 12, marginTop: 6 }}>{pinError}</p>}
              <button
                onClick={handlePinChange}
                disabled={pinSaving}
                style={{
                  width: "100%", marginTop: 12, padding: "10px",
                  border: "none", borderRadius: 10,
                  background: pinSaving ? "#ccc" : "#E8593C",
                  color: "white", fontSize: 13, fontWeight: 700,
                  cursor: pinSaving ? "not-allowed" : "pointer",
                }}
              >{pinSaving ? "변경 중..." : "PIN 변경"}</button>
            </div>
          )}
        </div>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "14px",
            border: "1.5px solid #ffcdd2", borderRadius: 14,
            background: "white", color: "#e53935",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          로그아웃
        </button>

        <p style={{ fontSize: 11, color: "#ccc", textAlign: "center", marginTop: 12 }}>
          맛집 지도 v2.0
        </p>
      </div>
    </div>
  );
}

// ── 토글 컴포넌트 ──────────────────────────────────────────

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: value ? "#E8593C" : "#ddd",
        position: "relative", cursor: "pointer",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: value ? 25 : 3,
        width: 20, height: 20, borderRadius: "50%",
        background: "white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px",
  border: "1.5px solid #f0f0f0", borderRadius: 10,
  fontSize: 13, outline: "none", boxSizing: "border-box",
};
