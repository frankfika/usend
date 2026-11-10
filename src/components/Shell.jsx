// USend — application shell: banner and top bar.

import { Fragment } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLang } from "../i18n.jsx";
import { isInsecureProtocol } from "../lib/format.js";
import { GitHubStarButton, LangSwitch } from "./Nav.jsx";

function InsecureBanner() {
  const { t } = useLang();
  if (!isInsecureProtocol()) return null;
  const upgrade = () => {
    const { host, pathname, search, hash } = window.location;
    window.location.replace(`https://${host}${pathname}${search}${hash}`);
  };
  return (
    <div className="insecure-banner" role="alert">
      <span className="insecure-banner-text">{t("insecure.banner")}</span>
      <button type="button" className="insecure-banner-btn" onClick={upgrade}>
        {t("insecure.switch")} <ArrowUpRight size={14} />
      </button>
    </div>
  );
}

function Shell({ children }) {
  const { t } = useLang();
  return (
    <div className="app-shell">
      <InsecureBanner />
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <svg
              width="22"
              height="22"
              viewBox="0 0 64 64"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7 7 28 14v5H18v3h10v4h-6v4h17v-4h-5v-4h10v-3h-7v-4l20-6v47l-14-6v-4H29v-3h14v-4H34v-3H21v6h7v8L7 57V7Z" />
            </svg>
          </span>
          <span>{t("brand.eyebrow")}</span>
        </a>
        <div className="top-right">
          <LangSwitch />
          <GitHubStarButton />
        </div>
      </header>
      {children}
    </div>
  );
}

// 把含 \n 的翻译切成多行（用于 h1/h2 的换行排版）
function Multiline({ text, as: Tag = "span" }) {
  const parts = text.split("\n");
  return (
    <Tag>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {p}
        </Fragment>
      ))}
    </Tag>
  );
}

export { Multiline, Shell };
