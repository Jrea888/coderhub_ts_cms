import {ResultSetHeader, RowDataPacket} from 'mysql2'
import connection from '../app/data-base'
import {AvatarRow} from '../types'

class FileService {
    // 创建文件元信息
    async saveAvatarFile(userId: number, filename: string, mimetype: string, size: number): Promise<ResultSetHeader> {
        // 执行SQL语句，数组是参数设置
        const statement = `INSERT INTO avatar (filename, mimetype, size, user_id) VALUES (?, ?, ?, ?);`
        const [result] = await connection.execute<ResultSetHeader>(statement, [filename, mimetype, size, userId])
        return result
    }

    // 创建动态图片元信息
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

    // 获取用户头像信息
    async getUserAvatarInfo(userId: number): Promise<AvatarRow | null> {
        const statement = `SELECT * FROM avatar WHERE user_id = ? ORDER BY id DESC LIMIT 1`
        const [result] = await connection.execute<RowDataPacket[]>(statement, [userId])
        return result[0] as AvatarRow | null
    }
}

export default new FileService()
