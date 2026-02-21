import { TldrawWhiteboard } from './TldrawWhiteboard'

interface WhiteboardWrapperProps {
  whiteboardId: number
  userId: number
  username: string
  roomId?: number
}

export const WhiteboardWrapper = ({
  whiteboardId,
  userId,
  username,
  roomId
}: WhiteboardWrapperProps) => {
  return (
    <TldrawWhiteboard
      whiteboardId={whiteboardId}
      userId={userId}
      username={username}
      roomId={roomId}
      onSave={(data) => {
        console.log('白板内容变化:', data)
      }}
    />
  )
}