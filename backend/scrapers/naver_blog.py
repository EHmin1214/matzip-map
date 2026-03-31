"""
scrapers/naver_blog.py
네이버 블로그 게시물 수집 모듈.

두 가지 수집 방식:
  1. 특정 블로거 게시물  : get_posts_by_author("블로거ID", max_posts=30)
  2. 키워드 검색 결과   : get_posts_by_keyword("홍대 맛집", max_posts=20)

[사전 준비]
  환경변수:
    NAVER_CLIENT_ID     : (네이버 개발자 센터에서 발급)
    NAVER_CLIENT_SECRET : (네이버 개발자 센터에서 발급)
  발급: https://developers.naver.com → Application 등록 → 검색 API 선택
  무료 할당량: 25,000건/일
"""

import os
import re
import time
import random
import logging
import urllib.parse
from datetime import datetime

import requests
from bs4 import BeautifulSoup

from scrapers.base import BaseScraper, PostData, SourceType

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────
# 상수
# ──────────────────────────────────────────

NAVER_SEARCH_API = "https://openapi.naver.com/v1/search/blog.json"
NAVER_BLOG_BASE  = "https://blog.naver.com"

# 네이버 블로그 본문 파싱에 사용하는 CSS 선택자
# 네이버가 구조를 변경하면 여기만 수정
CONTENT_SELECTORS = [
    "div.se-main-container",      # 스마트에디터 ONE (최신)
    "div#postViewArea",           # 구버전 에디터
    "div.post-view",              # 모바일
]


# ──────────────────────────────────────────
# 네이버 블로그 스크래퍼
# ──────────────────────────────────────────

