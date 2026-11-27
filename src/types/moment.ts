import {CommentItem} from './comment'
import {LabelRow} from './label'

export interface MomentRow {
    id: number
    content: string
    user_id: number
    create_time: Date
    update_time: Date
}

/**
 * 动态详情（SQL 聚合后的结构）
 *
 * 字段名与 SQL 别名严格一致：作者对象别名是 `auth`，列表里的用户对象别名是 `userInfo`。
 * 之前类型里写成 author / users，与真实返回不一致，靠 as 断言遮盖了问题。
 */
export interface MomentDetail {
    id: number
    content: string
    createTime: Date
    updateTime: Date
    auth: {id: number; name: string} | null
    comments: CommentItem[] | null
    labels: LabelRow[] | null
    images: string[] | null
}

/** 动态列表项 */
export interface MomentListItem {
    id: number
    content: string
    createTime: Date
    updateTime: Date
    userInfo: {id: number; name: string; avatar: string | null} | null
    commentCounts: number
    labelCounts: number
    images: string[] | null
}
