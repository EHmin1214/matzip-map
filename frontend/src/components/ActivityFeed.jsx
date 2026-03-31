// src/components/ActivityFeed.jsx
// Instagram-style feed — 팔로잉 장소 + 사진 + 후기 카드
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
  outlineVariant: "#afb3ae", primaryContainer: "#ede0d5",
};

const isMobile = () => window.innerWidth <= 768;

export default function ActivityFeed({ embedded = false, onPlaceClick, noHeader = false }) {
  const { user } = useUser();
  const mobile = isMobile();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/activity-feed?user_id=${user.user_id}&limit=50`)
      .then((res) => setActivities(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // 임베드 버전 (사이드바용)
  if (embedded) {
    return (
      <div style={{ height: "100%", overflowY: "auto", background: C.bg, padding: "12px 8px" }}>
        <p style={{ fontFamily: FL, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e", margin: "0 4px 12px" }}>
          팔로잉 활동
        </p>
        {loading ? (
          <p style={{ fontFamily: FL, fontSize: 12, color: "#a8a29e", padding: "8px 4px" }}>불러오는 중...</p>
        ) : activities.length === 0 ? (
          <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 13, color: "#a8a29e", padding: "8px 4px" }}>아직 활동이 없어요</p>
        ) : (
          activities.map((a, idx) => (
            <div key={idx} onClick={() => onPlaceClick && onPlaceClick(a)}
              style={{ padding: "10px 8px", borderBottom: `1px solid ${C.container}`, cursor: onPlaceClick ? "pointer" : "default" }}>
              <p style={{ margin: 0, fontFamily: FH, fontSize: 12, color: C.onSurface, lineHeight: 1.5 }}>
                <b>{a.owner_nickname}</b>님이 <span style={{ fontStyle: "italic", color: C.primary }}>{a.place_name}</span>을(를) {STATUS_EMOJI[a.place_status]} 추가
              </p>
              <p style={{ margin: "3px 0 0", fontFamily: FL, fontSize: 9, color: "#a8a29e" }}>{formatTime(a.created_at)}</p>
            </div>
          ))
        )}
      </div>
    );
  }

  // 풀 버전 — Instagram-style feed
  return (
    <div style={{ background: C.bg, minHeight: "100%" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: mobile ? "16px 0" : "32px 0" }}>
        {loading ? (
          <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 16, color: "#a8a29e", padding: "60px 0", textAlign: "center" }}>불러오는 중...</p>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 20, color: "#a8a29e", margin: "0 0 10px" }}>아직 활동이 없어요</p>
            <p style={{ fontFamily: FL, fontSize: 11, color: "#a8a29e", letterSpacing: "0.08em" }}>팔로우를 시작해보세요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 2 : 16 }}>
            {activities.map((a, idx) => (
              <FeedCard key={idx} activity={a} mobile={mobile} onPlaceClick={onPlaceClick} />
            ))}
          </div>
        )}

        {!loading && activities.length > 0 && (
          <div style={{ marginTop: 48, padding: "24px 0", textAlign: "center" }}>
            <p style={{ fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: "#c7c4bf" }}>
              End of recent archive
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedCard({ activity: a, mobile, onPlaceClick }) {
  const { user } = useUser();
  const sc = STATUS_COLOR[a.place_status];
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(a.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const galleryUrls = a.photo_urls?.length ? a.photo_urls : (a.photo_url ? [a.photo_url] : []);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axios.post(`${API_BASE}/places/${a.place_id}/like?user_id=${user.user_id}`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch (e) {}
  };

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      try {
        const res = await axios.get(`${API_BASE}/places/${a.place_id}/comments`);
        setComments(res.data);
      } catch (e) {}
    }
    setShowComments(!showComments);
  };

  const handleComment = async () => {
    if (!commentInput.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/places/${a.place_id}/comments`, {
        content: commentInput.trim(), user_id: user.user_id,
      });
      setComments((prev) => [...prev, res.data]);
      setCommentInput("");
    } catch (e) {
      alert(e.response?.data?.detail || "댓글 작성 실패");
    } finally { setSubmitting(false); }
  };

  return (
    <article style={{
      background: C.containerLowest,
      borderRadius: mobile ? 0 : 14,
      overflow: "hidden",
      boxShadow: mobile ? "none" : "0 1px 8px rgba(47,52,48,0.06)",
    }}>
      {/* 카드 헤더 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FH, fontStyle: "italic",
          fontSize: 14, color: "#fff6ef", fontWeight: 700,
        }}>
          {a.owner_nickname?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: FL, fontSize: 12, fontWeight: 700, color: C.onSurface }}>
            {a.owner_nickname}
          </p>
          <p style={{ margin: 0, fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
            {a.place_category || formatTime(a.created_at)}
          </p>
        </div>
        <span style={{ fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
          {a.place_category ? formatTime(a.created_at) : ""}
        </span>
      </div>

      {/* 사진 영역 — 갤러리 */}
      {galleryUrls.length > 0 ? (
        <div style={{ position: "relative" }}>
          <AdaptiveImage
            src={galleryUrls[galleryIdx]}
            alt={a.place_name}
            onClick={() => onPlaceClick && onPlaceClick(a)}
            clickable={!!onPlaceClick}
          />
          {galleryUrls.length > 1 && (
            <>
              {galleryIdx > 0 && (
                <button onClick={() => setGalleryIdx((i) => i - 1)} style={{
                  position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(0,0,0,0.35)", border: "none", color: "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                </button>
              )}
              {galleryIdx < galleryUrls.length - 1 && (
                <button onClick={() => setGalleryIdx((i) => i + 1)} style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(0,0,0,0.35)", border: "none", color: "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                </button>
              )}
              <div style={{
                position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: 5,
              }}>
                {galleryUrls.map((_, i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: i === galleryIdx ? "white" : "rgba(255,255,255,0.45)",
                  }} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div onClick={() => onPlaceClick && onPlaceClick(a)}
          style={{
            padding: mobile ? "32px 20px" : "40px 24px",
            background: `linear-gradient(135deg, ${C.primaryDim}18, ${C.primary}10)`,
            cursor: onPlaceClick ? "pointer" : "default",
          }}>
          <p style={{ margin: 0, fontFamily: FH, fontStyle: "italic", fontSize: mobile ? 22 : 26, color: C.primary, textAlign: "center", lineHeight: 1.3 }}>
            {a.place_name}
          </p>
          {a.place_address && (
            <p style={{ margin: "8px 0 0", fontFamily: FL, fontSize: 11, color: C.outlineVariant, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
              {a.place_address}
            </p>
          )}
        </div>
      )}

      {/* 하단 콘텐츠 */}
      <div style={{ padding: "10px 16px 14px" }}>
        {/* 좋아요 / 댓글 / 지도 액션 바 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button onClick={handleLike} style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: liked ? "#D4537E" : C.onSurfaceVariant, transition: "color 0.15s",
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 22, fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0",
            }}>favorite</span>
          </button>
          <button onClick={toggleComments} style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: C.onSurfaceVariant,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>chat_bubble_outline</span>
          </button>
          {onPlaceClick && (
            <button onClick={() => onPlaceClick(a)} style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer", padding: 0,
              color: C.onSurfaceVariant,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>location_on</span>
            </button>
          )}
        </div>

        {/* 좋아요 수 */}
        {likeCount > 0 && (
          <p style={{ margin: "0 0 4px", fontFamily: FL, fontSize: 12, fontWeight: 700, color: C.onSurface }}>
            좋아요 {likeCount}개
          </p>
        )}

        {/* 상태 뱃지 + 장소명 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: a.memo ? 6 : 2 }}>
          <span style={{
            fontFamily: FL, fontSize: 11, fontWeight: 600,
            padding: "2px 7px", borderRadius: 4,
            background: sc?.bg || C.surfaceLow,
            color: sc?.color || C.onSurfaceVariant,
          }}>
            {STATUS_EMOJI[a.place_status]} {STATUS_LABEL[a.place_status]}
          </span>
          {a.rating > 0 && (
            <span style={{
              fontFamily: FL, fontSize: 11, padding: "2px 7px",
              background: C.primaryContainer, color: C.primary,
              borderRadius: 4, fontWeight: 600,
            }}>
              {"★".repeat(a.rating)}{"☆".repeat(5 - a.rating)}
            </span>
          )}
          <span style={{ fontFamily: FH, fontSize: 13, fontWeight: 600, color: C.onSurface }}>
            {a.place_name}
          </span>
        </div>

        {/* 메모 */}
        {a.memo && (
          <p style={{
            margin: "0 0 6px", fontFamily: FH, fontStyle: "italic",
            fontSize: 13, color: C.onSurfaceVariant, lineHeight: 1.7,
          }}>
            "{a.memo}"
          </p>
        )}

        {/* 댓글 영역 */}
        {a.comment_count > 0 && !showComments && (
          <button onClick={toggleComments} style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontFamily: FL, fontSize: 12, color: C.outlineVariant, marginBottom: 4,
          }}>
            댓글 {a.comment_count}개 모두 보기
          </button>
        )}

        {showComments && (
          <div style={{ marginTop: 6 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ marginBottom: 4 }}>
                <p style={{ margin: 0, fontFamily: FL, fontSize: 12, color: C.onSurface, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700 }}>{c.author_nickname}</span>{" "}
                  <span style={{ color: C.onSurfaceVariant }}>{c.content}</span>
                </p>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="댓글 달기..."
                style={{
                  flex: 1, padding: "8px 0",
                  background: "none", border: "none", borderBottom: `1px solid ${C.container}`,
                  fontFamily: FL, fontSize: 12, color: C.onSurface, outline: "none",
                }}
              />
              {commentInput.trim() && (
                <button onClick={handleComment} disabled={submitting} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: FL, fontSize: 12, fontWeight: 700, color: C.primary,
                  padding: "8px 0", opacity: submitting ? 0.5 : 1,
                }}>
                  게시
                </button>
              )}
            </div>
          </div>
        )}

        {/* 시간 */}
        <p style={{ margin: "6px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
          {formatTime(a.created_at)}
        </p>
      </div>
    </article>
  );
}

function AdaptiveImage({ src, alt, onClick, clickable }) {
  const [ratio, setRatio] = useState("5/4"); // default landscape
  const imgRef = useRef(null);

  const handleLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    // portrait → 4:5, landscape/square → 5:4
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

