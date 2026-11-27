# coderhub_ts_cms

基于 **Koa 3 + TypeScript** 的内容社区后端（仿"coderhub"），提供用户、动态、评论、标签、文件上传五组 REST 接口，数据存 **MySQL**，鉴权用**自实现的 RS256 JWT**，密码用 **scrypt 加盐哈希**（兼容历史 MD5 并自动升级）。

> 本文档基于仓库内实际源码逐文件整理，并且**已连真实 MySQL（8.4）跑通全量接口回归 + 32 项冒烟测试**，结论都有实测依据。文档同时记录了一轮安全与正确性修复（见第十节）与仍未处理的事项（见第十二节）。

---

## 一、一句话概览

一个**分层清晰、依赖极简**的 Node.js 后端：Koa 工程只装了 6 个运行时依赖（`koa` / `@koa/router` / `koa-bodyparser` / `@koa/multer` / `multer` / `mysql2`），JWT 签发校验、密码哈希、分页、统一响应、错误处理、跨域全部手写，没有 nest/express 之类的重框架，也没有 ORM（SQL 直接写）。

---

## 二、技术栈总览

| 分类 | 技术 / 工具 | 版本 | 说明 |
| --- | --- | --- | --- |
| 运行时 | Node.js | ≥ 20.6（实测 26.10） | 依赖 `--env-file` 加载环境变量，低版本不支持该参数 |
| Web 框架 | Koa | `^3.3.0` | 洋葱模型中间件，`async/await` 写法 |
| 路由 | @koa/router | `^15.7.1` | 每个模块一个 `Router` 实例，`prefix` 区分模块 |
| 请求体解析 | koa-bodyparser | `^4.4.1` | 解析 JSON，挂到 `ctx.request.body` |
| 文件上传 | @koa/multer + multer | `^4.0.0` / `^2.5.0` | `diskStorage` 落盘；已加**大小上限与图片类型白名单** |
| 数据库 | mysql2 | `^3.24.6` | 连接池 + `pool.promise()`，全部走预编译 `execute` |
| 语言 | TypeScript | `^7.0.2` | `strict` + 一整套严格选项（见 tsconfig） |
| 开发运行 | tsx | `^4.23.15` | `tsx watch` 热重载，免编译直跑 TS |
| 构建 | tsc | 同上 | `tsc -p` 输出到 `dist/`，产物是 CommonJS |
| Lint | Biome | `^2.6.8` | `biome lint src`（只做 lint，格式化交给 Prettier） |
| 格式化 | Prettier | `^3.6.2` | `.prettierrc`：120 列 / 4 空格 / 单引号 / 无分号 |
| 鉴权 | node:crypto 手写 JWT | — | RS256，不用 jsonwebtoken（原因见 7.1） |
| 密码 | node:crypto scrypt | — | `scrypt$N$r$p$salt$hash` 格式，每用户独立随机盐 |
| 测试 | 自写冒烟脚本 | 32 项断言 | `npm run test:api`，需先启动服务 |

**TypeScript 严格度**（`tsconfig.json`）：`strict`、`noUnusedLocals`、`noUnusedParameters`、`noImplicitReturns`、`noFallthroughCasesInSwitch`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`isolatedModules`、`erasableSyntaxOnly`、`noUncheckedSideEffectImports`。这套配置比常见项目严得多，也是全项目代码大量显式判空的原因。

---

## 三、目录结构与分层

