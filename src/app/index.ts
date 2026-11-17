import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import useRouters from '../router'

const app = new Koa()

// 解析 body 参数，将参数挂载到 ctx.request.body 上
app.use(bodyParser())

// 动态加载路由
useRouters.call(app)

export default app
