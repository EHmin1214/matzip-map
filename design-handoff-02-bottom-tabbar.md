# 디자인 인수인계서 — #2 모바일 바텀 탭바 & 데스크톱 네비게이션

---

## 디자인 방향

"나만의 맛집 노트" 톤에 맞게 현재 위치를 조용하지만 명확하게 알려주는 인디케이터를 추가합니다. 알림은 숫자 압박 없이 부드러운 신호(도트)로 전달합니다.

---

## 수정 1: 모바일 바텀 탭바 — 활성 탭 pill 배경

**파일:** `frontend/src/components/BottomTabBar.js`

**현재 문제:** 활성 탭이 아이콘 색상 변경만으로 구분되어 현재 위치 인지가 약함

**변경 사항:**

- 활성 탭 아이콘 뒤에 **pill 형태 배경** 추가
- pill 스타일:
  - `background: #ede0d5` (primary container)
  - `borderRadius: 999px` (full round)
  - `padding: 6px 16px` (아이콘을 감싸는 정도)
  - 전환 애니메이션: `background 0.2s ease`
- 비활성 탭: 배경 없음 (transparent)
- 아이콘 색상 변경은 기존 로직 유지

**시각적 결과:**
```
[ 지도 ]  [ 검색 ]  [( 피드 )]  [ 알림 ]  [ 프로필 ]
                     ^^^^^^^^
                     pill 배경 (#ede0d5)
```

---

## 수정 2: 알림 뱃지 — 숫자 제거, 빨간 도트만

**파일:** `frontend/src/components/BottomTabBar.js`

**현재 문제:** 숫자 뱃지가 "확인해야 한다"는 압박감을 주어 서비스 톤과 맞지 않음

**변경 사항:**

- 알림 탭에 읽지 않은 알림이 있을 때 **빨간 도트만** 표시
- 도트 스타일:
  - `width: 6px`, `height: 6px`
  - `borderRadius: 50%`
  - `background: #D4537E` (기존 want_revisit 핑크 — 눈에 띄되 공격적이지 않음)
  - 또는 `#e53935` 같은 전통적 빨간색 사용 (선택)
  - `position: absolute` — 알림 아이콘 우측 상단에 위치 (`top: -2px`, `right: -4px`)
- 숫자 텍스트 제거
- 읽지 않은 알림 0개일 때: 도트 숨김

**주의:** 기존에 unreadCount를 숫자로 표시하던 로직에서 `unreadCount > 0`일 때 도트만 렌더하도록 변경

---

## 수정 3: 데스크톱 사이드바 네비게이션 — 활성 메뉴 하이라이트

**파일:** `frontend/src/components/Sidebar.js`

**현재 문제:** 데스크톱에서도 활성 탭/메뉴의 시각적 구분이 약함

**변경 사항:**

- 활성 네비게이션 항목에 **배경 하이라이트** 추가
- 스타일:
  - `background: #ede0d5` (모바일 pill과 동일한 색상으로 통일)
  - `borderRadius: 8px`
  - `padding: 8px 12px`
  - 전환: `background 0.15s ease`
- 비활성 항목: 배경 없음, hover 시 `#f4f4f0` (surface low)

**의도:** 모바일과 데스크톱에서 동일한 색상(`#ede0d5`)으로 활성 상태를 표현하여 플랫폼 간 일관성 확보

---

## 수정하지 않는 것

- 탭바 glassmorphism 배경 유지
- 탭 아이콘 종류 및 순서 변경 없음
- 탭바 높이/위치 변경 없음
- 프로필 탭의 아바타 표시 방식 유지
