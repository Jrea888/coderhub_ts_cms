/** JWT 载荷 */
export interface TokenPayload {
    id: number
    name: string
    iat?: number
    exp?: number
}
