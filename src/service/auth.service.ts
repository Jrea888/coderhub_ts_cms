import {ResultSetHeader} from 'mysql2'
import {UsersRegister} from '../types'
import pool from '../app/data-base'

class AuthService {
    // 注册用户
    async register(name: string, password: string): Promise<UsersRegister> {
        const statement = `INSERT into users (name, password) values (?, ?)`
        const [result] = await pool.execute<ResultSetHeader>(statement, [name, password])
        return {id: result.insertId, name: name, password}
    }
}

export default new AuthService()
