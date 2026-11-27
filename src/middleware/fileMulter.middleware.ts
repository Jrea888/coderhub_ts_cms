import type {Middleware} from 'koa'
import koaMulter from '@koa/multer'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import {ALLOWED_IMAGE_MIMES, MAX_PICTURE_COUNT, MAX_PICTURE_SIZE, PICTURE_PATH} from '../app/config'

fs.mkdirSync(PICTURE_PATH, {recursive: true})

const storage = multer.diskStorage({
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`)
    },
    destination: (_req, _file, cb) => {
        cb(null, PICTURE_PATH)
    }
})

// 只接受图片，且限制单张大小与张数；错误由全局错误中间件转成 400
const fileFilter = (
    _req: unknown,
    file: {mimetype: string},
    cb: (error: Error | null, acceptFile: boolean) => void
): void => {
    cb(null, ALLOWED_IMAGE_MIMES.includes(file.mimetype))
}

// 处理多文件上传
export const pictureFileHandle: Middleware = koaMulter({
    storage,
    limits: {fileSize: MAX_PICTURE_SIZE, files: MAX_PICTURE_COUNT},
    fileFilter
}).array('picture', MAX_PICTURE_COUNT)
