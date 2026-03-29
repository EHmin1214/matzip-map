// src/components/NotificationTab.jsx
// 디자인: desktop_3.html (Notifications) 기반
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary:    "#655d54",
  primaryDim: "#595149",
  primaryContainer: "#ede0d5",
  bg:         "#faf9f6",
  container:  "#edeeea",
  containerLowest: "#ffffff",
  containerLow: "#f4f4f0",
  onSurface:  "#2f3430",
  tertiary:   "#685f39",
};

const isMobile = () => window.innerWidth <= 768;

export default function NotificationTab({ embedded = false, onUnreadChange }) {
  const { user } = useUser();
  const mobile = isMobile();
  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchAll = useCallback(() => {
    if (!user) return;
    Promise.all([
      axios.get(`${API_BASE}/notifications/?user_id=${user.user_id}`),
      axios.get(`${API_BASE}/follows/requests/${user.user_id}`),
    ]).then(([notifRes, reqRes]) => {
      setNotifications(notifRes.data);
      setRequests(reqRes.data);
      const unread = notifRes.data.filter((n) => !n.is_read).length;
      if (onUnreadChange) onUnreadChange(unread);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, onUnreadChange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const markAllRead = async () => {
    try {
      await axios.patch(`${API_BASE}/notifications/read?user_id=${user.user_id}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onUnreadChange) onUnreadChange(0);
    } catch (e) {}
  };

  const handleAccept = async (fromId) => {
    setProcessingId(fromId);
    try {
      await axios.post(`${API_BASE}/follows/requests/${fromId}/accept?user_id=${user.user_id}`);
      setRequests((prev) => prev.filter((r) => r.from_user_id !== fromId));
      fetchAll();
    } catch (e) {} finally { setProcessingId(null); }
  };

  const handleReject = async (fromId) => {
    setProcessingId(fromId);
    try {
      await axios.post(`${API_BASE}/follows/requests/${fromId}/reject?user_id=${user.user_id}`);
      setRequests((prev) => prev.filter((r) => r.from_user_id !== fromId));
    } catch (e) {} finally { setProcessingId(null); }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getTypeIcon = (type) => {
    const icons = { follow: "person", follow_request: "person_add", follow_accepted: "check", like: "favorite", comment: "chat_bubble" };
    const colors = { follow: C.container, follow_request: C.primary, follow_accepted: C.primary, like: C.primaryContainer, comment: C.tertiary };
    return { icon: icons[type] || "notifications", bg: colors[type] || C.container };
  };

  const getTypeLabel = (type) => ({
    follow: "님이 팔로우하기 시작했어요",
    follow_request: "님이 팔로우를 요청했어요",
    follow_accepted: "님이 팔로우 요청을 수락했어요",
    like: "님이 맛집을 좋아해요",
    comment: "님이 댓글을 남겼어요",
  }[type] || "새 알림");

  if (embedded) {
    return (
      <div style={{ height: "100%", overflowY: "auto", background: C.bg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 12px 8px" }}>
          <span style={{ fontFamily: FL, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e" }}>알림</span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: "none", border: "none", fontFamily: FL, fontSize: 10, color: C.primary, cursor: "pointer", fontWeight: 600 }}>
              모두 읽음
            </button>
          )}
        </div>
        {loading ? (
          <p style={{ fontFamily: FL, fontSize: 12, color: "#a8a29e", padding: "8px 12px" }}>...</p>
        ) : notifications.slice(0, 5).map((n) => {
          const { icon, bg } = getTypeIcon(n.type);
          return (
            <div key={n.id} style={{
              padding: "10px 12px",
              background: n.is_read ? "transparent" : `${C.primaryContainer}60`,
              borderLeft: n.is_read ? "2px solid transparent" : `2px solid ${C.primary}`,
              borderBottom: `1px solid ${C.container}`,
            }}>
              <p style={{ margin: 0, fontFamily: FH, fontSize: 12, color: C.onSurface, lineHeight: 1.5 }}>
                <b>{n.actor_nickname}</b>{getTypeLabel(n.type)}
                {n.target_place_name && <span style={{ fontStyle: "italic", color: C.primary }}> — {n.target_place_name}</span>}
              </p>
              <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 9, color: "#a8a29e" }}>{formatTime(n.created_at)}</p>
            </div>
          );
        })}
      </div>
    );
  }

  // 풀스크린 — desktop_3.html 레이아웃
  return (
    <div style={{
      flex: 1, minHeight: "100vh", background: C.bg, overflowY: "auto",
      paddingBottom: mobile ? 80 : 48,
    }}>
      {/* 상단 헤더 (PC) */}
      {!mobile && (
        <header style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(250,249,246,0.85)", backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.container}`,
          padding: "14px 40px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h1 style={{ fontFamily: FH, fontStyle: "italic", fontSize: 22, color: C.primary, margin: 0 }}>My Space</h1>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{
              background: "none", border: "none", fontFamily: FL, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: C.primary, cursor: "pointer",
            }}>모두 읽음으로</button>
          )}
        </header>
      )}

      <div style={{ maxWidth: 800, margin: "0 auto", padding: mobile ? "20px 16px" : "48px 40px" }}>
        {/* 에디토리얼 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{
              fontFamily: FH, fontSize: mobile ? 36 : 52,
              fontWeight: 400, color: C.onSurface,
              margin: "0 0 8px", letterSpacing: "-0.02em",
            }}>
              Notifications
            </h2>
            <div style={{ width: 40, height: 3, background: C.primaryContainer }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#a8a29e", fontWeight: 700, margin: "0 0 3px" }}>Updated</p>
            <p style={{ fontFamily: FL, fontSize: 12, color: "#78716c", margin: 0 }}>
              {new Date().toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>

        {loading ? (
          <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 16, color: "#a8a29e", textAlign: "center", padding: "60px 0" }}>불러오는 중...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* 팔로우 요청 (unread 스타일) */}
            {requests.map((req) => (
              <div key={req.from_user_id} style={{
                display: "flex", alignItems: "flex-start", gap: 20,
                padding: mobile ? "16px" : "24px",
                borderRadius: 12,
                background: C.containerLowest,
                borderLeft: `4px solid ${C.primary}`,
                transition: "background 0.2s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.bg}
                onMouseLeave={(e) => e.currentTarget.style.background = C.containerLowest}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FH, fontStyle: "italic", fontSize: 18, color: "#fff6ef",
                  }}>
                    {req.from_nickname?.[0]?.toUpperCase()}
                  </div>
                  <div style={{
                    position: "absolute", bottom: -4, right: -4,
                    width: 22, height: 22, borderRadius: "50%",
                    background: C.primary, border: "2px solid white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12, color: "white", fontVariationSettings: "'FILL' 1" }}>person_add</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <p style={{ margin: "0 0 14px", fontFamily: FH, fontSize: mobile ? 15 : 17, color: C.onSurface, lineHeight: 1.5 }}>
                      <b>{req.from_nickname}</b>님이 팔로우를 요청했어요
                    </p>
                    <span style={{ fontFamily: FL, fontSize: 10, color: "#a8a29e", whiteSpace: "nowrap" }}>방금</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => handleAccept(req.from_user_id)} disabled={processingId === req.from_user_id}
                      style={{
                        padding: "8px 20px", background: C.primary, color: "#fff6ef",
                        border: "none", borderRadius: 6,
                        fontFamily: FL, fontSize: 10, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = C.primaryDim}
                      onMouseLeave={(e) => e.currentTarget.style.background = C.primary}
                    >수락</button>
                    <button onClick={() => handleReject(req.from_user_id)} disabled={processingId === req.from_user_id}
                      style={{
                        padding: "8px 20px", background: "none",
                        border: "1px solid rgba(175,179,174,0.3)", borderRadius: 6,
                        fontFamily: FL, fontSize: 10, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.1em",
                        color: "#78716c", cursor: "pointer",
                      }}
                    >거절</button>
                  </div>
                </div>
              </div>
            ))}

            {/* 일반 알림 */}
            {notifications.length === 0 && requests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 20, color: "#a8a29e", margin: "0 0 8px" }}>아직 알림이 없어요</p>
              </div>
            ) : (
              notifications.map((n) => {
                const { icon, bg } = getTypeIcon(n.type);
                const isUnread = !n.is_read;
                return (
                  <div key={n.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 20,
                    padding: mobile ? "14px" : "24px",
                    borderRadius: 12,
                    background: isUnread ? C.containerLowest : "transparent",
                    borderLeft: isUnread ? `4px solid ${C.primary}` : "4px solid transparent",
                    transition: "background 0.2s",
                  }}
                    onMouseEnter={(e) => { if (!isUnread) e.currentTarget.style.background = C.containerLow; }}
                    onMouseLeave={(e) => { if (!isUnread) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: isUnread
                          ? `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`
                          : "#e7e5e4",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: FH, fontStyle: "italic", fontSize: 18,
                        color: isUnread ? "#fff6ef" : "#78716c",
                        opacity: isUnread ? 1 : 0.8,
                      }}>
                        {n.actor_nickname?.[0]?.toUpperCase()}
                      </div>
                      <div style={{
                        position: "absolute", bottom: -4, right: -4,
                        width: 22, height: 22, borderRadius: "50%",
                        background: bg,
                        border: "2px solid white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: isUnread ? 1 : 0.5,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: isUnread ? "white" : C.primary, fontVariationSettings: "'FILL' 1" }}>
                          {icon}
                        </span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <p style={{
                          margin: 0, fontFamily: FH, fontSize: mobile ? 14 : 16,
                          color: isUnread ? C.onSurface : "#78716c", lineHeight: 1.6,
                        }}>
                          <b style={{ color: C.onSurface }}>{n.actor_nickname}</b>{getTypeLabel(n.type)}
                          {n.target_place_name && (
                            <span style={{ fontStyle: "italic" }}> — {n.target_place_name}</span>
                          )}
                        </p>
                        <span style={{ fontFamily: FL, fontSize: 10, color: "#a8a29e", whiteSpace: "nowrap", marginLeft: 12 }}>
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      {n.comment_content && (
                        <div style={{
                          marginTop: 10, padding: "12px 16px",
                          background: C.container, borderRadius: 8,
                          borderLeft: `2px solid ${C.primaryContainer}`,
                        }}>
                          <p style={{ margin: 0, fontFamily: FH, fontStyle: "italic", fontSize: 13, color: "#78716c" }}>
                            "{n.comment_content}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* 하단 */}
            {!loading && (notifications.length > 0 || requests.length > 0) && (
              <div style={{ marginTop: 60, paddingTop: 24, borderTop: `1px solid ${C.container}`, textAlign: "center" }}>
                <p style={{ fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: "#a8a29e" }}>
                  End of recent archive
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
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
