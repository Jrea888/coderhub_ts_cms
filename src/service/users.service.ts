import {ResultSetHeader, RowDataPacket} from 'mysql2'
import pool from '../app/data-base'
import {clampOffset, toNonNegativeInt} from '../utils'
import {ListPage, UserRow} from '../types'

class UsersService {
    // 根据用户名查询用户
    async getUserName(name: string): Promise<UserRow[]> {
        const statement = `SELECT * FROM users WHERE name = ? LIMIT 1`
        const [rows] = await pool.execute<RowDataPacket[]>(statement, [name])
        return rows as UserRow[]
    }

    // 更新用户密码（历史 MD5 登录成功后自动升级为 scrypt）
    async updatePassword(id: number, password: string): Promise<ResultSetHeader> {
        const statement = `UPDATE users SET password = ? WHERE id = ?`
        const [result] = await pool.execute<ResultSetHeader>(statement, [password, id])
        return result
    }

    // 获取用户列表
    async getUserList(size: number, offset: number): Promise<ListPage<UserRow>> {
        const totalStatement = `SELECT COUNT(*) AS total FROM users`
        const [totalRow] = await pool.execute<RowDataPacket[]>(totalStatement)
        const total = toNonNegativeInt(totalRow?.[0]?.total)

        // offset 超出总数时回退到最后一页，避免 total 有值但 list 为空
        const safeOffset = clampOffset(offset, total, size)
        const statement = `
        SELECT
            u.id id, u.name name, u.avatar_url avatar_url, u.createAt createTime, u.updateAt updateTime
        FROM users u
            LIMIT ?, ?
        `
        const [rows] = await pool.execute<RowDataPacket[]>(statement, [safeOffset, size])

        return {list: rows as UserRow[], total, offset: safeOffset}
    }

    // 获取用户信息
    async getUserInfo(userId: number): Promise<UserRow | null> {
        const statement = `SELECT JSON_OBJECT('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url, 'createAt', u.createAt, 'updateAt', u.updateAt) AS users FROM users u WHERE u.id = ?`
        const [rows] = await pool.execute<RowDataPacket[]>(statement, [userId])
        return (rows[0]?.users as UserRow) || null
    }

    // 删除用户：返回实际删除的行数，0 表示用户不存在
    async deleteUser(userId: number): Promise<number> {
        const statement = `DELETE FROM users WHERE id = ?`
        const [result] = await pool.execute<ResultSetHeader>(statement, [userId])
        return result.affectedRows
    }

    // 更新用户头像地址
    async updateAvatarUrlById(avatarUrl: string, userId: number): Promise<ResultSetHeader> {
        const statement = `UPDATE users SET avatar_url = ? WHERE id = ?`
        const [result] = await pool.execute<ResultSetHeader>(statement, [avatarUrl, userId])
        return result
    }
}

export default new UsersService()
