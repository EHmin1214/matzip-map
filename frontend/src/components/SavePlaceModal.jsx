// src/components/SavePlaceModal.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const C = {
  primary:    "#655d54",
  primaryDim: "#595149",
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

const STATUS_OPTIONS = [
  { value: "want_to_go",      emoji: "🔖", label: "가고 싶어요" },
  { value: "visited",         emoji: "✅", label: "가봤어요" },
  { value: "want_revisit",    emoji: "❤️", label: "또 가고 싶어요" },
];

const VISITED_STATUSES = ["visited", "want_revisit"];
const FOLDER_COLORS = ["#655d54", "#3B8BD4", "#1D9E75", "#BA7517", "#7F77DD", "#D4537E"];

export default function SavePlaceModal({ place, onSave, onClose, editMode = false, onDelete }) {
  const { user } = useUser();
  const isMobile = window.innerWidth <= 768;
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(place?.folder_id || null);
  const [status, setStatus] = useState(place?.status || "want_to_go");
  const [rating, setRating] = useState(place?.rating || 0);
  const [memo, setMemo] = useState(place?.memo || "");
  const [instagramUrl, setInstagramUrl] = useState(place?.instagram_post_url || "");
  // 사진: { type: "existing", url } 또는 { type: "new", file, blobUrl }
  const initPhotos = () => {
    const urls = place?.photo_urls?.length ? place.photo_urls : (place?.photo_url ? [place.photo_url] : []);
    return urls.map((url) => ({ type: "existing", url }));
  };
  const [photos, setPhotos] = useState(initPhotos);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#655d54");
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/folders/?user_id=${user.user_id}`)
      .then((res) => setFolders(res.data))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!VISITED_STATUSES.includes(status)) setRating(0);
  }, [status]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await axios.post(`${API_BASE}/folders/`, {
        user_id: user.user_id, name: newFolderName.trim(), color: newFolderColor,
      });
      setFolders((prev) => [...prev, res.data]);
      setSelectedFolderId(res.data.id);
      setNewFolderName(""); setShowNewFolder(false);
    } catch (e) { alert("폴더 생성 실패"); }
    finally { setCreatingFolder(false); }
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      await axios.delete(`${API_BASE}/folders/${folderId}?user_id=${user.user_id}`);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (selectedFolderId === folderId) setSelectedFolderId(null);
    } catch (e) { alert("컬렉션 삭제 실패"); }
  };

  const handleFolderColorChange = async (folderId, newColor) => {
    try {
      await axios.patch(`${API_BASE}/folders/${folderId}?user_id=${user.user_id}`, { color: newColor });
      setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, color: newColor } : f));
    } catch {}
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError("");
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining);
    const newPhotos = toAdd.map((file) => ({
      type: "new", file, blobUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = (idx) => {
    setPhotos((prev) => {
      const removed = prev[idx];
      if (removed?.type === "new" && removed.blobUrl) {
        URL.revokeObjectURL(removed.blobUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSave = async () => {
    if (!place) return;
    setSaving(true);
    setUploadError("");
    try {
      const finalUrls = [];

      // 1) 기존 URL 유지
      for (const p of photos) {
        if (p.type === "existing") finalUrls.push(p.url);
      }

      // 2) 새 파일 업로드
      const newFiles = photos.filter((p) => p.type === "new");
      if (newFiles.length > 0) {
        setUploading(true);
        const formData = new FormData();
        newFiles.forEach((p) => formData.append("files", p.file));
        try {
          const uploadRes = await axios.post(
            `${API_BASE}/upload/photos?user_id=${user.user_id}`,
            formData,
          );
          finalUrls.push(...uploadRes.data.urls);
        } catch (uploadErr) {
          const detail = uploadErr.response?.data?.detail || uploadErr.message || "업로드 실패";
          setUploading(false);
          setUploadError(`사진 업로드 실패: ${detail}`);
          setSaving(false);
          return; // 업로드 실패 시 저장 중단
        }
        setUploading(false);
      }

      // 3) 장소 저장
      await onSave({
        ...place, folder_id: selectedFolderId, status,
        rating: VISITED_STATUSES.includes(status) && rating > 0 ? rating : null,
        memo: memo.trim() || null,
        photo_url: finalUrls[0] || null,
        photo_urls: finalUrls.length > 0 ? finalUrls : null,
        instagram_post_url: instagramUrl.trim() || null,
      });
      onClose();
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || "알 수 없는 오류";
      alert(`저장 실패: ${detail}`);
    }
    finally { setSaving(false); }
  };

  if (!place) return null;

  return createPortal(
    <>
      {/* fonts loaded in App.css */}
      <div
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(47,52,48,0.3)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center", zIndex: 100,
        }}
      >
        <div style={{
          background: C.bg,
          borderRadius: isMobile ? "20px 20px 0 0" : 20,
          width: "100%", maxWidth: 520,
          maxHeight: isMobile ? "90vh" : "85vh",
          overflowY: "auto",
          boxShadow: isMobile
            ? "0 -8px 40px rgba(47,52,48,0.12)"
            : "0 20px 60px rgba(47,52,48,0.18)",
          margin: isMobile ? 0 : 24,
        }}>
          {/* 핸들 */}
          <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
            <div style={{ width: 32, height: 3, background: C.outline, borderRadius: 2, opacity: 0.4 }} />
          </div>

          {/* 헤더 */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            padding: "12px 24px 20px",
            borderBottom: `1px solid ${C.outlineFaint}`,
          }}>
            <div>
              <p style={{ margin: "0 0 4px", fontFamily: FL, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: C.outline }}>
                {editMode ? "기록 수정" : "새 기록"}
              </p>
              <h3 style={{ margin: 0, fontFamily: FH, fontSize: 20, fontWeight: 700, color: C.onSurface }}>
                {place.name}
              </h3>
              {place.address && !editMode && (
                <p style={{ margin: "4px 0 0", fontFamily: FL, fontSize: 12, color: C.outline }}>{place.address}</p>
              )}
            </div>
            <button onClick={onClose} style={{
              background: "none", border: "none",
              fontSize: 20, color: C.outline, cursor: "pointer", padding: 4,
            }}>✕</button>
          </div>

          <div style={{ padding: "20px 24px", paddingBottom: isMobile ? "calc(64px + 24px)" : 24 }}>

            {/* 상태 선택 */}
            <Section label="방문 상태">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      style={{
                        padding: "12px 8px",
                        border: `1.5px solid ${isActive ? C.primary : C.outline}44`,
                        borderRadius: 10,
                        background: isActive ? `${C.primary}12` : "transparent",
                        cursor: "pointer",
                        fontFamily: FL, fontSize: 12, fontWeight: isActive ? 700 : 400,
                        color: isActive ? C.primary : C.variant,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* 별점 */}
            {VISITED_STATUSES.includes(status) && (
              <Section label="별점">
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(rating === star ? 0 : star)}
                      style={{
                        fontSize: 26, background: "none", border: "none",
                        cursor: "pointer", padding: "2px 4px",
                        filter: star <= rating ? "none" : "grayscale(1) opacity(0.25)",
                        transition: "filter 0.15s",
                      }}
                    >⭐</button>
                  ))}
                  {rating > 0 && (
                    <span style={{ fontFamily: FL, fontSize: 12, color: C.outline, marginLeft: 4 }}>
                      {rating}점
                    </span>
                  )}
                </div>
              </Section>
            )}

            {/* 폴더 */}
            <Section label="컬렉션">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <FolderChip
                  label="없음" color={C.outline}
                  selected={selectedFolderId === null}
                  onClick={() => setSelectedFolderId(null)}
                />
                {folders.map((f) => (
                  <FolderChip
                    key={f.id} label={f.name} color={f.color}
                    selected={selectedFolderId === f.id}
                    onClick={() => setSelectedFolderId(f.id)}
                    onDelete={() => handleDeleteFolder(f.id)}
                    onColorChange={(c) => handleFolderColorChange(f.id, c)}
                  />
                ))}
                <button
                  onClick={() => setShowNewFolder(!showNewFolder)}
                  style={{
                    padding: "6px 12px",
                    border: `1.5px dashed ${C.outline}66`,
                    borderRadius: 999, background: "none",
                    fontFamily: FL, fontSize: 11, color: C.outline, cursor: "pointer",
                  }}
                >+ 새 컬렉션</button>
              </div>

              {showNewFolder && (
                <div style={{
                  marginTop: 12, padding: 14,
                  background: C.container, borderRadius: 10,
                }}>
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                    placeholder="컬렉션 이름"
                    autoFocus
                    style={{
                      width: "100%", padding: "9px 12px", border: "none",
                      background: C.bg, borderRadius: 8,
                      fontFamily: FL, fontSize: 13, color: C.onSurface,
                      outline: "none", boxSizing: "border-box", marginBottom: 10,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c} onClick={() => setNewFolderColor(c)}
                        style={{
                          width: 22, height: 22, borderRadius: "50%", background: c,
                          border: newFolderColor === c ? `2px solid ${C.onSurface}` : "2px solid transparent",
                          cursor: "pointer", padding: 0,
                        }}
                      />
                    ))}
                    <label style={{ position: "relative", width: 22, height: 22, cursor: "pointer" }}>
                      <input
                        type="color" value={newFolderColor}
                        onChange={(e) => setNewFolderColor(e.target.value)}
                        style={{
                          position: "absolute", inset: 0, opacity: 0,
                          width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0,
                        }}
                      />
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
                        border: FOLDER_COLORS.includes(newFolderColor) ? "2px solid transparent" : `2px solid ${C.onSurface}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: "white", textShadow: "0 0 2px rgba(0,0,0,0.5)" }}>palette</span>
                      </div>
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowNewFolder(false)} style={{
                      flex: 1, padding: "8px", border: "none", borderRadius: 8,
                      background: "none", fontFamily: FL, fontSize: 12, color: C.outline, cursor: "pointer",
                    }}>취소</button>
                    <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()} style={{
                      flex: 1, padding: "8px", border: "none", borderRadius: 8,
                      background: newFolderName.trim() ? C.primary : C.outline,
                      color: "#fff6ef",
                      fontFamily: FL, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>{creatingFolder ? "..." : "만들기"}</button>
                  </div>
                </div>
              )}
            </Section>

            {/* 메모 */}
            <Section label="나의 기록">
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="이 공간에 대한 소중한 기억을 남겨주세요..."
                maxLength={300}
                rows={3}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: C.container, border: "none", borderRadius: 10,
                  fontFamily: FH, fontSize: 13, fontStyle: "italic",
                  color: C.onSurface, outline: "none",
                  boxSizing: "border-box", resize: "none",
                  lineHeight: 1.7,
                }}
                onFocus={(e) => e.target.style.background = "#ede0d5"}
                onBlur={(e) => e.target.style.background = C.container}
              />
            </Section>

            {/* 사진 */}
            <Section label={`사진 (${photos.length}/5)`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {photos.map((photo, idx) => {
                  const src = photo.type === "existing" ? photo.url : photo.blobUrl;
                  return (
                    <div key={idx} style={{ position: "relative", width: 72, height: 72, borderRadius: 10, overflow: "hidden" }}>
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        onClick={() => handleRemovePhoto(idx)}
                        style={{
                          position: "absolute", top: 2, right: 2,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "rgba(0,0,0,0.5)", color: "#fff",
                          border: "none", cursor: "pointer",
                          fontSize: 12, lineHeight: "20px", padding: 0,
                        }}
                      >&times;</button>
                    </div>
                  );
                })}
                {photos.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 72, height: 72, borderRadius: 10,
                      border: `1.5px dashed ${C.outline}66`,
                      background: "none", cursor: "pointer",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 2,
                      color: C.outline, fontFamily: FL, fontSize: 9,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_photo_alternate</span>
                    추가
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                onChange={handlePhotoSelect}
                style={{ display: "none" }}
              />
              {uploadError && (
                <p style={{
                  margin: "8px 0 0", padding: "8px 12px",
                  background: "#fef0ec", borderRadius: 8,
                  fontFamily: FL, fontSize: 11, color: C.error,
                }}>{uploadError}</p>
              )}
            </Section>

            {/* 인스타 링크 */}
            <Section label="인스타 포스트 링크 (선택)">
              <input
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                style={{
                  width: "100%", padding: "11px 14px",
                  background: C.container, border: "none", borderRadius: 10,
                  fontFamily: FL, fontSize: 13, color: C.onSurface,
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => e.target.style.background = "#ede0d5"}
                onBlur={(e) => e.target.style.background = C.container}
              />
            </Section>

            {/* 저장 버튼 */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%", padding: "16px",
                background: saving ? C.outline : C.primary,
                color: "#fff6ef", border: "none", borderRadius: 12,
                fontFamily: FL, fontSize: 14, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                marginTop: 8,
                boxShadow: saving ? "none" : "0 4px 16px rgba(101,93,84,0.2)",
                letterSpacing: "0.02em",
              }}
            >
              {uploading ? "사진 업로드 중..." : saving ? "저장 중..." : editMode ? "수정하기" : "기록하기"}
            </button>

            {/* 삭제 버튼 (수정 모드에서만) */}
            {editMode && onDelete && (
              <button
                onClick={() => { if (window.confirm("이 장소를 삭제할까요?")) onDelete(); }}
                style={{
                  width: "100%", padding: "13px",
                  border: `1px solid rgba(158,66,44,0.2)`,
                  borderRadius: 10, background: "none",
                  color: C.error,
                  fontFamily: FL, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", marginTop: 8,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(158,66,44,0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
              >
                장소 삭제
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{
        margin: "0 0 10px",
        fontFamily: FL,
        fontSize: 10, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.15em",
        color: "#5c605c",
      }}>{label}</p>
      {children}
    </div>
  );
}

function FolderChip({ label, color, selected, onClick, onDelete, onColorChange }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={onClick}
        style={{
          padding: "6px 12px",
          paddingRight: onDelete ? 24 : 12,
          border: `1.5px solid ${selected ? color : "rgba(175,179,174,0.4)"}`,
          borderRadius: 999,
          background: selected ? `${color}18` : "transparent",
          cursor: "pointer",
          fontFamily: FL, fontSize: 11, fontWeight: selected ? 700 : 400,
          color: selected ? color : "#777c77",
          display: "flex", alignItems: "center", gap: 5,
          transition: "all 0.15s",
        }}
      >
        {onColorChange ? (
          <label style={{ position: "relative", width: 6, height: 6, flexShrink: 0, cursor: "pointer" }}
            onClick={(e) => e.stopPropagation()}>
            <input type="color" value={color}
              onChange={(e) => onColorChange(e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0 }}
            />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
          </label>
        ) : (
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        )}
        {label}
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: "absolute", top: -4, right: -4,
            width: 16, height: 16, borderRadius: "50%",
            background: "rgba(47,52,48,0.5)", color: "#fff",
            border: "none", cursor: "pointer",
            fontSize: 10, lineHeight: "16px", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >&times;</button>
      )}
    </div>
  );
}
