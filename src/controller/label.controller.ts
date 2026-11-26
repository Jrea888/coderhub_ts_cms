import {RouterContext} from '@koa/router'
import {buildPage, fail, getBody, parsePagination, success, toPositiveInt} from '../utils'
import {LabelBody} from '../types'
import {labelService} from '../service'

class LabelController {
    // 创建标签
    public async createLabel(ctx: RouterContext): Promise<void> {
        const {name} = getBody<LabelBody>(ctx)
        if (typeof name !== 'string' || !name.trim()) {
            fail(ctx, 400, '标签名不能为空')
            return
        }

        const id = await labelService.create(name)
        success(ctx, '标签创建成功', {id, name})
    }

    // 获取标签列表
    public async listLabel(ctx: RouterContext): Promise<void> {
        const {size, offset} = parsePagination(ctx.query)
        const {list, total, offset: effectiveOffset} = await labelService.list(size, offset)
        success(ctx, '标签列表获取成功', buildPage(list, total, effectiveOffset, size))
    }

    // 编辑标签
    public async editLabel(ctx: RouterContext): Promise<void> {
        const id = toPositiveInt(ctx.params.id)
        const {name} = getBody<LabelBody>(ctx)
        if (typeof name !== 'string' || !name.trim() || !id) {
            fail(ctx, 400, '标签名或标签ID不能为空或无效')
            return
        }

        await labelService.edit(id, name)
        success(ctx, '标签编辑成功')
    }

    // 删除标签
    public async deleteLabel(ctx: RouterContext): Promise<void> {
        const id = toPositiveInt(ctx.params.id)
        if (!id) {
            fail(ctx, 400, '标签ID不能为空或无效')
            return
        }

        await labelService.delete(id)
        success(ctx, '标签删除成功')
    }
}

export default new LabelController()
