import {Router} from '@koa/router'
import {authController} from '../controller'
import {passwordEncrypt, verifyTokenAuth, verifyUserInfo, verifyUserLogin, verifyUserPassword} from '../middleware'

const authRouter = new Router({prefix: '/auth'})

// 注册用户
authRouter.post('/register', verifyUserInfo, passwordEncrypt, authController.register)
// 登录用户
authRouter.post('/login', verifyUserLogin, verifyUserPassword, authController.login)

// 验证Token
authRouter.post('/verify', verifyTokenAuth, authController.verify)

export default authRouter
