import Koa from 'koa'
import KoaRouter from '@koa/router'

const app = new Koa()
const userRouter = new KoaRouter({prefix: '/users'})

userRouter.get('/list', async ctx => {
    ctx.body = 'user List'
})

// routes() 只管“匹配到就执行”，
app.use(userRouter.routes())
// allowedMethods() 管“没匹配到方法时给出语义正确的 HTTP 状态码”，让接口更符合 HTTP 规范，也便于客户端排查错误。
app.use(userRouter.allowedMethods())

app.listen(8000, () => {
    console.log('Server is running on port 8000')
})
