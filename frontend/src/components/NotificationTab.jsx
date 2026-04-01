// src/components/NotificationTab.jsx
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import { formatTime } from "../constants";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = { primary: "#655d54", primaryDim: "#595149", primaryContainer: "#ede0d5", bg: "#faf9f6", container: "#edeeea", containerLowest: "#ffffff", containerLow: "#f4f4f0", onSurface: "#2f3430", tertiary: "#685f39", error: "#9e422c" };

const isMobile = () => window.innerWidth <= 768;

const TYPE_ICON = {
  follow: { icon: "person", bg: C.container, color: C.primary },
  follow_request: { icon: "person_add", bg: C.primary, color: "white" },
  follow_accepted: { icon: "check", bg: C.primary, color: "white" },
  like: { icon: "favorite", bg: C.primaryContainer, color: C.primary },
  comment: { icon: "chat_bubble", bg: C.tertiary, color: "white" },
};
const TYPE_LABEL = {
  follow: "님이 팔로우하기 시작했어요",
  follow_request: "님이 팔로우를 요청했어요",
  follow_accepted: "님이 팔로우 요청을 수락했어요",
  like: "님이 맛집을 좋아해요",
  comment: "님이 댓글을 남겼어요",
};

export default function NotificationTab({ embedded = false, onUnreadChange, noHeader = false, onPlaceClick }) {
  const { user } = useUser();
  const mobile = isMobile();
  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [followLoading, setFollowLoading] = useState(null);

  const fetchAll = useCallback(() => {
    if (!user) return;
    Promise.all([
      axios.get(`${API_BASE}/notifications/?user_id=${user.user_id}`),
      axios.get(`${API_BASE}/follows/requests/${user.user_id}`),
      axios.get(`${API_BASE}/follows/${user.user_id}/following`),
    ]).then(([n, r, f]) => {
      setNotifications(n.data);
      setRequests(r.data);
      setFollowing(f.data);
      const unread = n.data.filter((x) => !x.is_read).length;
      if (onUnreadChange) onUnreadChange(unread);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, onUnreadChange]);

  const getFollowStatus = (targetId) => {
    const f = following.find((f) => f.id === targetId);
    return f ? (f.status || "accepted") : "none";
  };

  const handleFollowBack = async (targetId) => {
    if (!user) return;
    setFollowLoading(targetId);
    try {
      await axios.post(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
      const res = await axios.get(`${API_BASE}/follows/${user.user_id}/following`);
      setFollowing(res.data);
    } catch { alert("팔로우 요청에 실패했습니다."); }
    finally { setFollowLoading(null); }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const markAllRead = async () => {
    try {
      await axios.delete(`${API_BASE}/notifications/?user_id=${user.user_id}`);
      setNotifications([]);
      if (onUnreadChange) onUnreadChange(0);
    } catch { alert("알림 삭제에 실패했습니다."); }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`${API_BASE}/notifications/${id}?user_id=${user.user_id}`);
      setNotifications((prev) => {
        const next = prev.filter((n) => n.id !== id);
        const unread = next.filter((x) => !x.is_read).length;
        if (onUnreadChange) onUnreadChange(unread);
        return next;
      });
    } catch { alert("알림 삭제에 실패했습니다."); }
  };

  const handleAccept = async (fromId) => {
    setProcessingId(fromId);
    try {
      await axios.post(`${API_BASE}/follows/requests/${fromId}/accept?user_id=${user.user_id}`);
      setRequests((prev) => prev.filter((r) => r.from_user_id !== fromId));
      fetchAll();
    } catch { alert("요청 수락에 실패했습니다."); } finally { setProcessingId(null); }
  };

  const handleReject = async (fromId) => {
    setProcessingId(fromId);
    try {
      await axios.post(`${API_BASE}/follows/requests/${fromId}/reject?user_id=${user.user_id}`);
      setRequests((prev) => prev.filter((r) => r.from_user_id !== fromId));
    } catch { alert("요청 거절에 실패했습니다."); } finally { setProcessingId(null); }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // 임베드 (사이드바)
  if (embedded) {
    return (
      <div style={{ height: "100%", overflowY: "auto", background: C.bg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 12px 8px" }}>
          <span style={{ fontFamily: FL, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e" }}>알림</span>
          {notifications.length > 0 && (
            <button onClick={markAllRead} style={{
              padding: "3px 8px", borderRadius: 4,
              background: C.primary, border: "none",
              fontFamily: FL, fontSize: 9, color: "#fff6ef", cursor: "pointer", fontWeight: 700,
            }}>
              모두 읽음
            </button>
          )}
        </div>
        {loading ? <p style={{ fontFamily: FL, fontSize: 12, color: "#a8a29e", padding: "8px 12px" }}>...</p> :
          notifications.slice(0, 5).map((n) => (
            <div key={n.id} style={{ position: "relative", padding: "10px 12px", background: n.is_read ? "transparent" : `${C.primaryContainer}60`, borderLeft: n.is_read ? "2px solid transparent" : `2px solid ${C.primary}`, borderBottom: `1px solid ${C.container}` }}>
              <button
                onClick={() => deleteNotification(n.id)}
                style={{
                  position: "absolute", top: 4, right: 4,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "rgba(47,52,48,0.08)", border: "none",
                  cursor: "pointer", fontSize: 10, color: "#a8a29e",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 0, lineHeight: 1,
                }}
              >&times;</button>
              <p style={{ margin: 0, fontFamily: FH, fontSize: 12, color: C.onSurface, lineHeight: 1.5, paddingRight: 16 }}>
                <b>{n.actor_nickname}</b>{TYPE_LABEL[n.type] || "새 알림"}
                {n.target_place_name && <span style={{ fontStyle: "italic", color: C.primary }}> — {n.target_place_name}</span>}
              </p>
              <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 9, color: "#a8a29e" }}>{formatTime(n.created_at)}</p>
            </div>
          ))
        }
      </div>
    );
  }

  // 풀 버전
  return (
    <div style={{ background: C.bg, minHeight: "100%" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: mobile ? "16px 16px" : "24px 18px" }}>
        {/* 상단 actions */}
        {notifications.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
            <button onClick={markAllRead} style={{
              padding: "8px 16px", borderRadius: 8,
              background: C.primary, border: "none",
              fontFamily: FL, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "#fff6ef", cursor: "pointer",
              transition: "background 0.15s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.primaryDim}
              onMouseLeave={(e) => e.currentTarget.style.background = C.primary}
            >
              모두 읽음
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 13, color: "#a8a29e", padding: "60px 0", textAlign: "center" }}>불러오는 중...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* 팔로우 요청 */}
            {requests.map((req) => (
              <div key={req.from_user_id} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: mobile ? "12px 14px" : "14px 20px",
                borderRadius: 10, background: C.containerLowest,
                borderLeft: `3px solid ${C.primary}`,
              }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: `linear-gradient(135deg, #595149, #655d54)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FH, fontStyle: "italic", fontSize: 14, color: "#fff6ef",
                  }}>
                    {req.from_nickname?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ position: "absolute", bottom: -3, right: -3, width: 18, height: 18, borderRadius: "50%", background: C.primary, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 10, color: "white", fontVariationSettings: "'FILL' 1" }}>person_add</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <p style={{ margin: 0, fontFamily: FH, fontSize: 13, color: C.onSurface, lineHeight: 1.5 }}>
                      <b>{req.from_nickname}</b>님이 팔로우를 요청했어요
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <ActionBtn label="수락" primary onClick={() => handleAccept(req.from_user_id)} disabled={processingId === req.from_user_id} />
                    <ActionBtn label="거절" onClick={() => handleReject(req.from_user_id)} disabled={processingId === req.from_user_id} />
                  </div>
                </div>
              </div>
            ))}

            {notifications.length === 0 && requests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 14, color: "#a8a29e", margin: 0 }}>아직 알림이 없어요</p>
              </div>
            ) : (
              notifications.map((n) => {
                const ti = TYPE_ICON[n.type] || TYPE_ICON.follow;
                const isUnread = !n.is_read;
                const isFollowType = n.type === "follow" || n.type === "follow_accepted";
                const actorFollowStatus = isFollowType && n.actor_id ? getFollowStatus(n.actor_id) : "none";
                return (
                  <div key={n.id}
                    onClick={() => n.target_place_id && onPlaceClick && onPlaceClick(n.target_place_id)}
                    style={{
                    position: "relative",
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: mobile ? "10px 14px" : "12px 20px",
                    borderRadius: 10,
                    background: isUnread ? C.containerLowest : "transparent",
                    borderLeft: `3px solid ${isUnread ? C.primary : "transparent"}`,
                    transition: "background 0.15s",
                    cursor: n.target_place_id ? "pointer" : "default",
                  }}
                    onMouseEnter={(e) => { if (!isUnread) e.currentTarget.style.background = C.containerLow; }}
                    onMouseLeave={(e) => { if (!isUnread) e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* 삭제 버튼 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      style={{
                        position: "absolute", top: 8, right: 8,
                        width: 20, height: 20, borderRadius: "50%",
                        background: "rgba(47,52,48,0.06)", border: "none",
                        cursor: "pointer", fontSize: 12, color: "#a8a29e",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0, lineHeight: 1,
                        transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(158,66,44,0.1)"; e.currentTarget.style.color = C.error; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(47,52,48,0.06)"; e.currentTarget.style.color = "#a8a29e"; }}
                    >&times;</button>

                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: isUnread ? `linear-gradient(135deg, #595149, #655d54)` : "#e7e5e4",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: FH, fontStyle: "italic", fontSize: 14,
                        color: isUnread ? "#fff6ef" : "#78716c", opacity: isUnread ? 1 : 0.75,
                      }}>
                        {n.actor_nickname?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ position: "absolute", bottom: -3, right: -3, width: 18, height: 18, borderRadius: "50%", background: ti.bg, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", opacity: isUnread ? 1 : 0.5 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 10, color: ti.color, fontVariationSettings: "'FILL' 1" }}>{ti.icon}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, paddingRight: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontFamily: FH, fontSize: 13, color: isUnread ? C.onSurface : "#78716c", lineHeight: 1.6 }}>
                            <b style={{ color: C.onSurface }}>{n.actor_nickname}</b>{TYPE_LABEL[n.type] || "새 알림"}
                          </p>
                          {n.target_place_name && (
                            <p style={{ margin: "2px 0 0", fontFamily: FH, fontStyle: "italic", fontSize: 12, color: C.primary }}>
                              {n.target_place_name}
                            </p>
                          )}
                          <span style={{ fontFamily: FL, fontSize: 9, color: "#a8a29e" }}>{formatTime(n.created_at)}</span>
                        </div>
                        {isFollowType && n.actor_id && n.actor_id !== user?.user_id && (
                          actorFollowStatus === "accepted" ? (
                            <span style={{
                              padding: "5px 10px", borderRadius: 6,
                              border: "1px solid rgba(101,93,84,0.15)",
                              fontFamily: FL, fontSize: 10, fontWeight: 600,
                              color: C.primary, flexShrink: 0,
                              letterSpacing: "0.08em",
                            }}>
                              팔로잉
                            </span>
                          ) : actorFollowStatus === "pending" ? (
                            <span style={{
                              padding: "5px 10px", borderRadius: 6,
                              border: "1px solid rgba(101,93,84,0.15)",
                              fontFamily: FL, fontSize: 10, fontWeight: 600,
                              color: "#8a8e8a", flexShrink: 0,
                              letterSpacing: "0.08em",
                            }}>
                              신청됨
                            </span>
                          ) : (
                            <button
                              onClick={() => handleFollowBack(n.actor_id)}
                              disabled={followLoading === n.actor_id}
                              style={{
                                padding: "5px 12px", borderRadius: 6,
                                background: C.primary,
                                border: "none",
                                fontFamily: FL, fontSize: 10, fontWeight: 700,
                                textTransform: "uppercase", letterSpacing: "0.08em",
                                color: "#fff6ef", cursor: followLoading === n.actor_id ? "not-allowed" : "pointer",
                                flexShrink: 0, transition: "all 0.35s ease",
                              }}
                            >
                              팔로우
                            </button>
                          )
                        )}
                      </div>
                      {n.comment_content && (
                        <div style={{ marginTop: 8, padding: "10px 14px", background: C.container, borderRadius: 6, borderLeft: `2px solid ${C.primaryContainer}` }}>
                          <p style={{ margin: 0, fontFamily: FH, fontStyle: "italic", fontSize: 13, color: "#78716c" }}>"{n.comment_content}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ label, primary, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "7px 18px", border: primary ? "none" : "1px solid rgba(175,179,174,0.3)",
      borderRadius: 6, background: primary ? "#655d54" : "none",
      fontFamily: FL, fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.1em",
      color: primary ? "#fff6ef" : "#78716c", cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 0.15s",
    }}>
      {label}
    </button>
  );
}
