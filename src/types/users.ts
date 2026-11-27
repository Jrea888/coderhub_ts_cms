export interface UserBase {
    name: string
    password: string
}

/** 注册成功后的返回体：不包含 password，避免把哈希带到响应里 */
export interface RegisteredUser {
    id: number
    name: string
}

export interface UsersRegister extends UserBase {
    id: number
}

export interface UserRow extends Record<string, unknown>, UserBase {
    id: number
    createAt: Date
    updateAt: Date
}