```text
coderhub_ts_cms/
├─ src/
│  ├─ main.ts                 入口：读端口、启动 Koa
│  ├─ app/
│  │  ├─ index.ts             创建 Koa：CORS → 错误处理/日志 → bodyParser → 动态挂载路由
│  │  ├─ config.ts            读环境变量、加载 RSA 密钥、上传限制、密码参数
│  │  ├─ data-base.ts         mysql2 连接池 + 启动自检（SELECT 1）
│  │  └─ keys/                JWT 密钥（已 gitignore，用 npm run keys:generate 生成）
│  ├─ router/                 6 个模块路由 + index.ts（按目录动态 require 注册）
│  ├─ middleware/             鉴权（token/归属/本人）、密码加密、标签预处理、multer 存储
│  ├─ controller/             6 个控制器：校验入参 → 调 service → 统一响应
│  ├─ service/                6 个 service：只写 SQL，返回类型化结果
│  ├─ types/                  请求体/行/响应类型 + koa 与 @koa/multer 的模块增强
│  └─ utils/                  request/response/pagination/password/token 五个工具
├─ db/
│  ├─ schema.sql              建库建表（6 张表，含外键与索引）
│  └─ migrations/             增量迁移（001 加宽 password 列）
├─ scripts/
│  ├─ generate-keys.mjs       生成 RS256 密钥对（--force 轮换）
│  └─ smoke-test.mjs          32 项接口冒烟测试（自建数据、结束自清理）
├─ uploads/                   头像与动态配图（运行期产物，已 gitignore）
├─ dist/                      构建产物（已 gitignore）
├─ .env.local                 本地环境变量（已 gitignore）；模板见 .env.example
├─ biome.json                 Biome 配置（只做 lint）
├─ .prettierrc / .editorconfig / .gitignore
└─ tsconfig.json
```

**分层职责**（自上而下，依赖单向）：

| 层 | 职责 | 不该做的事 |
| --- | --- | --- |
| `router` | 声明路径 + 组装中间件链 | 不写业务逻辑 |
| `middleware` | 横切关注点：鉴权、密码加密、标签预处理、上传 | 不直接返回数据 |
| `controller` | 参数校验、调用 service、用 `success/fail` 输出 | 不写 SQL |
| `service` | 只负责 SQL 与结果映射 | 不碰 `ctx` |
| `types` / `utils` | 类型与无状态工具 | 不依赖上层 |

`controller/index.ts`、`service/index.ts`、`middleware/index.ts`、`utils/index.ts` 都是**桶文件（barrel）**，其他层只从目录导入，不关心具体文件名。

---

## 四、一次请求的完整链路

以"修改动态"为例：

```text
PATCH /moment/update/:momentId
  │
  ├─ CORS 中间件                设置跨域头，OPTIONS 直接 204
  ├─ 错误/日志中间件            记录耗时；兜住下游所有异常并转成统一格式
  ├─ koa-bodyparser            解析 JSON 到 ctx.request.body
  ├─ verifyTokenAuth           取 authorization（兼容 Bearer）→ verifyToken(RS256) → ctx.state.user
  ├─ verifyPermission          按参数名推断表名（momentId→moment），查 user_id 是否等于当前用户
  ├─ momentController.updateMoment
  │     trim 校验内容 → 调 service
  ├─ momentService.updateMoment  UPDATE moment SET content = ? WHERE id = ?
  └─ success(ctx, '修改动态成功', {...})   →  HTTP 200 + {status:200, data, message}
```

**响应约定**：`{status, data, message}`，且 **HTTP 状态码与 `status` 保持一致**（400/403/404 就是真的 400/403/404）。`data` 为空数组或 `null` 时统一规整成 `{}`。

---

## 五、接口清单（共 26 个）

