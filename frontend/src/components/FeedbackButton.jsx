// src/components/FeedbackButton.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54",
  bg: "#faf9f6",
  container: "#edeeea",
  containerLow: "#f4f4f0",
  onSurface: "#2f3430",
  outlineVariant: "#8a8e8a",
};

export default function FeedbackButton() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [items, setItems] = useState([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  const load = () =>
    axios.get(`${API_BASE}/feedback/`).then((r) => setItems(r.data)).catch(() => {});

  useEffect(() => {
    if (open) { load(); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [open]);

  const submit = () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    axios
      .post(`${API_BASE}/feedback/`, { nickname: user?.nickname || null, body: text })
      .then(() => { setBody(""); load(); })
      .finally(() => setSending(false));
  };

  const timeAgo = (d) => {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return "방금";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  return (
    <>
      {/* 버튼 */}
      <button
        onClick={() => setOpen(true)}
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(250,249,246,0.92)",
          border: "1px solid rgba(101,93,84,0.12)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="이슈/아이디어 보고"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.primary }}>
          campaign
        </span>
      </button>

      {/* 모달 */}
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={{
            background: C.bg, borderRadius: 16,
            width: "100%", maxWidth: 420, maxHeight: "80vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}>
            {/* 헤더 */}
            <div style={{
              padding: "18px 20px 12px",
              borderBottom: `1px solid ${C.container}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <h2 style={{
                margin: 0, fontFamily: FH, fontStyle: "italic",
                fontSize: 17, color: C.primary, letterSpacing: "-0.02em",
              }}>
                Feedback
              </h2>
              <button onClick={() => setOpen(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 4, display: "flex",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: C.outlineVariant }}>close</span>
              </button>
            </div>

            {/* 입력 */}
            <div style={{ padding: "14px 20px 10px" }}>
              <textarea
                ref={inputRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="이슈, 버그, 아이디어 자유롭게 적어주세요..."
                rows={3}
                style={{
                  width: "100%", padding: "10px 12px",
                  background: C.containerLow, border: "none", borderRadius: 10,
                  fontFamily: FL, color: C.onSurface, resize: "vertical",
                  outline: "none", boxSizing: "border-box", lineHeight: 1.5,
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  onClick={submit}
                  disabled={!body.trim() || sending}
                  style={{
                    padding: "6px 16px", borderRadius: 8,
                    background: body.trim() ? C.primary : C.container,
                    color: body.trim() ? "#fff" : C.outlineVariant,
                    border: "none", fontFamily: FL, fontSize: 12, fontWeight: 600,
                    cursor: body.trim() ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}
                >
                  {sending ? "전송 중..." : "보내기"}
                </button>
              </div>
            </div>

            {/* 목록 */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "0 20px 16px",
              borderTop: `1px solid ${C.container}`,
            }}>
              <p style={{
                fontFamily: FL, fontSize: 9, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.12em",
                color: C.outlineVariant, margin: "12px 0 8px",
              }}>
                Recent
              </p>
              {items.length === 0 && (
                <p style={{ fontFamily: FL, fontSize: 12, color: C.outlineVariant }}>
                  아직 피드백이 없습니다
                </p>
              )}
              {items.map((fb) => (
                <div key={fb.id} style={{
                  padding: "10px 0",
                  borderBottom: `1px solid ${C.container}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontFamily: FL, fontSize: 11, fontWeight: 600,
                      color: C.primary,
                    }}>
                      {fb.nickname || "익명"}
                    </span>
                    <span style={{ fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
                      {timeAgo(fb.created_at)}
                    </span>
                  </div>
                  <p style={{
                    margin: 0, fontFamily: FL, fontSize: 12,
                    color: C.onSurface, lineHeight: 1.5,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {fb.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
