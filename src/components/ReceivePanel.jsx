// USend — receiver panel: enter a pairing code, verify, and fetch the payload.

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Download,
  FileLock2,
  Info,
  KeyRound,
} from "lucide-react";
import { useLang } from "../i18n.jsx";
import { api, apiBinary } from "../lib/api.js";
import { delay } from "../lib/async.js";
import { fmt } from "../lib/format.js";
import {
  createPair,
  decryptPayload,
  derivePassphraseMaterial,
  deriveSession,
  normalizePassphrase,
} from "../crypto.js";

function ReceiveEntry() {
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [passphraseRequired, setPassphraseRequired] = useState(false);
  const [roomPreview, setRoomPreview] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);
  const abortRef = useRef(null);

  // Stop any in-flight receive when the panel goes away.
  useEffect(() => () => abortRef.current?.abort(), []);
  const codeRemaining = Math.max(0, 8 - code.length);
  const join = async () => {
    if (!/^\d{8}$/.test(code)) return setError(t("recv.err.code"));
    setState("joining");
    setError("");
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const { signal } = controller;
    try {
      const found = roomPreview || await api(`/rooms/code/${code}`, { signal });
      setRoomPreview(found);
      if (found.requiresPassphrase && !normalizePassphrase(passphrase)) {
        setPassphraseRequired(true);
        setState("idle");
        setError("");
        return;
      }
      const pair = await createPair();
      const passphraseMaterial = found.requiresPassphrase
        ? await derivePassphraseMaterial(passphrase, found.passphraseSalt)
        : null;
      const passphraseVerifier = passphraseMaterial?.verifier;
      const joined = await api(`/rooms/${found.roomId}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          receiverPublicKey: pair.publicKey,
          passphraseVerifier,
        }),
        signal,
      });
      const session = await deriveSession(
        pair.privateKey,
        pair.publicKey,
        found.senderPublicKey,
        passphraseMaterial?.encryptionSecret,
      );
      setVerificationCode(
        found.requiresVerification !== false ? session.verificationCode : "",
      );
      setState("waiting");
      for (;;) {
        const status = await api(`/rooms/${found.roomId}`, { signal });
        if (status.status === "ready") {
          const envelope = await apiBinary(`/rooms/${found.roomId}/payload`, {
            headers: { authorization: `Bearer ${joined.receiverToken}` },
            signal,
          });
          const decoded = await decryptPayload(session.encryptionKey, envelope);
          setPayload(decoded);
          try {
            await api(`/rooms/${found.roomId}/complete`, {
              method: "DELETE",
              headers: {
                authorization: `Bearer ${joined.receiverToken}`,
              },
            });
            setDeletionConfirmed(true);
          } catch {
            setDeletionConfirmed(false);
          }
          setState("done");
          break;
        }
        await delay(700, signal);
        if (signal.aborted) break;
      }
    } catch (e) {
      if (e?.code === "aborted") {
        setState("idle");
        setVerificationCode("");
        return;
      }
      setError(
        e.message === "rate_limited"
          ? t("recv.err.rate")
          : e.message === "expired" || e.message === "not_found"
            ? t("recv.err.notfound")
            : e.message === "already_paired"
              ? t("recv.err.paired")
              : e.message === "restricted_network"
                ? t("recv.err.network")
                : e.message === "invalid_passphrase"
                  ? t("recv.err.passphrase")
              : t("recv.err.fallback"),
      );
      setState("idle");
      setVerificationCode("");
    }
  };
  const download = () => {
    const blob = new Blob([payload.data], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = payload.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  if (state === "done")
    return (
      <div className="receive-inline-done">
        <div className="done-icon">
          <CheckCircle2 size={26} />
        </div>
        <span className="ready-eyebrow">
          <span className="live-dot" /> {t("done.eyebrow")}
        </span>
        <h2>{payload.kind === "text" ? t("done.h2.text") : t("done.h2.file")}</h2>
        {payload.kind === "text" ? (
          <pre className="text-result">
            {new TextDecoder().decode(payload.data)}
          </pre>
        ) : (
          <div className="download-file">
            <FileLock2 size={20} />
            <span>
              {payload.name}
              <small>{fmt(payload.size)}</small>
            </span>
            <button className="primary-btn small" onClick={download}>
              <Download size={15} /> {t("done.save")}
            </button>
          </div>
        )}
        <p className="delete-confirm">
          {deletionConfirmed ? (
            <>
              <Check size={14} /> {t("done.delete.ok")}
            </>
          ) : (
            <>
              <Info size={14} />{" "}
              {t("done.delete.fail")}
            </>
          )}
        </p>
      </div>
    );
  return (
    <div className="receive-entry">
      <div className={`code-field ${code.length === 8 ? "complete" : ""}`}>
        <input
          className="code-input"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 8));
            setRoomPreview(null);
            setPassphraseRequired(false);
            setPassphrase("");
            setError("");
          }}
          placeholder={t("recv.code.placeholder")}
          inputMode="numeric"
          maxLength={8}
          aria-invalid={code.length > 0 && code.length < 8}
        />
      </div>
      {passphraseRequired && (
        <div className="receive-passphrase">
          <KeyRound size={15} />
          <input
            type="password"
            value={passphrase}
            onChange={(event) => {
              setPassphrase(event.target.value.slice(0, 64));
              setError("");
            }}
            placeholder={t("recv.passphrase.placeholder")}
            autoComplete="current-password"
            autoFocus
          />
        </div>
      )}
      <button
        className="primary-btn"
        disabled={
          state !== "idle" ||
          code.length !== 8 ||
          (passphraseRequired && !normalizePassphrase(passphrase))
        }
        onClick={join}
      >
        {state === "joining" ? (
          <>
            <span className="spinner" /> {t("recv.btn.joining")}
          </>
        ) : state === "waiting" ? (
          <>
            <span className="spinner" /> {t("recv.btn.waiting")}
          </>
        ) : (
          <>
            {passphraseRequired
              ? normalizePassphrase(passphrase)
                ? t("recv.btn.withPassphrase")
                : t("recv.btn.enterPassphrase")
              : code.length > 0 && codeRemaining > 0
                ? t("recv.btn.remaining", { n: codeRemaining })
                : t("recv.btn.start")}{" "}
            {codeRemaining === 0 && <ArrowUpRight size={17} />}
          </>
        )}
      </button>
      {state === "waiting" && verificationCode && (
        <div className="verification-box" role="status">
          <span>{t("recv.verify.label")}</span>
          <strong>{verificationCode}</strong>
          <small>{t("recv.verify.hint")}</small>
        </div>
      )}
      {error && (
        <div className="error-note">
          <Info size={15} />
          {error}
        </div>
      )}
    </div>
  );
}

export { ReceiveEntry as ReceivePanel };
