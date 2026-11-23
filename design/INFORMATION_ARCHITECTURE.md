# 雪约 V1 信息架构与用户旅程

版本：V1  
确认日期：2026-11-23

## 主导航

- **首页**：搜索入口、附近行程、我的待办。
- **找拼车**：搜索、筛选、行程详情、申请与报价。
- **发布**：三步发布拼车，使用中间强调入口。
- **行程**：我作为车主、我作为乘客的所有行程。
- **我的**：资料、认证、安全中心、账号与隐私。
- **消息通知**：页头全局入口，通知申请、回价、路线和席位变化。

## 页面信息架构

```mermaid
flowchart TD
  APP["雪约 App"]
  APP --> HOME["首页"]
  APP --> FIND["找拼车"]
  APP --> PUBLISH["发布拼车"]
  APP --> TRIPS["我的行程"]
  APP --> ME["我的"]
  APP --> NOTICE["消息通知"]

  HOME --> HOME1["搜索雪场或出发区域"]
  HOME --> HOME2["附近即将出发"]
  HOME --> HOME3["我的待办"]
  HOME3 --> TODO1["待处理申请"]
  HOME3 --> TODO2["待回应回价"]
  HOME3 --> TODO3["路线变更确认"]
  HOME3 --> TODO4["即将出发"]

  FIND --> FILTER["搜索与筛选"]
  FILTER --> LIST["拼车结果列表"]
  LIST --> DETAIL["拼车详情"]
  DETAIL --> ROUTE["当前有效路线"]
  ROUTE --> MAP["真实地图路线详情"]
  MAP --> MAP1["起点 已确认接人点 雪场"]
  MAP --> MAP2["真实道路 距离与预计时间"]
  MAP --> MAP3["路线版本与更新时间"]
  DETAIL --> SEATS["剩余座位与雪具位"]
  DETAIL --> PRICE["最低价格与车主规则"]
  DETAIL --> APPLY["提交申请"]
  APPLY --> PEOPLE["选择人数"]
  APPLY --> GEAR["填写雪具与行李"]
  APPLY --> PICKUP["选择精确上车位置"]
  APPLY --> QUOTE["按人报价"]
  APPLY --> TOTAL["核对总价与规则"]
  TOTAL --> SUBMIT["提交申请"]
  SUBMIT --> STATUS["申请状态"]

  PUBLISH --> STEP1["出发与目的地"]
  STEP1 --> STEP2["人数与雪具容量"]
  STEP2 --> STEP3["最低价与规则"]
  STEP3 --> PREVIEW["发布预览"]
  PREVIEW --> MANAGE["行程管理"]
  MANAGE --> REQUESTS["申请审核中心"]
  REQUESTS --> REQUEST["申请详情"]
  REQUEST --> COMPARE["当前路线与加入后路线"]
  COMPARE --> MAP_COMPARE["真实地图前后对照"]
  MAP_COMPARE --> MAP_DIFF["新增距离 时长与途经点"]
  REQUEST --> OFFER["报价与最低价对比"]
  REQUEST --> DECIDE["同意 / 拒绝 / 回价"]
  MANAGE --> MEMBERS["已确认成员"]
  MANAGE --> VERSIONS["路线版本"]
  MANAGE --> CANCEL["修改或取消"]

  TRIPS --> AS_PASSENGER["我作为乘客"]
  TRIPS --> AS_OWNER["我作为车主"]
  AS_PASSENGER --> P1["申请中"]
  AS_PASSENGER --> P2["已成交"]
  AS_PASSENGER --> P3["已完成"]
  AS_PASSENGER --> P4["已取消"]
  AS_OWNER --> O1["招募中"]
  AS_OWNER --> O2["已满员"]
  AS_OWNER --> O3["待出发"]
  AS_OWNER --> O4["已完成"]

  ME --> PROFILE["个人资料"]
  ME --> VERIFY["手机号与车主认证"]
  ME --> SAFETY["安全中心"]
  ME --> SETTINGS["账号与隐私"]
  ME --> HELP["规则与客服"]
```

## 申请状态

| 状态 | 是否占座 | 路线变化 | 下一步 |
| --- | --- | --- | --- |
| 待车主审核 | 否 | 否 | 车主同意、拒绝或回价 |
| 车主回价中 | 否 | 否 | 乘客接受、再想想或放弃 |
| 再想想 | 否 | 否 | 有效期内答复，超时失效 |
| 席位冲突 | 否 | 否 | 重新选车或减少人数 |
| 已成交 | 是 | 生成新版本 | 等待出发 |
| 已拒绝 | 否 | 否 | 寻找其他行程 |
| 已放弃或超时 | 否 | 否 | 可重新申请 |
| 已取消 | 释放 | 更新版本 | 查看记录 |

## 核心规则

- 成交动作必须原子校验余位、锁定价格并生成路线版本。
- 多人申请整组成交，不支持只接受其中一部分乘客。
- 首发版本仅允许一轮回价。
- 未成交展示脱敏位置，成交后才向同行成员公开精确集合点。
- 页面统一使用“费用协商”“已确认价格”“线下结算”，不表现平台支付或担保。
- 拼车详情以真实地图为主要视图，路线由地图服务计算，不使用装饰性示意图替代产品页面。
- 未成交状态仅向申请人与车主展示计算所需的精确位置；公开详情隐藏精确地址。
- 车主审核申请时，地图必须同时展示当前路线与加入申请后的路线差异。
