// USend — sender panel: pick content, tune the safety options, start a transfer.

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Info,
  KeyRound,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { useLang } from "../i18n.jsx";
import { fmt } from "../lib/format.js";

export function SendCard({
  kind,
  onKindChange,
  file,
  onChoose,
  inputRef,
  text,
  onTextChange,
  minutes,
  onMinutesChange,
  securityOpen,
  onToggleSecurity,
  securitySummary,
  requiresVerification,
  onRequiresVerificationChange,
  sameNetworkOnly,
  onSameNetworkOnlyChange,
  usePassphrase,
  onUsePassphraseChange,
  passphrase,
  onPassphraseChange,
  passphraseMissingCharacters,
  busy,
  stage,
  canSend,
  error,
  onSend,
}) {
  const { t } = useLang();
  const [isDragOver, setIsDragOver] = useState(false);
  // Counts nested dragenter/dragleave pairs so the highlight survives the
  // pointer crossing child elements.
  const dragDepth = useRef(0);
  // Keeps the latest callbacks without re-subscribing the paste listener.
  const handlers = useRef({ onChoose, onKindChange });
  useEffect(() => {
    handlers.current = { onChoose, onKindChange };
  });

  // Pasting a screenshot is the most common way people move a file between
  // devices, so a clipboard file is picked up straight away.
  useEffect(() => {
    const handlePaste = (event) => {
      const file = event.clipboardData?.files?.[0];
      if (!file) return;
      event.preventDefault();
      handlers.current.onKindChange("file");
      handlers.current.onChoose(file);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <section className="send-card">
      {kind === "file" && (
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) => onChoose(e.target.files[0])}
        />
      )}
      {kind === "file" ? (
        <button
          className={`dropzone ${file ? "has-file" : ""} ${
            isDragOver ? "is-dragover" : ""
          }`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            dragDepth.current += 1;
            setIsDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragDepth.current = 0;
            setIsDragOver(false);
            onChoose(e.dataTransfer.files[0]);
          }}
        >
          {file ? (
            <>
              <span className="drop-title">{file.name}</span>
              <span className="drop-meta">
                {t("drop.filled.meta", { size: fmt(file.size) })}
              </span>
            </>
          ) : (
            <>
              <span className="drop-title">{t("drop.empty.title")}</span>
              <span className="drop-meta">{t("drop.empty.meta")}</span>
            </>
          )}
        </button>
      ) : (
        <div className="text-wrap">
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={t("text.placeholder")}
            maxLength={12000}
          />
          <span className="char-count">
            {t("text.count", { n: text.length.toLocaleString() })}
          </span>
        </div>
      )}
      <div className={`security-options ${securityOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="security-options-heading"
          aria-expanded={securityOpen}
          onClick={onToggleSecurity}
        >
          <span>
            <ShieldCheck size={16} />
            <b>{t("sec.heading")}</b>
            <small>{securitySummary}</small>
          </span>
          <ChevronDown size={17} />
        </button>
        {securityOpen && (
          <div className="security-options-body">
            <label className="send-options">
              <span>{t("opt.autoDelete")}</span>
              <select
                value={minutes}
                onChange={(e) => onMinutesChange(Number(e.target.value))}
              >
                <option value={1}>{t("opt.after1")}</option>
                <option value={5}>{t("opt.after5")}</option>
                <option value={10}>{t("opt.after10")}</option>
              </select>
            </label>
            <label className="security-toggle">
              <input
                type="checkbox"
                checked={requiresVerification}
                onChange={(event) => onRequiresVerificationChange(event.target.checked)}
              />
              <span className="toggle-box"><Check size={12} /></span>
              <ShieldCheck size={16} />
              <span>
                <b>{t("sec.verify.title")}</b>
                <small>{t("sec.verify.sub")}</small>
              </span>
            </label>
            <label className="security-toggle">
              <input
                type="checkbox"
                checked={sameNetworkOnly}
                onChange={(event) => onSameNetworkOnlyChange(event.target.checked)}
              />
              <span className="toggle-box"><Check size={12} /></span>
              <Wifi size={16} />
              <span>
                <b>{t("sec.network.title")}</b>
                <small>{t("sec.network.sub")}</small>
              </span>
            </label>
            <label className="security-toggle">
              <input
                type="checkbox"
                checked={usePassphrase}
                onChange={(event) => onUsePassphraseChange(event.target.checked)}
              />
              <span className="toggle-box"><Check size={12} /></span>
              <KeyRound size={16} />
              <span>
                <b>{t("sec.passphrase.title")}</b>
                <small>{t("sec.passphrase.sub")}</small>
              </span>
            </label>
            {usePassphrase && (
              <div className="passphrase-field">
                <input
                  className="passphrase-input"
                  type="password"
                  value={passphrase}
                  onChange={(event) => onPassphraseChange(event.target.value.slice(0, 64))}
                  placeholder={t("sec.passphrase.placeholder")}
                  autoComplete="new-password"
                  aria-invalid={
                    passphrase.length > 0 && passphraseMissingCharacters > 0
                  }
                  aria-describedby="passphrase-requirement"
                />
                <small
                  id="passphrase-requirement"
                  className={
                    passphrase.length > 0 && passphraseMissingCharacters > 0
                      ? "field-hint invalid"
                      : "field-hint"
                  }
                >
                  {passphrase.length === 0
                    ? t("sec.passphrase.hint.empty")
                    : passphraseMissingCharacters > 0
                      ? t("sec.passphrase.hint.short", { n: passphraseMissingCharacters })
                      : t("sec.passphrase.hint.ok")}
                </small>
              </div>
            )}
            {sameNetworkOnly && (
              <p className="network-caveat">
                {t("sec.network.caveat")}
              </p>
            )}
          </div>
        )}
      </div>
      <button
        className="primary-btn"
        disabled={!canSend || busy}
        onClick={onSend}
      >
        {busy ? (
          <>
            <span className="spinner" />{" "}
            {stage === "room"
              ? t("stage.room")
              : stage === "waiting"
                ? t("stage.waiting")
                : stage === "verify"
                  ? t("stage.verify")
                : stage === "encrypt"
                  ? t("stage.encrypt")
                  : t("stage.upload")}
          </>
        ) : (
          <>
            {usePassphrase && passphraseMissingCharacters > 0
              ? t("btn.passphraseShort", { n: passphraseMissingCharacters })
              : t("btn.generate")}
            <ArrowUpRight size={17} />
          </>
        )}
      </button>
      {error && (
        <div className="error-note">
          <Info size={15} />
          {error}
        </div>
      )}
    </section>
  );
}
