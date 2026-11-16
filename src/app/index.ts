import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'

const app = new Koa()
const router = new Router()

// 解析 body 参数，将参数挂载到 ctx.request.body 上
app.use(bodyParser())

// 静态路由注册
app.use(router.routes())
// 允许的 HTTP 方法 没匹配到方法时给出语义正确的 HTTP 状态码”，让接口更符合 HTTP 规范，也便于客户端排查错误。
app.use(router.allowedMethods())

// 动态路由注册
router.get('/', ctx => {
    ctx.body = 'Hello Koa!'
})

export default app

