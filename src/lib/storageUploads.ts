import { supabase, supabaseEnabled, CASE_MEDIA_BUCKET, AVATAR_BUCKET } from './supabase'
import { uid } from './utils'

/**
 * Every upload lands under `{caseNumber}/...` inside the case-media bucket,
 * so each case's photos and voice recordings are grouped under one path
 * prefix — Supabase's storage browser displays these prefixes as folders.
 * Each successful upload also gets a tracking row in the `case_media` table.
 */

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

async function trackCaseMedia(caseNumber: string, mediaType: 'photo' | 'audio' | 'signature', path: string, url: string) {
  if (!supabase) return
  const { error } = await supabase
    .from('case_media')
    .insert({ case_id: caseNumber, media_type: mediaType, file_path: path, url })
  if (error) console.error('case_media insert failed:', error.message)
}

export async function uploadCasePhoto(caseNumber: string, dataUrl: string): Promise<string> {
  if (!supabaseEnabled || !supabase) return dataUrl
  const path = `${caseNumber}/photos/${uid('photo')}.jpg`
  const blob = await dataUrlToBlob(dataUrl)
  const { error } = await supabase.storage.from(CASE_MEDIA_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(CASE_MEDIA_BUCKET).getPublicUrl(path)
  await trackCaseMedia(caseNumber, 'photo', path, data.publicUrl)
  return data.publicUrl
}

/** Overwrites the same path each time (upsert) -- one avatar per user, no
 * orphaned old files piling up in the bucket on every re-upload. The path's
 * leading userId segment is also what the storage RLS policy checks (see
 * supabase-avatar-storage-policy.sql) to keep users from overwriting
 * someone else's avatar. */
export async function uploadAvatar(userId: string, file: Blob, contentType: string): Promise<string> {
  if (!supabaseEnabled || !supabase) throw new Error('Supabase not configured')
  const ext = contentType === 'image/png' ? 'png' : 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType,
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

/** A relative's drawn refusal signature (see SignaturePad) -- just another
 * uploaded file's URL, tracked the same way a photo's is. */
export async function uploadCaseSignature(caseNumber: string, dataUrl: string): Promise<string> {
  if (!supabaseEnabled || !supabase) return dataUrl
  const path = `${caseNumber}/signatures/${uid('sig')}.png`
  const blob = await dataUrlToBlob(dataUrl)
  const { error } = await supabase.storage.from(CASE_MEDIA_BUCKET).upload(path, blob, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(CASE_MEDIA_BUCKET).getPublicUrl(path)
  await trackCaseMedia(caseNumber, 'signature', path, data.publicUrl)
  return data.publicUrl
}

export async function uploadCaseAudio(caseNumber: string, blob: Blob): Promise<string> {
  if (!supabaseEnabled || !supabase) return URL.createObjectURL(blob)
  const path = `${caseNumber}/audio/${uid('audio')}.webm`
  const { error } = await supabase.storage.from(CASE_MEDIA_BUCKET).upload(path, blob, {
    contentType: 'audio/webm',
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(CASE_MEDIA_BUCKET).getPublicUrl(path)
  await trackCaseMedia(caseNumber, 'audio', path, data.publicUrl)
  return data.publicUrl
}
