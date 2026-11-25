import path from 'path'
import fs from 'fs'
import type {RouterContext} from '@koa/router'
import {fileService, momentService} from '../service'
import {getBody, toPositiveInt} from '../utils'
import {PICTURE_PATH} from '../app/config'

const MAX_PAGE_SIZE = 100

class MomentController {
    // 创建动态
    async createMoment(ctx: RouterContext) {
        const user = ctx.state.user
        const {content} = getBody<{content: string}>(ctx)

        if (!user) {
            ctx.body = {
                message: '用户不存在',
                status: 400
            }
            return
        }
        if (!content) {
            ctx.body = {
                message: '内容不能为空',
                status: 400
            }
            return
        }
        if (content.trim().length > 10000) {
            ctx.body = {
                message: '内容长度不能超过10000个字符',
                status: 400
            }
            return
        }

        const momentId = await momentService.createMoment(content, user.id)
        ctx.body = {
            status: 200,
            message: '发表动态成功',
            data: {momentId, name: user.name}
        }
    }

    // 动态列表 分页获取
    async getMomentList(ctx: RouterContext) {
        const offset = toPositiveInt(ctx.request.query.offset) ?? 0
        const size = Math.min(toPositiveInt(ctx.request.query.size) ?? 10, MAX_PAGE_SIZE)

        const result = await momentService.getMomentList(offset, size)
        ctx.body = {
            status: 200,
            message: '获取动态列表成功',
            data: {
                list: result.list,
                total: result.total,
                page: Math.ceil(offset / size),
                totalPages: Math.ceil(result.total / size)
            }
        }
    }

    // 获取动态详情
    async getMomentDetail(ctx: RouterContext) {
        const momentId = toPositiveInt(ctx.params.momentId) ?? 0
        if (!momentId) {
            ctx.body = {
                message: '动态ID不能为空',
                status: 400
            }
            return
        }

        const detail = await momentService.getMomentDetail(momentId)
        if (!detail) {
            ctx.body = {
                message: '动态不存在',
                status: 400
            }
            return
        }
        ctx.body = {
            status: 200,
            message: '获取动态详情成功',
            data: detail
        }
    }

    // 修改动态
    async updateMoment(ctx: RouterContext) {
        const momentId = toPositiveInt(ctx.params.momentId) ?? 0
        const user = ctx.state.user
        if (!user) {
            ctx.body = {
                message: '用户不存在',
                status: 400
            }
            return
        }
        if (!momentId) {
            ctx.body = {
                message: '动态ID不能为空',
                status: 400
            }
            return
        }

        const {content} = getBody<{content: string}>(ctx)
        if (!content) {
            ctx.body = {
                message: '内容不能为空',
                status: 400
            }
            return
        }
        if (content.trim().length > 10000) {
            ctx.body = {
                message: '内容长度不能超过10000个字符',
                status: 400
            }
            return
        }

        const failCount = await momentService.updateMoment(momentId, content)
        if (failCount > 0) {
            ctx.body = {
                status: 400,
                message: '修改动态失败',
                data: null
            }
            return
        }

        ctx.body = {
            status: 200,
            message: '修改动态成功',
            data: {momentId, name: user.name, content}
        }
    }

    // 删除动态
    async deleteMoment(ctx: RouterContext) {
        const momentId = toPositiveInt(ctx.params.momentId) ?? 0
        const user = ctx.state.user
        if (!user) {
            ctx.body = {
                message: '用户不存在',
                status: 400
            }
            return
        }
        if (!momentId) {
            ctx.body = {
                message: '动态ID不能为空',
                status: 400
            }
            return
        }

        const failCount = await momentService.deleteMoment(momentId)
        if (failCount > 0) {
            ctx.body = {
                status: 400,
                message: '删除动态失败',
                data: null
            }
            return
        }

        ctx.body = {
            status: 200,
            message: '删除动态成功',
            data: {momentId, name: user.name}
        }
    }

    // 给动态上某一条动态打标签
    async addMomentLabels(ctx: RouterContext) {
        const momentId = toPositiveInt(ctx.params.momentId) ?? 0
        const user = ctx.state.user
        const labels = ctx.state.labels
        if (!user) {
            ctx.body = {
                message: '用户不存在',
                status: 400
            }
            return
        }
        if (!momentId) {
            ctx.body = {
                message: '动态ID不能为空',
                status: 400
            }
            return
        }
        if (!labels?.length) {
            ctx.body = {
                message: '标签不能为空',
                status: 400
            }
            return
        }

        for await (const label of labels) {
            // 检查标签是否存在在动态上
            const hasLabel = await momentService.hasLabel(label.id, momentId)
            // 如果动态上不存在这个标签，就给添加上
            if (!hasLabel) {
                await momentService.addLabel(label.id, momentId)
            }
        }

        ctx.body = {
            message: '动态添加标签成功',
            data: {labels, momentId},
            status: 200
        }
    }

    // 动态配图
    async filePictureInfo(ctx: RouterContext) {
        // 只取 basename，防止 ../ 越权读取 uploads 之外的文件
        const filename = path.basename(ctx.params.filename ?? '')
        if (!filename) {
            ctx.body = {
                message: '文件名不能为空',
                status: 400
            }
            return
        }

        const fileInfo = await fileService.getFileByFilename(filename)
        if (!fileInfo) {
            ctx.body = {
                message: '文件不存在',
                status: 400
            }
            return
        }

        ctx.set('content-type', fileInfo.mimetype)
        ctx.body = fs.createReadStream(path.join(PICTURE_PATH, filename))
    }
}

export default new MomentController()
