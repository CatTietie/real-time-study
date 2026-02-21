import { useCallback } from 'react'
import { useWhiteboardSocket } from './useWhiteboardSocket'

// 创建一个可以在组件外部使用的同步hook
export const useTldrawSync = (
  whiteboardId: number,
  userId: number,
  username: string
) => {
  const { sendAction, actions } = useWhiteboardSocket({
    whiteboardId,
    userId,
    username
  })

  // 提供发送动作的方法
  const sendTldrawChange = useCallback((change: unknown) => {
    try {
      // 添加调试日志
      console.log('发送Tldraw变更:', {
        type: 'tldraw_change',
        userId,
        username,
        changeType: typeof change,
        changeKeys: change ? Object.keys(change as object) : [],
        timestamp: new Date().toISOString()
      });
      
      sendAction({
        type: 'tldraw_change',
        data: change,
        userId,
        username
      });
    } catch (error) {
      console.error('发送Tldraw变更失败:', error);
    }
  }, [sendAction, userId, username])

  // 处理接收到的动作
  const processRemoteActions = useCallback((editor: unknown, remoteActions: unknown[]) => {
    try {
      console.log('开始处理远程动作:', remoteActions.length, '个');
      remoteActions.forEach((action: any, index) => {
        if (action.userId !== userId && action.type === 'tldraw_change') {
          console.log('应用远程变更 #' + index + ':', {
            userId: action.userId,
            username: action.username,
            dataType: typeof action.data,
            dataKeys: action.data ? Object.keys(action.data) : [],
            timestamp: new Date().toISOString()
          });
          
          (editor as any).store.mergeRemoteChanges(() => {
            (editor as any).store.applyDiff(action.data);
          });
        }
      });
    } catch (error) {
      console.error('处理远程动作失败:', error);
    }
  }, [userId]);

  return {
    sendTldrawChange,
    actions,
    processRemoteActions
  }
}