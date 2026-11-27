export interface LabelBody {
    id?: number
    name?: string
}

export interface LabelRow {
    id: number
    name: string
    createAt: Date
    updateAt: Date
}

/** verifyLabelExist 预处理后放进 ctx.state.labels 的最小结构 */
export interface LabelRef {
    id: number
    name: string
}
