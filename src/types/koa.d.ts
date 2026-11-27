import type {LabelRef} from './label'
import type {TokenPayload} from './token'
// 强制把 @types/multer 的全局 Express.Multer 命名空间纳入编译，供下面的 ctx.file 使用
import type {} from 'multer'

declare module 'koa' {
    interface DefaultState {
        /** verifyTokenAuth 解析出的当前登录用户 */
        user?: TokenPayload
        /** verifyLabelExist 准备好的标签列表 */
        labels?: LabelRef[]
    }

    interface DefaultContext {
        /** @koa/multer 单文件上传后注入 */
        file?: Express.Multer.File
        /** @koa/multer 多文件上传后注入 */
        files?: Express.Multer.File[]
    }
}
