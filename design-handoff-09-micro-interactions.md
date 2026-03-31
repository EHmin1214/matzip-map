# 디자인 인수인계서 — #9 마이크로 인터랙션 (토스트 피드백)

---

## 디자인 방향

작업 완료 시 조용하지만 명확한 피드백을 제공합니다. 서비스 톤에 맞게 작고 부드러운 토스트를 사용합니다.

---

## 수정 1: 공통 Toast 컴포넌트 생성

**파일:** `frontend/src/components/Toast.jsx` (신규)

**역할:** App.js 레벨에서 관리하는 재사용 가능한 토스트 알림

**스타일:**

```
위치: fixed, 화면 하단 중앙
  - 모바일: bottom: 80px (탭바 위)
  - 데스크톱: bottom: 32px

모양:
  - background: #655d54 (primary)
  - color: #fff6ef
  - padding: 10px 20px
  - borderRadius: 999px (pill)
  - fontFamily: Manrope
  - fontSize: 13px
  - fontWeight: 600
  - boxShadow: 0 4px 16px rgba(47,52,48,0.15)

애니메이션:
  - 등장: fadeUp (opacity 0→1, translateY 8px→0, 0.25s ease-out)
  - 퇴장: fade-out (opacity 1→0, 0.2s ease) — 2초 후 자동
  - 총 노출 시간: 2초
```

**컴포넌트 인터페이스:**

```jsx
// App.js에서 사용
const [toast, setToast] = useState(null);

// 토스트 표시
setToast("저장됐어요");

// 컴포넌트
<Toast message={toast} onClose={() => setToast(null)} />
```

**구현 참고:**
- `message`가 null이 아니면 렌더
- 내부에서 2초 타이머 후 `onClose()` 호출
- 새 메시지가 들어오면 타이머 리셋
- `left: "50%"`, `transform: "translateX(-50%)"` 로 중앙 정렬
- `zIndex: 9000` (모달보다는 낮게, 일반 UI보다는 높게)
- `pointerEvents: "none"` — 토스트가 아래 요소 클릭을 방해하지 않도록

---

## 수정 2: 장소 저장 성공 시 토스트

**파일:** `frontend/src/App.js` — SavePlaceModal의 onSave 콜백 영역

**현재 문제:** 장소 저장 성공 시 모달이 닫히기만 하고 피드백 없음

**변경 사항:**

장소 저장(신규/수정) 성공 후 토스트 표시:
- 신규 저장: `"저장됐어요"`
- 수정 완료: `"수정됐어요"`
- 삭제 완료: `"삭제됐어요"`

App.js에서 `handleSavePlace` 등의 콜백에서 `setToast("저장됐어요")` 호출.

---

## 수정 3: 팔로우 성공/취소 시 토스트

**파일:** 팔로우 기능이 있는 컴포넌트 (`SearchTab.jsx`, `UserProfileView.jsx` 등)

**변경 사항:**

- 팔로우 요청 성공: `"팔로우 요청을 보냈어요"` (비공개 계정) 또는 `"팔로우했어요"` (공개 계정)
- 팔로우 취소: `"팔로우를 취소했어요"`

이 컴포넌트들에서 토스트를 사용하려면 `setToast`를 prop으로 내려주거나, App.js에서 콜백을 관리해야 합니다. 기존 코드 구조에 맞게 판단하여 구현하세요.

---

## 수정하지 않는 것

- 좋아요 하트 애니메이션 유지 (이미 잘 되어 있음)
- 더블탭 좋아요 오버레이 유지
- 링크 복사 시 "복사됨" 텍스트 변환 유지 (토스트 불필요)
- 에러 시 기존 alert/인라인 에러 메시지 방식 유지
