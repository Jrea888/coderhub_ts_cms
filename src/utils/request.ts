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

/**
 * 取出并规整请求体里的某个字符串字段
 *
 * - 非字符串（数字、布尔、对象、undefined）一律当空串：避免 `!content` 被 0/false 之类放行
 * - 统一 trim："   " 这种纯空白不能通过"非空"校验
 *
 * 原来每个 controller 各写一份 readContent / readName，逻辑一样但漏改风险高，
 * 现在统一走这里。
 */
export function getTrimmedField(ctx: Context, field: string): string {
    const value = getBody<Record<string, unknown>>(ctx)[field]
    return typeof value === 'string' ? value.trim() : ''
}
