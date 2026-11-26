import {ResultSetHeader, RowDataPacket} from 'mysql2'
import {UsersRegister} from '../types'
import pool from '../app/data-base'
import {ResourceTable} from '../middleware'

class AuthService {
    // 注册用户
    async register(name: string, password: string): Promise<UsersRegister> {
        const statement = `INSERT into users (name, password) values (?, ?)`
        const [result] = await pool.execute<ResultSetHeader>(statement, [name, password])
        return {id: result.insertId, name: name, password}
    }

    // 检查用户是否有访问资源的权限
    async checkResource(tableName: ResourceTable, resourceId: number, userId: number): Promise<boolean> {
        const statement = `SELECT * FROM ${tableName} WHERE id = ? AND user_id = ?`
        const [result] = await pool.execute<RowDataPacket[]>(statement, [resourceId, userId])
        return result.length > 0
    }
}

export default new AuthService()
