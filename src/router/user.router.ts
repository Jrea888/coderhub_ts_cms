import {Router} from '@koa/router'
import {usersController} from '../controller'
import {verifySelfPermission, verifyTokenAuth} from '../middleware'

const usersRouter = new Router({prefix: '/users'})

// 获取用户列表
usersRouter.get('/list', verifyTokenAuth, usersController.list)
// 获取用户详情
usersRouter.get('/info/:userId', verifyTokenAuth, usersController.info)
// 删除用户（只能删自己，管理员角色待补）
usersRouter.delete('/delete/:userId', verifyTokenAuth, verifySelfPermission, usersController.delete)
// 获取用户头像信息
usersRouter.get('/:userId/avatar', usersController.userAvatarInfo)

export default usersRouter
