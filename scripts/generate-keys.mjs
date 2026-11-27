#!/usr/bin/env node
/**
 * 生成 JWT 用的 RSA 密钥对（RS256）
 *
 * 用法：执行 npm run keys:generate 或 npm run keys:rotate
 *   node scripts/generate-keys.mjs             # 输出到 src/app/keys（已存在则拒绝）
 *   node scripts/generate-keys.mjs --force     # 覆盖（轮换密钥，旧 token 全部失效）
 *   node scripts/generate-keys.mjs ./some-dir  # 指定输出目录
 */
import {generateKeyPairSync} from 'node:crypto'
import {existsSync, mkdirSync, writeFileSync} from 'node:fs'
import path from 'node:path'

// 解析命令行参数
const args = process.argv.slice(2)
const force = args.includes('--force')
const target = args.find(arg => !arg.startsWith('-'))
const outDir = target ? path.resolve(target) : path.resolve(process.cwd(), 'src/app/keys')
// 获取私钥和公钥路径
const privatePath = path.join(outDir, 'private.key')
const publicPath = path.join(outDir, 'public.key')

// 检查目录是否存在
// 注意：两个路径的"已存在"判断都要受 --force 控制，
// 之前写成 (!force && private存在) || public存在，导致 public.key 在时永远拒绝覆盖，keys:rotate 形同虚设
if (!force && (existsSync(privatePath) || existsSync(publicPath))) {
    console.error(`[keys] ${outDir} 下已存在密钥，拒绝覆盖；轮换请加 --force`)
    // 退出程序
    process.exit(1)
}

// 创建目录
mkdirSync(outDir, {recursive: true})

// 生成密钥对
const {privateKey, publicKey} = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {type: 'spki', format: 'pem'},
    privateKeyEncoding: {type: 'pkcs8', format: 'pem'}
})

// 写入文件
writeFileSync(privatePath, privateKey, {mode: 0o600})
writeFileSync(publicPath, publicKey, {mode: 0o644})

console.log('[keys] 已生成：')
console.log(`  ${privatePath}`)
console.log(`  ${publicPath}`)
console.log('[keys] 提示：密钥不应提交到仓库；轮换后此前签发的 token 会全部失效。')
