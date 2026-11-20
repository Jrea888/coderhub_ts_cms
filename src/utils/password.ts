import crypto from 'crypto'
import {PREFIX, KEY_LENGTH, SCRYPT_PARAMS, SALT_LENGTH, LEGACY_MD5} from '../app/config'

/**
 * 密码哈希（scrypt + 随机盐）
 *
 * 存储格式：scrypt$N$r$p$salt$hash（salt/hash 为 base64url）
 * - 参数写进字符串，以后调整 N/r/p 也不会让老密码失效；
 * - 每个用户独立随机盐，防彩虹表；
 * - scrypt 故意慢且吃内存，暴力破解成本远高于 MD5。
 *
 * 兼容历史数据：库里 32 位十六进制的旧 MD5 仍可校验通过，
 * 登录成功后由 verifyLogin 自动升级为 scrypt（见 auth.middleware）。
 */
const verifyScrypt = (plain: string, stored: string): boolean => {
    const parts = stored.split('$')
    if (parts.length !== 6) return false

    const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts
    if (!saltRaw || !hashRaw) return false

    const N = Number(nRaw)
    const r = Number(rRaw)
    const p = Number(pRaw)
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false

    const salt = Buffer.from(saltRaw, 'base64url')
    const expected = Buffer.from(hashRaw, 'base64url')
    if (salt.length === 0 || expected.length === 0) return false

    const derived = crypto.scryptSync(String(plain), salt, expected.length, {N, r, p})
    return crypto.timingSafeEqual(derived, expected)
}

const md5Hex = (plain: string): string => {
    return crypto.createHash('md5').update(String(plain)).digest('hex')
}

const safeEqual = (actual: string, expected: string): boolean => {
    const a = Buffer.from(actual)
    const b = Buffer.from(expected)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** 是否需要重新哈希（历史 MD5 或 scrypt 参数已升级） */
export function needsRehash(stored: string): boolean {
    if (typeof stored !== 'string' || stored.length === 0) return true
    if (LEGACY_MD5.test(stored)) return true
    if (!stored.startsWith(`${PREFIX}$`)) return true

    const [, n, r, p] = stored.split('$')
    return Number(n) !== SCRYPT_PARAMS.N || Number(r) !== SCRYPT_PARAMS.r || Number(p) !== SCRYPT_PARAMS.p
}

// 注册时对密码进行 scrypt 加盐存储
export const scryptEncrypt = (password: string): string => {
    // 生成随机盐
    const salt = crypto.randomBytes(SALT_LENGTH)
    // 生成密码哈希
    const derived = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS)
    return [
        PREFIX,
        SCRYPT_PARAMS.N,
        SCRYPT_PARAMS.r,
        SCRYPT_PARAMS.p,
        salt.toString('base64url'),
        derived.toString('base64url')
    ].join('$')
}

// 登录时校验密码
export const verifyPassword = (password: string, storedPassword: string): boolean => {
    if (typeof storedPassword !== 'string' || storedPassword.length === 0) return false

    if (storedPassword.startsWith(PREFIX)) {
        return verifyScrypt(password, storedPassword)
    }

    // 兼容老数据：早期用户是裸 MD5
    if (LEGACY_MD5.test(storedPassword)) {
        return safeEqual(md5Hex(password), storedPassword)
    }

    return false
}
