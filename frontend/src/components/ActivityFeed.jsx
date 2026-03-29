// src/components/ActivityFeed.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎" };
const STATUS_LABEL = { want_to_go: "가고 싶어요", visited: "가봤어요", want_revisit: "또 가고 싶어요", not_recommended: "별로였어요" };

const isMobile = () => window.innerWidth <= 768;

export default function ActivityFeed({ embedded = false, onPlaceClick }) {
  const { user } = useUser();
  const mobile = isMobile();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/activity-feed?user_id=${user.user_id}`)
      .then((res) => setActivities(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const containerStyle = embedded
    ? { height: "100%", overflowY: "auto", background: "white" }
    : {
        position: "fixed", inset: 0, background: "#f8f8f8",
        overflowY: "auto", paddingBottom: mobile ? 80 : 0, zIndex: 20,
        WebkitOverflowScrolling: "touch",
      };

  return (
    <div style={containerStyle}>
      {!embedded && (
        <div style={{ background: "white", padding: "16px 20px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#222" }}>활동 피드</h2>
        </div>
      )}
      {embedded && <p style={{ fontSize: 12, fontWeight: 700, color: "#888", padding: "12px 12px 6px" }}>팔로잉 활동</p>}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#ccc" }}>불러오는 중...</div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <p style={{ fontSize: 15 }}>팔로잉한 사람들의 활동이 없어요</p>
        </div>
      ) : (
        <div style={{ padding: embedded ? "0 8px 8px" : "8px 0" }}>
          {activities.map((a, idx) => (
            <div
              key={`${a.place_id}-${idx}`}
              onClick={() => onPlaceClick && onPlaceClick(a)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: embedded ? "12px 8px" : mobile ? "16px 20px" : "14px 20px",
                borderBottom: "1px solid #f5f5f5",
                cursor: onPlaceClick ? "pointer" : "default",
                minHeight: 60,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{
                width: embedded ? 38 : 46, height: embedded ? 38 : 46,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #E8593C, #ff8a65)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: embedded ? 15 : 19, color: "white", fontWeight: 700, flexShrink: 0,
              }}>
                {a.owner_nickname?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: embedded ? 13 : 14, color: "#333", lineHeight: 1.4 }}>
                  <b>{a.owner_nickname}</b>님이{" "}
                  <span style={{ color: "#E8593C", fontWeight: 600 }}>{a.place_name}</span>을(를){" "}
                  <span style={{ color: "#555" }}>{STATUS_EMOJI[a.place_status]} {STATUS_LABEL[a.place_status]}</span>에 추가했어요
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#bbb" }}>{formatTime(a.created_at)}</p>
              </div>
              {onPlaceClick && <span style={{ fontSize: 18, color: "#ddd", flexShrink: 0 }}>›</span>}
            </div>
          ))}
        </div>
      )}
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
