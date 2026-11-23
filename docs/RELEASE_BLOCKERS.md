# 应用商店发布阻塞项

更新时间：2026-11-23

代码和无账号发布物料已经准备完成。以下项目必须由应用所有者确认或提供，Agent 不应自行猜测或伪造。

## 1. 冻结应用身份

已确认：

- Android 包名：`com.xueyue.snowdate`
- 商店名称：雪约
- 开发者主体：蒲乐
- 公开支持邮箱：`wy_pule@163.com`

包名第一次上传 Google Play 后不可修改，现已冻结。

## 2. Expo / EAS

当前状态：未登录。

由应用所有者在终端自行执行：

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

不要把 Expo 密码或 `EXPO_TOKEN` 粘贴到聊天中。登录完成后 Agent 可以继续关联项目、生成 AAB 和检查构建。

## 3. Google Play

需要：

- 已完成身份验证的 Google Play Developer 账号。
- 在 Play Console 创建“雪约”应用。
- 上传第一个 AAB 的内部测试轨道权限。
- 服务账号 JSON，保存到 `secrets/play-service-account.json`。

如果没有服务账号，也可以先由 Agent 生成 AAB，再在 Play Console 手动上传。

## 4. 隐私政策与支持页

静态文件已准备在 `store-site/`，开发者主体与支持邮箱已填写。还需要：

- 已推送到 `pule-dpr/xueyue`。
- 已启用 GitHub Actions Pages。
- 隐私政策：https://pule-dpr.github.io/xueyue/privacy.html
- 支持页面：https://pule-dpr.github.io/xueyue/support.html

可选部署方式：GitHub Pages、Cloudflare Pages、Netlify、Vercel 或任何静态网站托管。当前机器没有这些平台的登录状态。

## 5. 生产服务端与短信

如果首发坚持“真实手机号认证”：

- 部署 `Dockerfile` 到支持持久磁盘或外部数据库的托管平台。
- 配置 HTTPS API 域名。
- 接入真实短信供应商。
- 在 EAS `production` 环境设置 `EXPO_PUBLIC_API_URL`。

如果首发采用本机模式：

- 生产构建不设置 `EXPO_PUBLIC_API_URL`。
- App 中手机号只保存本机且不显示为已认证。
- Store Data Safety 按本机数据填写。

两种方案都可以构建，但不能在未部署 API 时把手机号宣传为服务端已验证。

## 6. 当前无法自动完成的原因

- `npx eas-cli@latest whoami` 返回 `Not logged in`。
- 没有 EAS project ID。
- 没有 Google Play 服务账号 JSON。
- GitHub 项目尚未创建或关联。
- 当前机器没有 Android SDK，无法绕过 EAS 在本机生成正式 AAB。

## 完成上述信息后可执行

```bash
npm run release:check
npm run build:release
npm run submit:android
```

随后在 Play Console 完成内部测试、Data Safety、内容分级，并推进封闭测试或生产轨道。
