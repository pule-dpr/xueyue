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

当前状态：已登录 `provck`，并已关联项目：

```text
@provck/xueyue
1ff6fa9a-09ea-46d2-a54c-352016036e35
```

EAS 已创建并托管 Android keystore。

已完成：

- Production AAB：versionCode 8
- AAB：https://expo.dev/artifacts/eas/L_NElh776mKrd-uf2G24SB8nOn4iMsvS8wdJPU35K94.aab
- Preview APK：https://expo.dev/artifacts/eas/Jx_jYZw5dTHSNcWgz_Tp56qwHMJDCrf6QyVwZ_COjBU.apk

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

GitHub Pages 已启用，两个 URL 当前可公开访问。

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

- Google Play Developer 账号尚未注册和完成身份验证。
- 没有 Google Play 服务账号 JSON。
- 没有 Play Console 应用和内部测试轨道。

代码、EAS 构建、APK、AAB 和 GitHub Pages 不再是阻塞项。

## 完成上述信息后可执行

```bash
npm run release:check
npm run build:release
npm run submit:android
```

随后在 Play Console 完成内部测试、Data Safety、内容分级，并推进封闭测试或生产轨道。
