// src/components/FeedTab.jsx
// Combined feed — user's own places + following activity, sorted by created_at
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import { STATUS_LABEL, STATUS_EMOJI, STATUS_COLOR, formatTime } from "../constants";
const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54", primaryDim: "#595149",
  bg: "#faf9f6", surfaceLow: "#f4f4f0",
  container: "#edeeea", containerLowest: "#ffffff",
  onSurface: "#2f3430", onSurfaceVariant: "#5c605c",
  outlineVariant: "#8a8e8a", primaryContainer: "#ede0d5",
};

const isMobile = () => window.innerWidth <= 768;

export default function FeedTab({ personalPlaces = [], onPlaceClick, onDataChange, onNavigate }) {
  const { user } = useUser();
  const mobile = isMobile();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(null);
  const feedRef = useRef(null);

  const loadActivities = () => {
    if (!user) return Promise.resolve();
    return axios.get(`${API_BASE}/activity-feed?user_id=${user.user_id}&limit=50`)
      .then((res) => setActivities(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    loadActivities().finally(() => setLoading(false));
  }, [user]); // eslint-disable-line

  // Pull-to-refresh (mobile)
  const handleTouchStart = (e) => {
    if (!mobile) return;
    const el = feedRef.current;
    if (el && el.scrollTop <= 0) pullStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (pullStartY.current === null) return;
    const diff = e.changedTouches[0].clientY - pullStartY.current;
    pullStartY.current = null;
    if (diff > 80 && !refreshing) {
      setRefreshing(true);
      Promise.all([loadActivities(), onDataChange?.()].filter(Boolean))
        .finally(() => setRefreshing(false));
    }
  };

  // Combine personal places (isOwn) with activity feed, sort by created_at desc
  const combinedFeed = (() => {
    const ownItems = personalPlaces.map((p) => ({
      // Normalize own places to activity-like shape
      place_id: p.id,
      place_name: p.name,
      place_address: p.address,
      place_status: p.status,
      place_category: p.category,
      rating: p.rating,
      memo: p.memo,
      photo_urls: p.photo_urls || (p.photo_url ? [p.photo_url] : []),
      lat: p.lat,
      lng: p.lng,
      owner_nickname: user?.nickname || "나",
      like_count: p.like_count || 0,
      comment_count: p.comment_count || 0,
      created_at: p.created_at,
      isOwn: true,
      // Keep original place ref for onPlaceClick
      _original: p,
    }));

    const followItems = activities.map((a) => ({
      ...a,
      isOwn: false,
    }));

    return [...ownItems, ...followItems].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at) : new Date(0);
      const db = b.created_at ? new Date(b.created_at) : new Date(0);
      return db - da;
    });
  })();

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100%" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: mobile ? "12px 0" : "16px 0" }}>
          <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 13, color: "#a8a29e", padding: "48px 0", textAlign: "center" }}>
            불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  if (combinedFeed.length === 0) {
    return (
      <div style={{ background: C.bg, minHeight: "100%" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: mobile ? "12px 0" : "16px 0" }}>
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 17, color: "#a8a29e", margin: "0 0 8px" }}>
              아직 피드가 비어있어요
            </p>
            <p style={{ fontFamily: FL, fontSize: 11, color: "#a8a29e", letterSpacing: "0.08em" }}>
              장소를 추가하거나 팔로우를 시작해보세요
            </p>
            {onNavigate && (
              <button onClick={() => onNavigate("search")} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: FL, fontSize: 13, fontWeight: 700,
                color: C.primary, textDecoration: "underline",
                textUnderlineOffset: 3, marginTop: 16, padding: 0,
              }}>
                첫 장소를 검색해보세요
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={feedRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      style={{ background: C.bg, minHeight: "100%" }}>
      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <p style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant, margin: 0 }}>새로고침 중...</p>
        </div>
      )}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: mobile ? "12px 12px" : "16px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 12 : 8 }}>
          {combinedFeed.map((item, idx) => (
            <FeedCard key={`${item.isOwn ? "own" : "follow"}-${item.place_id}-${idx}`} item={item} mobile={mobile} onPlaceClick={onPlaceClick} onDataChange={onDataChange} />
          ))}
        </div>

        <div style={{ marginTop: 32, padding: "18px 0", textAlign: "center" }}>
          <p style={{ fontFamily: FL, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.3em", color: "#c7c4bf" }}>
            End of recent archive
          </p>
        </div>
      </div>
      <style>{`
        @keyframes heartPop {
          0% { transform: scale(0); opacity: 0; }
          15% { transform: scale(1.2); opacity: 0.9; }
          30% { transform: scale(0.95); opacity: 0.9; }
          45% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function FeedCard({ item, mobile, onPlaceClick, onDataChange }) {
  const { user } = useUser();
  const sc = STATUS_COLOR[item.place_status];
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, author_nickname }
  const commentInputRef = useRef(null);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const lastTap = useRef(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap detected
      if (!liked && user) {
        handleLike();
        setDoubleTapHeart(true);
        setTimeout(() => setDoubleTapHeart(false), 800);
      }
    }
    lastTap.current = now;
  };

  // Sync like count when item prop changes (e.g. after onDataChange refresh)
  useEffect(() => { setLikeCount(item.like_count || 0); }, [item.like_count]);
  // Fetch liked status for current user (also re-fetch when like_count changes from parent)
  useEffect(() => {
    if (!user || !item.place_id) return;
    axios.get(`${API_BASE}/places/${item.place_id}/like-status?user_id=${user.user_id}`)
      .then((res) => { setLiked(res.data.liked); setLikeCount(res.data.like_count); })
      .catch(() => {});
  }, [item.place_id, item.like_count, user?.user_id]); // eslint-disable-line
  // Re-fetch comments when item changes and comments are open
  useEffect(() => {
    if (showComments && item.place_id) {
      axios.get(`${API_BASE}/places/${item.place_id}/comments`)
        .then((res) => setComments(res.data)).catch(() => {});
    }
  }, [item.comment_count]); // eslint-disable-line
  const [submitting, setSubmitting] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const galleryUrls = item.photo_urls?.length ? item.photo_urls : (item.photo_url ? [item.photo_url] : []);

  const [heartAnim, setHeartAnim] = useState(false);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axios.post(`${API_BASE}/places/${item.place_id}/like?user_id=${user.user_id}`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
      if (res.data.liked) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 300); }
      if (onDataChange) onDataChange();
    } catch (e) {}
  };

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      try {
        const res = await axios.get(`${API_BASE}/places/${item.place_id}/comments`);
        setComments(res.data);
      } catch (e) {}
    }
    setShowComments(!showComments);
  };

  const handleComment = async () => {
    if (!commentInput.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/places/${item.place_id}/comments`, {
        content: commentInput.trim(), user_id: user.user_id,
        parent_id: replyTo?.id || null,
      });
      // Re-fetch full threaded comments
      const updated = await axios.get(`${API_BASE}/places/${item.place_id}/comments`);
      setComments(updated.data);
      setCommentInput("");
      setReplyTo(null);
      if (onDataChange) onDataChange();
    } catch (e) {
      alert(e.response?.data?.detail || "댓글 작성 실패");
    } finally { setSubmitting(false); }
  };

  const handlePlaceClick = () => {
    if (!onPlaceClick) return;
    // For own places, pass the original place object; for following, pass the activity item
    onPlaceClick(item._original || item);
  };

  const displayNickname = item.isOwn ? (user?.nickname || "나") : item.owner_nickname;

  return (
    <article style={{
      background: C.containerLowest,
      borderRadius: mobile ? 12 : 8,
      overflow: "hidden",
      boxShadow: mobile ? "0 1px 6px rgba(47,52,48,0.04)" : "0 1px 6px rgba(47,52,48,0.05)",
    }}>
      {/* Card header */}
      <div style={{
        display: "flex", alignItems: "center", gap: mobile ? 10 : 6,
        padding: mobile ? "10px 14px" : "8px 12px",
      }}>
        <div style={{
          width: mobile ? 32 : 24, height: mobile ? 32 : 24, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FH, fontStyle: "italic",
          fontSize: mobile ? 13 : 10, color: "#fff6ef", fontWeight: 700,
        }}>
          {displayNickname?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: FL, fontSize: mobile ? 13 : 10, fontWeight: 700, color: C.onSurface }}>
            {displayNickname}
            {item.isOwn && (
              <span style={{
                marginLeft: 4, fontFamily: FL, fontSize: mobile ? 9 : 7, fontWeight: 600,
                padding: "1px 4px", borderRadius: 3,
                background: C.primaryContainer, color: C.primary,
                verticalAlign: "middle",
              }}>
                나
              </span>
            )}
          </p>
          <p style={{ margin: 0, fontFamily: FL, fontSize: mobile ? 11 : 8, color: C.outlineVariant }}>
            {item.place_category || formatTime(item.created_at)}
          </p>
        </div>
        <span style={{ fontFamily: FL, fontSize: mobile ? 11 : 8, color: C.outlineVariant }}>
          {item.place_category ? formatTime(item.created_at) : ""}
        </span>
      </div>

      {/* Photo gallery */}
      {galleryUrls.length > 0 ? (
        <div style={{ position: "relative" }} onClick={handleDoubleTap}>
          <AdaptiveImage
            src={galleryUrls[galleryIdx]}
            alt={item.place_name}
            onClick={() => {}}
            clickable={false}
          />
          {/* Double-tap heart overlay */}
          {doubleTapHeart && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="#D4537E" stroke="none"
                style={{ opacity: 0.9, animation: "heartPop 0.8s ease-out forwards" }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
          )}
          {galleryUrls.length > 1 && (
            <>
              {galleryIdx > 0 && (
                <button onClick={() => setGalleryIdx((i) => i - 1)} style={{
                  position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                  width: 24, height: 24, borderRadius: "50%",
                  background: "rgba(0,0,0,0.35)", border: "none", color: "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span>
                </button>
              )}
              {galleryIdx < galleryUrls.length - 1 && (
                <button onClick={() => setGalleryIdx((i) => i + 1)} style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  width: 24, height: 24, borderRadius: "50%",
                  background: "rgba(0,0,0,0.35)", border: "none", color: "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
                </button>
              )}
              <div style={{
                position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: 5,
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
      ) : (
        <div onClick={(e) => { handleDoubleTap(); handlePlaceClick(); }}
          style={{
            padding: mobile ? "24px 16px" : "22px 14px",
            background: `linear-gradient(135deg, ${C.primaryDim}18, ${C.primary}10)`,
            cursor: onPlaceClick ? "pointer" : "default",
            position: "relative",
          }}>
          <p style={{ margin: 0, fontFamily: FH, fontStyle: "italic", fontSize: mobile ? 17 : 16, color: C.primary, textAlign: "center", lineHeight: 1.3 }}>
            {item.place_name}
          </p>
          {item.place_address && (
            <p style={{ margin: "5px 0 0", fontFamily: FL, fontSize: mobile ? 12 : 9, color: C.outlineVariant, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
              <span className="material-symbols-outlined" style={{ fontSize: mobile ? 14 : 11 }}>location_on</span>
              {item.place_address}
            </p>
          )}
        </div>
      )}

      {/* Bottom content */}
      <div style={{ padding: mobile ? "8px 14px 12px" : "6px 12px 10px" }}>
        {/* Action bar: like / comment / location */}
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 12 : 8, marginBottom: mobile ? 6 : 4 }}>
          <button onClick={handleLike} style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: liked ? "#D4537E" : C.onSurfaceVariant, transition: "color 0.15s",
          }}>
            <svg width={mobile ? 20 : 16} height={mobile ? 20 : 16} viewBox="0 0 24 24" fill={liked ? "#D4537E" : "none"} stroke={liked ? "#D4537E" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "transform 0.3s cubic-bezier(0.17,0.89,0.32,1.49)", transform: heartAnim ? "scale(1.3)" : "scale(1)" }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button onClick={toggleComments} style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: C.onSurfaceVariant,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: mobile ? 20 : 16 }}>chat_bubble_outline</span>
          </button>
          {onPlaceClick && (
            <button onClick={handlePlaceClick} style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer", padding: 0,
              color: C.onSurfaceVariant,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: mobile ? 20 : 16 }}>location_on</span>
            </button>
          )}
        </div>

        {/* Like count */}
        {likeCount > 0 && (
          <p style={{ margin: "0 0 2px", fontFamily: FL, fontSize: mobile ? 13 : 10, fontWeight: 700, color: C.onSurface }}>
            좋아요 {likeCount}개
          </p>
        )}

        {/* Status badge + rating + place name */}
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 6 : 4, flexWrap: "wrap", marginBottom: item.memo ? 4 : 2 }}>
          <span style={{
            fontFamily: FL, fontSize: mobile ? 11 : 9, fontWeight: 600,
            padding: mobile ? "2px 7px" : "1px 5px", borderRadius: 3,
            background: sc?.bg || C.surfaceLow,
            color: sc?.color || C.onSurfaceVariant,
          }}>
            {STATUS_EMOJI[item.place_status]} {STATUS_LABEL[item.place_status]}
          </span>
          {item.rating > 0 && (
            <span style={{
              fontFamily: FL, fontSize: mobile ? 11 : 9, padding: mobile ? "2px 7px" : "1px 5px",
              background: C.primaryContainer, color: C.primary,
              borderRadius: 3, fontWeight: 600,
            }}>
              {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
            </span>
          )}
          <span style={{ fontFamily: FH, fontSize: mobile ? 14 : 10, fontWeight: 600, color: C.onSurface }}>
            {item.place_name}
          </span>
        </div>

        {/* Memo */}
        {item.memo && (
          <p style={{
            margin: "0 0 4px", fontFamily: FH, fontStyle: "italic",
            fontSize: mobile ? 13 : 10, color: C.onSurfaceVariant, lineHeight: 1.6,
          }}>
            "{item.memo}"
          </p>
        )}

        {/* Address */}
        {item.place_address && galleryUrls.length > 0 && (
          <p style={{
            margin: "0 0 3px", fontFamily: FL, fontSize: mobile ? 11 : 9, color: C.outlineVariant,
            display: "flex", alignItems: "center", gap: 3,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: mobile ? 13 : 10 }}>location_on</span>
            {item.place_address}
          </p>
        )}

        {/* Comments section */}
        {item.comment_count > 0 && !showComments && (
          <button onClick={toggleComments} style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontFamily: FL, fontSize: mobile ? 12 : 10, color: C.outlineVariant, marginBottom: 2,
          }}>
            댓글 {item.comment_count}개 모두 보기
          </button>
        )}

        {showComments && (
          <div style={{ marginTop: 6 }}>
            {comments.length === 0 && (
              <p style={{ margin: "0 0 5px", fontFamily: FL, fontSize: mobile ? 12 : 10, color: C.outlineVariant, fontStyle: "italic" }}>
                첫 댓글을 남겨보세요
              </p>
            )}
            {comments.map((c) => (
              <CommentThread key={c.id} comment={c} depth={0} user={user} mobile={mobile}
                onReply={(c) => { setReplyTo(c); setTimeout(() => commentInputRef.current?.focus(), 0); }}
              />
            ))}
            {/* Reply indicator */}
            {replyTo && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "4px 0",
                fontFamily: FL, fontSize: mobile ? 12 : 10, color: C.outlineVariant,
              }}>
                <span>{replyTo.author_nickname}에게 답글</span>
                <button onClick={() => setReplyTo(null)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: FL, fontSize: mobile ? 12 : 10, color: C.outlineVariant, padding: 0,
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
                  flex: 1, padding: "5px 0",
                  background: "none", border: "none", borderBottom: `1px solid ${C.container}`,
                  fontFamily: FL, fontSize: mobile ? 13 : 10, color: C.onSurface, outline: "none",
                }}
              />
              {commentInput.trim() && (
                <button onClick={handleComment} disabled={submitting} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: FL, fontSize: mobile ? 13 : 10, fontWeight: 700, color: C.primary,
                  padding: "5px 0", opacity: submitting ? 0.5 : 1,
                }}>
                  게시
                </button>
              )}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p style={{ margin: "4px 0 0", fontFamily: FL, fontSize: mobile ? 11 : 9, color: C.outlineVariant }}>
          {formatTime(item.created_at)}
        </p>
      </div>
    </article>
  );
}

