# Google Play 开发者账号与首次发布

雪约的代码和 AAB 可以提前生成，但要让用户从 Google Play 下载，必须由应用所有者完成开发者账号注册、付款和身份验证。

## 1. 注册开发者账号

入口：https://play.google.com/console/signup

需要准备：

- Google 账号。
- 可完成付款的银行卡。Google Play 通常收取一次性开发者注册费，以注册页面当期显示为准。
- 与账号类型一致的真实身份信息。
- 可接收验证信息的手机号和邮箱。
- 如需公司主体，准备公司名称、地址和可验证资料。

注册过程中的付款、身份证明和协议必须由账号所有者本人确认，Agent 不应代为提交。

## 2. 创建应用

在 Play Console 创建应用：

| 字段 | 值 |
| --- | --- |
| 应用名称 | 雪约 |
| 默认语言 | 简体中文 |
| 应用或游戏 | 应用 |
| 免费或付费 | 免费 |

应用创建后，包名必须与构建包一致：`com.xueyue.snowdate`。

## 3. 首次上传

可以在没有 Play 服务账号 JSON 的情况下：

1. 从 EAS 构建页面下载 `.aab`。
2. 在 Play Console 创建内部测试轨道。
3. 手动上传 AAB。
4. 添加测试人员邮箱。
5. 安装测试链接版本并完成真机回归。

EAS 自动上传则需要：

```text
secrets/play-service-account.json
```

服务账号必须在 Google Cloud 创建，并在 Play Console 授予对应应用的发布权限。

## 4. 商店资料

使用：

- 隐私政策：https://pule-dpr.github.io/xueyue/privacy.html
- 支持页面：https://pule-dpr.github.io/xueyue/support.html
- 支持邮箱：`wy_pule@163.com`
- 图标：`store/icon-512.png`
- 横图：`store/feature-graphic-1024x500.png`
- 手机截图：`store/screenshots/v2-*.png`
- 文案：`docs/STORE_LISTING.md`

还需在 Play Console 完成：

- 内容分级。
- 目标受众。
- 广告声明。
- Data Safety。
- 新闻、政府、金融和健康功能声明。
- 隐私政策与支持联系方式。

## 5. 测试与发布

内部测试通过后：

1. 根据账号类型完成 Google 当前要求的封闭测试人数和持续时间。
2. 修复测试反馈并重新上传更高 versionCode 的 AAB。
3. 创建生产版本。
4. 完成分阶段发布设置。
5. 提交审核。

只有在审核通过并且生产轨道发布后，Google Play 用户才能公开搜索和下载雪约。
