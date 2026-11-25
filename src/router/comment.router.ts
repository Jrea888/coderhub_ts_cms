import {Router} from '@koa/router'
import {commentController} from '../controller'

const commentRouter = new Router({prefix: '/comment'})
// 发表评论
commentRouter.post('/', commentController.create)
// 恢复评论

// 评论列表

// 修改 / 删除（需要登录 + 归属校验）

export default commentRouter
