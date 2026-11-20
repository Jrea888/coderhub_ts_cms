export interface UserBase {
    name: string
    password: string
}

export interface UsersRegister extends UserBase {
    id: number
}

export interface UserRow extends Record<string, unknown>, UserBase {
    id: number
    createAt: Date
    updateAt: Date
}
