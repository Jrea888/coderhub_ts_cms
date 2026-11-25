import {RouterContext} from '@koa/router'
import {getBody, toPositiveInt} from '../utils'
import {LabelBody} from '../types'
import {labelService} from '../service'

class LabelController {
    // 创建标签
    public async createLabel(ctx: RouterContext): Promise<void> {
        const {name} = getBody<LabelBody>(ctx)
        if (typeof name !== 'string' || !name.trim()) {
            ctx.body = {
                status: 400,
                message: '标签名不能为空'
            }
            return
        }

        const id = await labelService.create(name)
        ctx.body = {
            status: 200,
            message: '标签创建成功',
            data: {id, name}
        }
    }

    // 获取标签列表
    public async listLabel(ctx: RouterContext): Promise<void> {
        const size = toPositiveInt(ctx.query.size) || 10
        const offset = toPositiveInt(ctx.query.offset) || 0

        const res = await labelService.list(size, offset)
        ctx.body = {
            status: 200,
            message: '标签列表获取成功',
            data: {
                list: res.list,
                total: res.total,
                page: Math.ceil(offset / size),
                totalPages: Math.ceil(res.total / size)
            }
        }
    }

    // 编辑标签
    public async editLabel(ctx: RouterContext): Promise<void> {
        const id = toPositiveInt(ctx.params.id)
        const {name} = getBody<LabelBody>(ctx)
        console.log(id, name)
        if (typeof name !== 'string' || !name.trim() || !id) {
            ctx.body = {
                status: 400,
                message: '标签名或标签ID不能为空或无效'
            }
            return
        }

        await labelService.edit(id, name)
        ctx.body = {
            status: 200,
            message: '标签编辑成功'
        }
    }

    // 删除标签
    public async deleteLabel(ctx: RouterContext): Promise<void> {
        const id = toPositiveInt(ctx.params.id)
        if (!id) {
            ctx.body = {
                status: 400,
                message: '标签ID不能为空或无效',
                data: null
            }
            return
        }

        await labelService.delete(id)
        ctx.body = {
            status: 200,
            message: '标签删除成功',
        }
    }
}

export default new LabelController()
