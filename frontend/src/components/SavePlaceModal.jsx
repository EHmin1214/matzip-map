// src/components/SavePlaceModal.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const STATUS_OPTIONS = [
  { value: "want_to_go",      emoji: "🔖", label: "가고 싶어요" },
  { value: "visited",         emoji: "✅", label: "가봤어요" },
  { value: "want_revisit",    emoji: "❤️", label: "또 가고 싶어요" },
  { value: "not_recommended", emoji: "👎", label: "별로였어요" },
];

const VISITED_STATUSES = ["visited", "want_revisit", "not_recommended"];

const DEFAULT_FOLDER_COLORS = [
  "#E8593C", "#3B8BD4", "#1D9E75", "#BA7517",
  "#7F77DD", "#D4537E", "#0F6E56", "#993C1D",
];

export default function SavePlaceModal({ place, onSave, onClose }) {
  const { user } = useUser();
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [status, setStatus] = useState("want_to_go");
  const [rating, setRating] = useState(0);
  const [memo, setMemo] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // 새 폴더 만들기
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#E8593C");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // 폴더 목록 로드
  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/folders/?user_id=${user.user_id}`)
      .then((res) => setFolders(res.data))
      .catch(() => {});
  }, [user]);

  // 별점 — 방문 전 상태면 초기화
  useEffect(() => {
    if (!VISITED_STATUSES.includes(status)) {
      setRating(0);
    }
  }, [status]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await axios.post(`${API_BASE}/folders/`, {
        user_id: user.user_id,
        name: newFolderName.trim(),
        color: newFolderColor,
      });
      setFolders((prev) => [...prev, res.data]);
      setSelectedFolderId(res.data.id);
      setNewFolderName("");
      setShowNewFolder(false);
    } catch (e) {
      alert("폴더 생성 실패");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSave = async () => {
    if (!place) return;
    setSaving(true);
    try {
      await onSave({
        ...place,
        folder_id: selectedFolderId,
        status,
        rating: VISITED_STATUSES.includes(status) && rating > 0 ? rating : null,
        memo: memo.trim() || null,
        instagram_post_url: instagramUrl.trim() || null,
      });
      onClose();
    } catch (e) {
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (!place) return null;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 100,
      padding: "0",
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "white",
        borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 480,
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "0 0 32px",
      }}>
        {/* 핸들 */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2 }} />
        </div>

        {/* 헤더 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "8px 20px 16px", borderBottom: "1px solid #f5f5f5",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a1a" }}>
              {place.name}
            </h3>
            {place.address && (
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#aaa" }}>
                {place.address}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              fontSize: 20, color: "#bbb", cursor: "pointer", padding: 4,
            }}
          >✕</button>
        </div>

        <div style={{ padding: "16px 20px" }}>

          {/* 상태 선택 */}
          <Section title="상태">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  style={{
                    padding: "10px 8px",
                    border: `2px solid ${status === opt.value ? "#E8593C" : "#f0f0f0"}`,
                    borderRadius: 10, background: status === opt.value ? "#fff0ed" : "white",
                    cursor: "pointer", fontSize: 13, fontWeight: 600,
                    color: status === opt.value ? "#E8593C" : "#555",
                    transition: "all 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* 별점 (방문 후 상태일 때만) */}
          {VISITED_STATUSES.includes(status) && (
            <Section title="별점">
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(rating === star ? 0 : star)}
                    style={{
                      fontSize: 28, background: "none", border: "none",
                      cursor: "pointer", padding: "2px 4px",
                      filter: star <= rating ? "none" : "grayscale(1) opacity(0.3)",
                      transition: "filter 0.15s",
                    }}
                  >
                    ⭐
                  </button>
                ))}
                {rating > 0 && (
                  <span style={{ fontSize: 13, color: "#aaa", alignSelf: "center", marginLeft: 4 }}>
                    {rating}점
                  </span>
                )}
              </div>
            </Section>
          )}

          {/* 폴더 선택 */}
          <Section title="폴더">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {/* 폴더 없음 */}
              <FolderChip
                label="없음"
                color="#aaa"
                selected={selectedFolderId === null}
                onClick={() => setSelectedFolderId(null)}
              />
              {folders.map((f) => (
                <FolderChip
                  key={f.id}
                  label={f.name}
                  color={f.color}
                  selected={selectedFolderId === f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                />
              ))}
              {/* 새 폴더 버튼 */}
              <button
                onClick={() => setShowNewFolder(!showNewFolder)}
                style={{
                  padding: "6px 12px", border: "1.5px dashed #ddd",
                  borderRadius: 20, background: "white",
                  fontSize: 12, color: "#aaa", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                + 새 폴더
              </button>
            </div>

            {/* 새 폴더 만들기 */}
            {showNewFolder && (
              <div style={{
                marginTop: 12, padding: 12,
                background: "#f8f8f8", borderRadius: 12,
              }}>
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  placeholder="폴더 이름"
                  autoFocus
                  style={{
                    width: "100%", padding: "8px 10px",
                    border: "1.5px solid #eee", borderRadius: 8,
                    fontSize: 13, outline: "none", boxSizing: "border-box",
                  }}
                />
                {/* 색상 선택 */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {DEFAULT_FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewFolderColor(c)}
                      style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: c, border: newFolderColor === c ? "2px solid #333" : "2px solid transparent",
                        cursor: "pointer", padding: 0,
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => setShowNewFolder(false)}
                    style={{
                      flex: 1, padding: "8px",
                      border: "1px solid #ddd", borderRadius: 8,
                      background: "white", fontSize: 13, cursor: "pointer", color: "#888",
                    }}
                  >취소</button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={creatingFolder || !newFolderName.trim()}
                    style={{
                      flex: 1, padding: "8px",
                      border: "none", borderRadius: 8,
                      background: newFolderName.trim() ? "#E8593C" : "#eee",
                      color: newFolderName.trim() ? "white" : "#aaa",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {creatingFolder ? "..." : "만들기"}
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* 메모 */}
          <Section title="메모 (선택)">
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="한줄 메모 (예: 웨이팅 있음, 주차 가능)"
              maxLength={100}
              style={{
                width: "100%", padding: "10px 12px",
                border: "1.5px solid #f0f0f0", borderRadius: 10,
                fontSize: 13, outline: "none", boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "#E8593C"}
              onBlur={(e) => e.target.style.borderColor = "#f0f0f0"}
            />
          </Section>

          {/* 인스타 포스트 링크 */}
          <Section title="인스타 포스트 링크 (선택)">
            <input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              style={{
                width: "100%", padding: "10px 12px",
                border: "1.5px solid #f0f0f0", borderRadius: 10,
                fontSize: 13, outline: "none", boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "#E8593C"}
              onBlur={(e) => e.target.style.borderColor = "#f0f0f0"}
            />
          </Section>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%", padding: "15px",
              background: saving ? "#ccc" : "#E8593C",
              color: "white", border: "none", borderRadius: 14,
              fontSize: 16, fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              marginTop: 8,
            }}
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 헬퍼 컴포넌트 ──────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#555" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function FolderChip({ label, color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        border: `2px solid ${selected ? color : "#f0f0f0"}`,
        borderRadius: 20,
        background: selected ? `${color}18` : "white",
        cursor: "pointer", fontSize: 12, fontWeight: 600,
        color: selected ? color : "#888",
        display: "flex", alignItems: "center", gap: 5,
        transition: "all 0.15s",
      }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: color, flexShrink: 0,
      }} />
      {label}
    </button>
  );
}
