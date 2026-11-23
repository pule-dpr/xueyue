# 雪约 API

这是雪约的服务端基础实现，使用 Node.js 内置 HTTP、SQLite、HMAC 会话签名和事务锁座，不依赖外部运行时包。Node 22 需要 `--experimental-sqlite` 标志，项目脚本已经包含该标志。

## 启动

```bash
npm run server
```

默认地址为 `http://127.0.0.1:3100`，数据库写入 `server/data/xueyue.sqlite`。

开发环境验证码默认为 `246810`。服务端只在 `SMS_PROVIDER=development` 时返回这个开发验证码；配置为其他值时，未接入真实短信发送器会明确返回 `503`，不会静默降级。

## 接入 Expo

在 `.env.local` 中配置：

```bash
EXPO_PUBLIC_API_URL=http://localhost:3100
```

Android 模拟器访问宿主机时通常改为：

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3100
```

真机需要使用开发机局域网地址，并确保 API 监听 `0.0.0.0`：

```bash
HOST=0.0.0.0 npm run server
```

未配置 `EXPO_PUBLIC_API_URL` 时，App 保持现有本地演示模式。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 服务健康状态 |
| `POST` | `/v1/auth/request-code` | 生成手机号验证码挑战 |
| `POST` | `/v1/auth/verify-code` | 验证码换取会话令牌 |
| `GET` | `/v1/me` | 当前用户 |
| `PATCH` | `/v1/me` | 更新昵称与车辆资料 |
| `GET` | `/v1/rides` | 查询可申请拼车 |
| `POST` | `/v1/rides` | 发布拼车 |
| `GET` | `/v1/rides/:id` | 拼车详情 |
| `POST` | `/v1/rides/:id/applications` | 提交申请 |
| `GET` | `/v1/applications` | 我申请或我收到的申请 |
| `POST` | `/v1/applications/:id/accept` | 车主同意 |
| `POST` | `/v1/applications/:id/reject` | 车主拒绝 |
| `POST` | `/v1/applications/:id/counter` | 车主回价 |
| `POST` | `/v1/applications/:id/accept-counter` | 乘客接受回价 |
| `POST` | `/v1/applications/:id/withdraw` | 乘客撤回 |
| `GET` | `/v1/notifications` | 当前用户通知 |
| `PATCH` | `/v1/notifications/:id/read` | 标记单条已读 |
| `PATCH` | `/v1/notifications/read-all` | 全部已读 |

除公共健康检查和认证接口外，所有 API 都需要：

```text
Authorization: Bearer <token>
```

## 安全边界

- 验证码只保存 HMAC 摘要，不保存明文。
- 会话令牌经过 HMAC 后写入数据库，服务端不保存原始令牌。
- 验证码 5 分钟过期，最多尝试 5 次。
- 同意申请时使用 `BEGIN IMMEDIATE` 在同一 SQLite 事务内重新校验座位、雪具、申请状态和路线版本。
- 满员时自动让同一行程的其他待处理或回价申请失效，并写入通知。
- 生产环境必须设置 `AUTH_SECRET`，并先接入真实短信发送器、限流、日志脱敏和风控。

## 测试

```bash
npm run server:test
```

测试覆盖认证、发布、申请、回价、锁座、满员失效和通知。
