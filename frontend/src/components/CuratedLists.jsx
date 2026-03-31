// src/components/CuratedLists.jsx
// 큐레이션 리스트 — 생성, 조회, 공유
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import { STATUS_EMOJI } from "../constants";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54", primaryDim: "#595149",
  bg: "#faf9f6", surfaceLow: "#f4f4f0",
  container: "#edeeea", containerLowest: "#ffffff",
  onSurface: "#2f3430", onSurfaceVariant: "#5c605c",
  outlineVariant: "#afb3ae", primaryContainer: "#ede0d5",
};

export default function CuratedLists({ personalPlaces = [] }) {
  const { user } = useUser();
  const mobile = window.innerWidth <= 768;
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedPlaces, setSelectedPlaces] = useState(new Set());
  const [expandedList, setExpandedList] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/lists/?user_id=${user.user_id}`)
      .then((res) => setLists(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/lists/?user_id=${user.user_id}`, {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        place_ids: [...selectedPlaces],
      });
      setLists((prev) => [res.data, ...prev]);
      setCreating(false);
      setNewTitle(""); setNewDesc(""); setSelectedPlaces(new Set());
    } catch (e) { alert(e.response?.data?.detail || "생성 실패"); }
  };

  const handleDelete = async (listId) => {
    try {
      await axios.delete(`${API_BASE}/lists/${listId}?user_id=${user.user_id}`);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    } catch (e) {}
  };

  const handleShare = (listId) => {
    const url = `${API_BASE}/og/list/${listId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(listId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleExpand = async (listId) => {
    if (expandedList?.id === listId) { setExpandedList(null); return; }
    try {
      const res = await axios.get(`${API_BASE}/lists/${listId}`);
      setExpandedList(res.data);
    } catch (e) {}
  };

  const togglePlace = (placeId) => {
    setSelectedPlaces((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  return (
    <div style={{ padding: mobile ? "16px" : "0" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: FH, fontSize: 18, fontWeight: 400, color: C.onSurface }}>
            큐레이션 리스트
          </h3>
          <p style={{ margin: "4px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant, letterSpacing: "0.1em" }}>
            테마별 장소 모음을 만들고 공유하세요
          </p>
        </div>
        <button onClick={() => setCreating(!creating)} style={{
          padding: "8px 16px", border: "none", borderRadius: 8,
          background: creating ? C.container : C.primary,
          color: creating ? C.onSurfaceVariant : "#fff6ef",
          fontFamily: FL, fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>
          {creating ? "취소" : "+ 새 리스트"}
        </button>
      </div>

      {/* 새 리스트 만들기 */}
      {creating && (
        <div style={{
          background: C.containerLowest, borderRadius: 12, padding: 20,
          marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="리스트 제목 (예: 강남 데이트 코스)"
            style={{
              width: "100%", padding: "12px", background: C.surfaceLow,
              border: "none", borderRadius: 8, fontFamily: FL, fontSize: 14,
              color: C.onSurface, boxSizing: "border-box", marginBottom: 10,
            }}
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="설명 (선택)"
            style={{
              width: "100%", padding: "10px 12px", background: C.surfaceLow,
              border: "none", borderRadius: 8, fontFamily: FL, fontSize: 12,
              color: C.onSurface, boxSizing: "border-box", marginBottom: 14,
            }}
          />
          <p style={{ margin: "0 0 8px", fontFamily: FL, fontSize: 10, fontWeight: 700, color: C.outlineVariant, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            장소 선택 ({selectedPlaces.size}곳)
          </p>
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 14 }}>
            {personalPlaces.map((p) => (
              <label key={p.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 6px", cursor: "pointer",
                borderBottom: `1px solid ${C.container}`,
              }}>
                <input
                  type="checkbox"
                  checked={selectedPlaces.has(p.id)}
                  onChange={() => togglePlace(p.id)}
                  style={{ accentColor: C.primary }}
                />
                <span style={{ fontFamily: FL, fontSize: 12, color: C.onSurface }}>
                  {STATUS_EMOJI[p.status]} {p.name}
                </span>
              </label>
            ))}
          </div>
          <button onClick={handleCreate} disabled={!newTitle.trim()} style={{
            width: "100%", padding: "12px", border: "none", borderRadius: 8,
            background: newTitle.trim() ? C.primary : C.container,
            color: newTitle.trim() ? "#fff6ef" : C.outlineVariant,
            fontFamily: FL, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            리스트 만들기
          </button>
        </div>
      )}

      {/* 리스트 목록 */}
      {loading ? (
        <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 13, color: C.outlineVariant }}>불러오는 중...</p>
      ) : lists.length === 0 && !creating ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#d6d3d1", display: "block", marginBottom: 12 }}>bookmark</span>
          <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 14, color: C.outlineVariant }}>
            아직 리스트가 없어요
          </p>
          <p style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>
            테마별로 장소를 모아보세요
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lists.map((list) => (
            <div key={list.id} style={{
              background: C.containerLowest, borderRadius: 12,
              overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div
                onClick={() => toggleExpand(list.id)}
                style={{
                  padding: "14px 16px", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                <div>
                  <p style={{ margin: 0, fontFamily: FH, fontSize: 15, fontWeight: 600, color: C.onSurface }}>
                    {list.title}
                  </p>
                  <p style={{ margin: "3px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
                    {list.item_count}곳 {list.description ? `· ${list.description}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); handleShare(list.id); }} style={{
                    background: copiedId === list.id ? C.primaryContainer : C.surfaceLow,
                    border: "none", borderRadius: 6, padding: "6px 10px",
                    fontFamily: FL, fontSize: 10, fontWeight: 600, cursor: "pointer",
                    color: copiedId === list.id ? C.primary : C.onSurfaceVariant,
                  }}>
                    {copiedId === list.id ? "복사됨" : "공유"}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(list.id); }} style={{
                    background: "none", border: "none", cursor: "pointer", padding: "6px",
                    color: C.outlineVariant,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
              </div>

              {/* 확장된 장소 목록 */}
              {expandedList?.id === list.id && expandedList.places && (
                <div style={{ borderTop: `1px solid ${C.container}`, padding: "8px 0" }}>
                  {expandedList.places.map((p) => (
                    <div key={p.id} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12 }}>{STATUS_EMOJI[p.status]}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontFamily: FH, fontSize: 13, color: C.onSurface }}>{p.name}</p>
                        {p.note && <p style={{ margin: "2px 0 0", fontFamily: FH, fontStyle: "italic", fontSize: 11, color: C.outlineVariant }}>"{p.note}"</p>}
                      </div>
                      {p.rating > 0 && (
                        <span style={{ fontFamily: FL, fontSize: 10, color: C.primary }}>{"★".repeat(p.rating)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
