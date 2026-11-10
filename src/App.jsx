// USend — home view. Orchestrates the send / receive flows.

import { useEffect, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { LangProvider, useLang } from "./i18n.jsx";
import {
  createPassphraseSalt,
  createPair,
  derivePassphraseMaterial,
  deriveSession,
  encryptPayload,
  normalizePassphrase,
} from "./crypto.js";
import { api, ApiError, UPLOAD_TIMEOUT } from "./lib/api.js";
import { delay } from "./lib/async.js";
import { readMode } from "./lib/url.js";
import { DiscoveryContent } from "./components/Discover.jsx";
import { ReceivePanel } from "./components/ReceivePanel.jsx";
import { ReadyPage } from "./components/ReadyPage.jsx";
import { SendCard } from "./components/SendCard.jsx";
import { Shell } from "./components/Shell.jsx";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

// Maps an API failure onto a translated, human readable message.
const describeError = (error, t) => {
  const code = error instanceof ApiError ? error.code : error?.message;
  switch (code) {
    case "timeout":
      return t("err.timeout");
    case "network_error":
      return t("err.network");
    case "rate_limited":
      return t("err.rate");
    case "expired":
    case "not_found":
      return t("err.expired");
    case "already_paired":
      return t("recv.err.paired");
    case "restricted_network":
      return t("recv.err.network");
    case "invalid_passphrase":
      return t("recv.err.passphrase");
    case "too_large":
      return t("drop.tooLarge");
    default:
      return t("err.transfer");
  }
};

// Splits the headline on "|" so a key phrase can carry the accent colour
// while the rest stays plain — translators keep full control of the wording.
function Headline({ text }) {
  const [lead, accent] = String(text || "").split("|");
  return (
    <h1>
      {lead}
      {accent ? <span className="accent">{accent}</span> : null}
    </h1>
  );
}

export function App() {
  return (
    <LangProvider>
      <UnifiedHome />
    </LangProvider>
  );
}

function UnifiedHome() {
  const { t } = useLang();
  const [mode, setMode] = useState(() => readMode());
  const [kind, setKind] = useState("file");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [requiresVerification, setRequiresVerification] = useState(true);
  const [sameNetworkOnly, setSameNetworkOnly] = useState(false);
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [securityOpen, setSecurityOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const verificationResolverRef = useRef(null);
  // Tracks the transfer that is currently in flight so it can be cancelled.
  const transferRef = useRef({ controller: null, roomId: null, uploadToken: null, delivered: false });

  const hasContent = kind === "file" ? file : text.trim();
  const normalizedPassphraseLength = normalizePassphrase(passphrase).length;
  const passphraseMissingCharacters = Math.max(0, 8 - normalizedPassphraseLength);
  const canSend = hasContent && (!usePassphrase || normalizedPassphraseLength >= 8);
  const securitySummary = [
    requiresVerification ? t("sec.summary.confirm") : t("sec.summary.auto"),
    sameNetworkOnly ? t("sec.summary.network") : t("sec.summary.internet"),
    usePassphrase ? t("sec.summary.passphrase") : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const choose = (f) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) return setError(t("drop.tooLarge"));
    setFile(f);
    setError("");
  };

  // Stops the polling loop without touching the server. The ready page uses
  // this when it destroys the room itself, so the loop cannot report the
  // deletion as a failure.
  const abortTransfer = () => {
    transferRef.current.controller?.abort();
  };

  // Aborts the running transfer and, when nothing was delivered yet, asks the
  // server to destroy the room instead of leaving it to expire on its own.
  const cancelTransfer = () => {
    const active = transferRef.current;
    transferRef.current = { controller: null, roomId: null, uploadToken: null, delivered: false };
    active.controller?.abort();
    if (!active.delivered && active.roomId && active.uploadToken) {
      api(`/rooms/${active.roomId}/revoke`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${active.uploadToken}` },
      }).catch(() => {});
    }
  };

  useEffect(() => () => cancelTransfer(), []);

  const createTransfer = async () => {
    if (!canSend || busy) return;
    setBusy(true);
    setError("");

    const controller = new AbortController();
    const { signal } = controller;
    transferRef.current = { controller, roomId: null, uploadToken: null, delivered: false };

    try {
      setStage("room");
      const pair = await createPair();
      const passphraseSalt = usePassphrase ? createPassphraseSalt() : undefined;
      const passphraseMaterial = usePassphrase
        ? await derivePassphraseMaterial(passphrase, passphraseSalt)
        : null;
      const passphraseVerifier = passphraseMaterial?.verifier;
      const room = await api("/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          minutes,
          senderPublicKey: pair.publicKey,
          requiresVerification,
          sameNetworkOnly,
          passphraseSalt,
          passphraseVerifier,
        }),
        signal,
      });
      transferRef.current.roomId = room.roomId;
      transferRef.current.uploadToken = room.uploadToken;
      setResult({
        ...room,
        size:
          kind === "file"
            ? file.size
            : new TextEncoder().encode(text).byteLength,
        name: kind === "file" ? file.name : t("text.defaultName"),
      });
      setStage("waiting");
      for (;;) {
        const status = await api(`/rooms/${room.roomId}`, { signal });
        if (status.receiverPublicKey) {
          const session = await deriveSession(
            pair.privateKey,
            pair.publicKey,
            status.receiverPublicKey,
            passphraseMaterial?.encryptionSecret,
          );
          if (requiresVerification) {
            setResult((current) => ({
              ...current,
              verificationCode: session.verificationCode,
            }));
            setStage("verify");
            const verified = await new Promise((resolve) => {
              verificationResolverRef.current = resolve;
            });
            verificationResolverRef.current = null;
            if (!verified) throw new Error("verification_cancelled");
          }
          setStage("encrypt");
          const envelope = await encryptPayload(
            kind === "file" ? { kind, file } : { kind, text },
            session.encryptionKey,
          );
          setStage("upload");
          await api(`/rooms/${room.roomId}/upload`, {
            method: "PUT",
            headers: { authorization: `Bearer ${room.uploadToken}` },
            body: envelope,
            timeout: UPLOAD_TIMEOUT,
            signal,
          });
          transferRef.current.delivered = true;
          setStage("ready");
          break;
        }
        await delay(700, signal);
      }
    } catch (failure) {
      // A cancelled transfer is a deliberate action, not a failure to report.
      if (signal.aborted || failure?.message === "verification_cancelled") {
        if (failure?.message === "verification_cancelled") setError(t("err.cancelled"));
        return;
      }
      // The room was destroyed or expired while the ready page was open.
      // That page renders the outcome itself, so keep it on screen instead
      // of throwing the visitor back to the home screen.
      if (failure?.message === "expired" && transferRef.current.roomId) return;
      setError(describeError(failure, t));
      setResult(null);
      setStage("idle");
    } finally {
      setBusy(false);
    }
  };

  const resetTransfer = () => {
    verificationResolverRef.current?.(false);
    cancelTransfer();
    setResult(null);
    setFile(null);
    setText("");
    setError("");
    setStage("idle");
  };

  if (result)
    return (
      <ReadyPage
        result={result}
        stage={stage}
        onVerify={() => verificationResolverRef.current?.(true)}
        onReset={resetTransfer}
        onCancel={abortTransfer}
      />
    );

  return (
    <Shell>
      <main className="main home-main">
        <section className="hero">
          <Headline
            text={mode === "send" ? t("hero.h1.send") : t("hero.h1.receive")}
          />
          <div className="hero-panel">
            <div className="mode-switch home-mode">
              <button
                className={mode === "send" && kind === "file" ? "active" : ""}
                onClick={() => {
                  setMode("send");
                  setKind("file");
                }}
              >
                <Upload size={14} /> {t("seg.file")}
              </button>
              <button
                className={mode === "send" && kind === "text" ? "active" : ""}
                onClick={() => {
                  setMode("send");
                  setKind("text");
                }}
              >
                <FileText size={14} /> {t("seg.text")}
              </button>
              <button
                className={mode === "receive" ? "active" : ""}
                onClick={() => setMode("receive")}
              >
                {t("mode.receive")}
              </button>
            </div>
            {mode === "send" ? (
          <SendCard
            kind={kind}
            onKindChange={setKind}
            file={file}
            onChoose={choose}
            inputRef={inputRef}
            text={text}
            onTextChange={setText}
            minutes={minutes}
            onMinutesChange={setMinutes}
            securityOpen={securityOpen}
            onToggleSecurity={() => setSecurityOpen((open) => !open)}
            securitySummary={securitySummary}
            requiresVerification={requiresVerification}
            onRequiresVerificationChange={setRequiresVerification}
            sameNetworkOnly={sameNetworkOnly}
            onSameNetworkOnlyChange={setSameNetworkOnly}
            usePassphrase={usePassphrase}
            onUsePassphraseChange={(checked) => {
              setUsePassphrase(checked);
              if (!checked) setPassphrase("");
            }}
            passphrase={passphrase}
            onPassphraseChange={setPassphrase}
            passphraseMissingCharacters={passphraseMissingCharacters}
            busy={busy}
            stage={stage}
            canSend={canSend}
            error={error}
              onSend={createTransfer}
            />
          ) : (
            <ReceivePanel />
          )}
          </div>
          <DiscoveryContent />
        </section>
      </main>
    </Shell>
  );
}
