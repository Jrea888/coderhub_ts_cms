import {Router} from '@koa/router'
import {momentController} from '../controller'
import {verifyLabelExist, verifyTokenAuth} from '../middleware'

const momentRouter = new Router({prefix: '/moment'})

// 发表动态
momentRouter.post('/', verifyTokenAuth, momentController.createMoment)

// 动态列表
momentRouter.get('/list', verifyTokenAuth, momentController.getMomentList)

// 动态详情
momentRouter.get('/detail/:momentId', verifyTokenAuth, momentController.getMomentDetail)

// 修改和删除动态
// 修改动态
momentRouter.patch('/update/:momentId', verifyTokenAuth, momentController.updateMoment)
// 删除动态
momentRouter.delete('/delete/:momentId', verifyTokenAuth, momentController.deleteMoment)

// 给动态打标签（labels 为正确拼写，lables 保留兼容）
momentRouter.post('/:momentId/labels', verifyTokenAuth, verifyLabelExist, momentController.addMomentLabels)
momentRouter.post('/:momentId/lables', verifyTokenAuth, verifyLabelExist, momentController.addMomentLabels)

// 给动态配图
momentRouter.get('/images/:filename', momentController.filePictureInfo)

export default momentRouter
