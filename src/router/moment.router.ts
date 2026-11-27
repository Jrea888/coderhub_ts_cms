import {Router} from '@koa/router'
import {momentController} from '../controller'
import {verifyLabelExist, verifyPermission, verifyTokenAuth} from '../middleware'

const momentRouter = new Router({prefix: '/moment'})

// 发表动态
momentRouter.post('/', verifyTokenAuth, momentController.createMoment)

// 动态列表
momentRouter.get('/list', verifyTokenAuth, momentController.getMomentList)

// 动态详情
momentRouter.get('/detail/:momentId', verifyTokenAuth, momentController.getMomentDetail)

// 修改和删除动态 （需要登录 + 归属校验，是自己的动态，才能修改/删除）
// 注意：verifyPermission 靠参数名推断表名（momentId -> moment），删掉它就会变成越权接口
// 修改动态
momentRouter.patch('/update/:momentId', verifyTokenAuth, verifyPermission, momentController.updateMoment)
// 删除动态
momentRouter.delete('/delete/:momentId', verifyTokenAuth, verifyPermission, momentController.deleteMoment)

// 给动态打标签（labels 为正确拼写，lables 保留兼容）
// 打标签同样是"改这条动态"，必须校验归属
momentRouter.post(
    '/:momentId/labels',
    verifyTokenAuth,
    verifyPermission,
    verifyLabelExist,
    momentController.addMomentLabels
)
momentRouter.post(
    '/:momentId/lables',
    verifyTokenAuth,
    verifyPermission,
    verifyLabelExist,
    momentController.addMomentLabels
)

// 给动态配图
momentRouter.get('/images/:filename', momentController.filePictureInfo)

export default momentRouter