| 模块 | 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- | --- |
| 认证 | POST | `/auth/register` | — | 注册：校验用户名唯一 → scrypt 加密 → 入库（响应不含密码） |
| 认证 | POST | `/auth/login` | — | 登录：校验密码（含 MD5 自动升级）→ 签发 JWT（24h） |
| 认证 | POST | `/auth/verify` | token | 校验 token 并回显载荷 |
| 用户 | GET | `/users/list` | token | 用户列表（分页） |
| 用户 | GET | `/users/info/:userId` | token | 用户详情（SQL `JSON_OBJECT` 聚合） |
| 用户 | DELETE | `/users/delete/:userId` | token + 本人 | 删除用户（**只能删自己**） |
| 用户 | GET | `/users/:userId/avatar` | — | 读取头像文件流（按 `mimetype` 设响应头） |
| 动态 | POST | `/moment` | token | 发表动态（trim 后非空、≤10000 字） |
| 动态 | GET | `/moment/list` | token | 动态列表（作者、标签数、评论数、配图数组） |
| 动态 | GET | `/moment/detail/:momentId` | token | 动态详情（作者 + 标签 + 评论 + 配图一次聚合） |
| 动态 | PATCH | `/moment/update/:momentId` | token + 归属 | 修改自己的动态（内容未变化时返回"未变化"） |
| 动态 | DELETE | `/moment/delete/:momentId` | token + 归属 | 删除自己的动态（不存在的返回 404） |
| 动态 | POST | `/moment/:momentId/labels` | token + 归属 | 给动态打标签（自动建标签、去重） |
| 动态 | POST | `/moment/:momentId/lables` | token + 归属 | 同上，历史拼写兼容别名 |
| 动态 | GET | `/moment/images/:filename` | — | 读取动态配图文件流（`path.basename` 防穿越） |
| 评论 | POST | `/comment` | token | 发表评论（trim 后非空） |
| 评论 | POST | `/comment/:commentId/reply` | token | 回复评论（写入 `comment_id`，楼中楼） |
| 评论 | GET | `/comment/list` | token | 某条动态下的评论列表（分页） |
| 评论 | PATCH | `/comment/:commentId` | token + 归属 | 修改自己的评论 |
| 评论 | DELETE | `/comment/:commentId` | token + 归属 | 删除自己的评论 |
| 标签 | POST | `/label/create` | token | 创建标签（重名返回 400） |
| 标签 | GET | `/label/list` | token | 标签列表（分页） |
| 标签 | PATCH | `/label/:id` | token | 编辑标签（改成重名会被拦） |
| 标签 | DELETE | `/label/:id` | token | 删除标签（不存在返回 404） |
| 上传 | POST | `/upload/avatar` | token | 上传头像（字段 `avatar`，≤2MB，仅图片） |
| 上传 | POST | `/upload/picture` | token + 归属 | 上传动态配图（字段 `picture`，≤16 张、单张 ≤10MB，仅图片） |

**分页约定**：所有列表接口支持 `size`（默认 10，上限 100）、`offset`（0 基，优先）或 `page`（1 基）；返回 `{list, total, totalPages, page, size}`。`offset` 超出总数时会夹到最后一页，避免"total 有值但 list 为空"。

**鉴权传参**：请求头 `Authorization` 支持 `Bearer <token>` 与裸 token 两种写法。

---

## 六、数据库设计

`db/schema.sql` 建 6 张表，全部 InnoDB + utf8mb4：

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `users` | 用户 | `name` 唯一；`password VARCHAR(255)` 容纳 scrypt 哈希 |
| `moment` | 动态 | `user_id` 外键 → users，级联删除；`idx_moment_user` |
| `comment` | 评论 | `moment_id` + `user_id` + **`comment_id` 自引用**（回复），全部级联删除 |
| `label` | 标签 | `name` 唯一 |
| `moment_label` | 动态-标签多对多 | 复合主键 `(moment_id, label_id)`，双向级联 |
| `avatar` / `file` | 上传元信息 | 存 `filename`/`mimetype`/`size`，关联 `user_id`（`file` 还关联 `moment_id`） |

**迁移**：`db/migrations/001-widen-password.sql` 把 `password` 改到 `VARCHAR(255)`——scrypt 哈希约 175 字符，老库若仍是 MD5 时代的 `CHAR(32)`，注册/升级会报 `Data too long`。该脚本可重复执行。

字段名历史遗留：时间列统一叫 **`createAt` / `updateAt`**，SQL 里再 `AS createTime` 映射给前端；`avatar`/`file` 表的 `mimetype` 也是历史拼写。schema 顶部有注释提醒。

> 实测环境注意事项：本机库是早期建的，`file.mimetype` 实际为 `VARCHAR(255) NULL`，与 `schema.sql` 里的 `VARCHAR(100) NOT NULL` 略有差异（不影响运行）。全新初始化请以 `schema.sql` 为准。

---

## 七、核心技术实现

### 7.1 手写 RS256 JWT（不依赖 jsonwebtoken）

`src/utils/token.ts` 用 `node:crypto` 实现签发与校验：

