import {toNonNegativeInt, toPositiveInt} from './request'
import {DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PagedList} from '../types/base'

/** 查询参数集合（koa 的 ctx.query / ctx.request.query 都符合） */
export type QueryParams = Record<string, unknown>

export interface PageQuery {
    /** 每页条数，已夹到 [1, MAX_PAGE_SIZE] */
    size: number
    /** 0 基偏移量 */
    offset: number
}

/**
 * 解析分页参数
 *
 * 全项目统一：默认每页 DEFAULT_PAGE_SIZE 条，最多 MAX_PAGE_SIZE 条。
 * 两种写法都支持：
 * - offset：0 基偏移量，优先使用
 * - page：1 基页码，offset 缺省或非法时用 (page - 1) * size 换算
 */
export function parsePagination(query: QueryParams): PageQuery {
    const size = Math.min(toPositiveInt(query.size) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const queryOffset = toNonNegativeInt(query.offset, -1)
    const page = toPositiveInt(query.page) || 1
    const offset = queryOffset >= 0 ? queryOffset : (page - 1) * size

    return {size, offset}
}

/**
 * 把偏移量夹到合法范围
 *
 * offset 超出总数时回退到最后一页，避免出现 total 有值但 list 为空的响应。
 */
export function clampOffset(offset: number, total: number, size: number): number {
    if (total <= 0) return 0
    const lastPageOffset = Math.floor((total - 1) / size) * size
    return Math.min(Math.max(offset, 0), lastPageOffset)
}

/** 组装分页响应数据（page 统一为 1 基页码） */
export function buildPage<T>(list: T[], total: number, offset: number, size: number): PagedList<T> {
    return {
        list,
        total,
        size,
        totalPages: Math.ceil(total / size),
        page: Math.floor(offset / size) + 1
    }
}
