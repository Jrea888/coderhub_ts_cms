import {Middleware} from 'koa'
import koaMulter from '@koa/multer'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import {AVATAR_PATH} from '../app/config'

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

export const avatarFileHandle: Middleware = koaMulter({storage}).single('avatar')