- **签发**：`header.payload` 用 `crypto.sign('RSA-SHA256', ...)` 签名后 `base64url` 编码，默认 24 小时过期；
- **校验**三步：① 公钥验签 → ② 校验 `alg` 必须是 RS256（防 alg 混淆）→ ③ 校验 `exp` 未过期；
- **为什么不用 jsonwebtoken**：其依赖链 `jws → jwa → buffer-equal-constant-time` 在 Node 22+ 会因 `Buffer.SlowBuffer` 被移除而启动崩溃（Node 26 实测）。属于"依赖极简 + 主动规避已知坑"。

密钥由 `scripts/generate-keys.mjs` 生成（2048 位 RSA，PKCS#8 私钥权限 `0o600` + SPKI 公钥），`npm run keys:rotate` 可轮换（旧 token 全部失效）。

### 7.2 密码哈希：scrypt + 历史 MD5 平滑升级

`src/utils/password.ts`：

- 存储格式 `scrypt$N$r$p$salt$hash`，**参数写进字符串**——以后调大 `N/r/p` 不会让老密码失效；
- 每用户 16 字节随机盐；`crypto.timingSafeEqual` 比较，防时序攻击；
- `verifyPassword` 同时兼容 scrypt 与 32 位 MD5；
- `needsRehash` 判断是否该升级（MD5 / 参数过期 / 非 scrypt），登录成功后由 `auth.middleware` 自动写回新哈希——**用户无感的密码迁移**；
- 另有一条兜底：库里若是明文密码，登录成功即改存 scrypt。

### 7.3 统一响应与 HTTP 状态码

| 工具 | 作用 |
| --- | --- |
| `utils/response.ts` | `success` / `fail` 同时设置 **HTTP 状态码与 body.status**；空数组与 `null` 规整成 `{}` |
| `utils/request.ts` | `getBody<T>()` 安全取请求体；`getTrimmedField(ctx, field)` 取出并规整字符串字段（非字符串当空、统一 trim）；`toPositiveInt` / `toNonNegativeInt` 严格数字转换 |
| `utils/pagination.ts` | `parsePagination`（size 夹到 1~100，兼容 offset/page）、`clampOffset`（越界回退最后一页）、`buildPage`（1 基页码） |

> 行为变更说明：早期版本所有响应都是 HTTP 200、错误码只放在 body 里。现在 HTTP 状态码与业务码一致，前端可以直接用 `res.ok` / `res.status` 判断，无需解析 body。若有旧客户端依赖"永远 200"，需要同步调整。

### 7.4 错误处理与访问日志

`src/app/index.ts` 里的中间件（顺序在 CORS 之后、路由之前）：

- 捕获下游所有异常，统一输出 `{status, data, message}`；
- 把**用户输入类错误**映射成 4xx：`ER_DUP_ENTRY` → 400、`LIMIT_FILE_SIZE` → 400、`LIMIT_FILE_COUNT` → 400、`LIMIT_UNEXPECTED_FILE` → 400，其余按 500 并打日志；
- 每次请求打印 `METHOD URL → 状态码 耗时ms`；
- `app.on('error')` 作为 Koa 内部错误的日志兜底。

### 7.5 鉴权与授权模型（三层）

| 中间件 | 作用 | 用法 |
| --- | --- | --- |
| `verifyTokenAuth` | 验签 token，写入 `ctx.state.user`（兼容 Bearer 前缀） | 除登录注册与图片读取外的全部接口 |
| `verifyPermission` | **资源归属校验**：按参数名推断表名（`momentId`→moment、`commentId`→comment），查 `user_id` 是否等于当前用户，否则 403 | 动态改/删/打标签，评论改/删 |
| `verifySelfPermission` | **本人校验**：只能操作自己的账号 | `DELETE /users/delete/:userId` |

表名推断只允许 `moment` / `comment`（`ALLOWED_RESOURCE_TABLES` 白名单），避免被拼进 SQL。

### 7.6 上传限制

之前 multer 没有任何限制，任意类型、任意大小的文件都能落盘。现在：

| 项 | 限制 |
| --- | --- |
| 头像 | 单文件，≤2MB |
| 动态配图 | 单张 ≤10MB，最多 16 张 |
| 类型 | 仅 `image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/bmp` |
| 归属 | 只能给自己的动态传配图（`authService.checkResource`） |
| 读取 | `path.basename` 过滤，防目录穿越 |

