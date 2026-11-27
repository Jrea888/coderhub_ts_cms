import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import useRouters from '../router'
import {fail} from '../utils'
import {ALLOWED_ORIGIN} from './config'

const app = new Koa()

// 1. 跨域：放在最外层，保证错误响应也带上 CORS 头
app.use(async (ctx, next) => {
    ctx.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    ctx.set('Access-Control-Max-Age', '86400')
    if (ctx.method === 'OPTIONS') {
        ctx.status = 204
        return
    }
    await next()
})

// 2. 统一错误处理 + 访问日志
// 之前控制器里 await 抛错（如唯一键冲突、上传超限）会走 Koa 默认 500，
// 响应体也不是统一格式，这里兜住所有异常，输出与 success/fail 一致的 {status, data, message}
app.use(async (ctx, next) => {
    const start = Date.now()
    try {
        await next()
    } catch (error) {
        const {code, message} = error as {code?: string; message?: string}
        // 唯一键冲突是"用户输入问题"，不该算 500
        if (code === 'ER_DUP_ENTRY') {
            fail(ctx, 400, '数据已存在（名称重复），请更换后重试')
        } else if (code === 'LIMIT_FILE_SIZE') {
            fail(ctx, 400, '文件超出大小限制')
        } else if (code === 'LIMIT_FILE_COUNT') {
            fail(ctx, 400, '文件数量超出限制')
        } else if (code === 'LIMIT_UNEXPECTED_FILE') {
            fail(ctx, 400, '文件字段名或数量不符合要求')
        } else {
            console.error(`[error] ${ctx.method} ${ctx.url}`, code || '', message || error)
            fail(ctx, 500, '服务器内部错误')
        }
    } finally {
        console.log(`${ctx.method} ${ctx.url} → ${ctx.status} ${Date.now() - start}ms`)
    }
})

// 3. 解析 body 参数，将参数挂载到 ctx.request.body 上
app.use(bodyParser())

// 4. 动态加载路由
useRouters.call(app)

// app.on('error') 只在 Koa 内部捕获到错误时触发，作为日志兜底
app.on('error', (error, ctx) => {
    console.error('[koa error]', ctx?.url, error.message)
})

export default app
