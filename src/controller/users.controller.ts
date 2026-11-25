import {RouterContext} from '@koa/router'
import path from 'node:path'
import {createReadStream} from 'node:fs'
import {toNonNegativeInt, toPositiveInt} from '../utils'
import {fileService, usersService} from '../service'
import {AVATAR_PATH} from '../app/config'

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

    // 获取用户头像信息
    async userAvatarInfo(ctx: RouterContext) {
        const userId = toNonNegativeInt(ctx.params.userId) || 0
        if (userId <= 0) {
            ctx.body = {status: 400, message: '参数错误'}
            return
        }

        // 获取用户头像信息
        const avatarInfo = await fileService.getUserAvatarInfo(userId)
        if (!avatarInfo) {
            ctx.body = {status: 404, message: '用户没有头像'}
            return
        }

        ctx.set('content-type', avatarInfo.mimetype)
        // 读取文件流路径： path.resolve(process.cwd(), 'uploads/avatar')
        ctx.body = createReadStream(path.join(AVATAR_PATH, avatarInfo.filename))
    }
}

export default new UsersController()
