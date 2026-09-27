import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useStore } from '@/lib/store'

/**
 * Old entry point for 1669's side of a call (links, the incoming-call list).
 * The call itself now lives app-wide in DispatchCallHost, so it survives
 * moving around the case -- this just hands the call over and opens the
 * case, with the call full screen on top.
 */
export default function DispatchCallScreen() {
  const { id } = useParams<{ id: string }>()
  const inCall = useStore((s) => (id ? s.cases[id]?.callStatus === 'in-call' : false))
  const setDispatchCallCaseId = useStore((s) => s.setDispatchCallCaseId)

  useEffect(() => {
    if (id && inCall) setDispatchCallCaseId(id)
  }, [id, inCall, setDispatchCallCaseId])

  return <Navigate to={id ? `/dispatch/case/${id}` : '/dispatch/incoming-call'} replace />
}
