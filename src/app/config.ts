import {readFileSync} from 'node:fs'
import path from 'node:path'

/**
 * 密钥目录
 *
 * tsc 只编译 .ts，不会把 keys/*.key 复制到 dist，所以不能用 __dirname/keys：
 *  __dirname: 执行当前脚本的目录
 * - 开发：__dirname = src/app        → 上两级 = 项目根
 * - 构建：__dirname = dist/app       → 上两级 = 项目根
 * 统一指向项目根下的 src/app/keys，密钥只保留一份。
 * 也可以用 KEY_DIR 环境变量覆盖（比如部署时挂载密钥）。
 */
const dir = process.env.KEY_DIR
    ? path.resolve(process.env.KEY_DIR)
    : path.resolve(__dirname, '..', '..', 'src/app/keys')

export const PRIVATE_KEY: Buffer = readFileSync(path.join(dir, 'private.key'))
export const PUBLIC_KEY: Buffer = readFileSync(path.join(dir, 'public.key'))

// 应用配置
export const APP_PORT = Number(process.env.APP_PORT) || 9002
export const APP_HOST = process.env.APP_HOST || 'http://localhost'

// 数据库配置
export const DB_HOST = process.env.DB_HOST || ''
export const DB_PORT = Number(process.env.DB_PORT) || 0
export const DB_DATABASE = process.env.DB_DATABASE || ''
export const MYSQL_USER = process.env.MYSQL_USER || ''
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || ''

// 密码哈希（scrypt + 随机盐）
export const PREFIX = 'scrypt'
export const KEY_LENGTH = 64
export const SALT_LENGTH = 16
export const LEGACY_MD5 = /^[a-f0-9]{32}$/i
export const SCRYPT_PARAMS = {N: 16384, r: 8, p: 1}

// 图片上传文件路径存储 上传目录（相对项目根目录，启动时 cwd 需要是项目根）
export const AVATAR_PATH = path.resolve(process.cwd(), 'uploads/avatar')
export const PICTURE_PATH = path.resolve(process.cwd(), 'uploads/picture')