class NaverBlogScraper(BaseScraper):

    def __init__(
        self,
        client_id: str | None = None,
        client_secret: str | None = None,
        request_delay: tuple[float, float] = (1.0, 3.0),  # 요청 간격 랜덤 범위(초)
    ):
        self.client_id = client_id or os.environ.get("NAVER_CLIENT_ID")
        self.client_secret = client_secret or os.environ.get("NAVER_CLIENT_SECRET")

        if not self.client_id or not self.client_secret:
            raise ValueError(
                "네이버 API 키가 필요합니다.\n"
                "NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수를 설정하세요.\n"
                "발급: https://developers.naver.com"
            )

        self.delay_range = request_delay
        self.session = requests.Session()
        self.session.headers.update({
            "X-Naver-Client-Id": self.client_id,
            "X-Naver-Client-Secret": self.client_secret,
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        })

    # ── 공개 메서드 ─────────────────────────
    def get_posts_by_author(
        self,
        author_id: str,
        max_posts: int = 100,
) -> list[PostData]:
        """
        네이버 블로그 RSS 피드로 특정 블로거의 최근 게시물 수집.
        RSS: https://rss.blog.naver.com/{author_id}
        """
        import xml.etree.ElementTree as ET

        logger.info(f"블로거 RSS 수집 시작: {author_id} (최대 {max_posts}개)")

        rss_url = f"https://rss.blog.naver.com/{author_id}"
        try:
            resp = self.session.get(rss_url, timeout=10)
            resp.raise_for_status()
            resp.encoding = "utf-8"
        except requests.RequestException as e:
            logger.error(f"RSS 요청 실패 ({author_id}): {e}")
            return []

        # RSS XML 파싱
        try:
            root = ET.fromstring(resp.text)
        except ET.ParseError as e:
            logger.error(f"RSS XML 파싱 실패: {e}")
            return []

        items = root.findall(".//item")[:max_posts]
        logger.info(f"RSS에서 {len(items)}개 게시물 발견")

        posts = []
        for item in items:
            link = item.findtext("link", "")
            title = item.findtext("title", "")
            pub_date_str = item.findtext("pubDate", "")

            # 본문 크롤링
            if not link:
                continue

            content = self._fetch_blog_content(link)
            if not content:
                continue

            # 날짜 파싱
            published_at = None
            if pub_date_str:
                try:
                    from email.utils import parsedate_to_datetime
                    published_at = parsedate_to_datetime(pub_date_str)
                except Exception:
                    pass

            # post_id 추출
            post_id_match = re.search(r"/(\d+)/?$", link)
            post_id = post_id_match.group(1) if post_id_match else link

            posts.append(PostData(
                source=SourceType.NAVER_BLOG,
                post_id=post_id,
                post_url=link,
                title=re.sub(r"<[^>]+>", "", title),
                content=content,
                author_id=author_id,
                author_name=author_id,
                published_at=published_at,
            ))

            time.sleep(random.uniform(*self.delay_range))

        logger.info(f"@{author_id}: {len(posts)}개 게시물 수집 완료")
        return posts

    def get_posts_by_keyword(
        self,
        keyword: str,
        max_posts: int = 20,
    ) -> list[PostData]:
        """
        키워드로 블로그 게시물 검색 수집.
        예: "홍대 맛집", "성수 카페 추천", "을지로 술집"

        Args:
            keyword  : 검색어
            max_posts: 최대 수집 개수 (최대 100, API 제한)
        """
        logger.info(f"키워드 검색 수집 시작: '{keyword}' (최대 {max_posts}개)")

        raw_items = self._search_blog_api(keyword, display=min(max_posts, 100))
        return self._fetch_post_details(raw_items[:max_posts])

    # ── 네이버 검색 API ─────────────────────

    def _search_blog_api(self, keyword: str, display: int = 20) -> list[dict]:
        """
        네이버 블로그 검색 API 호출.
        반환 형식:
          [{"title": ..., "link": ..., "description": ..., "bloggername": ...,
            "bloggerlink": ..., "postdate": "YYYYMMDD"}, ...]
        """
        params = {
            "query": keyword,
            "display": min(display, 100),  # API 최대값 100
            "start": 1,
            "sort": "date",  # 최신순
        }

        try:
            resp = self.session.get(NAVER_SEARCH_API, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            items = data.get("items", [])
            logger.debug(f"검색 API 결과: {len(items)}개")
            return items

        except requests.HTTPError as e:
            logger.error(f"네이버 검색 API 오류: {e} (응답: {resp.text[:200]})")
            raise
        except requests.RequestException as e:
            logger.error(f"네트워크 오류: {e}")
            raise

    # ── 본문 크롤링 ─────────────────────────

    def _fetch_post_details(self, api_items: list[dict]) -> list[PostData]:
        """API 검색 결과 목록을 받아 본문까지 크롤링해 PostData 리스트 반환."""
        results = []

        for item in api_items:
            post_url = item.get("link", "")

            # 네이버 블로그가 아닌 외부 블로그(티스토리 등) 제외
            if "blog.naver.com" not in post_url:
                logger.debug(f"외부 블로그 스킵: {post_url}")
                continue

            content = self._fetch_blog_content(post_url)
            if not content:
                continue

            post = self._build_post_data(item, content)
            results.append(post)

            # 요청 간격 랜덤 딜레이 (서버 부하 방지)
            time.sleep(random.uniform(*self.delay_range))

        logger.info(f"본문 크롤링 완료: {len(results)}개")
        return results

    def _fetch_blog_content(self, post_url: str) -> str | None:
        """
        네이버 블로그 게시물 URL에서 본문 텍스트 추출.

        네이버 블로그는 iframe 구조라 직접 URL 접근이 안 될 때가 있음.
        → mobile 버전 URL로 폴백 처리.
        """
        # 모바일 URL로 변환 (파싱이 더 쉬움)
        mobile_url = self._to_mobile_url(post_url)
        target_url = mobile_url or post_url

        try:
            resp = self.session.get(target_url, timeout=10)
            resp.raise_for_status()
            resp.encoding = "utf-8"

            soup = BeautifulSoup(resp.text, "html.parser")
            content = self._extract_text_from_soup(soup)

            if not content:
                logger.debug(f"본문 추출 실패 (선택자 매칭 없음): {target_url}")
                return None

            return content

        except requests.RequestException as e:
            logger.warning(f"본문 크롤링 실패 ({post_url}): {e}")
            return None

    def _to_mobile_url(self, url: str) -> str | None:
        """
        blog.naver.com/blogId/postNo 형태를 모바일 URL로 변환.
        예: https://blog.naver.com/yummy/223456789
         → https://m.blog.naver.com/yummy/223456789
        """
        if "m.blog.naver.com" in url:
            return url
        return url.replace("blog.naver.com", "m.blog.naver.com", 1)

    def _extract_text_from_soup(self, soup: BeautifulSoup) -> str | None:
        """
        여러 CSS 선택자를 순서대로 시도해 본문 텍스트 추출.
        네이버 에디터 버전(구/신)에 따라 DOM 구조가 다름.
        """
        for selector in CONTENT_SELECTORS:
            container = soup.select_one(selector)
            if container:
                # 불필요한 태그 제거 (스크립트, 스타일, 광고)
                for tag in container.select("script, style, .revenue_unit_wrap"):
                    tag.decompose()

                text = container.get_text(separator="\n", strip=True)
                text = self._clean_text(text)
                if len(text) > 50:  # 너무 짧으면 본문 아닌 것으로 판단
                    return text

        return None

    # ── 텍스트 정제 ─────────────────────────

    @staticmethod
    def _clean_text(text: str) -> str:
        """본문 텍스트에서 불필요한 공백/반복 줄바꿈 제거."""
        # 연속 공백 → 단일 공백
        text = re.sub(r"[ \t]+", " ", text)
        # 3줄 이상 연속 빈 줄 → 2줄로
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    # ── PostData 생성 ───────────────────────

    @staticmethod
    def _build_post_data(api_item: dict, content: str) -> PostData:
        """네이버 API 응답 + 크롤링 본문으로 PostData 생성."""

        # 제목의 HTML 태그 제거 (<b>맛집</b> → 맛집)
        raw_title = api_item.get("title", "")
        title = re.sub(r"<[^>]+>", "", raw_title)

        # 게시일 파싱 (YYYYMMDD → datetime)
        postdate_str = api_item.get("postdate", "")
        published_at: datetime | None = None
        if postdate_str:
            try:
                published_at = datetime.strptime(postdate_str, "%Y%m%d")
            except ValueError:
                pass

        # 블로거 링크에서 author_id 추출
        # bloggerlink: "https://blog.naver.com/yummyseoul"
        blogger_link = api_item.get("bloggerlink", "")
        author_id = blogger_link.rstrip("/").split("/")[-1] if blogger_link else "unknown"

        # post_id: URL 마지막 숫자 (게시물 번호)
        post_url = api_item.get("link", "")
        post_id_match = re.search(r"/(\d+)/?$", post_url)
        post_id = post_id_match.group(1) if post_id_match else post_url

        return PostData(
            source=SourceType.NAVER_BLOG,
            post_id=post_id,
            post_url=post_url,
            title=title,
            content=content,
            author_id=author_id,
            author_name=api_item.get("bloggername", author_id),
            published_at=published_at,
            location_hint=None,  # 블로그는 위치 태그 없음 (본문에서 추출)
            extra={
                "description": api_item.get("description", ""),  # API 요약본
            },
        )


# ──────────────────────────────────────────
# 간단 테스트 (직접 실행 시)
# ──────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    scraper = NaverBlogScraper()

    # ── 테스트 1: 키워드 검색 ──
    print("\n=== 키워드 검색 테스트: '을지로 맛집' ===")
    posts = scraper.get_posts_by_keyword("을지로 맛집 추천 후기", max_posts=3)

    for i, post in enumerate(posts, 1):
        print(f"\n[{i}] {post.title}")
        print(f"  작성자 : {post.author_name} (@{post.author_id})")
        print(f"  URL    : {post.post_url}")
        print(f"  본문   : {post.content[:150]}...")

    # ── 테스트 2: 특정 블로거 게시물 ──
    # print("\n=== 특정 블로거 테스트 ===")
    # posts = scraper.get_posts_by_author("맛집블로거ID", max_posts=5)
