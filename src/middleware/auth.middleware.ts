import {RouterContext} from '@koa/router'
import {Next} from 'koa'
import {fail, getBody, needsRehash, scryptEncrypt, toPositiveInt, verifyPassword, verifyToken} from '../utils'
import {UserBase, UsersRegister, TokenPayload} from '../types'
import {authService, usersService} from '../service'
import {PUBLIC_KEY} from '../app/config'

export type ResourceTable = 'moment' | 'comment'

export const ALLOWED_RESOURCE_TABLES = ['moment', 'comment'] as const

export const verifyUserPassword = async (ctx: RouterContext, next: Next): Promise<void> => {
    const {name, password} = getBody<UserBase>(ctx)

    const users = await usersService.getUserName(name as '')
    const user = users[0]
    if (!user) {
        fail(ctx, 400, '用户不存在')
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
        fail(ctx, 400, '密码错误, 请重新输入')
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
        fail(ctx, 400, '用户名或密码不能为空')
        return
    }

    // 判断用户是否存在
    const users = await usersService.getUserName(name)
    if (users.length) {
        fail(ctx, 400, '用户名已存在')
        return
    }

    // 注：这里原先还会把 {name, password} 塞进 ctx.state.user，
    // 但下游 register 是直接读 body 的，该赋值没有任何读取方，
    // 而且会把 TokenPayload 的类型弄混，已移除。
    await next()
}

// 验证用户登录信息：用户名和密码不能为空
export const verifyUserLogin = async (ctx: RouterContext, next: Next) => {
    const {name, password} = getBody<UsersRegister>(ctx)
    if (!name || !password) {
        fail(ctx, 400, '用户名或密码不能为空')
        return
    }
    await next()
}

// token 验签：只把验签放 try 里，下游异常不再被误判成 401
export const verifyTokenAuth = async (ctx: RouterContext, next: Next) => {
    const raw = ctx.headers.authorization
    if (!raw) {
        fail(ctx, 400, 'token不能为空')
        return
    }

    // 兼容两种写法：`Authorization: Bearer <token>` 与直接传裸 token
    const token = raw.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
        fail(ctx, 400, 'token不能为空')
        return
    }

    let payload: TokenPayload | null = null
    try {
        payload = verifyToken(token, PUBLIC_KEY)
    } catch (error) {
        fail(ctx, 400, 'token无效')
        return
    }

    ctx.state.user = payload
    await next()
}

// 验证用户权限：判断用户是否是资源的创建者, 是则放行, 否则返回 403, 根据参数确定表名称
export const verifyPermission = async (ctx: RouterContext, next: Next) => {
    const userId = ctx.state.user?.id
    if (!userId) {
        fail(ctx, 400, '用户不存在')
        return
    }
    const [resourceKey] = Object.keys(ctx.params)

    if (!resourceKey || !/Id$/g.test(resourceKey)) {
        fail(ctx, 400, '资源键不能为空')
        return
    }
    const resourceId = toPositiveInt(ctx.params[resourceKey])
    if (!resourceId) {
        fail(ctx, 400, '资源ID不能为空')
        return
    }
    const tableName = resourceKey.replace(/Id$/, '') as ResourceTable
    if (!ALLOWED_RESOURCE_TABLES.includes(tableName)) {
        fail(ctx, 400, '资源表名错误')
        return
    }

    const hasPermission = await authService.checkResource(tableName, resourceId, userId)
    if (!hasPermission) {
        fail(ctx, 403, '无权访问')
        return
    }

    await next()
}

/**
 * 校验"只能操作自己的账号"
 *
 * 用于 DELETE /users/delete/:userId。本项目没有角色体系，
 * 所以最小可行的约束是"登录用户只能删除自己"；
 * 将来引入管理员角色时，这里应补一条 role === 'admin' 的放行分支。
 */
export const verifySelfPermission = async (ctx: RouterContext, next: Next) => {
    const currentUserId = ctx.state.user?.id
    const targetUserId = toPositiveInt(ctx.params.userId)

    if (!currentUserId) {
        fail(ctx, 400, '用户不存在')
        return
    }
    if (!targetUserId) {
        fail(ctx, 400, '用户ID不能为空或无效')
        return
    }
    if (currentUserId !== targetUserId) {
        fail(ctx, 403, '只能操作自己的账号')
        return
    }

    await next()
}
