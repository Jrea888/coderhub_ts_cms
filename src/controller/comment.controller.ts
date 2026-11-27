import {RouterContext} from '@koa/router'
import {commentService} from '../service'
import {buildPage, fail, getBody, getTrimmedField, parsePagination, success, toPositiveInt} from '../utils'

class CommentController {
    // 创建评论
    async create(ctx: RouterContext) {
        const user = ctx.state.user
        const {momentId} = getBody<{momentId: number}>(ctx)
        const moment_id = toPositiveInt(momentId) || 0
        const content = getTrimmedField(ctx, 'content')

        if (!user) {
            fail(ctx, 400, '暂无用户信息，无法创建评论')
            return
        }
        if (!moment_id || !content) {
            fail(ctx, 400, '动态ID或内容不能为空')
            return
        }

        const commentId = await commentService.create(content, moment_id, user.id)
        if (!commentId) {
            fail(ctx, 400, '评论创建失败')
            return
        }

        success(ctx, '评论创建成功', {commentId, name: user.name, id: user.id})
    }

    // 评论列表
    // 分页参数支持两种写法：offset（0 基偏移，优先）或 page（1 基页码）
    async list(ctx: RouterContext) {
        const moment_id = toPositiveInt(ctx.request.query.momentId) || 0
        if (!moment_id) {
            fail(ctx, 400, '动态ID不能为空')
            return
        }

        const {size, offset} = parsePagination(ctx.request.query)
        const {list, total, offset: effectiveOffset} = await commentService.list(moment_id, size, offset)
        success(ctx, '评论列表获取成功', buildPage(list, total, effectiveOffset, size))
    }

    // 回复评论
    async reply(ctx: RouterContext) {
        const user = ctx.state.user
        const {momentId} = getBody<{momentId: number}>(ctx)
        const content = getTrimmedField(ctx, 'content')
        const comment_id = toPositiveInt(ctx.params.commentId) || 0
        const moment_id = toPositiveInt(momentId) || 0

        if (!user || !comment_id || !content || !moment_id) {
            fail(ctx, 400, '暂无用户信息或评论ID或内容或动态ID不能为空')
            return
        }

        const commentId = await commentService.reply(content, moment_id, comment_id, user.id)
        if (!commentId) {
            fail(ctx, 400, '评论回复失败')
            return
        }

        success(ctx, '评论回复成功', {commentId, content, momentId: moment_id, name: user.name, id: user.id})
    }

    // 修改评论
    async update(ctx: RouterContext) {
        const comment_id = toPositiveInt(ctx.params.commentId) || 0
        const content = getTrimmedField(ctx, 'content')
        if (!content || !comment_id) {
            fail(ctx, 400, '内容或评论ID不能为空')
            return
        }

        const commentId = await commentService.update(content, comment_id)
        // 影响行数为 0 说明内容没变（verifyPermission 已保证评论存在且属于自己）
        if (!commentId) {
            success(ctx, '评论内容未变化', {commentId: comment_id, content})
            return
        }
        success(ctx, '评论修改成功', {commentId, content})
    }

    // 删除评论
    async delete(ctx: RouterContext) {
        const comment_id = toPositiveInt(ctx.params.commentId) || 0
        if (!comment_id) {
            fail(ctx, 400, '评论ID不能为空')
            return
        }

        const commentId = await commentService.delete(comment_id)
        if (!commentId) {
            fail(ctx, 404, '评论不存在')
            return
        }
        success(ctx, '评论删除成功', {commentId})
    }
}

export default new CommentController()
