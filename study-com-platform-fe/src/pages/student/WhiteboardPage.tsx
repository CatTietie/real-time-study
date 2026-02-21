import React, { useState, useEffect } from 'react';
import { Card, Layout, Spin, message, Button, Modal, Form, Input, Select, Space } from 'antd';
import { WhiteboardWrapper } from '../../components/whiteboard/WhiteboardWrapper';
import { createWhiteboard, getWhiteboard, exportWhiteboardToPng } from '../../services/whiteboard';
import { getChatRooms } from '../../services/chat';
import { useAppSelector } from '../../app/hooks';
import type { ChatRoom } from '../../types/chat';

const { Content } = Layout;
const { Option } = Select;

interface WhiteboardPageProps {
  whiteboardId?: number;
}

const WhiteboardContent: React.FC<WhiteboardPageProps> = ({ whiteboardId }) => {
  const { user } = useAppSelector(state => state.auth);
  const [whiteboard, setWhiteboard] = useState<unknown>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // 加载聊天室列表
        const rooms = await getChatRooms();
        setChatRooms(rooms);
        
        if (whiteboardId) {
          // 加载现有白板
          const wb = await getWhiteboard(whiteboardId);
          setWhiteboard(wb);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
        message.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [whiteboardId, setWhiteboard]);

  // 加载选定聊天室的保存快照
  const loadRoomSnapshots = async (roomId: number) => {
    try {
      console.log('加载聊天室快照:', roomId);
      const data = await getChatRoomWhiteboardSnapshots(roomId);
      setSavedSnapshots(data.snapshots || []);
      console.log('加载到快照:', data.snapshots?.length || 0, '个');
    } catch (error) {
      console.error('加载快照失败:', error);
      setSavedSnapshots([]);
    }
  };

  const handleJoinWhiteboard = async (roomId: number) => {
    try {
      console.log('Joining whiteboard for room:', roomId);
      
      // 先加载该聊天室的保存快照
      await loadRoomSnapshots(roomId);
      setSelectedRoomId(roomId);
      
      // 直接加入聊天室对应的白板，实现协作
      const wb = await createWhiteboard({
        roomId: Number(roomId),
        name: `协作白板 - ${chatRooms.find(r => r.id === roomId)?.name || '聊天室'}`,
        type: 'collaborative',
        width: 1200,
        height: 800,
        backgroundColor: '#FFFFFF'
      });
      
      setWhiteboard(wb);
      message.success('已加入协作白板');
    } catch (error) {
      console.error('加入白板失败:', error);
      message.error((error as Error).message || '加入白板失败');
    }
  };

  const handleCreateWhiteboard = async (values: unknown) => {
    try {
      console.log('Form values:', values);
      // 类型断言来访问表单值
      const formValues = values as {
        roomId: number;
        name: string;
        type: string;
        width: number;
        height: number;
        backgroundColor: string;
      };
      
      const newWb = await createWhiteboard({
        roomId: Number(formValues.roomId),
        name: formValues.name,
        type: formValues.type || 'general',
        width: Number(formValues.width) || 1200,
        height: Number(formValues.height) || 800,
        backgroundColor: formValues.backgroundColor || '#FFFFFF'
      });
      setWhiteboard(newWb);
      setModalVisible(false);
      form.resetFields();
      message.success('已加入协作白板');
    } catch (error) {
      console.error('创建白板失败:', error);
      message.error((error as Error).message || '创建白板失败');
    }
  };

  const handleExport = async () => {
    if (!whiteboard) return;
    
    try {
      // 类型断言来访问白板ID
      const wb = whiteboard as { id: number };
      const exportData = await exportWhiteboardToPng(wb.id);
      message.success('白板数据导出成功');
      console.log('导出数据:', exportData);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <Card 
          title={`协作白板 - ${whiteboard?.name || '未命名'}`}
          extra={
            <Space>
              <Select
                placeholder="选择聊天室加入白板"
                style={{ width: 200 }}
                onChange={handleJoinWhiteboard}
                disabled={!!whiteboard}
              >
                {chatRooms.map(room => (
                  <Option key={room.id} value={room.id}>
                    {room.name} ({room.type})
                  </Option>
                ))}
              </Select>
              <Button 
                type="primary" 
                onClick={() => setModalVisible(true)}
                disabled={!!whiteboard}
              >
                新建白板
              </Button>
              {whiteboard && (
                <Button onClick={handleExport}>
                  导出PNG
                </Button>
              )}
              {whiteboard && (
                <Button 
                  danger 
                  onClick={() => {
                    setWhiteboard(null);
                    message.success('已退出白板');
                  }}
                >
                  退出白板
                </Button>
              )}
            </Space>
          }
          style={{ 
            maxWidth: 1400, 
            margin: '0 auto',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {whiteboard ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              padding: '20px' 
            }}>
              <WhiteboardWrapper
                whiteboardId={whiteboard.id}
                userId={user?.id || 0}
                username={user?.username || ''}
              />
            </div>
          ) : (
            <div>
              {selectedRoomId && savedSnapshots.length > 0 ? (
                // 显示保存的快照列表
                <div style={{ padding: '20px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '20px' 
                  }}>
                    <h3>💾 选择要继续编辑的白板</h3>
                    <Button 
                      onClick={() => {
                        setSelectedRoomId(null);
                        setSavedSnapshots([]);
                      }}
                    >
                      返回选择聊天室
                    </Button>
                  </div>
                  <List
                    dataSource={savedSnapshots}
                    renderItem={(snapshot) => (
                      <List.Item
                        actions={[
                          <Button 
                            type="primary" 
                            onClick={async () => {
                              try {
                                // 先加入白板
                                const wb = await createWhiteboard({
                                  roomId: selectedRoomId,
                                  name: `协作白板 - ${chatRooms.find(r => r.id === selectedRoomId)?.name || '聊天室'}`,
                                  type: 'collaborative',
                                  width: 1200,
                                  height: 800,
                                  backgroundColor: '#FFFFFF'
                                });
                                
                                setWhiteboard(wb);
                                message.success(`已加载白板: ${snapshot.name}`);
                              } catch (error) {
                                console.error('加载白板失败:', error);
                                message.error('加载白板失败');
                              }
                            }}
                          >
                            继续编辑
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
                    locale={{ emptyText: '该聊天室暂无保存的白板' }}
                  />
                </div>
              ) : (
                // 显示初始选择界面
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 40px',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎨</div>
                  <h2 style={{ marginBottom: '16px', color: '#333' }}>欢迎来到协作白板</h2>
                  <p style={{ marginBottom: '24px', fontSize: '16px' }}>
                    选择一个聊天室开始绘画吧！
                  </p>
                  <div style={{ 
                    background: '#f0f8ff', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    maxWidth: '500px', 
                    margin: '0 auto',
                    textAlign: 'left'
                  }}>
                    <h4 style={{ color: '#1890ff', marginBottom: '12px' }}>💡 使用说明：</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      <li>选择聊天室后可查看该聊天室保存的历史白板</li>
                      <li>可以选择继续编辑已保存的白板</li>
                      <li>也可以创建全新的白板</li>
                      <li>编辑完成后记得点击保存按钮</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Modal
          title="创建新白板"
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            onFinish={handleCreateWhiteboard}
            layout="vertical"
          >
            <Form.Item
              name="name"
              label="白板名称"
              rules={[{ required: true, message: '请输入白板名称' }]}
              initialValue="协作白板"
            >
              <Input placeholder="请输入白板名称" />
            </Form.Item>
            
            <Form.Item
              name="roomId"
              label="关联聊天室"
              rules={[{ required: true, message: '请选择关联的聊天室' }]}
            >
              <Select placeholder="选择关联的聊天室">
                {chatRooms.map(room => (
                  <Option key={room.id} value={room.id}>
                    {room.name} ({room.type})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="type"
              label="白板类型"
              initialValue="general"
            >
              <Select>
                <Option value="general">通用白板</Option>
                <Option value="brainstorming">头脑风暴</Option>
                <Option value="diagram">图表绘制</Option>
                <Option value="sketch">草图绘制</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="width"
              label="宽度"
              initialValue={1200}
            >
              <Input type="number" min={800} max={2000} />
            </Form.Item>
            
            <Form.Item
              name="height"
              label="高度"
              initialValue={800}
            >
              <Input type="number" min={600} max={1500} />
            </Form.Item>
            
            <Form.Item
              name="backgroundColor"
              label="背景色"
              initialValue="#FFFFFF"
            >
              <Input type="color" />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                创建白板
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

const WhiteboardPage: React.FC<WhiteboardPageProps> = (props) => {
  return <WhiteboardContent {...props} />;
};

export default WhiteboardPage;