### 7.7 路由动态加载

`src/router/index.ts` 不手写 `app.use(xxxRouter)`，而是：

1. 用 `__filename` 得到当前目录与扩展名（开发 `.ts`、构建后 `.js`）；
2. `readdirSync` 过滤同后缀、排除 `.d.ts` 与 `index`；
3. 逐个 `require` 取默认导出，校验后 `this.use(router.routes())` + `this.use(router.allowedMethods())`。

新增模块只要丢一个 `xxx.router.ts` 进去，不用改注册代码；`allowedMethods()` 保证方法不匹配返回 405。代价是隐式依赖目录约定（缺默认导出会显式报错）。

---

## 八、工具链与质量门禁

| 命令 | 作用 | 实测状态 |
| --- | --- | --- |
| `npm start` | `tsx watch --env-file=.env.local src/main.ts` | ✅ 启动成功，DB 连接成功 |
| `npm run build` | `tsc -p tsconfig.json` → `dist/` | ✅ 0 error（建议先删 `dist`，见第十二节） |
| `npm run serve` | `node --env-file=.env.local dist/main.js` | ✅ 产物可跑，路由自动加载 `.js` |
| `npm run typecheck` | `tsc --noEmit` | ✅ 0 error |
| `npx tsc --noEmit --skipLibCheck false` | 连声明文件一起检查 | ✅ 0 error |
| `npm run lint` | `biome lint src` | ✅ exit 0（35 条 warning，主要是 `useImportType` 风格建议） |
| `npm run format` / `format:check` | `prettier --write/--check "src/**/*.ts"` | ✅ 全部符合 |
| `npm run test:api` | `node scripts/smoke-test.mjs` | ✅ 32 项全部通过（需先启动服务） |
| `npm run keys:generate` | 生成密钥对 | ✅ 已存在时拒绝（exit 1） |
| `npm run keys:rotate` | 强制轮换密钥 | ✅ 可用（修复后） |

代码规范配置：`.editorconfig`（4 空格 / LF / utf8）、`.prettierrc`（120 列 / 单引号 / 无分号 / `arrowParens: avoid`）、`biome.json`（仅启用 linter，格式化交给 Prettier，避免两套工具互相覆盖）。

---

## 九、如何跑起来

```bash
# 1) 安装依赖（Node >= 20.6）
npm install

# 2) 准备环境变量：仓库只有模板，需要复制一份
cp .env.example .env.local
#    然后填 DB_HOST / DB_PORT / DB_DATABASE / MYSQL_USER / MYSQL_PASSWORD

# 3) 建库建表
mysql -u root -p < db/schema.sql
#    老库升级：先执行 db/migrations/001-widen-password.sql

# 4) 生成 JWT 密钥（仓库不提供密钥）
npm run keys:generate
#    轮换（旧 token 全失效）：npm run keys:rotate

# 5) 启动
npm start                              # 开发（热重载）
npm run build && npm run serve         # 生产

# 6) 验证（另开终端）
npm run test:api
```

`.env.local` 变量清单（`.env.example` 里都有注释）：

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `APP_PORT` | `9001` | 服务端口（代码默认 9002） |
| `APP_HOST` | `http://localhost` | 影响头像/配图返回的绝对 URL |
| `ALLOWED_ORIGIN` | `*` | 跨域允许来源，生产建议写具体域名 |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | MySQL 地址 |
| `DB_DATABASE` | `coder_hub` | 库名 |
| `MYSQL_USER` / `MYSQL_PASSWORD` | `root` / `***` | 账号密码 |
| `KEY_DIR` | `./src/app/keys` | 可选，覆盖密钥目录 |

### 环境变量是怎么加载的（以及为什么移除了 dotenv）

