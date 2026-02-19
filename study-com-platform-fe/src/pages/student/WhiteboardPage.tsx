import React, { useState, useEffect } from 'react';
import { Card, Layout, Spin, message, Button, Modal, Form, Input, Select, Space } from 'antd';
import { WhiteboardCanvas } from '../../components/whiteboard/WhileboardCanvas';
import { Toolbar } from '../../components/whiteboard/Toolbar';
import { WhiteboardProvider, useWhiteboard } from '../../components/whiteboard/WhiteboardProvider';
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
  const { 
    whiteboard, 
    setWhiteboard,
    currentTool, 
    setCurrentTool,
    currentColor, 
    setCurrentColor,
    lineWidth, 
    setLineWidth,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    shapeType,
    setShapeType,
    fillColor,
    setFillColor
  } = useWhiteboard();
  
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

  const handleCreateWhiteboard = async (values: any) => {
    try {
      console.log('Form values:', values);
      const newWb = await createWhiteboard({
        roomId: Number(values.roomId), // 确保roomId是数字类型
        name: values.name,
        type: values.type || 'general',
        width: Number(values.width) || 1200,
        height: Number(values.height) || 800,
        backgroundColor: values.backgroundColor || '#FFFFFF'
      });
      setWhiteboard(newWb);
      setModalVisible(false);
      form.resetFields();
      message.success('白板创建成功');
    } catch (error: any) {
      console.error('创建白板失败:', error);
      message.error(error.response?.data?.message || '创建白板失败');
    }
  };

  const handleClear = () => {
    // 清空白板逻辑将在WhiteboardCanvas中处理
    console.log('清空白板');
  };

  const handleExport = async () => {
    if (!whiteboard) return;
    
    try {
      const exportData = await exportWhiteboardToPng(whiteboard.id);
      message.success('白板数据导出成功');
      console.log('导出数据:', exportData);
      // 这里可以添加实际的PNG生成逻辑
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
        <Spin size="large" tip="加载白板中..." />
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
              <Button type="primary" onClick={() => setModalVisible(true)}>
                新建白板
              </Button>
              {whiteboard && (
                <Button onClick={handleExport}>
                  导出PNG
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
            <>
              <Toolbar
                currentTool={currentTool}
                onToolChange={setCurrentTool}
                currentColor={currentColor}
                onColorChange={setCurrentColor}
                lineWidth={lineWidth}
                onLineWidthChange={setLineWidth}
                onClear={handleClear}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                fontFamily={fontFamily}
                onFontFamilyChange={setFontFamily}
                shapeType={shapeType}
                onShapeTypeChange={setShapeType}
                fillColor={fillColor}
                onFillColorChange={setFillColor}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '20px' 
              }}>
                <WhiteboardCanvas
                  whiteboardId={whiteboard.id}
                  userId={user?.id || 0}
                  username={user?.username || ''}
                  roomId={whiteboard.room_id}
                  width={whiteboard.width}
                  height={whiteboard.height}
                  currentTool={currentTool}
                  currentColor={currentColor}
                  lineWidth={lineWidth}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  shapeType={shapeType}
                  fillColor={fillColor}
                  onClear={handleClear}
                />
              </div>
            </>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#666'
            }}>
              <p>请选择或创建一个白板开始协作</p>
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
  return (
    <WhiteboardProvider>
      <WhiteboardContent {...props} />
    </WhiteboardProvider>
  );
};

export default WhiteboardPage;