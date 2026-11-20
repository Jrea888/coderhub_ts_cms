// 连接mysql数据库
import mysql, {Pool} from 'mysql2'
import {DB_HOST, DB_PORT, DB_DATABASE, MYSQL_USER, MYSQL_PASSWORD} from './config'

const pool: Pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_DATABASE,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD
})

// 测试数据库连接
pool.query('SELECT 1', error => {
    if (error) {
        console.log('数据库连接失败！', error.code || error.message)
    } else {
        console.log('数据库连接成功！')
    }
})

// 导出 promise 版连接，供 service 层 await 使用
export default pool.promise()
