import { TldrawWhiteboard } from './TldrawWhiteboard'
import { forwardRef, useImperativeHandle, useRef } from 'react'

interface WhiteboardWrapperProps {
  whiteboardId: number
  userId: number
  username: string
  roomId?: number
}

export interface WhiteboardWrapperRef {
  handleExport: () => Promise<void>
}

export const WhiteboardWrapper = forwardRef<WhiteboardWrapperRef, WhiteboardWrapperProps>(({
  whiteboardId,
  userId,
  username,
  roomId
}, ref) => {
  const exportRef = useRef<{ handleExport: () => Promise<void> }>(null)
  
  useImperativeHandle(ref, () => ({
    handleExport: () => exportRef.current?.handleExport() || Promise.resolve()
  }))
  
  return (
    <TldrawWhiteboard
      ref={exportRef}
      whiteboardId={whiteboardId}
      userId={userId}
      username={username}
      roomId={roomId}
      onSave={(data) => {
        console.log('白板内容变化:', data)
      }}
    />
  )
})