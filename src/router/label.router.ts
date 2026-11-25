import {Router} from '@koa/router'
import {labelController} from '../controller'
import {verifyTokenAuth} from '../middleware'

const LabelRouter = new Router({prefix: '/label'})
// 创建标签
LabelRouter.post('/create', verifyTokenAuth, labelController.createLabel)
// 获取标签列表
LabelRouter.get('/list', verifyTokenAuth, labelController.listLabel)
// 删除标签
LabelRouter.delete('/:id', verifyTokenAuth, labelController.deleteLabel)
// 编辑标签
LabelRouter.patch('/:id', verifyTokenAuth, labelController.editLabel)

export default LabelRouter
