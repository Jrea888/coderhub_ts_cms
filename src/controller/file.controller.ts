import {RouterContext} from '@koa/router'
import {fileService, usersService} from '../service'
import {toPositiveInt} from '../utils'
import {APP_HOST, APP_PORT} from '../app/config'

class FileController {
    public async uploadAvatar(ctx: RouterContext): Promise<void> {
        if (!ctx.file?.filename) {
            ctx.body = {status: 400, message: '上传头像失败', data: null}
            return
        }

        const {id: userId} = ctx.state.user
        const {filename, mimetype, size} = ctx.file
        // 1. 保存头像元信息
        await fileService.saveAvatarFile(userId, filename, mimetype, size)

        // 2. 回填可访问的头像地址，通过设计接口返回图片数据 访问项目内部图片数据，是否可以把图片资源存放到 七牛云存储 或者 阿里云 OSS中
        const avatarUrl = `${APP_HOST}:${APP_PORT}/users/${userId}/avatar`
        await usersService.updateAvatarUrlById(avatarUrl, userId)
        ctx.body = {status: 200, message: '上传头像成功！', data: null}
    }

    public async uploadPicture(ctx: RouterContext): Promise<void> {
        const {id: userId} = ctx.state.user
        const files = ctx.files ?? []
        const momentId = toPositiveInt(ctx.query.momentId)

        if (!files.length || !momentId || !userId) {
            ctx.body = {status: 400, message: '上传图片失败', data: null}
            return
        }

        for await (const file of files) {
            await fileService.savePictureFiles(file.filename, file.mimetype, file.size, userId, momentId)
        }
        ctx.body = {status: 200, message: '动态图片发布成功！', data: null}
    }
}

export default new FileController()
