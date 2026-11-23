# Android 商店发布手册

本文对应当前项目配置：Expo SDK 58、应用名“雪约”、包名 `com.xueyue.snowdate`、版本 `1.0.0`、`versionCode 1`。

## 1. 发布前必须冻结的字段

| 字段 | 当前值 | 规则 |
| --- | --- | --- |
| App 名称 | 雪约 | 商店可显示更长副标题，但首次发布前确认商标和渠道占用 |
| Android 包名 | `com.xueyue.snowdate` | 已确认，发布后不可修改 |
| 正式签名 | EAS 托管 | 必须备份，丢失后同包名无法正常升级 |
| 应用版本 | `1.0.0` | 用户可见语义版本 |
| versionCode | `1` | 每次提交必须递增；不得复用 |
| 隐私政策 URL | GitHub Pages 部署后填写 | 审核硬性资料 |
| 开发者主体 | 蒲乐 | 已确认 |

包名已经确认，不得在首次上传后再修改。

## 2. 本机准备

### 路径 A：云端构建，推荐

需要：

- Node.js 22 LTS
- Expo 账户
- 稳定的项目 Git 仓库
- 浏览器

```bash
nvm use
npm ci
npx expo-doctor
npx expo export --platform android
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` 会把项目关联到 Expo 账户，并在 `app.json` 的 `extra.eas.projectId` 写入项目 ID。不要提交他人项目的 ID。

### 路径 B：本机 Gradle 构建

额外需要：

- Android Studio 当前稳定版
- Android SDK Platform 与 Build Tools
- Android Studio 自带 JDK 17 或项目兼容 JDK
- Android 模拟器或开启 USB 调试的真机

本项目使用 Continuous Native Generation，不需要提交 `android/`：

```bash
npx expo prebuild --platform android
npx expo run:android
```

原生改动应通过 `app.json` 或 config plugin 完成。不要修改生成目录后忘记来源，否则下次 prebuild 会覆盖。

## 3. 生成测试 APK

项目已将 `preview` 配置为内部分发 APK：

```bash
npm run build:preview
```

等价命令：

```bash
npx eas-cli@latest build --platform android --profile preview
```

构建完成后：

- 把 APK 链接发给测试人员安装，或直接从设备下载。
- 如果本机有 ADB：`adb install path/to/app.apk`。
- 用真实网络、真实字体大小和至少两台 Android 机型测试。

测试 APK 不能上传 Google Play 作为正式商店包。

## 4. 生成 Google Play AAB

```bash
npm run build:release
```

等价命令：

```bash
npx eas-cli@latest build --platform android --profile production
```

`eas.json` 使用：

- `buildType: app-bundle`
- `autoIncrement: true`
- 版本来源：Expo 远程版本源

每次生产构建前检查：

1. `app.json` 的 `version` 是否表示本次用户可见版本。
2. Expo 远程 `versionCode` 是否大于商店最后一次上传。
3. 包名、名称、图标、隐私政策没有变化错。
4. 构建提交的 Git commit 是已审核版本。

## 5. Android 签名

EAS 第一次生产构建会询问是否生成 keystore。选择由 EAS 管理后：

1. 在 Expo 项目设置中限制成员访问。
2. 下载并离线备份 keystore 与凭据。
3. 记录 keystore alias、密码、EAS 项目 ID 和恢复步骤。
4. 不要把 keystore、密码或凭据提交到 Git。

Google Play 新应用通常使用 Play App Signing。EAS 的 upload key 负责上传，Google 管理最终签名密钥。不要删除或重置任何一方密钥。

## 6. Google Play Console 首次发布

前提：完成开发者账户、身份和付款资料验证，并接受当时有效的开发者协议。个人账号通常还会触发额外测试要求，务必以 Play Console 当时提示为准。

### 创建应用

1. 名称：`雪约`
2. 默认语言：简体中文
3. 类型：应用
4. 免费/付费：按商业模式选择；免费发布后不能直接改回付费

### 填写商店资料

- 应用名称
- 简短说明
- 完整说明
- App 图标 512×512
- 特色图片 1024×500
- 手机截图 2–8 张
- 分类：生活方式或旅行与本地（以当前 Play Console 分类为准）
- 联系邮箱
- 隐私政策 URL

可直接使用 `store/` 中的素材和 `docs/STORE_LISTING.md` 文案，但必须替换联系方式并检查截图是否与最终包一致。

### 内容与合规

