// USend — the "transfer created" screen: pairing code, countdown, safety code.

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  Star,
  Trash2,
  Wifi,
} from "lucide-react";
import { useLang } from "../i18n.jsx";
import { api } from "../lib/api.js";
import { fmt, REPO_URL } from "../lib/format.js";
import { Multiline, Shell } from "./Shell.jsx";

function ReadyPage({ result, onReset, onVerify, onCancel, stage }) {
  const { t } = useLang();
  const [endReason, setEndReason] = useState(null);
  const ended = Boolean(endReason);
  // The ending reason is decided once: the first outcome wins, so a late
  // poll cannot relabel an explicit cancellation as "received".
  const endRef = useRef(null);
  const revokedRef = useRef(false);
  const finish = (reason) => {
    if (endRef.current) return;
    endRef.current = reason;
    setEndReason(reason);
  };
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState(
    Math.max(0, Math.ceil((result.expiresAt - Date.now()) / 1000)),
  );
  useEffect(() => {
    if (ended) {
      setLeft(0);
      return;
    }
    const t = setInterval(
      () =>
        setLeft(Math.max(0, Math.ceil((result.expiresAt - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(t);
  }, [ended, result.expiresAt]);
  useEffect(() => {
    if (ended) return;
    let active = true;
    const check = async () => {
      if (revokedRef.current || endRef.current) return;
      try {
        await api(`/rooms/${result.roomId}`);
      } catch (error) {
        if (!active || revokedRef.current || endRef.current) return;
        if (error.message === "expired" || error.message === "not_found") {
          finish(Date.now() >= result.expiresAt ? "expired" : "received");
        }
      }
    };
    check();
    const timer = setInterval(check, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [ended, result.expiresAt, result.roomId]);
  // Copies the pairing code so the user can paste it into a chat app
  // instead of reading eight digits out loud.
  const copyCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.code);
      } else {
        // Fallback for browsers without the async clipboard API.
        const scratch = document.createElement("textarea");
        scratch.value = result.code;
        scratch.setAttribute("readonly", "");
        scratch.style.position = "fixed";
        scratch.style.opacity = "0";
        document.body.appendChild(scratch);
        scratch.select();
        document.execCommand("copy");
        document.body.removeChild(scratch);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard access can be denied; the code stays visible to read.
    }
  };
  const revoke = async () => {
    // Stop the sender's own polling loop first, otherwise it would see the
    // room disappear and report it as a failed transfer.
    revokedRef.current = true;
    onCancel?.();
    try {
      await api(`/rooms/${result.roomId}/revoke`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${result.uploadToken}` },
      });
      finish("revoked");
    } catch {
      revokedRef.current = false;
    }
  };
  const endCopy = {
    received: {
      eyebrow: t("end.received.eyebrow"),
      message: t("end.received.message"),
    },
    expired: {
      eyebrow: t("end.expired.eyebrow"),
      message: t("end.expired.message"),
    },
    revoked: {
      eyebrow: t("end.revoked.eyebrow"),
      message: t("end.revoked.message"),
    },
  }[endReason];
  return (
    <Shell>
      <main className="main ready-main">
        <div className="ready-orbit">
          <span className="orbit-ring ring-one" />
          <span className="orbit-ring ring-two" />
          <div className="safe-box">
            <Check size={30} />
          </div>
        </div>
        <div className="ready-eyebrow">
          <span className="live-dot" />
          {ended ? ` ${endCopy.eyebrow}` : ` ${t("ready.eyebrow.waiting")}`}
        </div>
        <h1>
          {ended ? (
            <Multiline text={t("ready.h1.ended")} />
          ) : (
            <Multiline text={t("ready.h1.waiting")} />
          )}
        </h1>
        <p className="ready-sub">
          {result.name} · {fmt(result.size)}
        </p>
        <div className="ready-panel">
          {ended ? (
            <div className="destroyed-state">
              <CheckCircle2 size={28} />
              <strong>{endCopy.message}</strong>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={`pair-ticket ${copied ? "is-copied" : ""}`}
                onClick={copyCode}
              >
                <span className="pair-code">
                  {result.code.slice(0, 4)} <span>{result.code.slice(4)}</span>
                </span>
                <span className="pair-perf" aria-hidden="true" />
                <span className="pair-copy" aria-live="polite">
                  {copied ? (
                    <>
                      <Check size={14} /> {t("ready.pair.copied")}
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> {t("ready.pair.copy")}
                    </>
                  )}
                </span>
              </button>
              <p className="pair-hint">{t("ready.pair.hint")}</p>
              <div className="restriction-badges">
                <span>
                  <ShieldCheck size={12} />
                  {result.requiresVerification !== false
                    ? t("ready.badge.confirm")
                    : t("ready.badge.auto")}
                </span>
                {result.sameNetworkOnly && (
                  <span><Wifi size={12} /> {t("ready.badge.network")}</span>
                )}
                {result.requiresPassphrase && (
                  <span><KeyRound size={12} /> {t("ready.badge.passphrase")}</span>
                )}
              </div>
            </>
          )}
          {!ended && stage === "verify" && result.verificationCode && (
            <div className="verification-box" role="status">
              <span>{t("ready.verify.label")}</span>
              <strong>{result.verificationCode}</strong>
              <small>{t("ready.verify.hint")}</small>
              <button className="primary-btn small" onClick={onVerify}>
                <Check size={15} /> {t("ready.verify.btn")}
              </button>
            </div>
          )}
          {!ended && (
            <div
              className={`countdown ${
                left > 0 && left < 20
                  ? "is-critical"
                  : left > 0 && left < 60
                    ? "is-low"
                    : ""
              }`}
            >
              <span>{t("ready.countdown")}</span>
              <strong>
                {String(Math.floor(left / 60)).padStart(2, "0")}:
                {String(left % 60).padStart(2, "0")}
              </strong>
            </div>
          )}
          <div className="ready-actions">
            <button className="secondary-btn" onClick={onReset}>
              <RotateCcw size={15} /> {t("ready.btn.again")}
            </button>
            <button
              className="danger-btn"
              onClick={revoke}
              disabled={ended || left === 0}
            >
              {ended ? (
                <>
                  <Check size={15} /> {t("ready.btn.ended")}
                </>
              ) : (
                <>
                  <Trash2 size={15} /> {t("ready.btn.destroy")}
                </>
              )}
            </button>
          </div>
        </div>
        {ended && (
          <a
            className="ended-star-cta"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Star size={14} className="hero-star-pulse" />
            <span>{t("star.ended.cta")}</span>
            <ArrowUpRight size={13} />
          </a>
        )}
      </main>
    </Shell>
  );
}

export { ReadyPage };
