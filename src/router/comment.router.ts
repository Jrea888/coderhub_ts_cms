import {Router} from '@koa/router'
import {commentController} from '../controller'
import {verifyPermission, verifyTokenAuth} from '../middleware'

const commentRouter = new Router({prefix: '/comment'})
// 发表评论
commentRouter.post('/', verifyTokenAuth, commentController.create)
// 恢复评论
commentRouter.post('/:commentId/reply', verifyTokenAuth, commentController.reply)
// 评论列表
commentRouter.get('/list', verifyTokenAuth, commentController.list)
// 修改 / 删除（需要登录 + 归属校验，是自己的评论，才能修改/删除）
commentRouter.patch('/:commentId', verifyTokenAuth, verifyPermission, commentController.update)
commentRouter.delete('/:commentId', verifyTokenAuth, verifyPermission, commentController.delete)

export default commentRouter
