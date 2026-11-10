import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readItem, writeItem } from "./lib/storage.js";

// ============================================================
// USend — minimal i18n (zh / en)
// ============================================================

export const LANGS = ["zh", "en"];
const STORAGE_KEY = "lang";

// 推断初始语言：用户主动选择的语言 > 默认 en
export function detectLang() {
  if (typeof window === "undefined") return "en";
  try {
    const saved = readItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") return saved;
  } catch {}
  return "en";
}

// 翻译字典。带 {name} {count} {n} 的字符串支持插值。
const DICT = {
  zh: {
    // ---- document / meta ----
    "doc.title": "USend · 安全传到另一台设备",
    "doc.description": "USend 是一款无需注册的安全文件与文字传输工具。手机、电脑之间用一次性配对码传输，端到端加密，最长 10 分钟后自动清除。",
    "doc.lang": "zh-CN",
    "insecure.banner": "你正在用 http:// 打开 USend，端到端加密需要 https://。",
    "insecure.switch": "切换到 https",

    // ---- topbar ----
    "brand.eyebrow": "USEND",
    "top.trust": "端到端加密",
    "lang.switchTo": "切换到 English",

    // ---- github star ----
    "star.btn.hasStars": "Star",
    "star.btn.firstStar": "成为首个 Star",
    "star.btn.star": "Star",
    "star.aria.hasStars": "在 GitHub 上给项目点 Star，当前 {count} 颗星",
    "star.aria.firstStar": "在 GitHub 上成为首个给项目点 Star 的人",
    "star.aria.star": "在 GitHub 上给项目点 Star",
    "star.title.hasStars": "当前 {count} 颗星",
    "star.title.firstStar": "成为第一个 Star",
    "star.ended.cta": "顺手给个 Star，让 USend 被更多人看到",

    // ---- footer ----
    "footer.left": "端到端加密 · 阅后即焚 · 无需账号",

    // ---- trust strip ----

    // ---- hero ----
    "hero.h1.send": "传到|另一台设备",
    "hero.h1.receive": "接收来自|另一台设备",
    "hero.trust.encrypt": "浏览器端加密",
    "hero.trust.account": "无需注册",
    "hero.trust.burn": "阅后即焚",
    "hero.p.send": "不登录，不复制链接。选择内容后，用一次性配对码连接另一台设备。",
    "hero.p.receive": "输入发送设备上显示的配对码，内容只在这台设备本地解密。",

    // ---- mode switch ----
    "mode.send": "发送",
    "mode.receive": "接收",

    // ---- send card / segmented ----
    "seg.file": "文件",
    "seg.text": "文字",

    // ---- dropzone ----
    "drop.empty.title": "选择文件",
    "drop.empty.meta": "拖到这里 · 点击选择 · 或直接粘贴 · 最大 20 MB",
    "drop.filled.meta": "{size} · 准备就绪",
    "drop.change": "更换文件",
    "drop.tooLarge": "文件不能超过 20 MB",

    // ---- text ----
    "text.placeholder": "粘贴一段文字、地址或临时信息……",
    "text.count": "{n} / 12,000",
    "text.defaultName": "临时文字.txt",

    // ---- send options ----
    "opt.autoDelete": "保留时间",
    "opt.after1": "1 分钟",
    "opt.after5": "5 分钟",
    "opt.after10": "10 分钟",

    // ---- security options ----
    "sec.heading": "传输设置",
    "sec.summary.confirm": "需核对安全码",
    "sec.summary.auto": "自动发送",
    "sec.summary.internet": "不限网络",
    "sec.summary.network": "仅限同一网络",
    "sec.summary.passphrase": "已设接收密码",
    "sec.verify.title": "发送前核对安全码",
    "sec.verify.sub": "默认开启，防止连接到错误设备",
    "sec.network.title": "仅限同一网络",
    "sec.network.sub": "只适合两台设备连接同一 Wi-Fi 时使用",
    "sec.network.caveat": "VPN、代理、蜂窝网络或隐私中继可能导致判断失败。如果不确定，请保持关闭。",
    "sec.passphrase.title": "设置接收密码",
    "sec.passphrase.sub": "接收方还需要输入这个密码",
    "sec.passphrase.placeholder": "至少 8 个字符",
    "sec.passphrase.hint.empty": "至少 8 个字符",
    "sec.passphrase.hint.short": "还差 {n} 个字符，暂时不能生成配对码",
    "sec.passphrase.hint.ok": "密码长度符合要求",

    // ---- primary button / send stages ----
    "btn.generate": "生成配对码",
    "btn.passphraseShort": "密码还差 {n} 个字符",
    "stage.room": "正在生成配对码…",
    "stage.waiting": "等待接收方连接…",
    "stage.verify": "等待核对安全码…",
    "stage.encrypt": "正在本机加密…",
    "stage.upload": "正在发送加密内容…",
    "err.transfer": "传输未完成，请重新开始。",
    "err.timeout": "请求超时，网络太慢或连接中断了。请重试。",
    "err.network": "连不上服务器，请检查网络后重试。",
    "err.rate": "操作太频繁，请稍等一会儿再试。",
    "err.expired": "这个配对码不存在或已经过期。",
    "err.cancelled": "传输已取消。",

    // ---- how section ----
    "how.link": "了解安全机制",
    "how.kicker": "HOW IT WORKS",
    "how.title": "内容只在两台设备之间解密。",
    "how.1.title": "一次性连接",
    "how.1.body": "配对码只用于这一次传输。",
    "how.2.title": "端到端加密",
    "how.2.body": "加密密钥由两台设备临时生成，服务器无法解密内容。",
    "how.3.title": "自动清除",
    "how.3.body": "接收完成或时间到期后，临时数据会被删除。",

    // ---- discovery content ----
    "discover.kicker": "WHY USEND",
    "discover.title": "不想登录、不想建群时，\nUSend 刚刚好。",
    "discover.intro": "把文件或一段文字临时送到另一台设备。没有账号、没有公开链接，传输结束后临时数据会被清除。",
    "discover.card1.title": "手机传到电脑",
    "discover.card1.body": "打开 USend，在手机上选择文件，在电脑输入一次性配对码即可接收。",
    "discover.card2.title": "临时发送文件",
    "discover.card2.body": "发送合同、截图、附件或压缩包，不必上传到网盘，也不必给对方开长期权限。",
    "discover.card3.title": "传文字和链接",
    "discover.card3.body": "把地址、验证码以外的临时文字从一台设备带到另一台设备，复制即可。",
    "discover.faq.title": "常见问题",
    "discover.faq1.q": "USend 需要注册账号吗？",
    "discover.faq1.a": "不需要。发送方和接收方都不需要注册或登录，使用一次性 8 位配对码连接。",
    "discover.faq2.q": "USend 安全吗？",
    "discover.faq2.a": "内容会在发送设备本地先加密，真正的加密密钥由两台设备临时协商，服务器无法解密内容。",
    "discover.faq3.q": "文件会保存多久？",
    "discover.faq3.a": "传输完成后临时数据会删除；如果没有接收，默认最长保留 5 分钟，最多 10 分钟。",
    "discover.faq4.q": "USend 支持哪些文件？",
    "discover.faq4.a": "支持常见文件和文字内容，单个文件最大 20 MB。",
    "discover.openSource": "查看开源项目与安全说明",

    // ---- receive entry ----
    "recv.h2": "输入 8 位配对码",
    "recv.code.placeholder": "0000 0000",
    "recv.code.hint.empty": "输入发送方显示的 8 位数字",
    "recv.code.hint.remaining": "还差 {n} 位",
    "recv.code.hint.ready": "配对码完整，可以连接",
    "recv.passphrase.placeholder": "输入接收密码",
    "recv.btn.joining": "正在连接…",
    "recv.btn.waiting": "等待内容…",
    "recv.btn.start": "连接设备",
    "recv.btn.remaining": "还差 {n} 位",
    "recv.btn.enterPassphrase": "请输入接收密码",
    "recv.btn.withPassphrase": "连接并接收",
    "recv.verify.label": "安全码",
    "recv.verify.hint": "请确认发送方显示相同的安全码。",
    "recv.err.code": "请输入 8 位配对码",
    "recv.err.rate": "尝试次数过多，请稍后再试。",
    "recv.err.notfound": "这个配对码不存在或已经过期。",
    "recv.err.paired": "这次传输已经与另一台设备配对。",
    "recv.err.network": "无法确认两台设备在同一网络。请关闭 VPN、代理或蜂窝网络后重试，或让发送方关闭“仅限同一网络”。",
    "recv.err.passphrase": "接收密码不正确。",
    "recv.err.fallback": "接收失败，请检查配对码后重试。",

    // ---- receive done ----
    "done.eyebrow": "已安全接收",
    "done.h2.text": "已收到文字",
    "done.h2.file": "文件已收到",
    "done.save": "保存",
    "done.delete.ok": "临时加密数据已删除",
    "done.delete.fail": "内容已收到，临时加密数据将在到期后删除",

    // ---- ready page ----
    "ready.eyebrow.waiting": "等待接收方连接",
    "ready.h1.waiting": "在另一台设备输入\n这组配对码",
    "ready.h1.ended": "这次传输\n已经安全结束。",
    "ready.pair.hint": "配对码仅本次有效 · 点击复制",
    "ready.pair.copy": "复制配对码",
    "ready.pair.copied": "已复制",
    "ready.badge.confirm": "需核对安全码",
    "ready.badge.auto": "连接后自动发送",
    "ready.badge.network": "仅限同一网络",
    "ready.badge.passphrase": "需要接收密码",
    "ready.verify.label": "安全码",
    "ready.verify.hint": "请确认两台设备显示相同的安全码。",
    "ready.verify.btn": "安全码一致，发送",
    "ready.countdown": "剩余时间",
    "ready.privacy.title": "没有链接，也没有账号",
    "ready.privacy.sub": "配对码只负责找到房间，加密钥匙由两台设备临时协商。",
    "ready.btn.again": "发送新内容",
    "ready.btn.destroy": "取消传输",
    "ready.btn.ended": "已结束",
    "ready.note.ended": "本次配对码已经失效，不能再次接收",
    "ready.note.waiting": "将配对码告诉接收方",

    // ---- end reasons ----
    "end.received.eyebrow": "对方已安全接收",
    "end.received.message": "对方已收到内容，临时加密数据已删除",
    "end.expired.eyebrow": "传输已到期",
    "end.expired.message": "配对码已过期，临时数据已删除",
    "end.revoked.eyebrow": "已主动销毁",
    "end.revoked.message": "传输已取消，临时数据已删除",
  },

  en: {
    // ---- document / meta ----
    "doc.title": "USend · Secure device-to-device transfers",
    "doc.description": "USend is a secure file and text transfer tool with no sign-up. Use a one-time pairing code between your phone and computer, with end-to-end encryption and automatic cleanup.",
    "doc.lang": "en",
    "insecure.banner": "You opened USend over http://. End-to-end encryption requires https://.",
    "insecure.switch": "Switch to https",

    // ---- topbar ----
    "brand.eyebrow": "USEND",
    "top.trust": "End-to-end encrypted",
    "lang.switchTo": "Switch to 中文",

    // ---- github star ----
    "star.btn.hasStars": "Star",
    "star.btn.firstStar": "Be the first Star",
    "star.btn.star": "Star",
    "star.aria.hasStars": "Star this project on GitHub — currently {count} stars",
    "star.aria.firstStar": "Be the first to star this project on GitHub",
    "star.aria.star": "Star this project on GitHub",
    "star.title.hasStars": "{count} stars so far",
    "star.title.firstStar": "Be the first Star",
    "star.ended.cta": "Drop a Star so more people can find USend",

    // ---- footer ----
    "footer.left": "End-to-end encrypted · Auto-deleted · No account needed",

    // ---- trust strip ----

    // ---- hero ----
    "hero.h1.send": "Send to |another device",
    "hero.h1.receive": "Receive from |another device",
    "hero.trust.encrypt": "Encrypted in the browser",
    "hero.trust.account": "No account needed",
    "hero.trust.burn": "Burns after reading",
    "hero.p.send": "No sign-in, no copied links. Pick your content, connect with a one-time pairing code.",
    "hero.p.receive": "Enter the pairing code shown on the sending device. Content is decrypted only on this device.",

    // ---- mode switch ----
    "mode.send": "Send",
    "mode.receive": "Receive",

    // ---- send card / segmented ----
    "seg.file": "File",
    "seg.text": "Text",

    // ---- dropzone ----
    "drop.empty.title": "Choose a file",
    "drop.empty.meta": "drop, click, or paste · up to 20 MB",
    "drop.filled.meta": "{size} · ready",
    "drop.change": "Choose a different file",
    "drop.tooLarge": "File must be 20 MB or smaller",

    // ---- text ----
    "text.placeholder": "Paste some text, an address, or any temporary note…",
    "text.count": "{n} / 12,000",
    "text.defaultName": "temporary-text.txt",

    // ---- send options ----
    "opt.autoDelete": "Expires in",
    "opt.after1": "1 minute",
    "opt.after5": "5 minutes",
    "opt.after10": "10 minutes",

    // ---- security options ----
    "sec.heading": "Transfer settings",
    "sec.summary.confirm": "Security code required",
    "sec.summary.auto": "Send automatically",
    "sec.summary.internet": "Any network",
    "sec.summary.network": "Same network only",
    "sec.summary.passphrase": "Password set",
    "sec.verify.title": "Check security code before sending",
    "sec.verify.sub": "On by default to prevent connecting to the wrong device",
    "sec.network.title": "Same network only",
    "sec.network.sub": "Use only when both devices are on the same Wi-Fi",
    "sec.network.caveat": "VPNs, proxies, cellular data, or privacy relays can prevent this check from working. Leave it off if you're unsure.",
    "sec.passphrase.title": "Set a receive password",
    "sec.passphrase.sub": "The receiver must also enter this password",
    "sec.passphrase.placeholder": "At least 8 characters",
    "sec.passphrase.hint.empty": "At least 8 characters",
    "sec.passphrase.hint.short": "{n} more characters before we can generate a pairing code",
    "sec.passphrase.hint.ok": "Password length looks good",

    // ---- primary button / send stages ----
    "btn.generate": "Create pairing code",
    "btn.passphraseShort": "Password needs {n} more characters",
    "stage.room": "Creating pairing code…",
    "stage.waiting": "Waiting for receiver…",
    "stage.verify": "Waiting for security code check…",
    "stage.encrypt": "Encrypting on this device…",
    "stage.upload": "Sending encrypted content…",
    "err.transfer": "Transfer failed. Please start again.",
    "err.timeout": "The request timed out — the network is too slow or the connection dropped. Please try again.",
    "err.network": "Could not reach the server. Please check your connection and try again.",
    "err.rate": "Too many attempts. Please wait a moment and try again.",
    "err.expired": "This pairing code does not exist or has expired.",
    "err.cancelled": "The transfer was cancelled.",

    // ---- how section ----
    "how.link": "How security works",
    "how.kicker": "HOW IT WORKS",
    "how.title": "Content is decrypted only on your devices.",
    "how.1.title": "One-time connection",
    "how.1.body": "The pairing code works for this transfer only.",
    "how.2.title": "End-to-end encryption",
    "how.2.body": "Your devices create the encryption key. The server can't decrypt the content.",
    "how.3.title": "Automatic cleanup",
    "how.3.body": "Temporary data is deleted after receipt or when time runs out.",

    // ---- discovery content ----
    "discover.kicker": "WHY USEND",
    "discover.title": "No sign-in, no shared folder.\nJust a quick transfer.",
    "discover.intro": "Send a file or a piece of text to another device without creating an account or leaving a permanent public link.",
    "discover.card1.title": "Phone to computer",
    "discover.card1.body": "Choose a file on your phone, then enter the one-time pairing code on your computer to receive it.",
    "discover.card2.title": "Temporary file sharing",
    "discover.card2.body": "Send a contract, screenshot, attachment, or archive without uploading it to a shared drive or granting lasting access.",
    "discover.card3.title": "Move text and links",
    "discover.card3.body": "Move an address or a temporary note between devices, then copy it where you need it.",
    "discover.faq.title": "Frequently asked questions",
    "discover.faq1.q": "Do I need an account?",
    "discover.faq1.a": "No. Neither device needs an account. They connect with a one-time 8-digit pairing code.",
    "discover.faq2.q": "Is USend secure?",
    "discover.faq2.a": "Content is encrypted on the sending device first. The two devices negotiate the real encryption key, so the server cannot decrypt the content.",
    "discover.faq3.q": "How long is a file kept?",
    "discover.faq3.a": "Temporary data is deleted after receipt. If nobody receives it, it expires after 5 minutes by default and at most 10 minutes.",
    "discover.faq4.q": "What can I send?",
    "discover.faq4.a": "You can send common files and text. Each file can be up to 20 MB.",
    "discover.openSource": "View the open-source project and security notes",

    // ---- receive entry ----
    "recv.h2": "Enter the 8-digit code",
    "recv.code.placeholder": "0000 0000",
    "recv.code.hint.empty": "Enter the 8 digits shown by the sender",
    "recv.code.hint.remaining": "Need {n} more",
    "recv.code.hint.ready": "Pairing code complete — ready to connect",
    "recv.passphrase.placeholder": "Enter receive password",
    "recv.btn.joining": "Connecting…",
    "recv.btn.waiting": "Waiting for content…",
    "recv.btn.start": "Connect device",
    "recv.btn.remaining": "Need {n} more",
    "recv.btn.enterPassphrase": "Enter receive password",
    "recv.btn.withPassphrase": "Connect and receive",
    "recv.verify.label": "Security code",
    "recv.verify.hint": "Make sure the sender shows the same security code.",
    "recv.err.code": "Please enter the 8-digit code",
    "recv.err.rate": "Too many attempts. Please try again later.",
    "recv.err.notfound": "This code doesn't exist or has expired.",
    "recv.err.paired": "This transfer has already paired with another device.",
    "recv.err.network": "We couldn't confirm that both devices are on the same network. Turn off VPN, proxy, or cellular data, or ask the sender to disable “Same network only.”",
    "recv.err.passphrase": "Incorrect receive password.",
    "recv.err.fallback": "Receive failed. Please check the code and try again.",

    // ---- receive done ----
    "done.eyebrow": "Received securely",
    "done.h2.text": "Text received",
    "done.h2.file": "File received",
    "done.save": "Save",
    "done.delete.ok": "Temporary encrypted data deleted",
    "done.delete.fail": "Content received. Temporary encrypted data will be deleted at expiry.",

    // ---- ready page ----
    "ready.eyebrow.waiting": "Waiting for receiver",
    "ready.h1.waiting": "Enter this pairing code\non the other device",
    "ready.h1.ended": "This transfer\nhas safely ended.",
    "ready.pair.hint": "Valid for this transfer only · click to copy",
    "ready.pair.copy": "Copy pairing code",
    "ready.pair.copied": "Copied",
    "ready.badge.confirm": "Security code required",
    "ready.badge.auto": "Send automatically after connection",
    "ready.badge.network": "Same network only",
    "ready.badge.passphrase": "Receive password required",
    "ready.verify.label": "Security code",
    "ready.verify.hint": "Make sure both devices show the same security code.",
    "ready.verify.btn": "Codes match — send",
    "ready.countdown": "Time remaining",
    "ready.privacy.title": "No links, no accounts",
    "ready.privacy.sub": "The code only finds the room. The encryption key is negotiated by the two devices.",
    "ready.btn.again": "Send something new",
    "ready.btn.destroy": "Cancel transfer",
    "ready.btn.ended": "Ended",
    "ready.note.ended": "This pairing code is now invalid and can't be used again",
    "ready.note.waiting": "Share the pairing code with the receiver",

    // ---- end reasons ----
    "end.received.eyebrow": "Received securely",
    "end.received.message": "Content received. Temporary encrypted data was deleted.",
    "end.expired.eyebrow": "Transfer expired",
    "end.expired.message": "The pairing code expired and temporary data was deleted.",
    "end.revoked.eyebrow": "Destroyed",
    "end.revoked.message": "Transfer canceled. Temporary data was deleted.",
  },
};

const LangContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] != null ? String(params[key]) : `{${key}}`,
  );
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  const setLang = useCallback((next) => {
    setLangState(next);
    writeItem(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
      const dictTitle = DICT[lang]?.["doc.title"];
      if (dictTitle) document.title = dictTitle;
      const description = DICT[lang]?.["doc.description"];
      const descriptionMeta = document.querySelector('meta[name="description"]');
      if (description && descriptionMeta) descriptionMeta.setAttribute("content", description);
    }
  }, [lang]);

  const value = useMemo(() => {
    const table = DICT[lang] || DICT.zh;
    const t = (key, params) => {
      const raw = table[key];
      if (raw == null) {
        // 退回到另一语言，再退回到 key 本身，避免出现裸 key
        const fallback = DICT.zh[key] ?? DICT.en[key] ?? key;
        return interpolate(fallback, params);
      }
      return interpolate(raw, params);
    };
    return { lang, setLang, t };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
