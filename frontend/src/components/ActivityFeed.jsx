// src/components/ActivityFeed.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const STATUS_LABEL = { want_to_go: "가고 싶어요", visited: "가봤어요", want_revisit: "또 가고 싶어요", not_recommended: "별로였어요" };
const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎" };
const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = { primary: "#655d54", primaryDim: "#595149", bg: "#faf9f6", container: "#edeeea", containerLowest: "#ffffff", onSurface: "#2f3430" };

const isMobile = () => window.innerWidth <= 768;

export default function ActivityFeed({ embedded = false, onPlaceClick, noHeader = false }) {
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

  // 풀 버전
  return (
    <div style={{ background: C.bg, minHeight: "100%" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: mobile ? "24px 20px" : "40px 40px" }}>
        {loading ? (
          <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 16, color: "#a8a29e", padding: "60px 0", textAlign: "center" }}>불러오는 중...</p>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 20, color: "#a8a29e", margin: "0 0 10px" }}>아직 활동이 없어요</p>
            <p style={{ fontFamily: FL, fontSize: 11, color: "#a8a29e", letterSpacing: "0.08em" }}>팔로우를 시작해보세요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
            {activities.map((a, idx) => (
              <article key={idx} style={{ display: "flex", gap: mobile ? 16 : 24, alignItems: "flex-start" }}>
                {/* 아바타 */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{
                    width: mobile ? 40 : 52, height: mobile ? 40 : 52, borderRadius: "50%",
                    background: `linear-gradient(135deg, #595149, #655d54)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FH, fontStyle: "italic",
                    fontSize: mobile ? 16 : 20, color: "#fff6ef", fontWeight: 700,
                  }}>
                    {a.owner_nickname?.[0]?.toUpperCase()}
                  </div>
                </div>

                {/* 본문 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FL, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: C.primary }}>
                      {a.owner_nickname}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#c7c4bf" }} />
                    <span style={{ fontFamily: FL, fontSize: 10, color: "#a8a29e" }}>{formatTime(a.created_at)}</span>
                  </div>

                  <p style={{
                    fontFamily: FH, fontSize: mobile ? 17 : 21,
                    fontWeight: 400, color: C.onSurface,
                    margin: "0 0 16px", lineHeight: 1.4,
                  }}>
                    <span style={{ fontStyle: "italic", color: "#595149" }}>{a.place_name}</span>을(를){" "}
                    {STATUS_EMOJI[a.place_status]} <span style={{ color: "#595149" }}>{STATUS_LABEL[a.place_status]}</span>에 추가했어요
                  </p>

                  {/* 카드 */}
                  <div
                    onClick={() => onPlaceClick && onPlaceClick(a)}
                    style={{
                      background: C.containerLowest, borderRadius: 10, overflow: "hidden",
                      cursor: onPlaceClick ? "pointer" : "default",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => { if (onPlaceClick) e.currentTarget.style.background = "#f4f4f0"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = C.containerLowest; }}
                  >
                    <div style={{ padding: mobile ? "14px 16px" : "20px 24px" }}>
                      {a.place_address && (
                        <p style={{ margin: "0 0 8px", fontFamily: FL, fontSize: 11, color: "#a8a29e", display: "flex", alignItems: "center", gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
                          {a.place_address}
                        </p>
                      )}
                      {a.memo && (
                        <p style={{ margin: "0 0 14px", fontFamily: FH, fontStyle: "italic", fontSize: 14, color: "#78716c", lineHeight: 1.7 }}>
                          {a.memo}
                        </p>
                      )}
                      {onPlaceClick && (
                        <button style={{
                          display: "flex", alignItems: "center", gap: 5,
                          background: "none", border: "none", cursor: "pointer",
                          fontFamily: FL, fontSize: 10, fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.12em",
                          color: "#a8a29e", padding: 0, transition: "color 0.15s",
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.color = C.primary}
                          onMouseLeave={(e) => e.currentTarget.style.color = "#a8a29e"}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                          지도에서 보기
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && activities.length > 0 && (
          <div style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${C.container}`, textAlign: "center" }}>
            <p style={{ fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: "#c7c4bf" }}>
              End of recent archive
            </p>
          </div>
        )}
      </div>
    </div>
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
