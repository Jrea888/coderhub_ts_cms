import pool from '../app/data-base'

class commentService {
    async create() {
        // 执行SQL语句，数组是参数设置
        const statement = 'statement'
        const [result] = await pool.execute(statement, [0])
        return result
    }
}

export default new commentService()
