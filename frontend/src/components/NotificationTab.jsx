// src/components/NotificationTab.jsx
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const TYPE_INFO = {
  like:    { emoji: "❤️", label: "님이 회원님의 맛집을 좋아해요" },
  comment: { emoji: "💬", label: "님이 댓글을 남겼어요" },
  follow:  { emoji: "👤", label: "님이 팔로우하기 시작했어요" },
};

export default function NotificationTab({ embedded = false, onUnreadChange }) {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/notifications/?user_id=${user.user_id}`)
      .then((res) => {
        setNotifications(res.data);
        const unread = res.data.filter((n) => !n.is_read).length;
        if (onUnreadChange) onUnreadChange(unread);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, onUnreadChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    try {
      await axios.patch(`${API_BASE}/notifications/read?user_id=${user.user_id}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onUnreadChange) onUnreadChange(0);
    } catch (e) {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const containerStyle = embedded
    ? { height: "100%", overflowY: "auto", background: "white" }
    : {
        position: "fixed", inset: 0,
        background: "#f8f8f8", overflowY: "auto",
        paddingBottom: 80, zIndex: 20,
      };

  return (
    <div style={containerStyle}>
      {/* 헤더 */}
      {!embedded && (
        <div style={{
          background: "white", padding: "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#222" }}>알림</h2>
            {unreadCount > 0 && (
              <span style={{
                background: "#E8593C", color: "white",
                borderRadius: 10, padding: "2px 8px",
                fontSize: 12, fontWeight: 700,
              }}>{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                background: "none", border: "none",
                fontSize: 13, color: "#E8593C", cursor: "pointer", fontWeight: 600,
              }}
            >
              모두 읽음
            </button>
          )}
        </div>
      )}

      {/* 임베드 헤더 */}
      {embedded && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 12px 8px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#555" }}>알림</span>
            {unreadCount > 0 && (
              <span style={{
                background: "#E8593C", color: "white",
                borderRadius: 8, padding: "1px 6px",
                fontSize: 11, fontWeight: 700,
              }}>{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                background: "none", border: "none",
                fontSize: 11, color: "#E8593C", cursor: "pointer", fontWeight: 600,
              }}
            >모두 읽음</button>
          )}
        </div>
      )}

      {/* 알림 목록 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#ccc" }}>불러오는 중...</div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#bbb" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
          <p style={{ fontSize: 14 }}>아직 알림이 없어요</p>
        </div>
      ) : (
        <div style={{ padding: embedded ? "0 8px" : "8px 0" }}>
          {notifications.map((n) => {
            const info = TYPE_INFO[n.type] || { emoji: "📢", label: "새 알림이 있어요" };
            return (
              <div
                key={n.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: embedded ? "10px 8px" : "14px 20px",
                  background: n.is_read ? "transparent" : "#fff8f6",
                  borderLeft: n.is_read ? "3px solid transparent" : "3px solid #E8593C",
                  borderBottom: "1px solid #f5f5f5",
                  transition: "background 0.2s",
                }}
              >
                {/* 이모지 */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: n.is_read ? "#f5f5f5" : "#fff0ed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0,
                }}>
                  {info.emoji}
                </div>

                {/* 내용 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.4 }}>
                    <b>{n.actor_nickname}</b>
                    {info.label}
                    {n.target_place_name && (
                      <span style={{ color: "#E8593C" }}> — {n.target_place_name}</span>
                    )}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: "#bbb" }}>
                    {formatTime(n.created_at)}
                  </p>
                </div>

                {/* 읽지 않은 점 */}
                {!n.is_read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#E8593C", flexShrink: 0, marginTop: 4,
                  }} />
                )}
              </div>
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
