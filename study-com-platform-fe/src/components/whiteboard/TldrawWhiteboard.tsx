import { Tldraw, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import '../../styles/tldraw-enhanced.css'
import { useEffect, useState } from 'react'
import { useTldrawSync } from '../../hooks/useTldrawSync'

interface TldrawWhiteboardProps {
  whiteboardId: number
  userId: number
  username: string
  onSave?: (data: unknown) => void
}

const TldrawInner = ({
  whiteboardId,
  userId,
  username,
  onSave
}: {
  whiteboardId: number;
  userId: number;
  username: string;
  onSave?: (data: unknown) => void;
}) => {
  const editor = useEditor()
  const { sendTldrawChange, actions, processRemoteActions } = useTldrawSync(whiteboardId, userId, username)

  // 初始化编辑器
  useEffect(() => {
    console.log('初始化Tldraw编辑器', { userId, username });
    editor.user.updateUserPreferences({
      id: userId.toString(),
      name: username
    })
  }, [editor, userId, username])

  // 监听本地变更并发送到服务器
  useEffect(() => {
    console.log('设置变更监听器');
    const unsubscribe = editor.store.listen(
      (change) => {
        console.log('检测到本地变更:', change);
        sendTldrawChange(change)
        if (onSave) {
          onSave(change)
        }
      },
      { source: 'user', scope: 'document' }
    )

    return unsubscribe
  }, [editor, sendTldrawChange, onSave])

  // 应用远程变更
  useEffect(() => {
    if (actions.length > 0) {
      console.log('处理远程动作:', actions.length, '个');
      processRemoteActions(editor, actions);
    }
  }, [actions, editor, processRemoteActions])

  // 返回一个透明的占位元素，不影响渲染
  return <div style={{ width: 0, height: 0, overflow: 'hidden' }} />;
}

export const TldrawWhiteboard = ({
  whiteboardId,
  userId,
  username,
  onSave
}: TldrawWhiteboardProps) => {
  const [isReady, setIsReady] = useState(false);
  const [currentTool, setCurrentTool] = useState('select');
  const [showHelp, setShowHelp] = useState(false);
  
  // 工具说明
  const toolDescriptions = {
    select: '选择工具 - 选择和移动对象',
    draw: '画笔工具 - 自由绘制线条',
    erase: '橡皮擦 - 擦除绘制内容',
    text: '文字工具 - 添加文本',
    rectangle: '矩形工具 - 绘制矩形',
    ellipse: '圆形工具 - 绘制圆形',
    arrow: '箭头工具 - 绘制箭头',
    line: '直线工具 - 绘制直线',
    highlight: '高亮工具 - 高亮标记',
    laser: '激光笔 - 临时指示'
  };
  
  return (
    <div style={{ width: '100%', height: '800px', position: 'relative' }}>
      {/* 帮助面板 */}
      {showHelp && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 2000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '15px',
          maxWidth: '300px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h4 style={{ margin: 0, color: '#333' }}>工具说明</h4>
            <button 
              onClick={() => setShowHelp(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: '14px', color: '#555' }}>
            {Object.entries(toolDescriptions).map(([tool, desc]) => (
              <div key={tool} style={{ marginBottom: '8px' }}>
                <strong>{desc.split(' - ')[0]}:</strong> {desc.split(' - ')[1]}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 调试信息显示 */}
      <div className="tl-debug-info">
        <div>状态: {isReady ? '已就绪' : '加载中'}</div>
        <div>当前工具: {currentTool}</div>
        <div>用户ID: {userId}</div>
        <div>用户名: {username || '未登录'}</div>
      </div>
      
      {/* 工具状态显示 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 1500,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#333',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        当前工具: {toolDescriptions[currentTool as keyof typeof toolDescriptions]?.split(' - ')[0] || '未知'}
        <button 
          onClick={() => setShowHelp(!showHelp)}
          style={{
            marginLeft: '10px',
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          ? 帮助
        </button>
      </div>
      
      {!isReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #1890ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }}></div>
          <div>白板加载中...</div>
        </div>
      )}
      
      <Tldraw
        persistenceKey={`whiteboard-${whiteboardId}`}
        hideUi={false}
        onMount={(editor) => {
          console.log('Tldraw mounted successfully', editor);
          setIsReady(true);
          
          // 监听工具变化
          editor.addListener('tool-change', (tool: string) => {
            console.log('工具变更:', tool);
            setCurrentTool(tool);
          });
          
          // 设置初始工具
          editor.setCurrentTool('draw');
        }}
        components={{
          // 可自定义UI组件
        }}
      >
        <TldrawInner
          whiteboardId={whiteboardId}
          userId={userId}
          username={username}
          onSave={onSave}
        />
      </Tldraw>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* 增强Tldraw工具栏样式 */
          .tlui-toolbar {
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(10px);
            border-radius: 12px !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
          }
          
          .tlui-button {
            transition: all 0.2s ease !important;
          }
          
          .tlui-button:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
          }
          
          .tlui-button.selected {
            background: #1890ff !important;
            color: white !important;
          }
        `}
      </style>
    </div>
  )
}