function CommentThread({ comment, depth, user, onReply, mobile }) {
  const FL = "'Manrope', -apple-system, sans-serif";
  const C_onSurface = "#2f3430";
  const C_onSurfaceVariant = "#5c605c";
  const C_outlineVariant = "#8a8e8a";
  return (
    <>
      <div style={{ marginBottom: 3, paddingLeft: depth * 16 }}>
        <p style={{ margin: 0, fontFamily: FL, fontSize: mobile ? 13 : 10, color: C_onSurface, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700 }}>{comment.author_nickname}</span>{" "}
          <span style={{ color: C_onSurfaceVariant }}>{comment.content}</span>
        </p>
        {user && (
          <button onClick={() => onReply({ id: comment.id, author_nickname: comment.author_nickname })} style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontFamily: FL, fontSize: mobile ? 10 : 8, color: C_outlineVariant, marginTop: 1,
          }}>답글 달기</button>
        )}
      </div>
      {comment.replies?.map((r) => (
        <CommentThread key={r.id} comment={r} depth={depth + 1} user={user} onReply={onReply} mobile={mobile} />
      ))}
    </>
  );
}

function AdaptiveImage({ src, alt, onClick, clickable }) {
  const [ratio, setRatio] = useState("5/4");
  const imgRef = useRef(null);

  const handleLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setRatio(h > w ? "4/5" : "5/4");
  };

  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        cursor: clickable ? "pointer" : "default",
        overflow: "hidden",
        width: "100%",
        aspectRatio: ratio,
        background: "#f0efec",
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        style={{
          width: "100%", height: "100%",
          objectFit: "cover", display: "block",
        }}
      />
    </div>
  );
}

