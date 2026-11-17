import {RouterContext} from '@koa/router'

class UsersController {
    // 注册用户
    async register(ctx: RouterContext) {
        ctx.body = 200
    }
    // 登录用户
    async login(ctx: RouterContext) {
        ctx.body = 200
    }
    // 获取用户列表
    async list(ctx: RouterContext) {
        ctx.body = 200
    }
    // 获取用户详情
    async info(ctx: RouterContext) {
        ctx.body = 200
    }
    // 删除用户
    async delete(ctx: RouterContext) {
        ctx.body = 200
    }
}

export default new UsersController()
