// src/components/ActivityFeed.jsx
// Instagram-style feed — 팔로잉 장소 + 사진 + 후기 카드
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const STATUS_LABEL = { want_to_go: "가고 싶어요", visited: "가봤어요", want_revisit: "또 가고 싶어요" };
const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️" };
const STATUS_COLOR = {
  want_to_go: { bg: "#FEF3CD", color: "#BA7517" },
  visited:    { bg: "#E0F4EC", color: "#1D9E75" },
  want_revisit: { bg: "#FCE4EE", color: "#D4537E" },
};
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
  const sc = STATUS_COLOR[a.place_status];

  return (
    <article style={{
      background: C.containerLowest,
      borderRadius: mobile ? 0 : 14,
      overflow: "hidden",
      boxShadow: mobile ? "none" : "0 1px 8px rgba(47,52,48,0.06)",
    }}>
      {/* 카드 헤더 — 아바타 + 닉네임 + 시간 */}
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
          <p style={{
            margin: 0, fontFamily: FL, fontSize: 12, fontWeight: 700,
            color: C.onSurface,
          }}>
            {a.owner_nickname}
          </p>
          <p style={{
            margin: 0, fontFamily: FL, fontSize: 10, color: C.outlineVariant,
          }}>
            {a.place_category || formatTime(a.created_at)}
          </p>
        </div>
        <span style={{ fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
          {a.place_category ? formatTime(a.created_at) : ""}
        </span>
      </div>

      {/* 사진 영역 */}
      {a.photo_url ? (
        <div
          onClick={() => onPlaceClick && onPlaceClick(a)}
          style={{ cursor: onPlaceClick ? "pointer" : "default" }}
        >
          <img
            src={a.photo_url}
            alt={a.place_name}
            style={{
              width: "100%", height: mobile ? 280 : 340,
              objectFit: "cover", display: "block",
            }}
          />
        </div>
      ) : (
        /* 사진 없으면 장소명 카드 */
        <div
          onClick={() => onPlaceClick && onPlaceClick(a)}
          style={{
            padding: mobile ? "32px 20px" : "40px 24px",
            background: `linear-gradient(135deg, ${C.primaryDim}18, ${C.primary}10)`,
            cursor: onPlaceClick ? "pointer" : "default",
          }}
        >
          <p style={{
            margin: 0, fontFamily: FH, fontStyle: "italic",
            fontSize: mobile ? 22 : 26, color: C.primary,
            textAlign: "center", lineHeight: 1.3,
          }}>
            {a.place_name}
          </p>
          {a.place_address && (
            <p style={{
              margin: "8px 0 0", fontFamily: FL, fontSize: 11,
              color: C.outlineVariant, textAlign: "center",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
              {a.place_address}
            </p>
          )}
        </div>
      )}

      {/* 하단 콘텐츠 */}
      <div style={{ padding: "12px 16px 14px" }}>
        {/* 상태 뱃지 + 별점 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: a.memo ? 8 : 4 }}>
          <span style={{
            fontFamily: FL, fontSize: 11, fontWeight: 600,
            padding: "3px 8px", borderRadius: 5,
            background: sc?.bg || C.surfaceLow,
            color: sc?.color || C.onSurfaceVariant,
          }}>
            {STATUS_EMOJI[a.place_status]} {STATUS_LABEL[a.place_status] || a.place_status}
          </span>
          {a.rating > 0 && (
            <span style={{
              fontFamily: FL, fontSize: 11, padding: "3px 8px",
              background: C.primaryContainer, color: C.primary,
              borderRadius: 5, fontWeight: 600,
            }}>
              {"★".repeat(a.rating)}{"☆".repeat(5 - a.rating)}
            </span>
          )}
          {a.photo_url && (
            <span style={{
              fontFamily: FH, fontSize: 13, fontWeight: 600,
              color: C.onSurface, marginLeft: 2,
            }}>
              {a.place_name}
            </span>
          )}
        </div>

        {/* 메모 — 후기 */}
        {a.memo && (
          <p style={{
            margin: "0 0 8px", fontFamily: FH, fontStyle: "italic",
            fontSize: 13, color: C.onSurfaceVariant,
            lineHeight: 1.7,
          }}>
            "{a.memo}"
          </p>
        )}

        {/* 액션 바 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {a.like_count > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>favorite</span>
              {a.like_count}
            </span>
          )}
          {a.comment_count > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat_bubble_outline</span>
              {a.comment_count}
            </span>
          )}
          {onPlaceClick && (
            <button
              onClick={() => onPlaceClick(a)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer",
                fontFamily: FL, fontSize: 10, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: C.outlineVariant, padding: 0,
                marginLeft: "auto",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = C.primary}
              onMouseLeave={(e) => e.currentTarget.style.color = C.outlineVariant}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
              지도에서 보기
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr), diff = Math.floor((new Date() - d) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
