import {RouterContext} from '@koa/router'
import {Next} from 'koa'
import {scryptEncrypt} from '../utils'
import {UsersRegister} from '../types'

// 对密码进行 scrypt 加盐存储
export const passwordEncrypt = async (ctx: RouterContext, next: Next) => {
    const request = ctx.request as unknown as {body: UsersRegister}
    const encryptedPassword = scryptEncrypt(request.body.password)
    request.body.password = encryptedPassword
    await next()
}
