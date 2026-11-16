// 密钥dir

// 应用配置
export const APP_PORT = Number(process.env.APP_PORT) || 9001
export const APP_HOST = process.env.APP_HOST || 'http://localhost'

// 数据库配置
export const DB_HOST = process.env.DB_HOST || '127.0.0.1'
export const DB_PORT = Number(process.env.DB_PORT) || 3306
export const DB_DATABASE = process.env.DB_DATABASE || 'coder_hub'
export const DB_USER = process.env.DB_USER || 'root'
export const DB_PASSWORD = process.env.DB_PASSWORD || 'zwg123.'
