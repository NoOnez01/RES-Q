import { supabase, supabaseEnabled, CASE_MEDIA_BUCKET } from './supabase'
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

async function trackCaseMedia(caseNumber: string, mediaType: 'photo' | 'audio', path: string, url: string) {
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
