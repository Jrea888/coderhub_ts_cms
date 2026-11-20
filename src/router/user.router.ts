import {Router} from '@koa/router'
import {usersController} from '../controller'

const usersRouter = new Router({prefix: '/users'})

// 获取用户列表
usersRouter.get('/list', usersController.list)
// 获取用户详情
usersRouter.get('/info/:id', usersController.info)
// 删除用户
usersRouter.delete('/delete/:id', usersController.delete)

export default usersRouter
