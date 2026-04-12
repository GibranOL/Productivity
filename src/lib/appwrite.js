import { Client, Account, Databases, Storage, ID, Query, Permission, Role } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT)

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)

export { client, ID, Query, Permission, Role }
