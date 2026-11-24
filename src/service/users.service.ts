import {ResultSetHeader, RowDataPacket} from 'mysql2'
import pool from '../app/data-base'
import {UserRow} from '../types'

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
    async getUserList(size: number, offset: number): Promise<{list: UserRow[]; total: number}> {
        const statement = `SELECT * FROM users LIMIT ?, ?`
        const totalStatement = `SELECT COUNT(*) AS total FROM users `

        const [rows] = await pool.execute<RowDataPacket[]>(statement, [offset, size])
        const [totalRow] = await pool.execute<RowDataPacket[]>(totalStatement)
        return {list: rows as UserRow[], total: (totalRow?.[0]?.total as number) || 0}
    }

    // 获取用户信息
    async getUserInfo(userId: number): Promise<UserRow | null> {
        const statement = `SELECT JSON_OBJECT('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url, 'createAt', u.createAt, 'updateAt', u.updateAt) AS users FROM users u WHERE u.id = ?`
        const [rows] = await pool.execute<RowDataPacket[]>(statement, [userId])
        return (rows[0]?.users as UserRow) || null
    }

    // 删除用户
    async deleteUser(userId: number): Promise<ResultSetHeader> {
        const statement = `DELETE FROM users WHERE id = ?`
        const [result] = await pool.execute<ResultSetHeader>(statement, [userId])
        return result
    }
}

export default new UsersService()
