import React, { useState, useEffect } from 'react';
import { Card, Layout, Spin, message, Button, Modal, Form, Input, Select } from 'antd';
import { WhiteboardCanvas } from '../../components/whiteboard/WhileboardCanvas';
import { Toolbar } from '../../components/whiteboard/Toolbar';
import { WhiteboardProvider, useWhiteboard } from '../../components/whiteboard/WhiteboardProvider';
import { createWhiteboard, getWhiteboard } from '../../services/whiteboard';
import { useAppSelector } from '../../app/hooks';

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
    setLineWidth 
  } = useWhiteboard();
  
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const loadWhiteboard = async () => {
      try {
        setLoading(true);
        if (whiteboardId) {
          // 加载现有白板
          const wb = await getWhiteboard(whiteboardId);
          setWhiteboard(wb);
        } else {
          // 创建新白板
          const newWb = await createWhiteboard({
            roomId: 1, // 默认房间ID，实际应该从路由参数获取
            name: '协作白板',
            width: 1200,
            height: 800
          });
          setWhiteboard(newWb);
        }
      } catch (error) {
        console.error('加载白板失败:', error);
        message.error('加载白板失败');
      } finally {
        setLoading(false);
      }
    };

    loadWhiteboard();
  }, [whiteboardId, setWhiteboard]);

  const handleCreateWhiteboard = async (values: any) => {
    try {
      const newWb = await createWhiteboard({
        roomId: values.roomId,
        name: values.name,
        width: values.width || 1200,
        height: values.height || 800,
        backgroundColor: values.backgroundColor || '#FFFFFF'
      });
      setWhiteboard(newWb);
      setModalVisible(false);
      form.resetFields();
      message.success('白板创建成功');
    } catch (error) {
      console.error('创建白板失败:', error);
      message.error('创建白板失败');
    }
  };

  const handleClear = () => {
    // 清空白板逻辑将在WhiteboardCanvas中处理
    console.log('清空白板');
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
            <Button type="primary" onClick={() => setModalVisible(true)}>
              新建白板
            </Button>
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
                  width={whiteboard.width}
                  height={whiteboard.height}
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
              label="关联房间"
              initialValue={1}
            >
              <Select placeholder="选择关联的学习房间">
                <Option value={1}>默认学习室</Option>
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