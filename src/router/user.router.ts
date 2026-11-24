import {Router} from '@koa/router'
import {usersController} from '../controller'
import {verifyTokenAuth} from '../middleware'

const usersRouter = new Router({prefix: '/users'})

// 获取用户列表
usersRouter.get('/list', verifyTokenAuth, usersController.list)
// 获取用户详情
usersRouter.get('/info/:userId', verifyTokenAuth, usersController.info)
// 删除用户
usersRouter.delete('/delete/:userId', verifyTokenAuth, usersController.delete)
// 获取用户头像信息
usersRouter.get('/:userId/avatar', usersController.userAvatarInfo)

export default usersRouter
