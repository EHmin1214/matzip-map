# 디자인 인수인계서 — #8 접근성 개선

---

## 디자인 방향

시각적 계층을 유지하면서 실용적인 수준의 접근성을 확보합니다. 완벽한 WCAG AA 준수보다는 실제 가독성과 스크린리더 기본 지원에 집중합니다.

---

## 수정 1: outlineVariant 색상 대비 개선

**파일:** 프로젝트 전체에서 `#afb3ae`를 사용하는 곳

**현재 문제:**
- `#afb3ae` on `#faf9f6` = **2.02:1** (WCAG AA 기준 4.5:1 미달)
- 이 색상이 타임스탬프, 주소, 카테고리, 힌트 텍스트 등에 사용됨
- 장식적 텍스트이므로 엄격한 AA는 불필요하지만, 현재는 너무 연함

**변경 사항:**

| 위치 | 현재 | 변경 |
|------|------|------|
| 디자인 토큰 `outlineVariant` | `#afb3ae` | **`#8a8e8a`** |

`#8a8e8a` on `#faf9f6` = 약 **3.5:1** (큰 텍스트 AA 통과, 일반 텍스트는 약간 미달이지만 장식적 텍스트로서 충분)

**적용 대상 (전체 치환):**

각 컴포넌트의 `C` 객체에서 `outlineVariant: "#afb3ae"` → `"#8a8e8a"`로 변경. 해당 컴포넌트 목록:

- `FeedTab.jsx`
- `RestaurantPanel.jsx`
- `Sidebar.jsx`
- `SearchTab.jsx`
- `ProfilePage.jsx`
- `NotificationTab.jsx`
- `OnboardingGuide.jsx`
- 기타 `#afb3ae`를 직접 사용하는 모든 파일

또한 `frontend/src/design/tokens.js`에 토큰이 정의되어 있다면 거기서도 변경.
`frontend/src/index.css`의 CSS 변수에도 `#afb3ae`가 있다면 함께 변경.

**주의:** `#afb3ae`가 텍스트가 아닌 장식 요소(구분선, 보더 등)에도 쓰이는 경우 그것은 변경하지 않아도 됩니다. 텍스트 색상으로 사용되는 곳만 `#8a8e8a`로 변경하세요. 만약 구분이 어렵다면 전체 치환해도 시각적으로 큰 문제는 없습니다.

---

## 수정 2: 인터랙티브 아이콘에 aria-label 추가

**파일:** 프로젝트 전체 컴포넌트

**현재 문제:** Material Symbols 아이콘이 `<span>` 태그로 렌더되어 스크린리더가 의미를 알 수 없음

**변경 사항:**

클릭 가능한(버튼 역할의) 아이콘에 `aria-label` 추가. 장식용 아이콘에는 `aria-hidden="true"` 추가.

### 인터랙티브 아이콘 (aria-label 필요)

| 컴포넌트 | 아이콘 | aria-label |
|----------|--------|------------|
| RestaurantPanel | `close` | `"닫기"` |
| RestaurantPanel | `edit` | `"수정"` |
| RestaurantPanel | `share` (공유 버튼) | `"공유"` |
| RestaurantPanel | `map` (지도 버튼) | `"지도에서 보기"` |
| FeedTab | 좋아요 SVG 하트 | `"좋아요"` |
| FeedTab | `chat_bubble_outline` | `"댓글"` |
| FeedTab | `location_on` (액션바) | `"지도에서 보기"` |
| BottomTabBar | 각 탭 아이콘 | `"지도"`, `"검색"`, `"피드"`, `"알림"`, `"프로필"` |
| MapView | RefreshButton | `"새로고침"` |
| MapView | LocationButton | `"내 위치"` |

### 장식용 아이콘 (aria-hidden 필요)

| 위치 | 아이콘 | 처리 |
|------|--------|------|
| 주소 옆 `location_on` | 텍스트 보충용 | `aria-hidden="true"` |
| 갤러리 화살표 `chevron_left/right` | 버튼 자체에 aria-label | 아이콘에 `aria-hidden="true"` |
| 상태 뱃지 이모지 | 텍스트와 함께 사용 | `aria-hidden="true"` |

### 적용 방법

**버튼 안의 아이콘인 경우** — `<button>`에 `aria-label`을 추가:
```jsx
<button aria-label="닫기" onClick={onClose}>
  <span className="material-symbols-outlined" aria-hidden="true">close</span>
</button>
```

**아이콘만 단독으로 있는 경우** — `<span>`에 `role="img"`와 `aria-label` 추가:
```jsx
<span className="material-symbols-outlined" role="img" aria-label="검색">search</span>
```

---

## 수정하지 않는 것

- 다른 색상 토큰 변경 없음 (`onSurfaceVariant` #5c605c는 6.08:1로 충분)
- 키보드 네비게이션 전면 개편은 이번 스코프에서 제외
- 지도 관련 접근성은 Naver Maps API 제약으로 제외
