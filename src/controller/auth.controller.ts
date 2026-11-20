import {RouterContext} from '@koa/router'
import {authService} from '../service'
import {getBody, signToken} from '../utils'
import {UsersRegister} from '../types'
import {PRIVATE_KEY} from '../app/config'

class authController {
    // 注册用户
    async register(ctx: RouterContext) {
        const {name, password} = getBody<UsersRegister>(ctx)
        const result = await authService.register(name as string, password as string)
        ctx.body = {
            status: 200,
            message: '注册成功',
            data: result
        }
    }

    // 登录用户
    async login(ctx: RouterContext) {
        const user = ctx.state.user
        if (!user) {
            ctx.body = {status: 400, message: 'token无效', data: null}
            return
        }

        // 返回用户ID 和 token
        const token = signToken({id: user.id, name: user.name}, PRIVATE_KEY)
        ctx.body = {
            status: 200,
            message: '登录成功',
            data: {...user, token}
        }
    }

    // 验证Token
    async verify(ctx: RouterContext) {
        const user = ctx.state.user
        ctx.body = {
            status: 200,
            message: 'Token验证成功',
            data: user
        }
    }
}

export default new authController()
