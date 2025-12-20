"use client";

import { useLanguage } from "../contexts/LanguageContext";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: "ru" as const, name: "Русский", flag: "🇷🇺" },
    { code: "en" as const, name: "English", flag: "🇬🇧" },
    { code: "es" as const, name: "Español", flag: "🇪🇸" },
  ];

  return (
    <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1 border border-slate-600">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            language === lang.code
              ? "bg-slate-600 text-white shadow-md"
              : "text-slate-300 hover:text-white hover:bg-slate-700/50"
          }`}
          title={lang.name}
        >
          <span className="mr-1.5">{lang.flag}</span>
          <span className="hidden sm:inline">{lang.name}</span>
        </button>
      ))}
    </div>
  );
}

