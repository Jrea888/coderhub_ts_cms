import {RouterContext} from '@koa/router'
import {authService} from '../service'
import {fail, getBody, signToken, success} from '../utils'
import {UsersRegister} from '../types'
import {PRIVATE_KEY} from '../app/config'

class authController {
    // 注册用户
    async register(ctx: RouterContext) {
        const {name, password} = getBody<UsersRegister>(ctx)
        const result = await authService.register(name as string, password as string)
        success(ctx, '注册成功', result)
    }

    // 登录用户
    async login(ctx: RouterContext) {
        const user = ctx.state.user
        if (!user) {
            fail(ctx, 400, 'token无效')
            return
        }

        // 返回用户ID 和 token
        const token = signToken({id: user.id, name: user.name}, PRIVATE_KEY)
        success(ctx, '登录成功', {...user, token})
    }

    // 验证Token
    async verify(ctx: RouterContext) {
        success(ctx, 'Token验证成功', ctx.state.user)
    }
}

export default new authController()
