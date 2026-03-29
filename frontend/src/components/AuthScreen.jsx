// src/components/AuthScreen.jsx
import { useState } from "react";
import { useUser } from "../context/UserContext";

export default function AuthScreen() {
  const { login, register } = useUser();
  const [mode, setMode] = useState("login");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (nickname.trim().length < 2) { 
      setError("이름은 2자 이상 적어주세요."); 
      return; 
    }
    if (!/^\d{4}$/.test(pin)) { 
      setError("PIN 번호는 숫자 4자리로 설정해주세요."); 
      return; 
    }
    setLoading(true);
    try {
      if (mode === "login") await login(nickname.trim(), pin);
      else await register(nickname.trim(), pin);
    } catch (e) {
      setError(e.response?.data?.detail || "연결이 원활하지 않습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // 전체 컨테이너: 배경 #FAF9F6 (뉴트럴 화이트), 텍스트 #2F3430 (차콜 브라운)
    <div className="min-h-screen flex bg-[#FAF9F6] text-[#2F3430] font-['Manrope',sans-serif]">
      
      {/* 왼쪽 — 비주얼 패널 (데스크탑 전용) */}
      <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#EAE1D9]">
        {/* 차분한 분위기를 위한 부드러운 그라디언트와 노이즈 (이미지 대신 추상적인 공간감 부여) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#655D54]/20 to-[#FAF9F6]/50 mix-blend-multiply"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[120%] h-[120%] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-30 mix-blend-overlay"></div>
        
        {/* 장식용 원형 그래픽 (No-Line 원칙에 따라 투명도와 면으로만 표현) */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#FAF9F6]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-[#655D54]/5 rounded-full blur-2xl"></div>

        <div className="absolute bottom-16 left-16 z-10">
          <h1 className="font-['Noto_Serif'] text-5xl italic text-[#2F3430] tracking-tight mb-4 drop-shadow-sm">
            나의 공간
          </h1>
          <p className="font-['Manrope'] text-[#655D54] text-xs font-semibold tracking-[0.3em] uppercase">
            정갈한 기록의 보관소
          </p>
        </div>
      </section>

      {/* 오른쪽 — 입력 패널 */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 lg:p-24">
        <div className="w-full max-w-sm">
          
          {/* 모바일 브랜드 로고 (데스크탑에서는 숨김) */}
          <div className="lg:hidden mb-12 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-[#655D54] mb-3">auto_stories</span>
            <h1 className="font-['Noto_Serif'] text-3xl italic text-[#2F3430] tracking-tight">
              나의 공간
            </h1>
          </div>

          {/* 헤더 */}
          <header className="mb-12">
            <h2 className="font-['Noto_Serif'] text-4xl text-[#2F3430] mb-4 leading-tight">
              {mode === "login" ? "다시 오셨군요," : "처음 오셨군요,"}
            </h2>
            <p className="text-[#655D54] text-sm leading-relaxed">
              {mode === "login"
                ? "당신만의 아카이브에 접속하여 기록을 이어가세요."
                : "새로운 아카이브를 열고 당신만의 장소를 기록해보세요."}
            </p>
          </header>

          {/* 입력 폼 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 group">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#655D54] transition-colors group-focus-within:text-[#2F3430]">
                Nickname
              </label>
              {/* No-Line 원칙: border 없이 표면의 색상 차이(#F4F4F0)로만 인풋 영역 구분 */}
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="2자 이상 입력 (예: 기록자)"
                className="w-full bg-[#F4F4F0] border-none rounded-xl px-5 py-4 text-[#2F3430] placeholder:text-[#AFB3AE] focus:ring-2 focus:ring-[#ede0d5] focus:bg-[#FAF9F6] transition-all outline-none"
              />
            </div>
            
            <div className="space-y-2 group">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#655D54] transition-colors group-focus-within:text-[#2F3430]">
                Access PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="w-full bg-[#F4F4F0] border-none rounded-xl px-5 py-4 text-[#2F3430] placeholder:text-[#AFB3AE] focus:ring-2 focus:ring-[#ede0d5] focus:bg-[#FAF9F6] transition-all outline-none tracking-[0.5em] text-center text-lg font-medium"
              />
            </div>

            {/* 에러 메시지: 자극적인 빨간색 대신 차분한 톤 다운된 붉은색 사용 */}
            {error && (
              <div className="p-4 bg-[#F4F4F0] text-[#9E422C] rounded-xl text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">info</span>
                {error}
              </div>
            )}

            {/* 제출 버튼: 그림자와 호버 시 위로 살짝 뜨는 Tactile Feedback 적용 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-[#655D54] text-[#FAF9F6] font-medium py-4 px-6 rounded-xl shadow-[0_4px_20px_rgba(47,52,48,0.05)] transition-all duration-300 hover:bg-[#595149] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0 flex justify-center items-center gap-2"
            >
              {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              {loading ? "기록을 여는 중..." : mode === "login" ? "입장하기" : "아카이브 생성"}
            </button>
          </form>

          {/* 모드 전환 */}
          <div className="mt-12 pt-8 border-t border-[#655D54]/10 text-center">
            <p className="text-sm text-[#655D54]">
              {mode === "login" ? "아직 아카이브가 없으신가요?" : "이미 아카이브가 있으신가요?"}
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                className="ml-2 font-bold text-[#2F3430] hover:text-[#655D54] underline underline-offset-4 decoration-[#655D54]/30 hover:decoration-[#655D54] transition-all"
              >
                {mode === "login" ? "새로 만들기" : "입장하기"}
              </button>
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}