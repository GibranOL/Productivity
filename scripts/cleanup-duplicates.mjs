#!/usr/bin/env node
/**
 * Cleanup script: removes duplicate calendar events from Appwrite.
 * Keeps the first occurrence of each (title + start_date) pair, deletes the rest.
 *
 * Usage: node scripts/cleanup-duplicates.mjs
 */
import { Client, Databases, Query } from 'node-appwrite'

const ENDPOINT = 'https://tor.cloud.appwrite.io/v1'
const PROJECT_ID = '69db1b880015847e1eb0'
const API_KEY = process.env.APPWRITE_API_KEY

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
  // Fetch all events (paginate if needed)
  let allDocs = []
  let offset = 0
  const limit = 100

  while (true) {
    const res = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.limit(limit),
      Query.offset(offset),
      Query.orderAsc('start_date'),
    ])
    allDocs = allDocs.concat(res.documents)
    if (res.documents.length < limit) break
    offset += limit
  }

  console.log(`📋 Total events in Appwrite: ${allDocs.length}`)

  // Group by (title + start_date) to find duplicates
  const seen = new Map()
  const toDelete = []

  for (const doc of allDocs) {
    const key = `${doc.title}|${doc.start_date}`
    if (seen.has(key)) {
      toDelete.push(doc)
    } else {
      seen.set(key, doc)
    }
  }

  console.log(`🗑️  Duplicates to delete: ${toDelete.length}`)
  console.log(`✅ Unique events to keep: ${seen.size}`)

  if (toDelete.length === 0) {
    console.log('🎉 No duplicates found!')
    return
  }

  // Delete duplicates in batches
  let deleted = 0
  for (const doc of toDelete) {
    try {
      await db.deleteDocument(DATABASE_ID, COLLECTION_ID, doc.$id)
      deleted++
      if (deleted % 10 === 0) {
        console.log(`  Deleted ${deleted}/${toDelete.length}...`)
      }
    } catch (err) {
      console.error(`  ❌ Failed to delete ${doc.$id}: ${err.message}`)
    }
  }

  console.log(`\n✅ Done! Deleted ${deleted} duplicates. ${seen.size} unique events remain.`)
}

main().catch(console.error)
