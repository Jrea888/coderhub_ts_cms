import {Context} from 'koa'

// 获取请求体
export function getBody<T extends object>(ctx: Context): Partial<T> {
    const body = (ctx.request as {body?: unknown}).body
    return (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as Partial<T>
}
