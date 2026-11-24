import {Middleware} from 'koa'
import koaMulter from '@koa/multer'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import {PICTURE_PATH} from '../app/config'

fs.mkdirSync(PICTURE_PATH, {recursive: true})

const storage = multer.diskStorage({
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`)
    },
    destination: (_req, _file, cb) => {
        cb(null, PICTURE_PATH)
    }
})

// 处理多文件上传
export const pictureFileHandle: Middleware = koaMulter({storage}).array('picture', 16)
