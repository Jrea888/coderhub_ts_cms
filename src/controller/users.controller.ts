import {RouterContext} from '@koa/router'
import path from 'node:path'
import {createReadStream} from 'node:fs'
import {buildPage, fail, parsePagination, success, toNonNegativeInt} from '../utils'
import {fileService, usersService} from '../service'
import {AVATAR_PATH} from '../app/config'

class UsersController {
    // 获取用户列表
    async list(ctx: RouterContext) {
        const {size, offset} = parsePagination(ctx.request.query)
        const {list, total, offset: effectiveOffset} = await usersService.getUserList(size, offset)
        success(ctx, '用户列表获取成功', buildPage(list, total, effectiveOffset, size))
    }

    // 获取用户详情
    async info(ctx: RouterContext) {
        const userId = toNonNegativeInt(ctx.params.userId) || 0
        if (userId <= 0) {
            fail(ctx, 400, '用户ID不能为空或无效')
            return
        }

        const user = await usersService.getUserInfo(userId)
        if (!user) {
            fail(ctx, 404, '用户不存在')
            return
        }
        success(ctx, '用户详情获取成功', user)
    }

    // 删除用户
    async delete(ctx: RouterContext) {
        const userId = toNonNegativeInt(ctx.params.userId) || 0
        if (userId <= 0) {
            fail(ctx, 400, '用户ID不能为空或无效')
            return
        }

        await usersService.deleteUser(userId)
        success(ctx, '用户删除成功')
    }

    // 获取用户头像信息
    async userAvatarInfo(ctx: RouterContext) {
        const userId = toNonNegativeInt(ctx.params.userId) || 0
        if (userId <= 0) {
            fail(ctx, 400, '用户ID不能为空或无效')
            return
        }

        // 获取用户头像信息
        const avatarInfo = await fileService.getUserAvatarInfo(userId)
        if (!avatarInfo) {
            fail(ctx, 404, '用户没有头像')
            return
        }

        ctx.set('content-type', avatarInfo.mimetype)
        // 读取文件流路径： path.resolve(process.cwd(), 'uploads/avatar')
        ctx.body = createReadStream(path.join(AVATAR_PATH, avatarInfo.filename))
    }
}

export default new UsersController()