| 环节 | 做法 |
| --- | --- |
| 加载 | 启动命令带 Node **内置**参数：`tsx watch --env-file=.env.local src/main.ts`、`node --env-file=.env.local dist/main.js`。进程启动时就把文件内容写进 `process.env`，早于任何业务代码执行 |
| 读取 | `src/app/config.ts` 只读 `process.env.XXX`，并给默认值（例如 `APP_PORT` 缺省 9002、`ALLOWED_ORIGIN` 缺省 `*`） |
| 缺文件时 | `.env.local` 不存在会**直接报错退出**（`exit 9: .env.local: not found`），不会静默用默认值去连库——这是期望行为，避免连错数据库 |
| dotenv | 项目原先装了 `dotenv`，但源码里 **0 处 `import`**（历史遗留），实际加载一直是靠 `--env-file`。属冗余依赖，已移除（运行时依赖 7 → 6 个） |

> 结论：**不是"没用到所以删"，而是"从来没参与过环境变量加载"**。如果想在不用 npm 脚本的场景（例如 `node src/main.js` 直接跑）也能读到配置，可以自己加 `import 'dotenv/config'` 并把它装回来；当前设计选择的是"少一个依赖 + 启动命令显式声明配置来源"。

---

## 十、本次修复记录

> 全部改动都经过 `typecheck` + `build` + 真实接口回归验证，测试数据零残留。

### 10.1 安全（高危）

| # | 问题 | 处理方式 | 涉及文件 |
| --- | --- | --- | --- |
| 1 | JWT 私钥被 git 跟踪，拿到仓库即可伪造任意用户 token | `git rm --cached` 移出索引 + `.gitignore` 加 `src/app/keys/` + **轮换密钥**（公钥指纹 `32FB1A57…` → `19556334…`） | `.gitignore`、`src/app/keys/*` |
| 2 | 动态的改/删/打标签只校验登录，不校验归属，任何登录用户可操作他人动态 | 三条路由补 `verifyPermission` | `src/router/moment.router.ts` |
| 3 | `DELETE /users/delete/:userId` 任何登录用户可删任意账号（级联删其全部动态评论） | 新增 `verifySelfPermission`：只能删自己 | `src/middleware/auth.middleware.ts`、`src/router/user.router.ts` |
| 4 | 注册接口把 scrypt 密码哈希返回给前端 | `authService.register` 只回 `{id, name}` | `src/service/auth.service.ts`、`src/types/users.ts` |
| 5 | 上传无大小/类型限制，任意文件可落盘 | 加 `limits` + 图片 MIME 白名单 + 上传配图校验动态归属 | `src/app/config.ts`、`src/middleware/file*.ts`、`src/controller/file.controller.ts` |

### 10.2 正确性

| # | 问题 | 处理方式 | 涉及文件 |
| --- | --- | --- | --- |
| 6 | 动态/评论传纯空白 `"   "` 能通过校验入库 | 统一 `trim` 后判空（create/update/reply 全覆盖） | `moment.controller.ts`、`comment.controller.ts` |
| 7 | 标签重名触发唯一键冲突 → **HTTP 500** | 先查重返回 400，并在错误中间件把 `ER_DUP_ENTRY` 兜成 400 | `label.controller.ts`、`src/app/index.ts` |
| 8 | 更新/删除用 `result.fieldCount` 判断（对 UPDATE/DELETE 恒为 0），删不存在的记录也报成功 | 改用 `affectedRows`；用户删除/标签删除不存在时返回 404 | `moment.service.ts`、`users.service.ts`、对应 controller |
| 9 | 无全局错误处理，异常走 Koa 默认 500 且响应格式不一致 | 加错误处理中间件 + `app.on('error')` | `src/app/index.ts` |
| 10 | 业务错误一律 HTTP 200 | `success/fail` 同步设置 `ctx.status` | `src/utils/response.ts` |
| 11 | 不剥 `Bearer ` 前缀，前端按惯例传参会验签失败 | 兼容 `Bearer <token>` 与裸 token | `src/middleware/auth.middleware.ts` |
| 12 | `src/types/koa.d.ts` 引用不存在的 `./models`，被 `skipLibCheck` 掩盖 | 改从 `./token`、`./label` 导入并补 `LabelRef`；连带修出 5 处真实类型错误 | `src/types/*` |
| 13 | 类型字段名与 SQL 别名不一致（`author` vs `auth`、`users` vs `userInfo`） | 类型对齐真实返回 | `src/types/moment.ts` |
| 14 | `npm run keys:rotate` 永远失败（`--force` 只保护了私钥判断，`public.key` 存在时无条件拒绝） | 修正判断条件 | `scripts/generate-keys.mjs` |
| 15 | `getMomentDetail` 注释说"改用 query 执行"，代码仍是 `execute` | 按实测结论重写注释（8.4 + mysql2 3.x 下 `execute` 正常，并给出复现时的替代方案） | `src/service/moment.service.ts` |

