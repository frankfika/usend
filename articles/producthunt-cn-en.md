# Product Hunt Launch Worksheet · USend

> ⚠️ **DRAFT — 提交动作由你本人执行。**
> Product Hunt 对自动化访问有 Cloudflare 拦截（curl 403、内置浏览器卡验证页），所以这份是「照抄进表单」的物料包，不是自动发布脚本。
> 提交前请按文末《提交前检查清单》逐项核对，尤其是 **LICENSE**（当前仓库没有）与 **画廊图数量**。

---

## 0. 私有定位（不提交，仅供写稿时对齐语气）

> I built USend for people who need to hand a file or a secret to another device **without** creating an account or a permanent link, so the transfer takes under a minute and leaves nothing behind.

## 1. Product Hunt 字段要求（2026 现行，提交前请在 PH 页面再核一次）

| 字段 | 要求 | 本包状态 |
|---|---|---|
| Tagline | ≤ 60 字符 | ✅ 已备好（含字符数） |
| Description | ≤ 260 字符 | ✅ 已备好（含字符数） |
| First Maker Comment | 200–400 词，第一人称 | ✅ 已备好（**2 处需你改成自己的经历**） |
| Gallery images | 5–8 张，1270×760，首图为缩略图 | ✅ 已备好 5 张 1270×760（`docs/assets/gallery/1-home.png` ～ `5-receive.png`，`npm run gallery` 重拍） |
| Gallery video | 45–60 秒，静音可看 | ❌ 还没有 |
| App icon | 240×240 px | ✅ `public/icon-512.png` 可缩放 |
| Launch window | 00:01 PT，周二/周三/周四 | ✅ 建议 |

---

## 2. 基本信息

| 字段 | 值 |
|---|---|
| **Name** | USend |
| **Website** | https://usend.xyz/ |
| **Repository** | https://github.com/frankfika/usend |
| **Version at launch** | v0.1.1 |
| **License** | ✅ MIT（`LICENSE` + `package.json` 均已补上），PH 上可写 "Open Source" |
| **Stack** | React 19 · TypeScript · Cloudflare Workers + Durable Objects |
| **Maker** | 陈放（Frank）· github.com/frankfika |

---

## 3. Tagline（≤60 字符）

**English（推荐，用这版提交）**

> E2E-encrypted transfers without accounts or share links

（55 字符 ✅）

**English 备选**

> Private file transfer, no account and no share link

（51 字符 ✅）

> Send files between devices. No account, no link, E2E encrypted.

（63 字符 ❌ 超了 3 个字，别用）

**中文版**

> 不注册、不分享链接的端到端加密临时传输

（19 字符）

> **给 PH 提交时选英文版**：PH 流量以英文为主；中文版留作自己分发时用。

---

## 4. Description（≤260 字符，PH 产品页短描述）

**English（提交用这版）**

> USend moves a file or text between two devices in seconds — no signup, no share link, just an 8-digit pairing code. Content is encrypted in your browser and decrypted only on the receiver. Rooms self-destruct after 1/5/10 minutes or the moment the file lands.

（259 字符 ✅）

**中文版**

> USend 让两台设备在几秒内互传文件或文字：不用注册、不用分享链接，只报一次 8 位配对码。内容在浏览器端加密，只在接收端解密；房间在 1/5/10 分钟后或接收完成的瞬间自动销毁。

（92 字符）

---

## 5. 关键收益（PH 产品页要点 / 画廊首图文字）

- **不用注册，也不用分享链接** —— 一次 8 位配对码完成连接
- **浏览器端端到端加密** —— ECDH P-256 协商 + HKDF-SHA-256 派生 + AES-256-GCM 加密，服务端拿不到明文
- **默认短暂存在** —— 1 / 5 / 10 分钟自动过期、接收即焚、发送方可随时撤销
- **看得见的安全过程** —— 默认让双方核对安全码；可选「仅同一网络」与接收密码
- **开箱即用** —— 浏览器打开即用，最大单文件 20 MB / 12,000 字文本

---

## 6. Topics（提交前在 PH 当前 topic 列表里核对是否存在）

`Privacy` · `Security` · `File Sharing` · `Productivity` · `Utilities` · `Web App`

> 不要加 `Open Source` —— 仓库还没放许可证，加了等于在 PH 上做无法兑现的声明。

---

## 7. 画廊素材（只用仓库里真实存在的图，不生成、不摆拍）

| # | 文件 | 内容 | 用途 |
|---|---|---|---|
| 01 | `docs/assets/home_en.png` | 发送端首页（英文界面） | **首图 / 缩略图**（截图即英文版，直接给 PH 用） |
| 02 | `docs/assets/settings_en.png` | 安全选项：安全码核对 / 仅同一网络 / 接收密码 | 证明「安全过程可见」 |
| 03 | `docs/assets/features_en.png` | 接收端输入配对码 | 补全两端流程 |
| 04 | `docs/assets/home_zh.png` | 发送端首页（中文界面） | 可选：证明双语 |
| 05 | `docs/assets/settings_zh.png` | 安全选项（中文） | 可选 |

**还需要补拍的（用真实 UI 截图，不要 AI 生成）**

1. 两台设备同屏的安全码核对画面（讲清「核对安全码」这一步）
2. 接收成功后的销毁提示（证明「阅后即焚 / 自动过期」）
3. 一次完整的「发送 → 配对 → 接收成功」三连图

