// src/components/RestaurantPanel.jsx
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getAccountColor } from "../App";
import { useUser, API_BASE } from "../context/UserContext";

export default function RestaurantPanel({ restaurant, accounts, onClose, onHide, apiBase, sidebarWidth = 280 }) {
  const { user } = useUser();
  const r = restaurant;
  const [adResult, setAdResult] = useState(null);
  const [adLoading, setAdLoading] = useState(false);

  // 좋아요 / 댓글 (팔로잉 유저 맛집에만 표시)
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // personal 맛집이면서 내 것이 아닌 경우 (팔로잉 레이어에서 클릭한 경우)
  const isOthersPlace = r.isPersonal && r.user_id && user && r.user_id !== user.user_id;
  const isPersonalMine = r.isPersonal && (!r.user_id || (user && r.user_id === user.user_id));

  // 좋아요 / 댓글 로드
  useEffect(() => {
    if (!isOthersPlace || !r.id) return;
    // 좋아요 수
    axios.get(`${API_BASE}/places/${r.id}/comments`)
      .then((res) => setComments(res.data))
      .catch(() => {});
  }, [r?.id, isOthersPlace]);

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
        content: commentInput.trim(),
        user_id: user.user_id,
      });
      setComments((prev) => [...prev, res.data]);
      setCommentInput("");
    } catch (e) {
      alert(e.response?.data?.detail || "댓글 작성 실패");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user) return;
    try {
      await axios.delete(`${API_BASE}/comments/${commentId}?user_id=${user.user_id}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {}
  };

  const checkAds = useCallback(async () => {
    setAdLoading(true);
    try {
      const res = await axios.post(`${apiBase}/ad-check/`, {
        restaurant_name: r.name,
        address_hint: r.address ? r.address.split(" ").slice(0, 2).join(" ") : null,
      });
      setAdResult(res.data);
    } catch (e) {
      console.error("광고 분석 실패", e);
    } finally {
      setAdLoading(false);
    }
  }, [r, apiBase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!r) return;
    setAdResult(null);
    setLiked(false);
    setLikeCount(0);
    setComments([]);
    setShowComments(false);
    // 블로그 크롤링 맛집만 광고 분석
    if (!r.isPersonal) checkAds();
  }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const verdictInfo = adResult ? {
    clean:      { label: "✅ 광고 적음",  color: "#1D9E75", bg: "#E1F5EE" },
    suspicious: { label: "⚠️ 광고 의심",  color: "#BA7517", bg: "#FAEEDA" },
    heavy_ad:   { label: "🚨 광고 많음",  color: "#993C1D", bg: "#FAECE7" },
  }[adResult.verdict] : null;

  const isSearchResult = r.isSearchResult || false;

  const STATUS_LABEL = {
    want_to_go:      "🔖 가고 싶어요",
    visited:         "✅ 가봤어요",
    want_revisit:    "❤️ 또 가고 싶어요",
    not_recommended: "👎 별로였어요",
  };

  return (
    <div style={{
      position: "fixed", bottom: 0,
      left: sidebarWidth, right: 0,
      background: "white",
      borderRadius: "16px 16px 0 0",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
      padding: "20px 24px",
      zIndex: 20, maxHeight: "55vh", overflowY: "auto",
      transition: "left 0.3s ease",
    }}>

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          {isSearchResult && (
            <span style={{
              fontSize: 10, background: "#444", color: "white",
              padding: "2px 6px", borderRadius: 4, marginBottom: 4,
              display: "inline-block",
            }}>검색 결과</span>
          )}
          <p style={{ margin: "4px 0 4px", fontSize: 11, color: "#E8593C", fontWeight: 600 }}>
            {r.category || "맛집"}
          </p>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>
            {r.name}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            📍 {r.address || "주소 정보 없음"}
          </p>

          {/* 내 맛집 상태/별점/메모 표시 */}
          {isPersonalMine && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {r.status && (
                <span style={{
                  fontSize: 12, padding: "3px 8px",
                  background: "#fff0ed", color: "#E8593C",
                  borderRadius: 20, fontWeight: 600,
                }}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              )}
              {r.rating && (
                <span style={{ fontSize: 12, color: "#E8593C" }}>
                  {"⭐".repeat(r.rating)}
                </span>
              )}
              {r.memo && (
                <span style={{ fontSize: 12, color: "#888" }}>💬 {r.memo}</span>
              )}
              {r.instagram_post_url && (
                <a href={r.instagram_post_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: "#E8593C", textDecoration: "none" }}>
                  📷 인스타 포스트
                </a>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {!isOthersPlace && (
            <button
              onClick={() => onHide(r.id, r.isPersonal)}
              title="삭제"
              style={{
                background: "#f5f5f5", border: "none", borderRadius: "50%",
                width: 32, height: 32, cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center", color: "#888",
              }}
            >🗑</button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "#f5f5f5", border: "none", borderRadius: "50%",
              width: 32, height: 32, cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>
      </div>

      {/* 네이버 지도 링크 */}
      {r.naver_place_url && (
        <a href={r.naver_place_url} target="_blank" rel="noreferrer" style={{
          display: "inline-block", marginBottom: 16,
          padding: "7px 14px", background: "#03C75A",
          color: "white", borderRadius: 8, fontSize: 12,
          fontWeight: 600, textDecoration: "none",
        }}>
          네이버 지도에서 보기
        </a>
      )}

      {/* ── 좋아요 + 댓글 (팔로잉 유저 맛집) ── */}
      {isOthersPlace && (
        <div style={{ marginBottom: 16 }}>
          {/* 좋아요 버튼 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button
              onClick={handleLike}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px",
                background: liked ? "#fff0ed" : "#f5f5f5",
                border: `1.5px solid ${liked ? "#E8593C" : "#eee"}`,
                borderRadius: 20, cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                color: liked ? "#E8593C" : "#888",
                transition: "all 0.15s",
              }}
            >
              {liked ? "❤️" : "🤍"} {likeCount > 0 ? likeCount : "좋아요"}
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px",
                background: showComments ? "#f0f4ff" : "#f5f5f5",
                border: `1.5px solid ${showComments ? "#3B8BD4" : "#eee"}`,
                borderRadius: 20, cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                color: showComments ? "#3B8BD4" : "#888",
              }}
            >
              💬 {comments.length > 0 ? comments.length : "댓글"}
            </button>
          </div>

          {/* 댓글 섹션 */}
          {showComments && (
            <div style={{
              background: "#f8f8f8", borderRadius: 12, padding: 12,
            }}>
              {/* 댓글 목록 */}
              {comments.length === 0 ? (
                <p style={{ fontSize: 13, color: "#bbb", textAlign: "center", padding: "8px 0" }}>
                  첫 댓글을 남겨보세요!
                </p>
              ) : (
                <div style={{ marginBottom: 12, maxHeight: 200, overflowY: "auto" }}>
                  {comments.map((c) => (
                    <div key={c.id} style={{
                      display: "flex", gap: 8, marginBottom: 8,
                      alignItems: "flex-start",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "#E8593C", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {c.author_nickname?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>
                            {c.author_nickname}
                          </span>
                          <span style={{ fontSize: 10, color: "#ccc" }}>
                            {formatTime(c.created_at)}
                          </span>
                          {user && c.user_id === user.user_id && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              style={{
                                background: "none", border: "none",
                                fontSize: 10, color: "#ccc", cursor: "pointer",
                                marginLeft: "auto",
                              }}
                            >삭제</button>
                          )}
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#444" }}>
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 댓글 입력 */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  placeholder="댓글 입력..."
                  style={{
                    flex: 1, padding: "8px 12px",
                    border: "1.5px solid #eee", borderRadius: 20,
                    fontSize: 13, outline: "none",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#E8593C"}
                  onBlur={(e) => e.target.style.borderColor = "#eee"}
                />
                <button
                  onClick={handleComment}
                  disabled={submittingComment || !commentInput.trim()}
                  style={{
                    padding: "8px 14px",
                    background: commentInput.trim() ? "#E8593C" : "#eee",
                    color: commentInput.trim() ? "white" : "#aaa",
                    border: "none", borderRadius: 20,
                    fontSize: 13, fontWeight: 700,
                    cursor: commentInput.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  {submittingComment ? "..." : "전송"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 광고 분석 (블로그 크롤링 맛집만) ── */}
      {!r.isPersonal && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px", fontWeight: 600 }}>
            광고 분석
          </p>
          {adLoading && (
            <div style={{
              background: "#f5f5f5", borderRadius: 12,
              padding: "14px 16px", fontSize: 13, color: "#888",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              블로그 분석 중...
            </div>
          )}
          {!adLoading && adResult && verdictInfo && (
            <div style={{ background: verdictInfo.bg, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: verdictInfo.color }}>
                  {verdictInfo.label}
                </span>
                <span style={{ fontSize: 12, color: verdictInfo.color }}>
                  블로그 {adResult.total_posts}개 분석
                  {adResult.cached && (
                    <span style={{ fontSize: 10, color: "#aaa", marginLeft: 6 }}>
                      ({adResult.checked_at} 기준)
                    </span>
                  )}
                </span>
              </div>
              <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                {adResult.ad_count > 0 && <div style={{ flex: adResult.ad_count, background: "#E24B4A" }} />}
                {adResult.suspicious_count > 0 && <div style={{ flex: adResult.suspicious_count, background: "#EF9F27" }} />}
                {adResult.genuine_count > 0 && <div style={{ flex: adResult.genuine_count, background: "#1D9E75" }} />}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#555" }}>
                <span>🔴 광고 {adResult.ad_count}개</span>
                <span>🟡 의심 {adResult.suspicious_count}개</span>
                <span>🟢 순수 {adResult.genuine_count}개</span>
              </div>
              {adResult.posts.filter(p => p.is_ad || p.is_suspicious).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>광고/의심 게시물</p>
                  {adResult.posts.filter(p => p.is_ad || p.is_suspicious).slice(0, 5).map((p, i) => (
                    <a key={i} href={p.post_url} target="_blank" rel="noreferrer" style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 8px", marginBottom: 4,
                      background: "rgba(255,255,255,0.7)", borderRadius: 8, textDecoration: "none",
                    }}>
                      <span style={{ fontSize: 12 }}>{p.is_ad ? "🔴" : "🟡"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: 11, color: "#333",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{p.post_title}</p>
                        {p.matched_keywords.length > 0 && (
                          <p style={{ margin: 0, fontSize: 10, color: "#888" }}>
                            키워드: {p.matched_keywords.join(", ")}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 소개한 블로거 목록 */}
      {r.sources && r.sources.length > 0 && (
        <div>
          <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px", fontWeight: 600 }}>
            소개한 블로거 ({r.sources.length})
          </p>
          {r.sources.map((s, i) => {
            const acc = accounts.find(a => a.author_id === s.author_id);
            const color = acc ? getAccountColor(acc.id, accounts) : "#888";
            return (
              <a key={i} href={s.post_url} target="_blank" rel="noreferrer" style={{
                display: "flex", alignItems: "center",
                padding: "10px 12px", marginBottom: 6,
                background: "#fafafa", borderRadius: 10,
                textDecoration: "none", border: "1px solid #f0f0f0",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: color, color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, marginRight: 10, flexShrink: 0,
                }}>
                  {(s.author_name || "?")[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                    {s.author_name || s.author_id}
                  </p>
                  <p style={{
                    margin: 0, fontSize: 11, color: "#888",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{s.post_title}</p>
                </div>
                <span style={{ fontSize: 16, color: "#ccc" }}>›</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
