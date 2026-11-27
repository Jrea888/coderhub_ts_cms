import {ResultSetHeader, RowDataPacket} from 'mysql2'
import pool from '../app/data-base'
import {clampOffset, toNonNegativeInt} from '../utils'
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
            m.id id, m.content content,  m.createAt createTime, m.updateAt updateTime,
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

    /**
     * 动态详情：作者、评论、标签、配图一次聚合
     *
     * 说明：SQL 里 `JSON_ARRAYAGG(JSON_OBJECT(...))` 嵌套，在部分 MySQL 版本的
     * 预编译协议下会报 "Incorrect parameters ... json_object"；本机 MySQL 8.4 +
     * mysql2 3.x 实测 `execute` 正常（接口已回归验证），故保持 execute。
     * 若换库后复现该报错，把这里换成 `pool.query(statement, [id])`（文本协议）即可。
     */
    async getMomentDetail(id: number): Promise<MomentDetail | null> {
        const statement = `
        SELECT
            m.id id, m.content content, m.createAt createTime, m.updateAt updateTime,
            JSON_OBJECT("id", u.id, "name", u.name) auth,
            (SELECT JSON_ARRAYAGG(l.name)
             FROM moment_label ml
             LEFT JOIN label l ON l.id = ml.label_id
             WHERE ml.moment_id = m.id) labels,
            (SELECT JSON_ARRAYAGG(CONCAT('${APP_HOST}:${APP_PORT}/moment/images/', f.filename)) FROM file f WHERE f.moment_id = m.id) images,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT("id", c.id, "content", c.content, "parentId", c.comment_id, "createTime", c.createAt, "user", JSON_OBJECT("id", cu.id, "name", cu.name, "avatar", cu.avatar_url)))
             FROM comment c
             LEFT JOIN users cu ON c.user_id = cu.id
             WHERE c.moment_id = m.id) comments
        FROM moment m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        `
        const [result] = await pool.execute<RowDataPacket[]>(statement, [id])
        return result?.[0] as MomentDetail | null
    }

    // 修改动态：返回影响行数（0 表示内容与原来相同）
    async updateMoment(id: number, content: string): Promise<number> {
        const statement = 'UPDATE moment SET content = ? WHERE id = ?'
        const [result] = await pool.execute<ResultSetHeader>(statement, [content, id])
        // 之前误用 result.fieldCount（对 UPDATE 恒为 0），改为真正的影响行数
        return result.affectedRows
    }

    // 删除动态：返回影响行数（0 表示动态不存在）
    async deleteMoment(id: number): Promise<number> {
        const statement = 'DELETE FROM moment WHERE id = ?'
        const [result] = await pool.execute<ResultSetHeader>(statement, [id])
        return result.affectedRows
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
