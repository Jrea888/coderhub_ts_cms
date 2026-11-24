import {Context} from 'koa'

// 获取请求体
export function getBody<T extends object>(ctx: Context): Partial<T> {
    const body = (ctx.request as {body?: unknown}).body
    return (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as Partial<T>
}

/** 转正整数，非法返回 null */
export function toPositiveInt(value: unknown): number | null {
    const num = Number(value)
    return Number.isInteger(num) && num > 0 ? num : null
}

/** 转非负整数，非法返回 fallback */
export function toNonNegativeInt(value: unknown, fallback = 0): number {
    const num = Number(value)
    return Number.isInteger(num) && num >= 0 ? num : fallback
}
