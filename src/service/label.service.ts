import {ResultSetHeader, RowDataPacket} from 'mysql2'
import pool from '../app/data-base'
import {clampOffset, toNonNegativeInt} from '../utils'
import {LabelRow, ListPage} from '../types'

class LabelService {
    // 创建标签
    async create(name: string): Promise<number> {
        // 执行SQL语句，数组是参数设置
        const statement = 'INSERT INTO label (name) VALUES (?)'
        const [result] = await pool.execute<ResultSetHeader>(statement, [name])
        return result.insertId
    }

    // 获取标签列表
    async list(size: number, offset: number): Promise<ListPage<LabelRow>> {
        // ASC：按 id 升序排列 DESC：按 id 降序排列
        // LIMIT offset, count 表示：跳过 offset 条记录，取 count 条。
        const totalStatement = 'SELECT COUNT(*) AS total FROM label'
        const [totalRow] = await pool.execute<RowDataPacket[]>(totalStatement)
        const total = toNonNegativeInt(totalRow?.[0]?.total)

        // offset 超出总数时回退到最后一页，避免 total 有值但 list 为空
        const safeOffset = clampOffset(offset, total, size)
        const statement = 'SELECT * FROM label ORDER BY id ASC LIMIT ?, ?'
        const [result] = await pool.execute<RowDataPacket[]>(statement, [safeOffset, size])

        return {list: result as LabelRow[], total, offset: safeOffset}
    }

    // 编辑标签
    async edit(id: number, name: string): Promise<ResultSetHeader> {
        const statement = 'UPDATE label SET name = ? WHERE id = ?'
        const [result] = await pool.execute<ResultSetHeader>(statement, [name, id])
        return result
    }

    // 删除标签
    async delete(id: number): Promise<ResultSetHeader> {
        const statement = 'DELETE FROM label WHERE id = ?'
        const [result] = await pool.execute<ResultSetHeader>(statement, [id])
        return result
    }

    async getLabelName(name: string): Promise<LabelRow | null> {
        const statement = 'SELECT * FROM label WHERE name = ?'
        const [result] = await pool.execute<RowDataPacket[]>(statement, [name])
        return result?.[0] as LabelRow | null
    }
}

export default new LabelService()
