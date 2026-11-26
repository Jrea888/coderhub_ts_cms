import {ResultSetHeader, RowDataPacket} from 'mysql2'
import pool from '../app/data-base'
import {clampOffset, toNonNegativeInt} from '../utils'
import {CommentItem, ListPage} from '../types'

class commentService {
    async create(content: string, moment_id: number, user_id: number): Promise<number> {
        // 执行SQL语句，数组是参数设置
        const statement = 'INSERT INTO comment (content, moment_id, user_id) VALUES (?, ?, ?)'
        const [result] = await pool.execute<ResultSetHeader>(statement, [content, moment_id, user_id])
        return result.insertId || 0
    }

    // 评论列表
    async list(moment_id: number, size: number, offset: number): Promise<ListPage<CommentItem>> {
        const totalStatement = `SELECT COUNT(*) as total FROM comment WHERE moment_id = ?`
        const [totalResult] = await pool.execute<RowDataPacket[]>(totalStatement, [moment_id])
        const total = toNonNegativeInt(totalResult?.[0]?.total)

        // offset 超出总数时回退到最后一页，避免 total 有值但 list 为空
        const safeOffset = clampOffset(offset, total, size)

        // 执行SQL语句，数组是参数设置（LIMIT offset, size）
        const statement = `
        SELECT
            c.id id, c.content content, c.moment_id commentId, c.createAt createTime,
            JSON_OBJECT('name', u.name, 'id', u.id) AS user
        FROM comment c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.moment_id = ?
            ORDER BY id ASC
            LIMIT ?, ?;
        `
        const [result] = await pool.execute<RowDataPacket[]>(statement, [moment_id, safeOffset, size])

        return {total, list: result as CommentItem[], offset: safeOffset}
    }

    // 回复评论
    async reply(content: string, moment_id: number, comment_id: number, user_id: number): Promise<number> {
        // 执行SQL语句，数组是参数设置
        const statement = 'INSERT INTO comment (content, moment_id, comment_id, user_id) VALUES (?, ?, ?, ?)'
        const [result] = await pool.execute<ResultSetHeader>(statement, [content, moment_id, comment_id, user_id])
        return result.insertId || 0
    }

    // 修改评论
    async update(content: string, comment_id: number): Promise<number> {
        // 执行SQL语句，数组是参数设置
        const statement = 'UPDATE comment SET content = ? WHERE id = ?'
        const [result] = await pool.execute<ResultSetHeader>(statement, [content, comment_id])
        return result.affectedRows || 0
    }

    // 删除评论
    async delete(comment_id: number): Promise<number> {
        // 执行SQL语句，数组是参数设置
        const statement = 'DELETE FROM comment WHERE id = ?'
        const [result] = await pool.execute<ResultSetHeader>(statement, [comment_id])
        return result.affectedRows || 0
    }
}

export default new commentService()
