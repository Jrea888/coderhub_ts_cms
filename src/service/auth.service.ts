import {ResultSetHeader, RowDataPacket} from 'mysql2'
import {RegisteredUser} from '../types'
import pool from '../app/data-base'
import {ResourceTable} from '../middleware'

class AuthService {
    // 注册用户
    async register(name: string, password: string): Promise<RegisteredUser> {
        const statement = `INSERT into users (name, password) values (?, ?)`
        const [result] = await pool.execute<ResultSetHeader>(statement, [name, password])
        // 只回传 id 与用户名：password 是 scrypt 哈希，绝不能出现在接口响应里
        return {id: result.insertId, name}
    }

    // 检查用户是否有访问资源的权限
    async checkResource(tableName: ResourceTable, resourceId: number, userId: number): Promise<boolean> {
        const statement = `SELECT * FROM ${tableName} WHERE id = ? AND user_id = ?`
        const [result] = await pool.execute<RowDataPacket[]>(statement, [resourceId, userId])
        return result.length > 0
    }
}

export default new AuthService()
