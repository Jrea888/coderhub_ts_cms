import {RouterContext} from '@koa/router'
import {buildPage, fail, getTrimmedField, parsePagination, success, toPositiveInt} from '../utils'
import {labelService} from '../service'

class LabelController {
    // 创建标签
    public async createLabel(ctx: RouterContext): Promise<void> {
        const name = getTrimmedField(ctx, 'name')
        if (!name) {
            fail(ctx, 400, '标签名不能为空')
            return
        }

        // 事先查重，给出明确提示；并发下仍可能撞唯一键，由全局错误中间件兜住（ER_DUP_ENTRY -> 400）
        const existed = await labelService.getLabelName(name)
        if (existed) {
            fail(ctx, 400, '标签名已存在')
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
        const name = getTrimmedField(ctx, 'name')
        if (!name || !id) {
            fail(ctx, 400, '标签名或标签ID不能为空或无效')
            return
        }

        // 改成和别的标签重名要拦住；改成自己的原名则允许（等价于无变化）
        const existed = await labelService.getLabelName(name)
        if (existed && existed.id !== id) {
            fail(ctx, 400, '标签名已存在')
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

        const result = await labelService.delete(id)
        if (!result.affectedRows) {
            fail(ctx, 404, '标签不存在')
            return
        }

        success(ctx, '标签删除成功')
    }
}

export default new LabelController()
