import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Form, Input, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getChatRooms, createChatRoom } from '../../services/chat';
import type { ChatRoom } from '../../types/chat';

const { Option } = Select;

interface ChatRoomSelectorProps {
  currentRoomId: number;
  onRoomChange: (roomId: number) => void;
}

export const ChatRoomSelector: React.FC<ChatRoomSelectorProps> = ({
  currentRoomId,
  onRoomChange
}) => {
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
    } catch (error) {
      console.error('创建聊天室失败:', error);
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
        <Select
          value={currentRoomId}
          onChange={onRoomChange}
          loading={loading}
          style={{ width: '100%' }}
          placeholder="选择聊天室"
        >
          {rooms.map(room => (
            <Option key={room.id} value={room.id}>
              {room.name} ({room.type})
            </Option>
          ))}
        </Select>
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