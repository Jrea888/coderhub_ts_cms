// 动态加载接口路由
import Koa from 'koa'
import path from 'node:path'
import fs from 'node:fs'
import type {RouterInstance} from '@koa/router'

export default function useRouters(this: Koa): void {
    const ext = path.extname(__filename) // 获取文件扩展名
    const dir = path.dirname(__filename) // 获取文件所在目录
    const files = fs.readdirSync(dir) // 读取目录下的所有文件

    // 过滤出与当前入口同后缀的文件；排除 index.ts 文件，filter为true的文件过滤出来
    const routerFiles = files.filter(file => file.endsWith(ext) && !file.endsWith(`.d${ext}`) && file !== `index${ext}`)
    console.log('注册的路由文件:', routerFiles)
    routerFiles.sort().forEach(file => {
        const fullPath = path.join(dir, file)
        const mod = require(fullPath) as {default?: RouterInstance}
        const router = mod.default
        if (!router) {
            throw new Error(`路由文件缺少默认导出：${file}`)
        }
        this.use(router.routes())
        // 允许的 HTTP 方法 没匹配到方法时给出语义正确的 HTTP 状态码”，让接口更符合 HTTP 规范，也便于客户端排查错误。
        this.use(router.allowedMethods())
    })
}
