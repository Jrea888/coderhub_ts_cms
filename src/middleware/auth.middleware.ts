import {RouterContext} from '@koa/router'
import {Next} from 'koa'
import {getBody, needsRehash, scryptEncrypt, verifyPassword, verifyToken} from '../utils'
import {UserBase, UsersRegister, TokenPayload} from '../types'
import {usersService} from '../service'
import {PUBLIC_KEY} from '../app/config'

export const verifyUserPassword = async (ctx: RouterContext, next: Next): Promise<void> => {
    const {name, password} = getBody<UserBase>(ctx)

    const users = await usersService.getUserName(name as '')
    const user = users[0]
    if (!user) {
        ctx.body = {status: 400, message: '用户不存在', data: null}
        return
    }

    // 对于历史即非md5，也非scrypt的用户密码，直接将密码转换为scrypt格式存储
    if (password === user.password) {
        await usersService.updatePassword(user.id, scryptEncrypt(password || ''))
        ctx.state.user = {id: user.id, name: user.name}
        await next()
        return
    }

    if (!verifyPassword(password || '', user.password)) {
        ctx.body = {status: 400, message: '密码错误, 请重新输入', data: null}
        return
    }

    // 对历史md5密码进行升级 先判断是否需要进行
    if (needsRehash(user.password)) {
        try {
            await usersService.updatePassword(user.id, scryptEncrypt(password || ''))
        } catch (error) {
            console.error('[password] 升级哈希失败:', error)
        }
    }

    ctx.state.user = {id: user.id, name: user.name}
    await next()
}

// 验证用户信息：用户名和密码不能为空，用户是否已经注册
export const verifyUserInfo = async (ctx: RouterContext, next: Next) => {
    const {name, password} = getBody<UsersRegister>(ctx)
    // 判断为空
    if (!name || !password) {
        ctx.body = {status: 400, message: '用户名或密码不能为空', data: null}
        return
    }

    // 判断用户是否存在
    const users = await usersService.getUserName(name)
    if (users.length) {
        ctx.body = {status: 400, message: '用户名已存在', data: null}
        return
    }

    ctx.state.user = {name, password}
    await next()
}

// 验证用户登录信息：用户名和密码不能为空
export const verifyUserLogin = async (ctx: RouterContext, next: Next) => {
    const {name, password} = getBody<UsersRegister>(ctx)
    // 判断为空
    if (!name || !password) {
        ctx.body = {status: 400, message: '用户名或密码不能为空', data: null}
        return
    }
    await next()
}

// token 校验：只把验签放 try 里，下游异常不再被误判成 401
export const verifyTokenAuth = async (ctx: RouterContext, next: Next) => {
    const token = ctx.headers.authorization
    if (!token) {
        ctx.body = {status: 400, message: 'token不能为空', data: null}
        return
    }

    let payload: TokenPayload | null = null
    try {
        payload = verifyToken(token, PUBLIC_KEY)
    } catch (error) {
        ctx.body = {status: 400, message: 'token无效', data: null}
        return
    }

    ctx.state.user = payload
    await next()
}
