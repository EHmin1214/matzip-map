// src/components/RestaurantPanel.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import SavePlaceModal from "./SavePlaceModal";

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

const STATUS_LABEL = {
  want_to_go:      "가고 싶어요",
  visited:         "가봤어요",
  want_revisit:    "또 가고 싶어요",
};
const STATUS_COLOR = {
  want_to_go:      { bg: "#FEF3CD", color: "#BA7517" },
  visited:         { bg: "#E0F4EC", color: "#1D9E75" },
  want_revisit:    { bg: "#FCE4EE", color: "#D4537E" },
};

// ── 아이콘 버튼 ─────────────────────────────────────────────
function IconBtn({ icon, onClick, title, danger = false, size = 32 }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: size, height: size,
        background: danger ? "rgba(158,66,44,0.07)" : C.surfaceLow,
        border: "none", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        color: danger ? C.error : C.onSurfaceVariant,
        transition: "background 0.15s",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = danger ? "rgba(158,66,44,0.12)" : C.container}
      onMouseLeave={(e) => e.currentTarget.style.background = danger ? "rgba(158,66,44,0.07)" : C.surfaceLow}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
    </button>
  );
}

export default function RestaurantPanel({
  restaurant, onClose, onHide, sidebarWidth = 240,
  onPlaceUpdated, mapInstance,
}) {
  const { user } = useUser();
  const mobile = isMobile();
  const [r, setR] = useState(restaurant);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [neighbors, setNeighbors] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const touchStartY = useRef(null);

  useEffect(() => { setR(restaurant); }, [restaurant]);

  const isPersonalMine = r.isPersonal && (!r.user_id || (user && r.user_id === user.user_id));
  const isOthersPlace  = r.isPersonal && r.user_id && user && r.user_id !== user.user_id;

  useEffect(() => {
    if (!r.isPersonal || !r.id) return;
    axios.get(`${API_BASE}/places/${r.id}/neighbors?viewer_id=${user?.user_id || ""}`)
      .then((res) => setNeighbors(res.data)).catch(() => {});
  }, [r?.id, r?.isPersonal, user?.user_id]);

  useEffect(() => {
    if (!isOthersPlace || !r.id) return;
    axios.get(`${API_BASE}/places/${r.id}/comments`)
      .then((res) => setComments(res.data)).catch(() => {});
  }, [r?.id, isOthersPlace]);

  const handleCenterMap = () => {
    if (!mapInstance || !r.lat || !r.lng || !window.naver) return;
    mapInstance.setCenter(new window.naver.maps.LatLng(r.lat, r.lng));
    mapInstance.setZoom(17);
  };

  const handleLike = async () => {
    if (!user || !isOthersPlace) return;
    try {
      const res = await axios.post(`${API_BASE}/places/${r.id}/like?user_id=${user.user_id}`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch (e) {}
  };

  const handleComment = async () => {
    if (!commentInput.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const res = await axios.post(`${API_BASE}/places/${r.id}/comments`, {
        content: commentInput.trim(), user_id: user.user_id,
      });
      setComments((prev) => [...prev, res.data]);
      setCommentInput("");
    } catch (e) {
      alert(e.response?.data?.detail || "댓글 작성 실패");
    } finally { setSubmittingComment(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API_BASE}/comments/${commentId}?user_id=${user.user_id}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {}
  };

  const handleEditSave = async (updated) => {
    console.log("[EditSave] sending photo_urls:", updated.photo_urls);
    const res = await axios.patch(
      `${API_BASE}/personal-places/${r.id}?user_id=${user.user_id}`,
      { folder_id: updated.folder_id, status: updated.status, rating: updated.rating, memo: updated.memo, photo_url: updated.photo_url, photo_urls: updated.photo_urls, instagram_post_url: updated.instagram_post_url }
    );
    const updatedPlace = res.data;
    console.log("[EditSave] response photo_urls:", updatedPlace.photo_urls);
    setR((prev) => ({ ...prev, ...updatedPlace }));
    if (onPlaceUpdated) onPlaceUpdated({ ...r, ...updatedPlace });
  };

  const galleryUrls = r.photo_urls?.length ? r.photo_urls : (r.photo_url ? [r.photo_url] : []);

  useEffect(() => {
    if (!r) return;
    setLiked(false); setLikeCount(0);
    setComments([]); setShowComments(false); setNeighbors([]);
    setGalleryIdx(0);
  }, [r?.id]); // eslint-disable-line

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80) onClose();
    touchStartY.current = null;
  };

  const handleShare = () => {
    const url = `${API_BASE}/og/place/${r.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const statusStyle = r.status ? STATUS_COLOR[r.status] : null;

  const naverUrl = (r.naver_place_id && /^\d+$/.test(r.naver_place_id))
    ? `https://map.naver.com/v5/entry/place/${r.naver_place_id}`
    : r.naver_place_url || (r.name ? `https://map.naver.com/v5/search/${encodeURIComponent(r.name)}` : null);

  return (
    <>
      <div
        onTouchStart={mobile ? handleTouchStart : undefined}
        onTouchEnd={mobile ? handleTouchEnd : undefined}
        style={{
          position: "fixed",
          bottom: mobile ? 64 : 0,
          left: mobile ? 0 : sidebarWidth,
          right: 0,
          background: C.bg,
          borderRadius: mobile ? "18px 18px 0 0" : "14px 14px 0 0",
          boxShadow: "0 -8px 40px rgba(47,52,48,0.10)",
          zIndex: 30,
          maxHeight: mobile ? "65vh" : "56vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          transition: "left 0.2s ease",
        }}
      >
        {/* 스와이프 핸들 */}
        {mobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", cursor: "grab" }}>
            <div style={{ width: 32, height: 3, background: C.container, borderRadius: 2 }} />
          </div>
        )}

        {/* ── 히어로 사진 갤러리 ────────────────────────── */}
        {galleryUrls.length > 0 && (
          <div style={{ position: "relative" }}>
            <div style={{ width: "100%", overflow: "hidden", maxHeight: mobile ? 320 : 360 }}>
              <img
                src={galleryUrls[galleryIdx]}
                alt={r.name}
                style={{
                  width: "100%", display: "block",
                  objectFit: "cover", maxHeight: mobile ? 320 : 360,
                }}
              />
            </div>
            {/* 갤러리 좌우 버튼 */}
            {galleryUrls.length > 1 && (
              <>
                {galleryIdx > 0 && (
                  <button onClick={() => setGalleryIdx((i) => i - 1)} style={{
                    position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(0,0,0,0.35)", border: "none", color: "white",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                  </button>
                )}
                {galleryIdx < galleryUrls.length - 1 && (
                  <button onClick={() => setGalleryIdx((i) => i + 1)} style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(0,0,0,0.35)", border: "none", color: "white",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                  </button>
                )}
                {/* 인디케이터 */}
                <div style={{
                  position: "absolute", bottom: 68, left: "50%", transform: "translateX(-50%)",
                  display: "flex", gap: 5,
                }}>
                  {galleryUrls.map((_, i) => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: i === galleryIdx ? "white" : "rgba(255,255,255,0.45)",
                      transition: "background 0.15s",
                    }} />
                  ))}
                </div>
              </>
            )}
            {/* 그라데이션 오버레이 */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
              background: `linear-gradient(transparent, ${C.bg})`,
            }} />
            {/* 닫기 버튼 오버레이 */}
            <div style={{ position: "absolute", top: 10, right: 12, display: "flex", gap: 6 }}>
              {isPersonalMine && (
                <IconBtn icon="edit" onClick={() => setEditModalOpen(true)} title="수정" size={32} />
              )}
              <IconBtn icon="close" onClick={onClose} title="닫기" size={32} />
            </div>
          </div>
        )}

        <div style={{ padding: mobile ? "6px 20px 24px" : "14px 24px 20px" }}>

          {/* ── 헤더 ──────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              {/* 카테고리 */}
              {r.category && (
                <p style={{
                  margin: "0 0 3px",
                  fontFamily: FL, fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  color: C.primary,
                }}>
                  {r.category}
                </p>
              )}

              {/* 이름 */}
              <h2 style={{
                margin: "0 0 4px",
                fontFamily: FH, fontSize: mobile ? 20 : 22,
                fontWeight: 700, color: C.onSurface,
                letterSpacing: "-0.01em",
              }}>
                {r.name}
              </h2>

              {/* 주소 */}
              {r.address && (
                <p style={{
                  margin: 0, fontFamily: FL, fontSize: 12,
                  color: C.outlineVariant,
                }}>
                  {r.address}
                </p>
              )}
            </div>

            {/* 액션 버튼 (사진 없을 때만 여기에 표시) */}
            {galleryUrls.length === 0 && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <IconBtn icon="near_me" onClick={handleCenterMap} title="지도에서 보기" size={mobile ? 38 : 32} />
                {isPersonalMine && (
                  <IconBtn icon="edit" onClick={() => setEditModalOpen(true)} title="수정" size={mobile ? 38 : 32} />
                )}
                {!isOthersPlace && (
                  <IconBtn icon="delete_outline" onClick={() => onHide(r.id, r.isPersonal)} title="삭제" danger size={mobile ? 38 : 32} />
                )}
                <IconBtn icon="close" onClick={onClose} title="닫기" size={mobile ? 38 : 32} />
              </div>
            )}
          </div>

          {/* ── 상태 + 별점 + 메모 카드 ──────────────────────── */}
          {r.isPersonal && r.status && (
            <div style={{
              background: C.surfaceLow, borderRadius: 10,
              padding: "12px 14px", marginBottom: 14,
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: r.memo ? 8 : 0 }}>
                <span style={{
                  fontFamily: FL, fontSize: 11, fontWeight: 600,
                  padding: "3px 9px", borderRadius: 5,
                  background: statusStyle?.bg || C.container,
                  color: statusStyle?.color || C.onSurfaceVariant,
                }}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
                {r.rating > 0 && (
                  <span style={{
                    fontFamily: FL, fontSize: 11, padding: "3px 9px",
                    background: C.primaryContainer, color: C.primary,
                    borderRadius: 5, fontWeight: 600,
                  }}>
                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                  </span>
                )}
                {r.owner_nickname && isOthersPlace && (
                  <span style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>
                    by {r.owner_nickname}
                  </span>
                )}
              </div>
              {r.memo && (
                <p style={{
                  margin: 0, fontFamily: FH, fontStyle: "italic",
                  fontSize: 13, color: C.onSurfaceVariant,
                  lineHeight: 1.7,
                }}>
                  "{r.memo}"
                </p>
              )}
            </div>
          )}

          {/* ── 링크 바 ──────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {naverUrl && (
              <a href={naverUrl} target="_blank" rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px",
                  background: "#03C75A", color: "white",
                  borderRadius: 7,
                  fontFamily: FL, fontSize: 11, fontWeight: 600,
                  textDecoration: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>map</span>
                네이버 지도
              </a>
            )}
            {r.instagram_post_url && (
              <a href={r.instagram_post_url} target="_blank" rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px",
                  background: C.surfaceLow, color: C.primary,
                  borderRadius: 7,
                  fontFamily: FL, fontSize: 11, fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>photo_camera</span>
                인스타
              </a>
            )}
            {r.isPersonal && r.id && (
              <button onClick={handleShare}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px",
                  background: copied ? C.primaryContainer : C.surfaceLow,
                  color: copied ? C.primary : C.onSurfaceVariant,
                  border: "none", borderRadius: 7,
                  fontFamily: FL, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {copied ? "check" : "share"}
                </span>
                {copied ? "복사됨" : "공유"}
              </button>
            )}
            {galleryUrls.length > 0 && (
              <>
                <button onClick={handleCenterMap}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 12px",
                    background: C.surfaceLow, color: C.onSurfaceVariant,
                    border: "none", borderRadius: 7,
                    fontFamily: FL, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>near_me</span>
                  지도 보기
                </button>
                {!isOthersPlace && (
                  <button onClick={() => onHide(r.id, r.isPersonal)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "6px 12px",
                      background: "rgba(158,66,44,0.07)", color: C.error,
                      border: "none", borderRadius: 7,
                      fontFamily: FL, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete_outline</span>
                    삭제
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── 이웃이 같이 저장 ─────────────────────────────── */}
          {neighbors.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{
                fontFamily: FL, fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.15em",
                color: C.outlineVariant, margin: "0 0 6px",
              }}>
                함께 저장한 이웃 {neighbors.length}명
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {neighbors.map((n) => (
                  <div key={n.user_id} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: C.surfaceLow, borderRadius: 6,
                    padding: "4px 8px",
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, color: "white", fontWeight: 700, flexShrink: 0,
                      fontFamily: FL,
                    }}>
                      {n.nickname?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontFamily: FL, fontSize: 11, color: C.onSurfaceVariant }}>
                      {n.nickname}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 좋아요 / 댓글 ────────────────────────────────── */}
          {isOthersPlace && (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <button
                  onClick={handleLike}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: liked ? C.primaryContainer : C.surfaceLow,
                    border: "none", borderRadius: 7, padding: "7px 14px",
                    fontFamily: FL, fontSize: 12, fontWeight: 600,
                    color: liked ? C.primary : C.outlineVariant,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <span className="material-symbols-outlined" style={{
                    fontSize: 15,
                    fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0",
                  }}>
                    favorite
                  </span>
                  {likeCount > 0 ? likeCount : "좋아요"}
                </button>

                <button
                  onClick={() => setShowComments(!showComments)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: showComments ? C.container : C.surfaceLow,
                    border: "none", borderRadius: 7, padding: "7px 14px",
                    fontFamily: FL, fontSize: 12, fontWeight: 600,
                    color: C.onSurfaceVariant, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chat_bubble_outline</span>
                  댓글 {comments.length > 0 ? comments.length : ""}
                </button>
              </div>

              {showComments && (
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    {comments.map((c) => (
                      <div key={c.id} style={{ background: C.surfaceLow, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <p style={{ margin: "0 0 3px", fontFamily: FL, fontSize: 11, fontWeight: 600, color: C.onSurface }}>
                            {c.author_nickname}
                          </p>
                          {c.user_id === user?.user_id && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              style={{
                                background: "none", border: "none",
                                fontFamily: FL, fontSize: 9,
                                color: C.outlineVariant, cursor: "pointer", padding: 0,
                              }}
                            >
                              삭제
                            </button>
                          )}
                        </div>
                        <p style={{ margin: 0, fontFamily: FL, fontSize: 12, color: C.onSurfaceVariant, lineHeight: 1.5 }}>
                          {c.content}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleComment()}
                      placeholder="댓글 달기"
                      style={{
                        flex: 1, padding: "9px 12px",
                        background: C.surfaceLow, border: "none", borderRadius: 7,
                        fontFamily: FL, fontSize: 13, color: C.onSurface,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={handleComment}
                      disabled={submittingComment}
                      style={{
                        padding: "9px 14px",
                        background: C.primary,
                        color: "#fff6ef", border: "none", borderRadius: 7,
                        fontFamily: FL, fontSize: 11, fontWeight: 600,
                        cursor: submittingComment ? "not-allowed" : "pointer",
                        opacity: submittingComment ? 0.6 : 1,
                        transition: "all 0.35s ease",
                      }}
                    >
                      올리기
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editModalOpen && (
        <SavePlaceModal
          place={r}
          editMode
          onSave={(updated) => { handleEditSave(updated); setEditModalOpen(false); }}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </>
  );
}
