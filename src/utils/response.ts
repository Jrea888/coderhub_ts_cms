import type {Context} from 'koa'

/**
 * 统一响应格式：{status, data, message}
 *
 * - status：业务状态码（200 / 400 / 403 / 404 ...）
 * - data：有数据就返回数据，没有数据统一返回 {}
 * - message：本次请求的说明
 */
export interface ResponseBody {
    status: number
    data: unknown
    message: string
}

/** 没有数据时统一给 {}，避免前端拿到 null / undefined 还要判空 */
function normalizeData(data: unknown): unknown {
    if (data === undefined || data === null) return {}
    if (Array.isArray(data) && data.length === 0) return {}
    return data
}

/** 成功响应 */
export function success(ctx: Context, message: string, data?: unknown): void {
    ctx.body = {status: 200, data: normalizeData(data), message} satisfies ResponseBody
}

/** 失败响应 */
export function fail(ctx: Context, status: number, message: string, data?: unknown): void {
    ctx.body = {status, data: normalizeData(data), message} satisfies ResponseBody
}