- 内容分级问卷：当前版本无用户公开内容、无成人内容、无赌博。
- 广告声明：当前版本无广告。
- 目标受众：成年人/一般用户；如果面向未成年人，儿童安全政策会成为独立高风险项。
- Data Safety：当前版本内容只保存在设备；系统分享由用户主动发起。确认无隐藏分析 SDK。
- 地图：当前为离线真实道路样例，不调用在线地图 SDK；接入高德后需重新声明位置、设备与第三方 SDK。
- 新闻应用：否。
- 政府应用：否。
- 健康声明：无医疗功效声明。
- 金融功能：无。

任何后续新增的崩溃统计、分析、登录、推送、地图、广告 SDK 都可能改变 Data Safety 答案。每次加 SDK 都重新审查。

### 上传测试版本

1. 创建内部测试轨道。
2. 上传第一个 AAB。
3. 添加测试人员邮箱或 Google Group。
4. 审核发布说明和构建详情。
5. 安装测试链接版本，按真实发布流程回归。

正式生产发布前，确认：

- 无白屏、崩溃、ANR。
- 创建、重启恢复、分享、返回键和清单勾选全部正常。
- 商店截图、名称和实际功能一致。
- 隐私政策可公开访问；邮箱可用。
- 应用内无测试调试入口或占位文案。

### 分阶段发布

推荐：

```text
5% -> 观察 24–48 小时 -> 20% -> 50% -> 100%
```

只要崩溃率、首日留存或关键流程出现明显异常，就暂停并修复。

## 7. 后续提交

```bash
npm run build:release
```

如果使用 Google 服务账号自动提交：

1. 在 Google Cloud 创建服务账号。
2. 在 Play Console 授权发布权限。
3. 下载 JSON 到 `secrets/play-service-account.json`。
4. 确保 `secrets/` 已加入 `.gitignore`。
5. 执行：

```bash
npm run submit:android
```

`eas.json` 当前默认提交到 `internal` 轨道。确认无误后，在 Play Console 手动推进到封闭/生产轨道，或修改配置并经过代码评审。

## 8. 国内安卓商店

常见渠道包括华为应用市场、小米应用商店、OPPO 软件商店、vivo 应用商店、应用宝等。各渠道入口、主体资格、软件著作权和备案要求会变化，提交时以渠道后台和当地监管要求为准。

建议提前准备：

- 开发者实名认证或企业资质。
- APP 备案信息与备案号。
- 隐私政策公开 URL。
- 权限说明与第三方 SDK 清单。
- 软件著作权证书（部分渠道/类目会要求或有利于审核）。
- 相同包名、版本号和签名体系。
- 测试账号（有登录后）。
- 内容安全与用户协议（有公开用户内容后）。

当前 MVP 不申请定位、通讯录、短信和通知等敏感权限。保持这个范围能显著降低审核和隐私成本。

国内分发不要直接依赖 Google Play 服务；如果未来接入登录、地图、推送或支付，需选择国内可用方案并重新测试无 GMS 设备。

## 9. 发布检查表

- [ ] 最终名称和包名已冻结
- [ ] 商标与渠道名称检索完成
- [ ] 图标、启动图、横图和截图与当前版本一致
- [ ] `version` 与 `versionCode` 已确认
- [ ] 隐私政策 URL 可公开访问
- [ ] 联系邮箱真实可用
- [ ] 应用无调试入口、测试人员姓名和占位引用
- [ ] 真机通过创建、持久化、分享、返回键回归
- [ ] AAB 已上传内部测试
- [ ] Data Safety、内容分级、受众、广告问卷完成
- [ ] 应用备案/软著等渠道要求完成
- [ ] 签名备份可恢复
- [ ] 分阶段发布计划已确定

## 10. 常见故障

**`versionCode` 已存在**

生产构建必须自动递增，或手动提高远程版本；不能让 Play 收到重复值。

**Upload key 不匹配**

确认使用的是第一次上传的签名。不要擅自重置；先在 Play Console 走密钥重置流程。

**构建成功但安装闪退**

用同一 commit 生成 development/preview 构建，查看 Logcat；确认字体文件、原生模块和远程配置没有差异。

**隐私审核要求修改**

先以真实代码和 SDK 为准更新隐私政策与 Data Safety，再解释权限用途。不要只改商店文案而保留实际收集行为。

**国内渠道说包名/签名与其他渠道不一致**

全渠道应使用同一应用身份与升级签名策略。主要差异应只在上架资料，而不是 APK/AAB 身份。
