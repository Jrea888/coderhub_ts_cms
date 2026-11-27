import type {Middleware} from 'koa'
import koaMulter from '@koa/multer'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import {ALLOWED_IMAGE_MIMES, AVATAR_PATH, MAX_AVATAR_SIZE} from '../app/config'

// 创建头像目录 （如果不存在）
fs.mkdirSync(AVATAR_PATH, {recursive: true})

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, AVATAR_PATH)
    },
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`)
    }
})

// 只接受图片，且限制大小；超限的错误由全局错误中间件转成 400
const fileFilter = (
    _req: unknown,
    file: {mimetype: string},
    cb: (error: Error | null, acceptFile: boolean) => void
): void => {
    cb(null, ALLOWED_IMAGE_MIMES.includes(file.mimetype))
}

export const avatarFileHandle: Middleware = koaMulter({
    storage,
    limits: {fileSize: MAX_AVATAR_SIZE},
    fileFilter
}).single('avatar')
