import { TLRecord, TLStore } from '@tldraw/tlstore'
import { saveWhiteboardData, getWhiteboard } from './whiteboard'

export class TldrawStorage {
  static async saveStore(store: TLStore, whiteboardId: number) {
    const snapshot = store.getSnapshot()
    await saveWhiteboardData(whiteboardId, snapshot)
  }

  static async loadStore(whiteboardId: number): Promise<TLRecord[] | null> {
    try {
      // 从现有API加载数据
      const response = await getWhiteboard(whiteboardId)
      if (response) {
        // 如果返回的数据包含records字段，则直接使用
        // 否则可能需要转换现有数据格式
        return response.records || null
      }
      return null
    } catch (error) {
      console.error('加载Tldraw存储失败:', error)
      return null
    }
  }
  
  static async loadWhiteboardData(whiteboardId: number): Promise<unknown> {
    try {
      const response = await getWhiteboard(whiteboardId)
      return response
    } catch (error) {
      console.error('加载白板数据失败:', error)
      return null
    }
  }
}