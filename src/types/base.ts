/** 分页默认大小 */
export const DEFAULT_PAGE_SIZE = 10

/** 分页大小上限，防止一次拉爆内存 */
export const MAX_PAGE_SIZE = 100

/**
 * service 层列表查询结果
 *
 * offset 是「实际生效」的偏移量：offset 超出总数时会被夹到最后一页，
 * 上层据此反推页码才不会算错。
 */
export interface ListPage<T> {
    list: T[]
    total: number
    offset: number
}

/** 接口返回给前端的分页数据（page 为 1 基页码） */
export interface PagedList<T> {
    list: T[]
    total: number
    totalPages: number
    page: number
    size: number
}
