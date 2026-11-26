import path from 'path'
import fs from 'fs'
import type {RouterContext} from '@koa/router'
import {fileService, momentService} from '../service'
import {buildPage, fail, getBody, parsePagination, success, toPositiveInt} from '../utils'
import {PICTURE_PATH} from '../app/config'

class MomentController {
    // 创建动态
    async createMoment(ctx: RouterContext) {
        const user = ctx.state.user
        const {content} = getBody<{content: string}>(ctx)

        if (!user) {
            fail(ctx, 400, '用户不存在')
            return
        }
        if (!content) {
            fail(ctx, 400, '内容不能为空')
            return
        }
        if (content.trim().length > 10000) {
            fail(ctx, 400, '内容长度不能超过10000个字符')
            return
        }

        const momentId = await momentService.createMoment(content, user.id)
        success(ctx, '发表动态成功', {momentId, name: user.name})
    }

    // 动态列表 分页获取
    async getMomentList(ctx: RouterContext) {
        const {size, offset} = parsePagination(ctx.request.query)
        const {list, total, offset: effectiveOffset} = await momentService.getMomentList(offset, size)
        success(ctx, '获取动态列表成功', buildPage(list, total, effectiveOffset, size))
    }

    // 获取动态详情
    async getMomentDetail(ctx: RouterContext) {
        const momentId = toPositiveInt(ctx.params.momentId) ?? 0
        if (!momentId) {
            fail(ctx, 400, '动态ID不能为空')
            return
        }

        const detail = await momentService.getMomentDetail(momentId)
        if (!detail) {
            fail(ctx, 404, '动态不存在')
            return
        }
        success(ctx, '获取动态详情成功', detail)
    }

    // 修改动态
    async updateMoment(ctx: RouterContext) {
        const momentId = toPositiveInt(ctx.params.momentId) ?? 0
        const user = ctx.state.user
        if (!user) {
            fail(ctx, 400, '用户不存在')
            return
        }
        if (!momentId) {
            fail(ctx, 400, '动态ID不能为空')
            return
        }

        const {content} = getBody<{content: string}>(ctx)
        if (!content) {
            fail(ctx, 400, '内容不能为空')
            return
        }
        if (content.trim().length > 10000) {
            fail(ctx, 400, '内容长度不能超过10000个字符')
            return
        }

        const failCount = await momentService.updateMoment(momentId, content)
        if (failCount > 0) {
            fail(ctx, 400, '修改动态失败')
            return
        }

        success(ctx, '修改动态成功', {momentId, name: user.name, content})
    }

    // 删除动态
    async deleteMoment(ctx: RouterContext) {
        const momentId = toPositiveInt(ctx.params.momentId) ?? 0
        const user = ctx.state.user
        if (!user) {
            fail(ctx, 400, '用户不存在')
            return
        }
        if (!momentId) {
            fail(ctx, 400, '动态ID不能为空')
            return
        }

        const failCount = await momentService.deleteMoment(momentId)
        if (failCount > 0) {
            fail(ctx, 400, '删除动态失败')
            return
        }

        success(ctx, '删除动态成功', {momentId, name: user.name})
    }

    // 给动态上某一条动态打标签
    async addMomentLabels(ctx: RouterContext) {
        const momentId = toPositiveInt(ctx.params.momentId) ?? 0
        const user = ctx.state.user
        const labels = ctx.state.labels
        if (!user) {
            fail(ctx, 400, '用户不存在')
            return
        }
        if (!momentId) {
            fail(ctx, 400, '动态ID不能为空')
            return
        }
        if (!labels?.length) {
            fail(ctx, 400, '标签不能为空')
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

        success(ctx, '动态添加标签成功', {labels, momentId})
    }

    // 动态配图
    async filePictureInfo(ctx: RouterContext) {
        // 只取 basename，防止 ../ 越权读取 uploads 之外的文件
        const filename = path.basename(ctx.params.filename ?? '')
        if (!filename) {
            fail(ctx, 400, '文件名不能为空')
            return
        }

        const fileInfo = await fileService.getFileByFilename(filename)
        if (!fileInfo) {
            fail(ctx, 404, '文件不存在')
            return
        }

        ctx.set('content-type', fileInfo.mimetype)
        ctx.body = fs.createReadStream(path.join(PICTURE_PATH, filename))
    }
}

export default new MomentController()