### 10.3 工程化

| # | 问题 | 处理方式 |
| --- | --- | --- |
| 16 | `uploads/` 32 个文件 16.3MB 入库 | `git rm --cached` + `.gitignore` |
| 17 | `src/index.ts` 练手残留（另起 8000 端口），每次构建都产出 `dist/index.js` | 删除；清理 `dist` 后重建只剩 `main.js` |
| 18 | `dotenv` 装了但 0 处 import（环境变量实际由 Node `--env-file` 注入） | 移除依赖，并补 `engines.node >= 20.6`（该参数的最低版本） |
| 19 | 缺 `.env.example`（`.gitignore` 里却列了它） | 新增模板，并从 ignore 中移除该行 |
| 20 | `biome.json` 是 0 字节空文件，`npm run lint` 必失败 | 写入合法配置（仅启用 linter），lint 现 exit 0 |
| 21 | Prettier 未安装，`format` / `format:check` 不可用 | 加 `prettier` 依赖并跑一次格式化（其实只有 2 个文件需要改） |
| 22 | `.prettierrc` 含已废弃的 `jsxBracketSameLine` | 移除 |
| 23 | 无 CORS，前后端分离时跨域失败 | 加 CORS 中间件（`ALLOWED_ORIGIN` 可配，`OPTIONS` 返 204） |
| 24 | 无访问日志，排障只能靠猜 | 日志中间件打印方法/路径/状态/耗时 |
| 25 | 完全没有测试 | 新增 `scripts/smoke-test.mjs`（32 项断言，自建数据、结束自清理）+ `npm run test:api` |
| 26 | 三个 controller 各自复制了一份 `readContent` / `readName`（逻辑相同，改一处容易漏） | 抽成 `utils/request.ts` 的 `getTrimmedField(ctx, field)`，三处调用统一 |

---

## 十一、验证记录

**环境**：Node 26.10.0、TypeScript 7.0.2、MySQL 8.4.10、库 `coder_hub`（既有真实数据：users 38 / moment 103 / comment 144 / label 23 / moment_label 160 / file 19 / avatar 5）。

### 11.1 静态检查

| 命令 | 修复前 | 修复后 |
| --- | --- | --- |
| `tsc --noEmit` | 0 error（但 `ctx.state` 类型增强失效，等于没检查到） | ✅ 0 error（类型增强生效，暴露并修完 5 处真实错误） |
| `tsc --noEmit --skipLibCheck false` | ❌ `TS2307: Cannot find module './models'` | ✅ 0 error |
| `biome lint src` | ❌ 配置解析失败 | ✅ exit 0（35 warnings） |
| `prettier --check` | ❌ 依赖缺失 | ✅ 全部符合 |
| `tsc -p`（build） | ✅ 但产出 `dist/index.js` 死代码 | ✅ 只剩 `main.js` |

### 11.2 接口全量回归（55 步，修复前 vs 修复后）

| 场景 | 修复前实测 | 修复后实测 |
| --- | --- | --- |
| 注册响应 | 含 `password` 字段（泄露哈希） | 仅 `{id, name}` |
| `Authorization: Bearer xxx` | 400 token无效 | 200 通过 |
| 动态内容传 `"   "` | **200 发表成功** | 400 内容不能为空 |
| B 修改 A 的动态 | **200 修改成功（越权）** | 403 无权访问 |
| B 删除 A 的动态 | **200 删除成功（越权）** | 403 无权访问 |
| B 给 A 的动态打标签 | **200 成功（越权）** | 403 无权访问 |
| B 给 A 的动态传配图 | 未实测（代码无归属校验，推断可越权） | 403 只能给自己的动态上传配图 |
| A 删除 B 的账号 | 未实测（代码无任何权限校验，推断可越权） | 403 只能操作自己的账号 |
| 标签重名 | **HTTP 500** | 400 标签名已存在 |
| 更新不存在的动态 | **200 修改成功** | 403 无权访问（归属校验先拦） |
| 删除不存在的动态 | **200 删除成功** | 403 无权访问（归属校验先拦） |
| 删除不存在的用户 | **200 用户删除成功** | 403 只能操作自己的账号 |
| `/moment/images/../../.env.local` | 404（防护正确） | 404（保持） |
| HTTP 状态码分布 | 200×52、500×1；**其中 15 处 HTTP 与 body.status 不一致**（业务错误全被包成 200） | 200×31、400×10、403×9、404×5；**0 处不一致** |

