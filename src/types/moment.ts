import {CommentItem} from './comment'
import {LabelRow} from './label'

export interface MomentRow {
    id: number
    content: string
    user_id: number
    create_time: Date
    update_time: Date
}

/** 动态详情（SQL 聚合后的结构） */
export interface MomentDetail {
    id: number
    content: string
    createTime: Date
    updateTime: Date
    author: {id: number; name: string} | null
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
    
    users: {id: number; name: string} | null
    commentCounts: number
    labelCounts: number
    images: string[] | null
}
