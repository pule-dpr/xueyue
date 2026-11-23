# 雪约部署与商店上线

当前目标渠道是 Google Play Android。国内安卓商店需要开发者主体、APP 备案、软著和渠道后台，不能仅依赖 Google Play 材料。

## 当前已准备

- Expo SDK 58 Android 工程
- EAS `preview` APK 与 `production` AAB 配置
- 应用图标、512×512 商店图标、1024×500 横图和 7 张手机截图
- 中文商店文案
- 可 Docker 化的 Node + SQLite API
- 静态隐私政策、首页和支持页
- 发布前自动审计脚本

## 1. 冻结应用身份

首次上传后不能修改 Android 包名。当前已确认：

- 包名：`com.xueyue.snowdate`
- 名称：雪约
- 开发者主体：蒲乐
- 支持邮箱：`wy_pule@163.com`

## 2. 发布隐私与支持页面

静态文件位于 `store-site/`。本地预览：

```bash
npm run site
```

访问 `http://localhost:4173`。部署到任意静态托管后，记录公开地址，例如：

```text
https://example.com/xueyue/privacy.html
https://example.com/xueyue/support.html
```

开发者主体与支持邮箱已经写入页面。部署后运行：

```bash
npm run release:check
```

## 3. 部署 API

容器构建：

```bash
docker build -t xueyue-api .
docker run --rm -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e AUTH_SECRET="$(openssl rand -hex 32)" \
  -e SMS_PROVIDER=disabled \
  -v xueyue-data:/app/server/data \
  xueyue-api
```

生产环境至少需要：

- 一个支持持久磁盘的容器或托管数据库。
- HTTPS 域名，例如 `https://api.example.com`。
- `AUTH_SECRET` 随机密钥。
- 真实短信供应商。
- 反向代理限流、访问日志和告警。
- 定期备份 SQLite，或迁移到 PostgreSQL。

当前 `SMS_PROVIDER=disabled` 时，认证接口会明确返回 `503`，不会使用演示验证码。真实短信接入完成前不能把手机号认证标记为已认证。

## 4. 配置 Expo 环境

登录 Expo：

```bash
npx eas-cli@latest login
```

关联项目：

```bash
npx eas-cli@latest init
```

如启用生产 API：

```bash
npx eas-cli@latest env:set \
  --name EXPO_PUBLIC_API_URL \
  --value https://api.example.com \
  --environment production \
  --visibility plaintext
```

`EXPO_PUBLIC_*` 会进入客户端包，不能存放密钥。

如果不部署 API，生产构建会保持本机模式。此时商店文案、隐私政策和 App 内认证文案必须一致，且不能展示“服务端已验证”。

## 5. 生成 AAB

```bash
npm run release:check
npm run build:release
```

首次生产构建会让 EAS 生成 Android keystore。完成后必须：

- 限制 Expo 项目成员权限。
- 备份 EAS 凭据。
- 记录项目 ID、包名和恢复步骤。

## 6. 上传 Google Play

前提：

- Google Play Developer 账号已完成身份和付款验证。
- Play Console 已创建应用。
- 商店资料、内容分级、Data Safety 和测试轨道已经配置。
- 已下载服务账号 JSON 到 `secrets/play-service-account.json`。

```bash
npm run submit:android
```

`eas.json` 当前提交到 `internal`。先在 Play Console 完成内部测试，再逐步推进封闭测试和生产发布。个人开发者账号可能需要满足当前 Play Console 规定的测试人数与持续时间。

## 7. 上线验收

- 从 Play 内部测试链接安装，不通过 Expo Go。
- 检查首次启动、返回、重启恢复、分享和 Android 返回键。
- 关闭网络，确认地图关键词、认证和本机功能给出明确状态。
- 检查截图中没有开发占位文案。
- 检查隐私政策公开可访问，邮箱可收信。
- 检查 Data Safety 与实际 SDK、网络请求和数据库一致。
- 记录 AAB 版本号、Git commit、EAS build ID 和签名指纹。

## 当前外部阻塞

截至 2026-11-23，本机没有 Expo 登录、EAS 项目关联、Google Play 服务账号或已认证的 Play Developer 后台，因此无法在此机器上完成云端 AAB 与商店上传。需要先完成上述账号级操作。