### 11.3 冒烟测试（32 项）

`npm run test:api` 在**开发模式**与**生产产物（`npm run serve`）**下均为 **32/32 通过**，覆盖：注册/登录/验签、Bearer 兼容、空白内容拒绝、列表分页字段、动态/评论 CRUD、三类越权（改动态、删动态、改评论）、越权打标签、越权传图、越权删账号、标签重名、上传大小与类型限制、目录穿越、头像与配图读取。

### 11.4 数据安全确认

- 测试前后数据库计数**完全一致**（users 38、moment 103、comment 144、label 23、moment_label 160、file 19、avatar 5），未触碰任何既有数据；
- 测试产生的账号、动态、评论、标签均已删除；
- 测试上传的图片已从 `uploads/` 清理，测试标签已从库中删除；
- 密钥轮换后，此前签发的 token 全部失效（这是预期行为）。

---

## 十二、仍未处理 / 已知限制

| 项 | 说明 | 建议 |
| --- | --- | --- |
| 无角色体系 | 现在只能"删自己"；没有管理员/版主，也没有审核能力 | `users` 加 `role` 字段，`verifySelfPermission` 增加 `role === 'admin'` 分支，并补全局角色中间件 |
| 标签是全局资源 | 任何登录用户都能改名/删除他人动态正在用的标签（级联会解除关联） | 给标签加 `user_id` 归属或用角色控制 |
| 删除不清理磁盘文件 | 删动态/用户时 `file`、`avatar` 行被级联删除，但 `uploads/` 里的物理文件成为孤儿 | 删除前查出 filename 再 `fs.unlink`，或定期跑孤儿文件清理脚本 |
| 无速率限制 | 登录接口可被无限次尝试；所有接口无频控 | 加 `koa-ratelimit` 或网关层限流，登录单独收紧 |
| 无单元测试 | 只有接口级冒烟测试 | `utils/password.ts`、`utils/token.ts`、`utils/pagination.ts` 是纯函数，优先补单测 |
| 无接口文档 | 只有本文档的接口表 | 按第五节转成 OpenAPI，或用 Swagger UI 自动生成 |
| `dist` 不自动清空 | `tsc` 不会删除已移除文件对应的旧产物（本次已手工清理过一次） | build 脚本加 `rimraf dist` 前置步骤 |
| 分页 offset 越界回退 | 越界时返回最后一页而不是空列表 | 属有意设计，前端需知晓；若要严格语义可改为返回 400 |
| 日志只到控制台 | 没有落文件/采集，重启即丢 | 生产接入 pino/winston 或交给容器日志采集 |
| 基础库/依赖较新 | TypeScript 7、Node 26 都是前沿版本 | 部署环境需同步，避免用 Node 18 跑 |

---

## 十三、后续建议（按优先级）

1. **补角色体系**：管理员/版主 → 让"删除任意用户""管理标签"这类操作有合法出口，而不是永久缺失；
2. **补单元测试**：三个纯函数模块先覆盖，再逐步加鉴权中间件的集成测试；
3. **资源生命周期**：删除动态/用户时清理磁盘文件，避免 `uploads/` 无限膨胀；
4. **接口文档**：把第五节的表格转成 OpenAPI，前端联调不用再翻代码；
5. **可观测性**：日志结构化 + 慢查询记录（现在 SQL 全在 service 层，加耗时打点成本很低）；
6. **CI**：把 `typecheck`、`lint`、`format:check`、`build`、`test:api` 串成流水线，本次修的这些问题基本都能被门禁拦住。
