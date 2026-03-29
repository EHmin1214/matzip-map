// src/components/RestaurantPanel.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { getAccountColor } from "../App";
import { useUser, API_BASE } from "../context/UserContext";
import SavePlaceModal from "./SavePlaceModal";

const isMobile = () => window.innerWidth <= 768;

export default function RestaurantPanel({
  restaurant, accounts, onClose, onHide, apiBase, sidebarWidth = 280,
  onPlaceUpdated, mapInstance,
}) {
  const { user } = useUser();
  const mobile = isMobile();
  const [r, setR] = useState(restaurant);
  const [adResult, setAdResult] = useState(null);
  const [adLoading, setAdLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [neighbors, setNeighbors] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const touchStartY = useRef(null);

  useEffect(() => { setR(restaurant); }, [restaurant?.id]);

  const isPersonalMine = r.isPersonal && (!r.user_id || (user && r.user_id === user.user_id));
  const isOthersPlace = r.isPersonal && r.user_id && user && r.user_id !== user.user_id;

  useEffect(() => {
    if (!r.isPersonal || !r.id) return;
    axios.get(`${API_BASE}/places/${r.id}/neighbors?viewer_id=${user?.user_id || ""}`)
      .then((res) => setNeighbors(res.data))
      .catch(() => {});
  }, [r?.id, r?.isPersonal, user?.user_id]);

  useEffect(() => {
    if (!isOthersPlace || !r.id) return;
    axios.get(`${API_BASE}/places/${r.id}/comments`)
      .then((res) => setComments(res.data))
      .catch(() => {});
  }, [r?.id, isOthersPlace]);

  // 지도 중심 이동
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
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API_BASE}/comments/${commentId}?user_id=${user.user_id}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {}
  };

  const handleEditSave = async (updated) => {
    const res = await axios.patch(
      `${API_BASE}/personal-places/${r.id}?user_id=${user.user_id}`,
      {
        folder_id: updated.folder_id,
        status: updated.status,
        rating: updated.rating,
        memo: updated.memo,
        instagram_post_url: updated.instagram_post_url,
      }
    );
    const updatedPlace = res.data;
    setR((prev) => ({ ...prev, ...updatedPlace }));
    if (onPlaceUpdated) onPlaceUpdated({ ...r, ...updatedPlace });
  };

  const checkAds = useCallback(async () => {
    setAdLoading(true);
    try {
      const res = await axios.post(`${apiBase}/ad-check/`, {
        restaurant_name: r.name,
        address_hint: r.address ? r.address.split(" ").slice(0, 2).join(" ") : null,
      });
      setAdResult(res.data);
    } catch (e) {}
    finally { setAdLoading(false); }
  }, [r?.name, apiBase]); // eslint-disable-line

  useEffect(() => {
    if (!r) return;
    setAdResult(null); setLiked(false); setLikeCount(0);
    setComments([]); setShowComments(false); setNeighbors([]);
    if (!r.isPersonal) checkAds();
  }, [r?.id]); // eslint-disable-line

  // 스와이프 닫기
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80) onClose();
    touchStartY.current = null;
  };

  const verdictInfo = adResult ? {
    clean:      { label: "✅ 광고 적음",  color: "#1D9E75", bg: "#E1F5EE" },
    suspicious: { label: "⚠️ 광고 의심",  color: "#BA7517", bg: "#FAEEDA" },
    heavy_ad:   { label: "🚨 광고 많음",  color: "#993C1D", bg: "#FAECE7" },
  }[adResult.verdict] : null;

  const STATUS_LABEL = {
    want_to_go:      "🔖 가고 싶어요",
    visited:         "✅ 가봤어요",
    want_revisit:    "❤️ 또 가고 싶어요",
    not_recommended: "👎 별로였어요",
  };

  return (
    <>
      <div
        onTouchStart={mobile ? handleTouchStart : undefined}
        onTouchEnd={mobile ? handleTouchEnd : undefined}
        style={{
          position: "fixed",
          bottom: mobile ? 60 : 0,
          left: mobile ? 0 : sidebarWidth,
          right: 0,
          background: "white",
          borderRadius: mobile ? "20px 20px 0 0" : "16px 16px 0 0",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
          zIndex: 20,
          maxHeight: mobile ? "62vh" : "55vh",
          overflowY: "auto",
          transition: "left 0.3s ease",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* 스와이프 핸들 */}
        {mobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", cursor: "grab" }}>
            <div style={{ width: 36, height: 4, background: "#ddd", borderRadius: 2 }} />
          </div>
        )}

        <div style={{ padding: mobile ? "8px 20px 24px" : "20px 24px" }}>
          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "#E8593C", fontWeight: 600 }}>
                {r.category || "맛집"}
              </p>
              <h2 style={{ margin: 0, fontSize: mobile ? 18 : 20, fontWeight: 700, color: "#1a1a1a" }}>
                {r.name}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
                📍 {r.address || "주소 정보 없음"}
              </p>

              {isPersonalMine && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {r.status && (
                    <span style={{ fontSize: 12, padding: "4px 10px", background: "#fff0ed", color: "#E8593C", borderRadius: 20, fontWeight: 600 }}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  )}
                  {r.rating > 0 && <span style={{ fontSize: 13, color: "#E8593C" }}>{"⭐".repeat(r.rating)}</span>}
                  {r.memo && <span style={{ fontSize: 12, color: "#888" }}>💬 {r.memo}</span>}
                  {r.instagram_post_url && (
                    <a href={r.instagram_post_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: "#E8593C", textDecoration: "none" }}>
                      📷 인스타 포스트
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 버튼들 */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
              {/* 지도 중심 이동 버튼 */}
              <button onClick={handleCenterMap} title="지도에서 보기"
                style={{
                  background: "#f0f7ff", border: "none", borderRadius: "50%",
                  width: mobile ? 40 : 32, height: mobile ? 40 : 32,
                  cursor: "pointer", fontSize: mobile ? 16 : 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  WebkitTapHighlightColor: "transparent",
                }}>🎯</button>

              {isPersonalMine && (
                <button onClick={() => setEditModalOpen(true)}
                  style={{
                    background: "#fff0ed", border: "none", borderRadius: "50%",
                    width: mobile ? 40 : 32, height: mobile ? 40 : 32,
                    cursor: "pointer", fontSize: mobile ? 16 : 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    WebkitTapHighlightColor: "transparent",
                  }}>✏️</button>
              )}
              {!isOthersPlace && (
                <button onClick={() => onHide(r.id, r.isPersonal)}
                  style={{
                    background: "#f5f5f5", border: "none", borderRadius: "50%",
                    width: mobile ? 40 : 32, height: mobile ? 40 : 32,
                    cursor: "pointer", fontSize: mobile ? 16 : 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#888", WebkitTapHighlightColor: "transparent",
                  }}>🗑</button>
              )}
              <button onClick={onClose}
                style={{
                  background: "#f5f5f5", border: "none", borderRadius: "50%",
                  width: mobile ? 40 : 32, height: mobile ? 40 : 32,
                  cursor: "pointer", fontSize: mobile ? 18 : 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  WebkitTapHighlightColor: "transparent",
                }}>×</button>
            </div>
          </div>

          {/* 네이버 지도 + 지도 이동 버튼 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {r.naver_place_url && (
              <a href={r.naver_place_url} target="_blank" rel="noreferrer" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: mobile ? "10px 16px" : "7px 14px",
                background: "#03C75A", color: "white", borderRadius: 10,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
                WebkitTapHighlightColor: "transparent",
              }}>
                🗺️ 네이버 지도
              </a>
            )}
          </div>

          {/* 이웃 */}
          {neighbors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px", fontWeight: 600 }}>
                함께 저장한 이웃 ({neighbors.length})
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {neighbors.map((n) => (
                  <div key={n.user_id} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "#f8f8f8", borderRadius: 20,
                    padding: "6px 12px", border: "1px solid #f0f0f0",
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "linear-gradient(135deg, #3B8BD4, #7F77DD)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "white", fontWeight: 700,
                    }}>
                      {n.nickname?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{n.nickname}</span>
                    <span style={{ fontSize: 12 }}>
                      {n.status === "want_to_go" ? "🔖" : n.status === "visited" ? "✅" : n.status === "want_revisit" ? "❤️" : "👎"}
                    </span>
                    {n.rating > 0 && <span style={{ fontSize: 11, color: "#E8593C" }}>⭐{n.rating}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 좋아요 + 댓글 */}
          {isOthersPlace && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <button onClick={handleLike} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: mobile ? "10px 18px" : "8px 16px", minHeight: 44,
                  background: liked ? "#fff0ed" : "#f5f5f5",
                  border: `1.5px solid ${liked ? "#E8593C" : "#eee"}`,
                  borderRadius: 22, cursor: "pointer", fontSize: 14, fontWeight: 600,
                  color: liked ? "#E8593C" : "#888",
                  WebkitTapHighlightColor: "transparent",
                }}>
                  {liked ? "❤️" : "🤍"} {likeCount > 0 ? likeCount : "좋아요"}
                </button>
                <button onClick={() => setShowComments(!showComments)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: mobile ? "10px 18px" : "8px 16px", minHeight: 44,
                  background: showComments ? "#f0f4ff" : "#f5f5f5",
                  border: `1.5px solid ${showComments ? "#3B8BD4" : "#eee"}`,
                  borderRadius: 22, cursor: "pointer", fontSize: 14, fontWeight: 600,
                  color: showComments ? "#3B8BD4" : "#888",
                  WebkitTapHighlightColor: "transparent",
                }}>
                  💬 {comments.length > 0 ? comments.length : "댓글"}
                </button>
              </div>

              {showComments && (
                <div style={{ background: "#f8f8f8", borderRadius: 14, padding: 14 }}>
                  {comments.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#bbb", textAlign: "center", padding: "8px 0" }}>첫 댓글을 남겨보세요!</p>
                  ) : (
                    <div style={{ marginBottom: 12, maxHeight: 160, overflowY: "auto" }}>
                      {comments.map((c) => (
                        <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: "50%", background: "#E8593C", color: "white",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, flexShrink: 0,
                          }}>
                            {c.author_nickname?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{c.author_nickname}</span>
                              <span style={{ fontSize: 10, color: "#ccc" }}>{formatTime(c.created_at)}</span>
                              {user && c.user_id === user.user_id && (
                                <button onClick={() => handleDeleteComment(c.id)}
                                  style={{ background: "none", border: "none", fontSize: 11, color: "#ccc", cursor: "pointer", marginLeft: "auto", padding: "4px 8px" }}>
                                  삭제
                                </button>
                              )}
                            </div>
                            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#444" }}>{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleComment()}
                      placeholder="댓글 입력..."
                      style={{
                        flex: 1, padding: "10px 14px",
                        border: "1.5px solid #eee", borderRadius: 22,
                        fontSize: 14, outline: "none", WebkitAppearance: "none",
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#E8593C"}
                      onBlur={(e) => e.target.style.borderColor = "#eee"}
                    />
                    <button onClick={handleComment} disabled={submittingComment || !commentInput.trim()}
                      style={{
                        padding: "10px 16px", minHeight: 44,
                        background: commentInput.trim() ? "#E8593C" : "#eee",
                        color: commentInput.trim() ? "white" : "#aaa",
                        border: "none", borderRadius: 22,
                        fontSize: 14, fontWeight: 700, cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                      }}>
                      {submittingComment ? "..." : "전송"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 광고 분석 */}
          {!r.isPersonal && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px", fontWeight: 600 }}>광고 분석</p>
              {adLoading && (
                <div style={{ background: "#f5f5f5", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 8 }}>
                  ⏳ 블로그 분석 중...
                </div>
              )}
              {!adLoading && adResult && verdictInfo && (
                <div style={{ background: verdictInfo.bg, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: verdictInfo.color }}>{verdictInfo.label}</span>
                    <span style={{ fontSize: 11, color: verdictInfo.color }}>블로그 {adResult.total_posts}개</span>
                  </div>
                  <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                    {adResult.ad_count > 0 && <div style={{ flex: adResult.ad_count, background: "#E24B4A" }} />}
                    {adResult.suspicious_count > 0 && <div style={{ flex: adResult.suspicious_count, background: "#EF9F27" }} />}
                    {adResult.genuine_count > 0 && <div style={{ flex: adResult.genuine_count, background: "#1D9E75" }} />}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#555" }}>
                    <span>🔴 {adResult.ad_count}</span>
                    <span>🟡 {adResult.suspicious_count}</span>
                    <span>🟢 {adResult.genuine_count}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 소개 블로거 */}
          {r.sources && r.sources.length > 0 && (
            <div>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px", fontWeight: 600 }}>소개한 블로거 ({r.sources.length})</p>
              {r.sources.map((s, i) => {
                const acc = accounts.find(a => a.author_id === s.author_id);
                const color = acc ? getAccountColor(acc.id, accounts) : "#888";
                return (
                  <a key={i} href={s.post_url} target="_blank" rel="noreferrer" style={{
                    display: "flex", alignItems: "center",
                    padding: mobile ? "12px 14px" : "10px 12px", marginBottom: 8,
                    background: "#fafafa", borderRadius: 12,
                    textDecoration: "none", border: "1px solid #f0f0f0", minHeight: 44,
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%", background: color, color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, marginRight: 12, flexShrink: 0,
                    }}>
                      {(s.author_name || "?")[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{s.author_name || s.author_id}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.post_title}</p>
                    </div>
                    <span style={{ fontSize: 18, color: "#ddd" }}>›</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editModalOpen && (
        <SavePlaceModal place={r} onSave={handleEditSave} onClose={() => setEditModalOpen(false)} editMode />
      )}
    </>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
