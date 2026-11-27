import { database } from './database.js'
export function hasLocalDatabase() { return true }
export function getLocalServices() { return { db: database } }
