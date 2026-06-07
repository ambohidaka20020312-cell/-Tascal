import React, { useState } from "react";
import { Link } from "react-router-dom";

const MAC_URL =
  "https://github.com/ambohidaka20020312-cell/-Tascal/releases/latest/download/Tascal-mac.dmg";
const WIN_URL =
  "https://github.com/ambohidaka20020312-cell/-Tascal/releases/latest/download/Tascal-Setup.exe";

function detectDevice() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMac = /Macintosh/.test(ua) && !isIOS;
  const isWindows = /Windows/.test(ua);
  return { isIOS, isAndroid, isMac, isWindows };
}

function IOSButton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => alert("App Store申請準備中です")}
        className="inline-flex items-center gap-2 bg-black text-white text-base font-semibold px-8 py-4 rounded-2xl shadow-lg hover:bg-gray-800 active:scale-95 transition-transform"
      >
        <span className="text-xl">🍎</span>
        App Storeでダウンロード
      </button>
      <p className="text-sm text-gray-500">App Store申請中</p>
    </div>
  );
}

function AndroidForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // TODO: submit to backend
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <p className="text-[#4A7C59] font-medium text-base">
        ✅ 登録しました！リリース時にご連絡します。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-gray-600 text-sm font-medium">
        📧 Android版リリース通知を受け取る
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          required
          className="border border-gray-300 rounded-xl px-4 py-3 text-sm flex-1 min-w-[200px] outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-transparent"
        />
        <button
          type="submit"
          className="bg-[#4A7C59] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#3d6b4a] active:scale-95 transition-transform"
        >
          登録する
        </button>
      </form>
    </div>
  );
}

function MacButton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <a
        href={MAC_URL}
        className="inline-flex items-center gap-2 bg-[#4A7C59] text-white text-base font-semibold px-8 py-4 rounded-2xl shadow-lg hover:bg-[#3d6b4a] active:scale-95 transition-transform"
      >
        <span className="text-xl">💻</span>
        Mac版をダウンロード（無料）
      </a>
      <p className="text-sm text-gray-500">macOS 12以上 · Intel &amp; Apple Silicon対応</p>
    </div>
  );
}

function WindowsButton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <a
        href={WIN_URL}
        className="inline-flex items-center gap-2 bg-[#4A7C59] text-white text-base font-semibold px-8 py-4 rounded-2xl shadow-lg hover:bg-[#3d6b4a] active:scale-95 transition-transform"
      >
        <span className="text-xl">🖥️</span>
        Windows版をダウンロード（無料）
      </a>
      <p className="text-sm text-gray-500">Windows 10 / 11対応</p>
    </div>
  );
}

function CTASection({ dark = false }: { dark?: boolean }) {
  const { isIOS, isAndroid, isMac, isWindows } = detectDevice();
  const isPC = isMac || isWindows;

  if (isIOS) {
    return <IOSButton />;
  }

  if (isAndroid) {
    return (
      <div className="w-full max-w-md">
        <AndroidForm />
      </div>
    );
  }

  if (isPC) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {isMac && <MacButton />}
        {isWindows && <WindowsButton />}
      </div>
    );
  }

  // Unknown — show all
  return (
    <div className={`flex flex-col gap-6 items-center w-full max-w-md ${dark ? "text-white" : ""}`}>
      <div className="w-full">
        <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>
          iPhoneをお使いの方
        </p>
        <IOSButton />
      </div>
      <div className="w-full">
        <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Macをお使いの方
        </p>
        <MacButton />
      </div>
      <div className="w-full">
        <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Windowsをお使いの方
        </p>
        <WindowsButton />
      </div>
      <div className="w-full">
        <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Androidをお使いの方
        </p>
        <AndroidForm />
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: "🤖",
    title: "AIスケジュール最適化",
    desc: "今日やるべきことをAIが自動で並べ替え。優先度・締め切り・見積もり時間を考慮。",
  },
  {
    icon: "⚡",
    title: "超過時リアルタイム再計画",
    desc: "予定より長引いても大丈夫。残りのタスクを即座に再スケジュール。",
  },
  {
    icon: "🔒",
    title: "会議・アポは絶対に動かさない",
    desc: "固定タスク設定で、人との約束は必ずスケジュールに残る。",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "¥0",
    period: "",
    features: ["タスク20件/月", "AI最適化3回/日", "広告表示あり"],
    accent: false,
  },
  {
    name: "Pro",
    price: "¥980",
    period: "/月",
    features: ["無制限タスク", "AI最適化無制限", "高度な分析", "広告非表示"],
    accent: true,
  },
  {
    name: "Team",
    price: "¥1,480",
    period: "/人/月",
    features: ["Pro機能すべて", "チーム共有（最大5名）", "チームチャット"],
    accent: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] font-sans">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-[0.2em] uppercase text-[#1a1a1a]">
            Tascal
          </span>
          <Link
            to="/login"
            className="text-sm font-medium text-gray-600 hover:text-[#1a1a1a] transition-colors"
          >
            ログイン
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-14 px-5 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-10">
          <div>
            <h1 className="text-5xl sm:text-6xl font-black leading-tight tracking-tight text-[#1a1a1a] mb-5">
              AIが締め切りを
              <br />
              自動で守る
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg mx-auto">
              タスクを記録するだけじゃない。
              <br />
              超過したら即座に再計画。
              <br />
              あなたの1日を最適化するAIアシスタント。
            </p>
          </div>

          <CTASection />
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-5 bg-[#f5f5f5]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-14 tracking-tight">
            なぜTascalが選ばれるのか
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2 text-[#1a1a1a]">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-4 tracking-tight">
            シンプルな料金体系
          </h2>
          <p className="text-center text-gray-500 mb-14 text-base">
            まずは無料で始めよう。アップグレードはいつでも。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={[
                  "rounded-2xl p-8 flex flex-col gap-4 transition-shadow",
                  p.accent
                    ? "bg-[#4A7C59] text-white shadow-xl sm:scale-105"
                    : "bg-[#f5f5f5] text-[#1a1a1a] shadow-sm hover:shadow-md",
                ].join(" ")}
              >
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${p.accent ? "text-green-200" : "text-gray-500"}`}>
                    {p.name}
                  </p>
                  <p className="text-4xl font-black">
                    {p.price}
                    <span className={`text-sm font-medium ml-1 ${p.accent ? "text-green-200" : "text-gray-500"}`}>
                      {p.period}
                    </span>
                  </p>
                </div>
                <ul className="flex flex-col gap-2">
                  {p.features.map((feat) => (
                    <li key={feat} className={`flex items-center gap-2 text-sm ${p.accent ? "text-green-50" : "text-gray-700"}`}>
                      <svg
                        className={`w-4 h-4 shrink-0 ${p.accent ? "text-green-200" : "text-[#4A7C59]"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-5 bg-[#1a1a1a] text-white text-center">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-8">
          <h2 className="text-3xl sm:text-4xl font-black leading-tight">
            今日から、AIに
            <br />
            スケジュールを任せよう
          </h2>
          <CTASection dark />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-100 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© 2026 Tascal</p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/privacy" className="text-sm text-gray-500 hover:text-[#1a1a1a] transition-colors">
              プライバシーポリシー
            </Link>
            <Link to="/terms" className="text-sm text-gray-500 hover:text-[#1a1a1a] transition-colors">
              利用規約
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
