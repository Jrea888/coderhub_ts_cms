import {RouterContext} from '@koa/router'
import {toNonNegativeInt, toPositiveInt} from '../utils'
import {usersService} from '../service'

class UsersController {
    // 获取用户列表
    async list(ctx: RouterContext) {
        const query = ctx.request.query as {size?: number; offset?: number}
        const size = toPositiveInt(query.size) || 10
        const offset = toNonNegativeInt(query.offset) || 0

        const {list, total} = await usersService.getUserList(size, offset)
        ctx.body = {
            status: 200,
            message: 'OK',
            data: {list, total, size, totalPages: Math.ceil(total / size)}
        }
    }
    // 获取用户详情
    async info(ctx: RouterContext) {
        const userId = toNonNegativeInt(ctx.params.userId) || 0
        if (userId <= 0) {
            ctx.body = {status: 400, message: '参数错误'}
            return
        }

        const user = await usersService.getUserInfo(userId)
        ctx.body = {
            status: 200,
            message: 'OK',
            data: {...user}
        }
    }
    // 删除用户
    async delete(ctx: RouterContext) {
        const userId = toNonNegativeInt(ctx.params.userId) || 0
        if (userId <= 0) {
            ctx.body = {status: 400, message: '参数错误'}
            return
        }

        await usersService.deleteUser(userId)
        ctx.body = {status: 200, message: 'OK'}
    }
}

export default new UsersController()
