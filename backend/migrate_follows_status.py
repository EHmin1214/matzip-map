"""
migrate_follows_status.py
follows 테이블에 status 컬럼을 안전하게 추가하는 마이그레이션.

Railway 배포 후 한 번만 실행:
  python migrate_follows_status.py
"""

from database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        # status 컬럼이 없으면 추가
        try:
            conn.execute(text("""
                ALTER TABLE follows
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'accepted';
            """))
            conn.commit()
            print("✅ follows.status 컬럼 추가 완료")
        except Exception as e:
            print(f"⚠️ 이미 존재하거나 오류: {e}")

        # blog_url 컬럼도 없으면 추가
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS blog_url VARCHAR(200);
            """))
            conn.commit()
            print("✅ users.blog_url 컬럼 추가 완료")
        except Exception as e:
            print(f"⚠️ 이미 존재하거나 오류: {e}")

        print("🎉 마이그레이션 완료")

if __name__ == "__main__":
    run()
