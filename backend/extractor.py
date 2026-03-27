"""
extractor.py
블로그 본문에서 맛집 상호명을 추출하는 모듈.

Claude API를 사용해 자연어 본문에서 식당/카페 상호명과 위치 힌트를 추출.
관련 없는 글(여행기, 일상글 등)은 자동으로 빈 리스트 반환.

[사전 준비]
  pip install anthropic
  환경변수:
    ANTHROPIC_API_KEY : Anthropic API 키
    발급: https://console.anthropic.com
"""

import os
import json
import logging
from dataclasses import dataclass

import anthropic

from scrapers.base import PostData

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────
# 데이터 구조
# ──────────────────────────────────────────

@dataclass
class ExtractedRestaurant:
    """본문에서 추출된 맛집 하나."""
    name: str                   # 상호명 (예: "을지면옥")
    category: str | None        # 업종 (예: "냉면", "카페", "이자카야")
    address_hint: str | None    # 본문에서 언급된 위치 힌트 (예: "을지로 3가")
    mention_context: str | None # 상호명 주변 문장 (place_resolver 정확도 향상용)

@dataclass
class ExtractionResult:
    """게시물 하나의 추출 결과."""
    post: PostData
    restaurants: list[ExtractedRestaurant]
    is_restaurant_post: bool    # 맛집 관련 글인지 여부


# ──────────────────────────────────────────
# 프롬프트
# ──────────────────────────────────────────

SYSTEM_PROMPT = """
당신은 블로그 본문에서 식당, 카페, 바 등 음식점 상호명을 추출하는 전문가입니다.

[추출 규칙]
1. 실제 방문하거나 소개한 음식점 상호명만 추출하세요.
2. 단순 언급(지명, 일반명사)은 제외하세요. 예) "을지로 맛집" → 상호명 아님
3. 체인점은 지점명까지 포함하세요. 예) "스타벅스 을지로점"
4. 상호명이 불확실하면 추출하지 마세요.
5. 맛집/카페와 무관한 글(여행기, 일상, 뉴스 등)이면 restaurants를 빈 배열로 반환하세요.

[응답 형식]
반드시 아래 JSON 형식만 반환하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "is_restaurant_post": true,
  "restaurants": [
    {
      "name": "상호명",
      "category": "업종 (식당/카페/바/베이커리 등, 모르면 null)",
      "address_hint": "본문에 언급된 위치 (없으면 null)",
      "mention_context": "상호명이 등장하는 문장 1개"
    }
  ]
}
""".strip()


# ──────────────────────────────────────────
# 메인 추출기
# ──────────────────────────────────────────

class RestaurantExtractor:

    def __init__(self, api_key: str | None = None):
        self.client = anthropic.Anthropic(
            api_key=api_key or os.environ.get("ANTHROPIC_API_KEY")
        )
        self.model = "claude-sonnet-4-20250514"

    # ── 공개 메서드 ─────────────────────────

    def extract_from_post(self, post: PostData) -> ExtractionResult:
        """
        게시물 하나에서 맛집 상호명을 추출.

        Args:
            post: 스크래퍼가 수집한 PostData

        Returns:
            ExtractionResult (맛집 없는 글이면 restaurants=[])
        """
        # 본문이 너무 길면 앞 3000자만 사용 (토큰 절약)
        content_preview = post.content[:3000]
        if len(post.content) > 3000:
            content_preview += "\n...(이하 생략)"

        user_message = f"""
제목: {post.title}
작성자: {post.author_name}

본문:
{content_preview}
""".strip()

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )

            raw = response.content[0].text
            parsed = self._parse_response(raw)
            restaurants = [
                ExtractedRestaurant(**r) for r in parsed.get("restaurants", [])
            ]
            is_restaurant_post = parsed.get("is_restaurant_post", False)

            logger.info(
                f"추출 완료: '{post.title[:30]}' "
                f"→ {len(restaurants)}개 상호명"
                + (" (맛집 글 아님)" if not is_restaurant_post else "")
            )
            return ExtractionResult(
                post=post,
                restaurants=restaurants,
                is_restaurant_post=is_restaurant_post,
            )

        except Exception as e:
            logger.error(f"추출 실패 ({post.post_url}): {e}")
            return ExtractionResult(post=post, restaurants=[], is_restaurant_post=False)

    def extract_from_posts(self, posts: list[PostData]) -> list[ExtractionResult]:
        """
        여러 게시물을 순차 처리.
        맛집 관련 글만 필터링해서 반환.
        """
        results = []
        for i, post in enumerate(posts, 1):
            logger.info(f"처리 중 ({i}/{len(posts)}): {post.title[:40]}")
            result = self.extract_from_post(post)
            results.append(result)

        # 통계 출력
        total = len(results)
        restaurant_posts = sum(1 for r in results if r.is_restaurant_post)
        total_restaurants = sum(len(r.restaurants) for r in results)
        logger.info(
            f"전체 완료: {total}개 글 중 맛집 글 {restaurant_posts}개, "
            f"총 상호명 {total_restaurants}개 추출"
        )

        return results

    # ── 내부 메서드 ─────────────────────────

    @staticmethod
    def _parse_response(raw: str) -> dict:
        """
        Claude 응답에서 JSON 파싱.
        응답이 ```json ... ``` 형식으로 감싸여 있을 경우도 처리.
        """
        text = raw.strip()

        # 마크다운 코드블록 제거
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON 파싱 실패: {e}\n원본 응답: {raw[:200]}")
            return {"is_restaurant_post": False, "restaurants": []}


# ──────────────────────────────────────────
# 간단 테스트 (직접 실행 시)
# ──────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    from base import SourceType
    from datetime import datetime

    extractor = RestaurantExtractor()

    # ── 테스트용 더미 PostData ──
    test_posts = [
        PostData(
            source=SourceType.NAVER_BLOG,
            post_id="test_001",
            post_url="https://blog.naver.com/test/001",
            title="을지로 맛집 투어",
            content="""
                오늘은 을지로에서 친구들과 맛집 투어를 했어요!
                첫 번째로 간 곳은 을지면옥. 평양냉면으로 유명한 곳인데
                웨이팅이 좀 있었지만 기다릴 만했어요.
                다음으론 수하동 골목에 있는 이자카야 카무이에 들렀어요.
                분위기가 너무 좋고 하이볼이 맛있었어요!
                마지막으론 하이드미플리즈에서 디저트로 마무리했습니다.
            """,
            author_id="foodie_seoul",
            author_name="서울맛집탐방",
            published_at=datetime.now(),
        ),
        PostData(
            source=SourceType.NAVER_BLOG,
            post_id="test_002",
            post_url="https://blog.naver.com/test/002",
            title="튀르키예 3일차 여행기",
            content="""
                오늘은 이스탄불 그랜드 바자르를 구경했어요.
                터키 현지 빵인 포아차를 먹었는데 퍼석한 느낌...
                저녁엔 숙소 근처에서 케밥을 먹었어요.
            """,
            author_id="traveler_kim",
            author_name="김여행",
            published_at=datetime.now(),
        ),
    ]

    results = extractor.extract_from_posts(test_posts)

    print("\n=== 추출 결과 ===")
    for result in results:
        print(f"\n[{'✅ 맛집 글' if result.is_restaurant_post else '❌ 관련 없음'}] "
              f"{result.post.title}")
        for r in result.restaurants:
            print(f"  - {r.name} ({r.category or '업종 미상'})")
            print(f"    위치 힌트: {r.address_hint or '없음'}")
            print(f"    문맥: {r.mention_context}")
