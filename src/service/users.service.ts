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
}

export default new UsersService()
