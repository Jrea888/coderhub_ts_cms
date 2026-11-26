import {ResultSetHeader, RowDataPacket} from 'mysql2'
import pool from '../app/data-base'
import {clampOffset} from '../utils'
import {ListPage, MomentDetail, MomentListItem} from '../types'
import {APP_HOST, APP_PORT} from '../app/config'

class momentService {
    // 发表动态
    async createMoment(content: string, userId: number): Promise<number> {
        // 执行SQL语句，数组是参数设置
        const statement = 'INSERT INTO moment (content, user_id) VALUES (?, ?)'
        const [result] = await pool.execute<ResultSetHeader>(statement, [content, userId])
        return result.insertId
    }
    // 动态列表
    async getMomentList(offset: number, size: number): Promise<ListPage<MomentListItem>> {
        const totalStatement = 'SELECT COUNT(*) as total FROM moment'
        const [totalResult] = await pool.execute<RowDataPacket[]>(totalStatement)
        const total = toNonNegativeInt(totalResult?.[0]?.total)

        // offset 超出总数时回退到最后一页，避免 total 有值但 list 为空
        const safeOffset = clampOffset(offset, total, size)
        const statement = `
        SELECT
            m.id id, m.content content,  m.creatAt createTime, m.updateAt updateTime,
            JSON_OBJECT("id", u.id, "name", u.name, "avatar", u.avatar_url) userInfo,
            (SELECT COUNT(*) FROM moment_label ml WHERE ml.moment_id = m.id) labelCounts,
            (SELECT COUNT(*) FROM comment c WHERE c.moment_id = m.id) commentCounts,
            (SELECT JSON_ARRAYAGG(CONCAT('${APP_HOST}:${APP_PORT}/moment/images/', f.filename)) FROM file f WHERE f.moment_id = m.id) images
        FROM moment m
            LEFT JOIN users u ON m.user_id = u.id
            ORDER BY m.id ASC
            LIMIT ?, ?`
        const [result] = await pool.execute<RowDataPacket[]>(statement, [safeOffset, size])

        return {list: result as MomentListItem[], total, offset: safeOffset}
    }

    // 获取动态详情
    async getMomentDetail(id: number): Promise<MomentDetail | null> {
        const statement = 'SELECT * FROM moment WHERE id = ?'
        const [result] = await pool.execute<RowDataPacket[]>(statement, [id])
        return result?.[0] as MomentDetail | null
    }

    // 修改动态
    async updateMoment(id: number, content: string): Promise<number> {
        const statement = 'UPDATE moment SET content = ? WHERE id = ?'
        const [result] = await pool.execute<ResultSetHeader>(statement, [content, id])
        return result.fieldCount
    }

    // 删除动态
    async deleteMoment(id: number): Promise<number> {
        const statement = 'DELETE FROM moment WHERE id = ?'
        const [result] = await pool.execute<ResultSetHeader>(statement, [id])
        return result.fieldCount
    }

    // 判断标签是否存在
    async hasLabel(labelID: number, momentID: number): Promise<boolean> {
        const statement = 'SELECT * FROM moment_label WHERE moment_id = ? AND label_id = ?'
        const [result] = await pool.execute<RowDataPacket[]>(statement, [momentID, labelID])
        return result.length > 0
    }

    // 给动态添加标签
    async addLabel(labelID: number, momentID: number): Promise<number> {
        const statement = 'INSERT INTO moment_label (moment_id, label_id) VALUES (?, ?)'
        const [result] = await pool.execute<ResultSetHeader>(statement, [momentID, labelID])
        return result.insertId
    }
}

export default new momentService()
