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
  want_to_go: "가고 싶어요", visited: "가봤어요", want_revisit: "또 가고 싶어요",
};
const STATUS_COLOR = {
  want_to_go: { bg: "#FEF3CD", color: "#BA7517" },
  visited:    { bg: "#E0F4EC", color: "#1D9E75" },
  want_revisit: { bg: "#FCE4EE", color: "#D4537E" },
};

export default function RestaurantPanel({
  restaurant, onClose, onHide, sidebarWidth = 240,
  onPlaceUpdated, mapInstance, onDataChange,
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
  const [replyTo, setReplyTo] = useState(null); // { id, author_nickname }
  const commentInputRef = useRef(null);

  // 모바일 시트 상태: "peek" | "full"
  const [sheetMode, setSheetMode] = useState("peek");
  const sheetRef = useRef(null);
  const dragStartY = useRef(null);
  const dragStartScroll = useRef(0);

  useEffect(() => { setR(restaurant); setSheetMode("peek"); }, [restaurant]);

  const isPersonalMine = r.isPersonal && (!r.user_id || (user && r.user_id === user.user_id));
  const isOthersPlace  = r.isPersonal && r.user_id && user && r.user_id !== user.user_id;

  useEffect(() => {
    if (!r.isPersonal || !r.id) return;
    axios.get(`${API_BASE}/places/${r.id}/neighbors?viewer_id=${user?.user_id || ""}`)
      .then((res) => setNeighbors(res.data)).catch(() => {});
  }, [r?.id, r?.isPersonal, user?.user_id]);

  useEffect(() => {
    if (!r.isPersonal || !r.id) return;
    axios.get(`${API_BASE}/places/${r.id}/comments`)
      .then((res) => setComments(res.data)).catch(() => {});
  }, [r?.id, r?.isPersonal]);

  useEffect(() => {
    if (!r) return;
    setLiked(false); setLikeCount(r.like_count || 0);
    setComments([]); setShowComments(false); setNeighbors([]);
    setGalleryIdx(0); setReplyTo(null);
  }, [r?.id]); // eslint-disable-line

  // Sync like count when restaurant prop changes (e.g. after onDataChange refresh)
  useEffect(() => { setLikeCount(restaurant.like_count || 0); }, [restaurant.like_count]);
  // Fetch liked status for current user (also re-fetch when like_count changes from parent)
  useEffect(() => {
    if (!user || !r.isPersonal || !r.id) return;
    axios.get(`${API_BASE}/places/${r.id}/like-status?user_id=${user.user_id}`)
      .then((res) => { setLiked(res.data.liked); setLikeCount(res.data.like_count); })
      .catch(() => {});
  }, [r?.id, restaurant.like_count, user?.user_id]); // eslint-disable-line

  const handleCenterMap = () => {
    if (!mapInstance || !r.lat || !r.lng || !window.naver) return;
    const coord = new window.naver.maps.LatLng(r.lat, r.lng);
    mapInstance.setCenter(coord);
    mapInstance.setZoom(17);
    // 데스크톱: 디테일 패널(360px)만큼 오른쪽으로 보정
    if (!mobile) {
      mapInstance.panBy(new window.naver.maps.Point(-180, 0));
    }
  };

  const handleLike = async () => {
    if (!user || !r.isPersonal || !r.id) return;
    try {
      const res = await axios.post(`${API_BASE}/places/${r.id}/like?user_id=${user.user_id}`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
      if (onDataChange) onDataChange();
    } catch (e) {}
  };

  const handleComment = async () => {
    if (!commentInput.trim() || !user) return;
    setSubmittingComment(true);
    try {
      await axios.post(`${API_BASE}/places/${r.id}/comments`, {
        content: commentInput.trim(), user_id: user.user_id,
        parent_id: replyTo?.id || null,
      });
      // Re-fetch full threaded comments
      const updated = await axios.get(`${API_BASE}/places/${r.id}/comments`);
      setComments(updated.data);
      setCommentInput("");
      setReplyTo(null);
      if (onDataChange) onDataChange();
    } catch (e) {
      alert(e.response?.data?.detail || "댓글 작성 실패");
    } finally { setSubmittingComment(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API_BASE}/comments/${commentId}?user_id=${user.user_id}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (onDataChange) onDataChange();
    } catch (e) {}
  };

  const handleEditSave = async (updated) => {
    const res = await axios.patch(
      `${API_BASE}/personal-places/${r.id}?user_id=${user.user_id}`,
      { folder_id: updated.folder_id, status: updated.status, rating: updated.rating, memo: updated.memo, photo_url: updated.photo_url, photo_urls: updated.photo_urls, instagram_post_url: updated.instagram_post_url }
    );
    const updatedPlace = res.data;
    setR((prev) => ({ ...prev, ...updatedPlace }));
    if (onPlaceUpdated) onPlaceUpdated({ ...r, ...updatedPlace });
    if (onDataChange) onDataChange();
  };

  const handleShare = () => {
    const url = `${API_BASE}/og/place/${r.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const galleryUrls = r.photo_urls?.length ? r.photo_urls : (r.photo_url ? [r.photo_url] : []);
  const statusStyle = r.status ? STATUS_COLOR[r.status] : null;
  const naverUrl = (r.naver_place_id && /^\d+$/.test(r.naver_place_id))
    ? `https://map.naver.com/v5/entry/place/${r.naver_place_id}`
    : r.naver_place_url || (r.name ? `https://map.naver.com/v5/search/${encodeURIComponent(r.name)}` : null);

  // ── 모바일 드래그 핸들러 ────────────────────
  const handleDragStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartScroll.current = sheetRef.current?.scrollTop || 0;
  };
  const handleDragEnd = (e) => {
    if (dragStartY.current === null) return;
    const diff = e.changedTouches[0].clientY - dragStartY.current;
    if (sheetMode === "peek" && diff < -40) {
      setSheetMode("full");
    } else if (sheetMode === "full" && diff > 60 && dragStartScroll.current <= 0) {
      setSheetMode("peek");
    } else if (sheetMode === "peek" && diff > 60) {
      onClose();
    }
    dragStartY.current = null;
  };

  // ── 공통 콘텐츠 블록들 ──────────────────────
  const HeaderBlock = (
    <div style={{ marginBottom: 10 }}>
      {r.category && (
        <p style={{
          margin: "0 0 3px", fontFamily: FL, fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.12em", color: C.primary,
        }}>{r.category}</p>
      )}
      <h2 style={{
        margin: "0 0 4px", fontFamily: FH, fontSize: mobile ? 20 : 22,
        fontWeight: 700, color: C.onSurface, letterSpacing: "-0.01em",
      }}>{r.name}</h2>
      {/* 주소 + 네이버/공유 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {r.address && (
          <p style={{
            margin: 0, fontFamily: FL, fontSize: 12, color: C.outlineVariant, flex: 1, minWidth: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{r.address}</p>
        )}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {naverUrl && (
            <a href={naverUrl} target="_blank" rel="noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 8px",
              background: "#03C75A", color: "white", borderRadius: 5,
              fontFamily: FL, fontSize: 10, fontWeight: 600, textDecoration: "none",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>map</span>
              네이버
            </a>
          )}
          {r.isPersonal && r.id && (
            <button onClick={handleShare} style={{
              display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 8px",
              background: copied ? C.primaryContainer : C.surfaceLow,
              color: copied ? C.primary : C.onSurfaceVariant,
              border: "none", borderRadius: 5, fontFamily: FL, fontSize: 10, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                {copied ? "check" : "share"}
              </span>
              {copied ? "복사됨" : "공유"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const StatusBlock = r.isPersonal && r.status ? (
    <div style={{
      background: C.surfaceLow, borderRadius: 10, padding: "12px 14px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: r.memo ? 8 : 0 }}>
        <span style={{
          fontFamily: FL, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 5,
          background: statusStyle?.bg || C.container, color: statusStyle?.color || C.onSurfaceVariant,
        }}>{STATUS_LABEL[r.status] || r.status}</span>
        {r.rating > 0 && (
          <span style={{
            fontFamily: FL, fontSize: 11, padding: "3px 9px",
            background: C.primaryContainer, color: C.primary, borderRadius: 5, fontWeight: 600,
          }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
        )}
        {r.owner_nickname && isOthersPlace && (
          <span style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>by {r.owner_nickname}</span>
        )}
      </div>
      {r.memo && (
        <p style={{
          margin: 0, fontFamily: FH, fontStyle: "italic", fontSize: 13,
          color: C.onSurfaceVariant, lineHeight: 1.7,
        }}>"{r.memo}"</p>
      )}
    </div>
  ) : null;

  const GalleryBlock = galleryUrls.length > 0 ? (
    <div style={{ position: "relative", marginBottom: 12, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ width: "100%", aspectRatio: "4/3", background: "#f0efec" }}>
        <img src={galleryUrls[galleryIdx]} alt={r.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      {galleryUrls.length > 1 && (
        <>
          {galleryIdx > 0 && (
            <button onClick={() => setGalleryIdx((i) => i - 1)} style={{
              position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(0,0,0,0.35)", border: "none", color: "white",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
            </button>
          )}
          {galleryIdx < galleryUrls.length - 1 && (
            <button onClick={() => setGalleryIdx((i) => i + 1)} style={{
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(0,0,0,0.35)", border: "none", color: "white",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
            </button>
          )}
          <div style={{
            position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 4,
          }}>
            {galleryUrls.map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                background: i === galleryIdx ? "white" : "rgba(255,255,255,0.45)",
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  ) : null;

  const InstaBlock = r.instagram_post_url ? (
    <a href={r.instagram_post_url} target="_blank" rel="noreferrer" style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px",
      background: C.surfaceLow, color: C.primary, borderRadius: 7,
      fontFamily: FL, fontSize: 11, fontWeight: 600, textDecoration: "none", marginBottom: 12,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>photo_camera</span>
      인스타 포스트
    </a>
  ) : null;

  const NeighborsBlock = neighbors.length > 0 ? (
    <div style={{ marginBottom: 12 }}>
      <p style={{
        fontFamily: FL, fontSize: 9, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.15em",
        color: C.outlineVariant, margin: "0 0 6px",
      }}>함께 저장한 이웃 {neighbors.length}명</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {neighbors.map((n) => (
          <div key={n.user_id} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: C.surfaceLow, borderRadius: 6, padding: "4px 8px",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, color: "white", fontWeight: 700, flexShrink: 0, fontFamily: FL,
            }}>{n.nickname?.[0]?.toUpperCase()}</div>
            <span style={{ fontFamily: FL, fontSize: 11, color: C.onSurfaceVariant }}>{n.nickname}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const SocialBlock = r.isPersonal && r.id ? (
    <div style={{ marginTop: 4 }}>
      {/* 액션 바 — 피드 스타일 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={handleLike} style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: liked ? "#D4537E" : C.onSurfaceVariant, transition: "color 0.15s",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? "#D4537E" : "none"} stroke={liked ? "#D4537E" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <button onClick={() => setShowComments(!showComments)} style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: C.onSurfaceVariant,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>chat_bubble_outline</span>
        </button>
        <button onClick={handleCenterMap} style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: C.onSurfaceVariant,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>location_on</span>
        </button>
      </div>

      {/* 좋아요 수 */}
      {likeCount > 0 && (
        <p style={{ margin: "0 0 4px", fontFamily: FL, fontSize: 12, fontWeight: 700, color: C.onSurface }}>
          좋아요 {likeCount}개
        </p>
      )}

      {/* 댓글 미리보기 */}
      {comments.length > 0 && !showComments && (
        <button onClick={() => setShowComments(true)} style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontFamily: FL, fontSize: 12, color: C.outlineVariant, marginBottom: 4,
        }}>
          댓글 {comments.length}개 모두 보기
        </button>
      )}

      {/* 댓글 펼침 */}
      {showComments && (
        <div style={{ marginTop: 6 }}>
          {comments.map((c) => (
            <PanelCommentThread key={c.id} comment={c} depth={0} user={user}
              onReply={(c) => { setReplyTo(c); setTimeout(() => commentInputRef.current?.focus(), 0); }}
              onDelete={handleDeleteComment}
            />
          ))}
          {/* Reply indicator */}
          {replyTo && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 0",
              fontFamily: FL, fontSize: 11, color: C.outlineVariant,
            }}>
              <span>{replyTo.author_nickname}에게 답글</span>
              <button onClick={() => setReplyTo(null)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: FL, fontSize: 11, color: C.outlineVariant, padding: 0,
              }}>✕</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: replyTo ? 0 : 8 }}>
            <input
              ref={commentInputRef}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder={replyTo ? `${replyTo.author_nickname}에게 답글 달기...` : "댓글 달기..."}
              style={{
                flex: 1, padding: "8px 0",
                background: "none", border: "none", borderBottom: `1px solid ${C.container}`,
                fontFamily: FL, fontSize: 12, color: C.onSurface, outline: "none",
              }}
            />
            {commentInput.trim() && (
              <button onClick={handleComment} disabled={submittingComment} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: FL, fontSize: 12, fontWeight: 700, color: C.primary,
                padding: "8px 0", opacity: submittingComment ? 0.5 : 1,
              }}>게시</button>
            )}
          </div>
        </div>
      )}
    </div>
  ) : null;

  // ═══════════════════════════════════════════════════════════
  // 모바일 레이아웃: 바텀 시트 (peek ↔ full)
  // ═══════════════════════════════════════════════════════════
  if (mobile) {
    const peekHeight = galleryUrls.length > 0 ? 210 : 160;
    return (
      <>
        <div
          ref={sheetRef}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
          style={{
            position: "fixed",
            bottom: 64,
            left: 0, right: 0,
            height: sheetMode === "full" ? "80vh" : peekHeight,
            background: C.bg,
            borderRadius: "18px 18px 0 0",
            boxShadow: "0 -8px 40px rgba(47,52,48,0.12)",
            zIndex: 30,
            overflowY: sheetMode === "full" ? "auto" : "hidden",
            WebkitOverflowScrolling: "touch",
            transition: "height 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* 핸들 */}
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", cursor: "grab" }}>
            <div style={{ width: 32, height: 3, background: C.container, borderRadius: 2 }} />
          </div>

          <div style={{ padding: "6px 20px 24px" }}>
            {/* 헤더 + 닫기/수정 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>{HeaderBlock}</div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 2 }}>
                {isPersonalMine && (
                  <IconBtn icon="edit" onClick={() => setEditModalOpen(true)} title="수정" size={32} />
                )}
                <IconBtn icon="close" onClick={onClose} title="닫기" size={32} />
              </div>
            </div>

            {/* 상태/별점 */}
            {StatusBlock}

            {/* 사진 갤러리 (상태 아래) */}
            {GalleryBlock}

            {/* 인스타 */}
            {InstaBlock}

            {/* 이웃 */}
            {NeighborsBlock}

            {/* 좋아요/댓글 */}
            {SocialBlock}
          </div>

          {/* peek 상태에서 스크롤 유도 화살표 */}
          {sheetMode === "peek" && (
            <div
              onClick={() => setSheetMode("full")}
              style={{
                position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
                display: "flex", flexDirection: "column", alignItems: "center",
                cursor: "pointer", opacity: 0.4,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.outlineVariant }}>
                expand_less
              </span>
            </div>
          )}
        </div>

        {editModalOpen && (
          <SavePlaceModal
            place={r} editMode
            onSave={(updated) => { handleEditSave(updated); setEditModalOpen(false); }}
            onClose={() => setEditModalOpen(false)}
            onDelete={() => { onHide(r.id, r.isPersonal); setEditModalOpen(false); }}
          />
        )}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 데스크톱 레이아웃: 사이드바 오른쪽에 세로 패널
  // ═══════════════════════════════════════════════════════════
  return (
    <>
      <div style={{
        position: "fixed",
        top: 0,
        left: sidebarWidth,
        width: 360,
        height: "100vh",
        background: C.bg,
        boxShadow: "4px 0 24px rgba(47,52,48,0.08)",
        zIndex: 35,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        animation: "slideInDetail 0.22s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* 상단 바 */}
        <div style={{
          position: "sticky", top: 0, zIndex: 5,
          background: "rgba(250,249,246,0.92)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid rgba(101,93,84,0.06)",
        }}>
          <p style={{ margin: 0, fontFamily: FL, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant }}>
            장소 상세
          </p>
          <div style={{ display: "flex", gap: 4 }}>
            {isPersonalMine && (
              <IconBtn icon="edit" onClick={() => setEditModalOpen(true)} title="수정" size={28} />
            )}
            <IconBtn icon="close" onClick={onClose} title="닫기" size={28} />
          </div>
        </div>

        <div style={{ padding: "16px 20px 24px" }}>
          {/* 헤더 */}
          {HeaderBlock}

          {/* 상태/별점 */}
          {StatusBlock}

          {/* 사진 갤러리 */}
          {GalleryBlock}

          {/* 인스타 */}
          {InstaBlock}

          {/* 이웃 */}
          {NeighborsBlock}

          {/* 좋아요/댓글 */}
          {SocialBlock}
        </div>
      </div>

      {editModalOpen && (
        <SavePlaceModal
          place={r} editMode
          onSave={(updated) => { handleEditSave(updated); setEditModalOpen(false); }}
          onClose={() => setEditModalOpen(false)}
          onDelete={() => { onHide(r.id, r.isPersonal); setEditModalOpen(false); }}
        />
      )}

      <style>{`
        @keyframes slideInDetail {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function PanelCommentThread({ comment, depth, user, onReply, onDelete }) {
  return (
    <>
      <div style={{ marginBottom: 4, paddingLeft: depth * 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontFamily: FL, fontSize: 12, color: "#2f3430", lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700 }}>{comment.author_nickname}</span>{" "}
            <span style={{ color: "#5c605c" }}>{comment.content}</span>
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 1 }}>
            {user && (
              <button onClick={() => onReply({ id: comment.id, author_nickname: comment.author_nickname })} style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontFamily: FL, fontSize: 10, color: "#afb3ae",
              }}>답글 달기</button>
            )}
            {comment.user_id === user?.user_id && (
              <button onClick={() => onDelete(comment.id)} style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontFamily: FL, fontSize: 10, color: "#afb3ae",
              }}>삭제</button>
            )}
          </div>
        </div>
      </div>
      {comment.replies?.map((r) => (
        <PanelCommentThread key={r.id} comment={r} depth={depth + 1} user={user} onReply={onReply} onDelete={onDelete} />
      ))}
    </>
  );
}

function IconBtn({ icon, onClick, title, danger = false, size = 32 }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: size, height: size,
      background: danger ? "rgba(158,66,44,0.07)" : C.surfaceLow,
      border: "none", borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", flexShrink: 0,
      color: danger ? C.error : C.onSurfaceVariant,
      transition: "background 0.15s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = danger ? "rgba(158,66,44,0.12)" : C.container}
      onMouseLeave={(e) => e.currentTarget.style.background = danger ? "rgba(158,66,44,0.07)" : C.surfaceLow}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
    </button>
  );
}
