import {RouterContext} from '@koa/router'
import {authService, fileService, usersService} from '../service'
import {fail, success, toPositiveInt} from '../utils'
import {APP_HOST, APP_PORT} from '../app/config'

class FileController {
    public async uploadAvatar(ctx: RouterContext): Promise<void> {
        const user = ctx.state.user
        if (!user) {
            fail(ctx, 400, '用户不存在')
            return
        }
        if (!ctx.file?.filename) {
            fail(ctx, 400, '上传头像失败')
            return
        }

        const userId = user.id
        const {filename, mimetype, size} = ctx.file
        // 1. 保存头像元信息
        await fileService.saveAvatarFile(userId, filename, mimetype, size)

        // 2. 回填可访问的头像地址，通过设计接口返回图片数据 访问项目内部图片数据，是否可以把图片资源存放到 七牛云存储 或者 阿里云 OSS中
        const avatarUrl = `${APP_HOST}:${APP_PORT}/users/${userId}/avatar`
        await usersService.updateAvatarUrlById(avatarUrl, userId)
        success(ctx, '上传头像成功！', {avatarUrl})
    }

    public async uploadPicture(ctx: RouterContext): Promise<void> {
        const user = ctx.state.user
        const files = ctx.files ?? []
        const momentId = toPositiveInt(ctx.query.momentId)

        if (!user || !files.length || !momentId) {
            fail(ctx, 400, '上传图片失败')
            return
        }

        // 只能给自己的动态传配图：之前这里不校验归属，任何登录用户都能往别人的动态里塞图
        const owned = await authService.checkResource('moment', momentId, user.id)
        if (!owned) {
            fail(ctx, 403, '只能给自己的动态上传配图')
            return
        }

        for await (const file of files) {
            await fileService.savePictureFiles(file.filename, file.mimetype, file.size, user.id, momentId)
        }
        success(ctx, '动态图片发布成功！')
    }
}

export default new FileController()
