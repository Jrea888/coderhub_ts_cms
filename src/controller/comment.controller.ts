import {RouterContext} from '@koa/router'
import {commentService} from '../service'

class CommentController {
    // 创建评论
    async create(ctx: RouterContext) {
        const {body} = ctx.request
        const commentId = await commentService.create()
        ctx.body = {commentId}
    }
}

export default new CommentController()
