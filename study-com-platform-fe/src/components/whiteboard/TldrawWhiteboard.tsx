import { Tldraw, useEditor, Editor as TLEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import '../../styles/tldraw-enhanced.css'
import { useEffect, useState, useRef } from 'react'
import { useTldrawSync } from '../../hooks/useTldrawSync'
import { saveWhiteboardSnapshot, getWhiteboardSnapshots } from '../../services/whiteboard'
import { Button, Modal, List, Input, message } from 'antd'
import { SaveOutlined, HistoryOutlined, DownloadOutlined } from '@ant-design/icons'


interface WhiteboardSnapshot {
  id: number;
  name: string;
  data: string;
  created_at: string;
  updated_at: string;
  User?: {
    username: string;
    nickname: string;
  };
}

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

  // 返回一个可见的元素，确保Tldraw正常渲染
  return (
    <div 
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100
      }} 
    />
  );
}

export const TldrawWhiteboard = ({
  whiteboardId,
  userId,
  username,
  onSave
}: TldrawWhiteboardProps) => {
  const [isReady, setIsReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [snapshots, setSnapshots] = useState<WhiteboardSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const editorRef = useRef<TLEditor | null>(null);
  
  // 定时刷新快照列表的引用
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 保存白板快照
  const handleSaveSnapshot = async () => {
    if (!editorRef.current) return;
    
    try {
      setSaving(true);
      // 使用Tldraw v4的正确API
      const snapshot = editorRef.current.getSnapshot();
      const name = snapshotName || `白板快照 ${new Date().toLocaleString()}`;
      
      const result = await saveWhiteboardSnapshot(whiteboardId, snapshot, name);
      if (result.success) {
        message.success('白板保存成功');
        setShowSaveModal(false);
        setSnapshotName('');
        // 保存成功后立即刷新快照列表
        console.log('保存成功，刷新快照列表');
        await loadSnapshots();
      }
    } catch (error) {
      console.error('保存白板失败:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 加载快照列表
  const loadSnapshots = async () => {
    try {
      console.log('加载快照列表，白板ID:', whiteboardId);
      const snapshotList = await getWhiteboardSnapshots(whiteboardId);
      console.log('获取到快照数量:', snapshotList.length);
      console.log('快照数据:', snapshotList.map(s => ({
        id: s.id,
        name: s.name,
        user: s.User?.nickname || s.User?.username,
        updatedAt: s.updated_at || s.updatedAt
      })));
      
      setSnapshots(snapshotList);
      
      // 不再自动加载最新快照，让用户手动选择
      console.log('快照列表已更新，等待用户选择');
    } catch (error) {
      console.error('加载快照列表失败:', error);
    }
  };
  
  // 启动定时刷新
  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    // 每30秒刷新一次快照列表
    refreshIntervalRef.current = setInterval(() => {
      console.log('定时刷新快照列表');
      loadSnapshots();
    }, 30000);
  };
  
  // 停止定时刷新
  const stopAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  // 导出白板为PNG
  const handleExportPng = async () => {
    if (!editorRef.current) return;
    
    try {
      setExporting(true);
      message.loading('正在导出白板为PNG...');
      
      // 使用HTML to Canvas的方式导出
      // 首先获取Tldraw容器
      const tldrawContainer = document.querySelector('.tl-container') as HTMLElement;
      if (!tldrawContainer) {
        throw new Error('无法找到白板容器');
      }
      
      // 创建临时canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建canvas上下文');
      }
      
      // 设置canvas尺寸
      const rect = tldrawContainer.getBoundingClientRect();
      canvas.width = rect.width * 2; // 2倍分辨率
      canvas.height = rect.height * 2;
      
      // 设置背景色
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 使用html2canvas库截图
      const html2canvas = (await import('html2canvas')).default;
      const screenshotCanvas = await html2canvas(tldrawContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      // 将截图绘制到我们的canvas上
      ctx.drawImage(screenshotCanvas, 0, 0, canvas.width, canvas.height);
      
      // 转换为blob并下载
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `白板_${new Date().toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(/[/:]/g, '-')}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          message.success('白板导出成功！');
        }
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('导出PNG失败:', error);
      message.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 加载快照到白板
  const loadSnapshot = async (snapshot: WhiteboardSnapshot) => {
    try {
      if (!editorRef.current) return;
      
      const snapshotData = JSON.parse(snapshot.data);
      // 使用Tldraw v4的正确API
      editorRef.current.loadSnapshot(snapshotData);
      message.success(`已加载快照: ${snapshot.name}`);
      setShowHistory(false);
    } catch (error) {
      console.error('加载快照失败:', error);
      message.error('加载快照失败');
    }
  };
  
  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, []);
  
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
            <div style={{ marginBottom: '8px' }}>
              <strong>画笔工具:</strong> 自由绘制线条
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>选择工具:</strong> 选择和移动对象
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>橡皮擦:</strong> 擦除绘制内容
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>文字工具:</strong> 添加文本
            </div>
          </div>
        </div>
      )}
      
      {/* 移除了调试信息显示 */}
      
      {/* 操作按钮区域 - 四个按钮 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 1500,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Button 
          type="primary" 
          size="small"
          icon={<SaveOutlined />}
          onClick={() => setShowSaveModal(true)}
          loading={saving}
        />
        <Button 
          size="small"
          icon={<DownloadOutlined />}
          onClick={handleExportPng}
          loading={exporting}
        />
        <Button 
          size="small"
          icon={<HistoryOutlined />}
          onClick={async () => {
            console.log('点击历史按钮，刷新快照列表');
            await loadSnapshots(); // 点击时立即刷新
            setShowHistory(true);
          }}
        />
        <Button 
          size="small"
          onClick={() => setShowHelp(!showHelp)}
        >
          ?
        </Button>
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
          editorRef.current = editor;
          
          // 设置初始工具为画笔
          editor.setCurrentTool('draw');
          
          // 加载快照列表
          loadSnapshots();
          
          // 启动定时刷新
          startAutoRefresh();
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
      
      {/* 保存快照模态框 */}
      <Modal
        title="保存白板快照"
        open={showSaveModal}
        onCancel={() => {
          setShowSaveModal(false);
          setSnapshotName('');
        }}
        onOk={handleSaveSnapshot}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
      >
        <Input
          placeholder="请输入快照名称（可选）"
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          onPressEnter={handleSaveSnapshot}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          快照将保存当前白板的所有内容，方便后续恢复
        </div>
      </Modal>
      
      {/* 历史快照模态框 */}
      <Modal
        title="历史快照"
        open={showHistory}
        onCancel={() => setShowHistory(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={snapshots}
          renderItem={(snapshot) => (
            <List.Item
              actions={[
                <Button 
                  type="primary" 
                  size="small"
                  onClick={() => loadSnapshot(snapshot)}
                >
                  加载
                </Button>
              ]}
            >
              <List.Item.Meta
                title={snapshot.name}
                description={
                  <div>
                    <div>创建者: {snapshot.User?.nickname || snapshot.User?.username || '未知'}</div>
                    <div>更新时间: {
                      (() => {
                        try {
                          // 尝试多种时间格式
                          const updateTime = snapshot.updated_at || snapshot.updatedAt || snapshot.createdAt || snapshot.created_at;
                          if (updateTime) {
                            const date = new Date(updateTime);
                            if (!isNaN(date.getTime())) {
                              return date.toLocaleString();
                            }
                          }
                          return '时间未知';
                        } catch (e) {
                          console.error('时间解析错误:', e);
                          return '时间格式错误';
                        }
                      })()
                    }</div>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: '暂无历史快照' }}
        />
      </Modal>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}