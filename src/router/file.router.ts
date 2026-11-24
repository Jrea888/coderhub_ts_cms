import {Router} from '@koa/router'
import {fileController} from '../controller'
import {avatarFileHandle, pictureFileHandle, verifyTokenAuth} from '../middleware'

const fileRouter = new Router({prefix: '/upload'})

// 上传用户头像
fileRouter.post('/avatar', verifyTokenAuth, avatarFileHandle, fileController.uploadAvatar)
// 上传动态配图
fileRouter.post('/picture', verifyTokenAuth, pictureFileHandle, fileController.uploadPicture)

export default fileRouter
