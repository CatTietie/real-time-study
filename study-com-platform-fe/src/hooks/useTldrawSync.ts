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
      // 添加详细的调试日志
      console.log('📤 发送Tldraw变更:', {
        actionType: 'tldraw_change',
        userId,
        username,
        changeType: typeof change,
        changeKeys: change ? Object.keys(change as object) : [],
        changePreview: change ? JSON.stringify(change).substring(0, 200) + '...' : 'null',
        timestamp: new Date().toISOString()
      });
      
      sendAction({
        type: 'tldraw_change',
        data: change,
        userId,
        username
      });
      
      console.log('✅ Tldraw变更发送成功');
    } catch (error) {
      console.error('❌ 发送Tldraw变更失败:', error);
    }
  }, [sendAction, userId, username])

  // 处理接收到的动作
  const processRemoteActions = useCallback((editor: unknown, remoteActions: unknown[]) => {
    try {
      console.log('=== 开始处理远程动作 ===');
      console.log('远程动作总数:', remoteActions.length);
      console.log('当前用户ID:', userId);
      
      let appliedCount = 0;
      remoteActions.forEach((action: any, index) => {
        console.log(`处理动作 #${index}:`, {
          actionUserId: action.userId,
          currentUserId: userId,
          actionType: action.type,
          isDifferentUser: action.userId !== userId,
          isTldrawChange: action.type === 'tldraw_change'
        });
        
        if (action.userId !== userId && action.type === 'tldraw_change') {
          console.log('✅ 应用远程变更 #' + index + ':', {
            userId: action.userId,
            username: action.username,
            dataType: typeof action.data,
            dataKeys: action.data ? Object.keys(action.data) : [],
            timestamp: new Date().toISOString()
          });
          
          try {
            // 使用Tldraw v4的正确API
            (editor as any).store.mergeRemoteChanges(() => {
              (editor as any).store.applyDiff(action.data);
            });
            appliedCount++;
            console.log('✅ 远程变更应用成功');
          } catch (applyError) {
            console.error('❌ 应用远程变更失败:', applyError);
          }
        } else {
          console.log('⏭️ 跳过动作 #' + index + ':', {
            reason: action.userId === userId ? '自己的动作' : '非tldraw_change类型',
            actionType: action.type
          });
        }
      });
      
      console.log(`=== 远程动作处理完成，共应用 ${appliedCount} 个变更 ===`);
    } catch (error) {
      console.error('❌ 处理远程动作失败:', error);
    }
  }, [userId]);

  return {
    sendTldrawChange,
    actions,
    processRemoteActions
  }
}