**尺寸**：PH 画廊推荐 1270×760；仓库原图是原始分辨率，需等比裁切或加留白，**不要拉伸**。
**App icon**：`public/icon-512.png` → 缩到 240×240。
**Gallery video**（45–60 秒，静音可看）：目前没有。`usend` 有 `npm run screenshots` 脚本可以重出 README 图，但视频需要你自己录屏。

---

## 8. First Maker Comment（首评，提交后 60 秒内自己发出）

> **⚠️ 标了 `<<` 的两处请换成你自己的真实经历** —— PH 的首评权重最高，编出来的故事评论区一眼就会被拆穿。

> Hi, I'm Frank — I make small privacy tools that I keep running into myself.
>
> << 这里写一句你自己的触发场景：比如「我经常在两台设备间互传配置文件/一次性口令，每次都要在网盘、微信、AirDrop 之间来回倒，留下的链接和账号比文件本身更让我不安。」>>
>
> USend is my answer to that. You open a page, pick a file or type some text, and you get an eight-digit pairing code. On the other device you type the code, and the two devices agree on a shared secret via ECDH — the server never sees the key, only ciphertext it briefly relays.
>
> Three things I deliberately made non-negotiable:
>
> - **No account, no link.** No signup, no long-lived share URL to leak. Just a code that dies with the room.
> - **Short-lived by default.** You pick 1, 5 or 10 minutes. After a successful transfer the room and its ciphertext are deleted immediately; the sender can revoke at any moment.
> - **The security step is visible, not hidden.** By default the sender confirms both devices show the same security code before anything is sent. You can turn that off for trusted transfers, and optionally require the same network plus a receive password.
>
> It's built on Cloudflare Workers and Durable Objects — one Worker serves the app and the API on the same origin, each transfer room is its own Durable Object, and expiry is handled by Durable Object alarms.
>
> The repo ships the full security model, a privacy notice and a third-party-style security audit, so you can read the design before you trust it with anything: https://github.com/frankfika/usend
>
> Try it at https://usend.xyz/ — it needs no signup, and the first transfer takes under a minute.
>
> << 结尾一句：下一步打算做什么（可写：加密目录传输 / 移动端 / 自建部署 / 更多审计）。>>
>
> Happy to answer questions about the crypto choices — I did not take them lightly, and I'd rather explain the trade-offs than hide them.

**中文版（自己分发时用）**

> 大家好，我是 Frank，做一些自己先用得上的小工具。
>
> << 这里换成你自己的真实触发场景。>>
>
> USend 就是为此做的：打开页面选文件或输入文字，拿到一个 8 位配对码；另一台设备输入配对码后，两端用 ECDH 协商出共享密钥，服务端只短暂中转密文，从头到尾拿不到密钥。
>
> 三条我坚持不妥协的设计：
>
> - **不注册、不分享链接** —— 没有账号，也没有会泄露的长期分享链接，只有一个随房间一起失效的配对码。
> - **默认短暂存在** —— 可选 1 / 5 / 10 分钟过期；接收成功立即删除房间与密文；发送方随时可撤销。
> - **安全步骤是可见的** —— 默认由发送方确认两端安全码一致后再发送；可信场景可关闭，也可另加「仅同一网络」与接收密码。
>
> 技术栈是 Cloudflare Workers + Durable Objects：同一个 Worker 同域提供网页与 API，每个传输房间是独立 Durable Object，到期由 Durable Object Alarm 清理。
>
> 仓库里放了完整的安全模型、隐私说明和安全审计，你可以先读设计再决定要不要信任它：https://github.com/frankfika/usend
>
> 在线体验：https://usend.xyz/ —— 不用注册，第一次传输 1 分钟内完成。
>
> << 结尾一句：下一步打算做什么。>>

---

## 9. 提交前检查清单

- [ ] **补 LICENSE 文件**（当前没有 → 不能写 MIT、不能打 Open Source 标签）。建议 MIT，与仓库其他项目一致；确认后我可以加上
- [ ] `package.json` 补 `"license": "MIT"`
- [ ] 补拍 2–3 张真实 UI 截图 → 画廊凑到 5–8 张
- [ ] 把 3 张截图裁成 1270×760（等比，不拉伸）
- [ ] 做 240×240 app icon（`public/icon-512.png` 缩放）
- [ ] 录 45–60 秒画廊视频（静音也要能看懂）
- [ ] 首评里两处 `<<` 换成你自己的经历
- [ ] 在 PH 页面核对 Topics 是否存在、字段上限是否仍是 60/260
- [ ] 选周二/周三/周四 00:01 PT 上线
- [ ] 上线后 60 秒内自己发出首评
- [ ] 准备 5–10 位支持者：让他们**试用并留真实评论**，不要组织投票刷量（PH 明令禁止）
- [ ] 上线当天在 X 发一条（原文另写，不要照抄这段描述）

## 10. 已知短板（诚实披露，别在 PH 上被问住）

- 单文件上限 20 MB、文本上限 12,000 字 —— 大文件走不通
- v0.1.1，只有 Web 版，没有原生客户端
- 接收密码与「仅同一网络」是可选加固，默认关闭
- 端到端加密只覆盖内容，**不解决**「对面是谁」的信任问题（README 里已写明，评论区一定会问）
