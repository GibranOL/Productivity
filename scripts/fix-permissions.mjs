#!/usr/bin/env node
/**
 * Fix permissions on existing calendar events.
 * Adds user-level read/update/delete permissions to all documents
 * owned by the specified user.
 *
 * Usage: node scripts/fix-permissions.mjs
 */
import { Client, Databases, Query, Permission, Role } from 'node-appwrite'

const ENDPOINT = 'https://tor.cloud.appwrite.io/v1'
const PROJECT_ID = '69db1b880015847e1eb0'
const API_KEY = process.env.APPWRITE_API_KEY
const USER_ID = '69db2e7bb18daee23fff' // Gibran's Appwrite user ID

if (!API_KEY) {
  console.error('❌ Set APPWRITE_API_KEY env var first:\n  export APPWRITE_API_KEY=your_key_here')
  process.exit(1)
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY)

const db = new Databases(client)

const DATABASE_ID = 'gibran_os'
const COLLECTION_ID = 'calendar_events'

async function main() {
  // Fetch all events
  let allDocs = []
  let offset = 0
  const limit = 100

  while (true) {
    const res = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.limit(limit),
      Query.offset(offset),
    ])
    allDocs = allDocs.concat(res.documents)
    if (res.documents.length < limit) break
    offset += limit
  }

  console.log(`📋 Total documents: ${allDocs.length}`)

  const permissions = [
    Permission.read(Role.user(USER_ID)),
    Permission.update(Role.user(USER_ID)),
    Permission.delete(Role.user(USER_ID)),
  ]

  let fixed = 0
  for (const doc of allDocs) {
    try {
      // updateDocument with permissions parameter (6th param)
      await db.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        doc.$id,
        {}, // no data changes
        permissions
      )
      fixed++
      if (fixed % 10 === 0) {
        console.log(`  Fixed ${fixed}/${allDocs.length}...`)
      }
    } catch (err) {
      console.error(`  ❌ Failed ${doc.$id}: ${err.message}`)
    }
  }

  console.log(`\n✅ Done! Fixed permissions on ${fixed} documents.`)
}

main().catch(console.error)
