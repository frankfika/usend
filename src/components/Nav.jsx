// USend — top navigation chrome: the language switch and the GitHub link.

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useLang } from "../i18n.jsx";
import { REPO_API_URL, REPO_URL } from "../lib/format.js";
import { readItem, writeItem } from "../lib/storage.js";

function GithubIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

// Reads the star count once, caching it so the API is not hit on every visit.
function useStarCount() {
  const [stars, setStars] = useState(null);
  useEffect(() => {
    const cacheTtl = 10 * 60 * 1000;
    const cached = readItem("stars");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.t < cacheTtl && typeof parsed.s === "number") {
          setStars(parsed.s);
          return;
        }
      } catch {
        // A corrupt cache entry is simply ignored.
      }
    }
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch(REPO_API_URL, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const s =
          typeof d.stargazers_count === "number" ? d.stargazers_count : null;
        setStars(s);
        if (s != null) {
          writeItem("stars", JSON.stringify({ s, t: Date.now() }));
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  return stars;
}

function GitHubStarButton() {
  const { t } = useLang();
  const stars = useStarCount();
  const hasStars = stars != null && stars > 0;
  const starLabel = stars != null ? stars.toLocaleString() : "";
  return (
    <a
      className="gh-link"
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        hasStars
          ? t("star.aria.hasStars", { count: starLabel })
          : t("star.aria.firstStar")
      }
      title={
        hasStars
          ? t("star.title.hasStars", { count: starLabel })
          : t("star.title.firstStar")
      }
    >
      <GithubIcon size={15} />
      {hasStars && (
        <span className="gh-count">
          <Star size={11} /> {starLabel}
        </span>
      )}
    </a>
  );
}

function LangSwitch() {
  const { lang, setLang, t } = useLang();
  const other = lang === "zh" ? "en" : "zh";
  return (
    <button
      type="button"
      className="lang-switch"
      onClick={() => setLang(other)}
      aria-label={t("lang.switchTo")}
      title={t("lang.switchTo")}
    >
      <span className={lang === "zh" ? "lang-active" : ""}>中</span>
      <span className="lang-sep">/</span>
      <span className={lang === "en" ? "lang-active" : ""}>EN</span>
    </button>
  );
}

export { GitHubStarButton, GithubIcon, LangSwitch };
