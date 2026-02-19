import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Form, Input, Modal, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, LogoutOutlined } from '@ant-design/icons';
import { getChatRooms, createChatRoom, deleteChatRoom, leaveChatRoom } from '../../services/chat';
import type { ChatRoom } from '../../types/chat';
import { useAppSelector } from '../../app/hooks';

const { Option } = Select;

interface ChatRoomSelectorProps {
  currentRoomId: number;
  onRoomChange: (roomId: number) => void;
}

export const ChatRoomSelector: React.FC<ChatRoomSelectorProps> = ({
  currentRoomId,
  onRoomChange
}) => {
  const { user } = useAppSelector(state => state.auth);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomList = await getChatRooms();
      setRooms(roomList);
    } catch (error) {
      console.error('获取聊天室列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreateRoom = async (values: any) => {
    try {
      const newRoom = await createChatRoom({
        name: values.name,
        type: values.type,
        maxUsers: values.maxUsers
      });
      setRooms(prev => [...prev, newRoom]);
      onRoomChange(newRoom.id);
      setModalVisible(false);
      form.resetFields();
      message.success('聊天室创建成功');
    } catch (error) {
      console.error('创建聊天室失败:', error);
      message.error('创建聊天室失败');
    }
  };

  const handleDeleteRoom = async () => {
    try {
      await deleteChatRoom(currentRoomId);
      const updatedRooms = rooms.filter(room => room.id !== currentRoomId);
      setRooms(updatedRooms);
      
      // 切换到第一个房间或清空选择
      if (updatedRooms.length > 0) {
        onRoomChange(updatedRooms[0].id);
      } else {
        onRoomChange(0);
      }
      
      message.success('聊天室删除成功');
    } catch (error) {
      console.error('删除聊天室失败:', error);
      message.error('删除聊天室失败');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveChatRoom(currentRoomId);
      const updatedRooms = rooms.filter(room => room.id !== currentRoomId);
      setRooms(updatedRooms);
      
      // 切换到第一个房间或清空选择
      if (updatedRooms.length > 0) {
        onRoomChange(updatedRooms[0].id);
      } else {
        onRoomChange(0);
      }
      
      message.success('退出聊天室成功');
    } catch (error) {
      console.error('退出聊天室失败:', error);
      message.error('退出聊天室失败');
    }
  };

  return (
    <>
      <Card 
        title="聊天室选择" 
        size="small"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            size="small"
            onClick={() => setModalVisible(true)}
          >
            创建
          </Button>
        }
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Select
            value={currentRoomId}
            onChange={onRoomChange}
            loading={loading}
            style={{ flex: 1 }}
            placeholder="选择聊天室"
          >
            {rooms.map(room => (
              <Option key={room.id} value={room.id}>
                {room.name} ({room.type})
                {room.created_by === user?.id && ' (我创建的)'}
              </Option>
            ))}
          </Select>
          
          {currentRoomId > 0 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {rooms.find(r => r.id === currentRoomId)?.created_by === user?.id ? (
                <Popconfirm
                  title="确定要删除这个聊天室吗？"
                  description="删除后所有消息将被清除且无法恢复"
                  onConfirm={handleDeleteRoom}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button 
                    danger 
                    icon={<DeleteOutlined />} 
                    size="small"
                  />
                </Popconfirm>
              ) : (
                <Popconfirm
                  title="确定要退出这个聊天室吗？"
                  onConfirm={handleLeaveRoom}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button 
                    icon={<LogoutOutlined />} 
                    size="small"
                  />
                </Popconfirm>
              )}
            </div>
          )}
        </div>
      </Card>

      <Modal
        title="创建聊天室"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          onFinish={handleCreateRoom}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="聊天室名称"
            rules={[{ required: true, message: '请输入聊天室名称' }]}
          >
            <Input placeholder="请输入聊天室名称" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="聊天室类型"
            initialValue="study_group"
          >
            <Select>
              <Option value="public">公开</Option>
              <Option value="private">私密</Option>
              <Option value="study_group">学习小组</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="maxUsers"
            label="最大人数"
            initialValue={50}
          >
            <Input type="number" min={2} max={100} />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建聊天室
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};