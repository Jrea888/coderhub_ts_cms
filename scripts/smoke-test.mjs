#!/usr/bin/env node
/**
 * 接口冒烟测试（SMOKE TEST）
 *
 * 用法：
 *   1. 先启动服务：npm start
 *   2. 另开终端：npm run test:api
 *   可通过 API_BASE 指定地址，例如 API_BASE=http://127.0.0.1:9002 npm run test:api
 *
 * 设计原则：
 * - 只操作自己创建的测试账号与数据，结束后全部清理（含自动创建的标签）
 * - 每条断言失败会以红色 FAIL 输出并使进程以 1 退出，可直接接 CI
 * - 重点覆盖鉴权/越权边界，这部分最容易回归
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:9001'
const stamp = Date.now()
const userA = {name: `_smokeA_${stamp}`, password: 'pw123456'}
const userB = {name: `_smokeB_${stamp}`, password: 'pw123456'}

let passed = 0
const failures = []

function check(name, condition, detail = '') {
    if (condition) {
        passed++
        console.log(`  ✅ ${name}`)
    } else {
        failures.push({name, detail})
        console.log(`  ❌ ${name}${detail ? ` -> ${detail}` : ''}`)
    }
}

async function call(method, path, {token, body, form} = {}) {
    const headers = {}
    if (token) headers.authorization = token
    let payload
    if (form) {
        payload = form
    } else if (body !== undefined) {
        headers['content-type'] = 'application/json'
        payload = JSON.stringify(body)
    }

    const res = await fetch(BASE + path, {method, headers, body: payload})
    const text = await res.text()
    let json = null
    try {
        json = JSON.parse(text)
    } catch {
        // 图片等二进制响应，保留原文
    }
    return {http: res.status, body: json, text, contentType: res.headers.get('content-type')}
}

const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAPwAB/1n2z3kAAAAASUVORK5CYII=',
    'base64'
)
function pngForm(field, filename) {
    const fd = new FormData()
    fd.append(field, new Blob([png], {type: 'image/png'}), filename)
    return fd
}

async function main() {
    console.log(`\n=== 冒烟测试 ${BASE} ===\n`)

    // ---------- 认证 ----------
    console.log('[认证]')
    const regA = await call('POST', '/auth/register', {body: userA})
    const regB = await call('POST', '/auth/register', {body: userB})
    check('注册成功', regA.body?.status === 200, regA.body?.message)
    check('注册响应不含 password 字段', regA.body?.data && !('password' in regA.body.data), JSON.stringify(regA.body?.data))

    const loginA = await call('POST', '/auth/login', {body: userA})
    const loginB = await call('POST', '/auth/login', {body: userB})
    const tokenA = loginA.body?.data?.token
    const tokenB = loginB.body?.data?.token
    const idA = loginA.body?.data?.id
    const idB = loginB.body?.data?.id
    check('登录返回 token', typeof tokenA === 'string' && tokenA.split('.').length === 3)
    check('错误密码被拒绝', (await call('POST', '/auth/login', {body: {name: userA.name, password: 'x'}})).body?.status === 400)

    const verifyRaw = await call('POST', '/auth/verify', {token: tokenA})
    const verifyBearer = await call('POST', '/auth/verify', {token: `Bearer ${tokenA}`})
    check('裸 token 校验通过', verifyRaw.body?.status === 200)
    check('Bearer 前缀兼容', verifyBearer.body?.status === 200)

    // ---------- 动态 ----------
    console.log('\n[动态]')
    const m = await call('POST', '/moment', {token: tokenA, body: {content: `smoke ${stamp}`}})
    const momentA = m.body?.data?.momentId
    check('发表动态', m.body?.status === 200, m.body?.message)

    const blank = await call('POST', '/moment', {token: tokenA, body: {content: '   '}})
    check('纯空白内容被拒绝', blank.body?.status === 400 && blank.http === 400, blank.body?.message)

    const mB = await call('POST', '/moment', {token: tokenB, body: {content: `smoke B ${stamp}`}})
    const momentB = mB.body?.data?.momentId

    const list = await call('GET', '/moment/list?size=2', {token: tokenA})
    check('动态列表', list.body?.status === 200 && Array.isArray(list.body?.data?.list))
    check(
        '列表分页字段完整',
        ['list', 'total', 'totalPages', 'page', 'size'].every(k => k in (list.body?.data || {}))
    )

    const detail = await call('GET', `/moment/detail/${momentA}`, {token: tokenA})
    check('动态详情', detail.body?.status === 200, detail.body?.message)

    const updateOwn = await call('PATCH', `/moment/update/${momentA}`, {token: tokenA, body: {content: `改 ${stamp}`}})
    check('修改自己的动态', updateOwn.body?.status === 200)

    const updateOther = await call('PATCH', `/moment/update/${momentA}`, {token: tokenB, body: {content: '越权'}})
    check('★ 不能修改他人动态', updateOther.body?.status === 403 && updateOther.http === 403, updateOther.body?.message)

    const labelB = await call('POST', `/moment/${momentA}/labels`, {token: tokenB, body: {labels: [`_smoke_${stamp}`]}})
    check('★ 不能给他人动态打标签', labelB.body?.status === 403, labelB.body?.message)

    // ---------- 评论 ----------
    console.log('\n[评论]')
    const c = await call('POST', '/comment', {token: tokenA, body: {content: `评论 ${stamp}`, momentId: momentA}})
    const commentA = c.body?.data?.commentId
    check('发表评论', c.body?.status === 200, c.body?.message)

    const cBlank = await call('POST', '/comment', {token: tokenA, body: {content: '  ', momentId: momentA}})
    check('纯空白评论被拒绝', cBlank.body?.status === 400)

    const reply = await call('POST', `/comment/${commentA}/reply`, {
        token: tokenB,
        body: {content: `回复 ${stamp}`, momentId: momentA}
    })
    check('回复评论', reply.body?.status === 200, reply.body?.message)

    const cList = await call('GET', `/comment/list?momentId=${momentA}&size=10`, {token: tokenA})
    check('评论列表', cList.body?.status === 200 && cList.body?.data?.total >= 2)

    const cUpdateOther = await call('PATCH', `/comment/${commentA}`, {token: tokenB, body: {content: '越权'}})
    check('★ 不能修改他人评论', cUpdateOther.body?.status === 403)

    // ---------- 标签 ----------
    console.log('\n[标签]')
    const lc = await call('POST', '/label/create', {token: tokenA, body: {name: `_smokeL_${stamp}`}})
    const labelId = lc.body?.data?.id
    check('创建标签', lc.body?.status === 200, lc.body?.message)

    const lcDup = await call('POST', '/label/create', {token: tokenA, body: {name: `_smokeL_${stamp}`}})
    check('重名标签返回 400（而不是 500）', lcDup.body?.status === 400 && lcDup.http === 400, lcDup.body?.message)

    // ---------- 上传 ----------
    console.log('\n[上传]')
    const upAvatar = await call('POST', '/upload/avatar', {token: tokenA, form: pngForm('avatar', 'smoke.png')})
    check('上传头像', upAvatar.body?.status === 200, upAvatar.body?.message)

    const bigFd = new FormData()
    bigFd.append('avatar', new Blob([Buffer.alloc(3 * 1024 * 1024)], {type: 'image/png'}), 'big.png')
    const upBig = await call('POST', '/upload/avatar', {token: tokenA, form: bigFd})
    check('超大文件被拒绝（400）', upBig.body?.status === 400 && upBig.http === 400, upBig.body?.message)

    const txtFd = new FormData()
    txtFd.append('avatar', new Blob([Buffer.from('not an image')], {type: 'text/plain'}), 'a.txt')
    const upTxt = await call('POST', '/upload/avatar', {token: tokenA, form: txtFd})
    check('非图片类型被拒绝（400）', upTxt.body?.status === 400, upTxt.body?.message)

    const avatarRes = await fetch(`${BASE}/users/${idA}/avatar`)
    check('读取头像流', avatarRes.status === 200 && (avatarRes.headers.get('content-type') || '').includes('image'))

    const upPic = await call('POST', `/upload/picture?momentId=${momentA}`, {
        token: tokenA,
        form: pngForm('picture', 'smoke.png')
    })
    check('给自己的动态上传配图', upPic.body?.status === 200, upPic.body?.message)

    const upPicOther = await call('POST', `/upload/picture?momentId=${momentA}`, {
        token: tokenB,
        form: pngForm('picture', 'smoke.png')
    })
    check('★ 不能给他人动态上传配图', upPicOther.body?.status === 403, upPicOther.body?.message)

    const traversal = await call('GET', '/moment/images/..%2F..%2F.env.local')
    check('目录穿越被拦截', traversal.body?.status === 404 && traversal.http === 404)

    // ---------- 越权删除 ----------
    console.log('\n[越权删除]')
    const delMomentOther = await call('DELETE', `/moment/delete/${momentA}`, {token: tokenB})
    check('★ 不能删除他人动态', delMomentOther.body?.status === 403)

    const delUserOther = await call('DELETE', `/users/delete/${idB}`, {token: tokenA})
    check('★ 不能删除他人账号', delUserOther.body?.status === 403, delUserOther.body?.message)

    // ---------- 清理 ----------
    console.log('\n[清理]')
    // 清理本次自动创建的标签（打标签时服务端会自动建）
    const allLabels = await call('GET', '/label/list?size=100', {token: tokenA})
    const mine = (allLabels.body?.data?.list || []).filter(
        l => typeof l.name === 'string' && (l.name.startsWith('_smoke') || l.name.startsWith('_lab'))
    )
    for (const label of mine) {
        await call('DELETE', `/label/${label.id}`, {token: tokenA})
    }
    console.log(`  已删除测试标签 ${mine.length} 个`)

    const delMomentA = await call('DELETE', `/moment/delete/${momentA}`, {token: tokenA})
    const delMomentB = await call('DELETE', `/moment/delete/${momentB}`, {token: tokenB})
    check('删除自己的动态', delMomentA.body?.status === 200 && delMomentB.body?.status === 200)

    const delUserA = await call('DELETE', `/users/delete/${idA}`, {token: tokenA})
    const delUserB = await call('DELETE', `/users/delete/${idB}`, {token: tokenB})
    check('删除自己的账号', delUserA.body?.status === 200 && delUserB.body?.status === 200)

    // ---------- 结果 ----------
    console.log(`\n=== 结果：通过 ${passed} 项，失败 ${failures.length} 项 ===`)
    if (failures.length) {
        for (const f of failures) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ''}`)
        process.exitCode = 1
    }
}

main().catch(error => {
    console.error('\n[smoke] 执行异常:', error)
    process.exitCode = 1
})
