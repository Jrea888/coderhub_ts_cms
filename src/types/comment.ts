/** 评论列表项 */
export interface CommentItem {
    id: number
    content: string
    commentId: number | null
    createTime: Date
    user: {id: number; name: string} | null
}
