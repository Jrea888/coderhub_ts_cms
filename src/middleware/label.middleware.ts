import {RouterContext} from '@koa/router'
import {Next} from 'koa'
import {fail, getBody} from '../utils'
import {LabelBody} from '../types'
import {labelService} from '../service'

export const verifyLabelExist = async (ctx: RouterContext, next: Next) => {
    const {labels} = getBody<{labels: unknown}>(ctx)
    if (!Array.isArray(labels)) {
        fail(ctx, 400, 'labels 必须是数组')
        return
    }

    const names = [
        ...new Set(
            labels
                .filter((name): name is string => typeof name === 'string' && name.trim() !== '')
                .map(name => name.trim())
        )
    ]

    const newLabels: LabelBody[] = []
    for (const name of names) {
        const labelResult = await labelService.getLabelName(name)
        if (labelResult) {
            newLabels.push({name, id: labelResult.id})
        } else {
            const labelID = await labelService.create(name)
            newLabels.push({name, id: labelID})
        }
    }

    ctx.state.labels = newLabels
    await next()
}
