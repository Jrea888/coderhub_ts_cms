import {ResultSetHeader} from 'mysql2'
import connection from '../app/data-base'

class FileService {
    // 创建文件元信息
    async saveAvatarFile(userId: number, filename: string, mimetype: string, size: number): Promise<ResultSetHeader> {
        // 执行SQL语句，数组是参数设置
        const statement = `INSERT INTO avatar (filename, mimetype, size, user_id) VALUES (?, ?, ?, ?);`
        const [result] = await connection.execute<ResultSetHeader>(statement, [filename, mimetype, size, userId])
        return result
    }

    async savePictureFiles(
        filename: string,
        mimetype: string,
        size: number,
        userId: number,
        momentId: number
    ): Promise<ResultSetHeader> {
        const statement = `INSERT INTO file (filename, mimetype, size, user_id, moment_id) VALUES (?, ?, ?, ?, ?);`
        const [result] = await connection.execute<ResultSetHeader>(statement, [
            filename,
            mimetype,
            size,
            userId,
            momentId
        ])
        return result
    }
}

export default new FileService()
