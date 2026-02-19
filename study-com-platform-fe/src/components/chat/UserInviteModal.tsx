import React, { useState, useEffect } from 'react';
import { Modal, List, Avatar, Button, message, Spin, Input } from 'antd';
import { UserAddOutlined, SearchOutlined } from '@ant-design/icons';
import { getAvailableUsers, addUserToRoom } from '../../services/chat';
import type { AvailableUser } from '../../types/chat';

interface UserInviteModalProps {
  visible: boolean;
  roomId: number;
  onClose: () => void;
  onUserAdded?: () => void;
  sendSystemMessage?: (message: string) => void;
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({
  visible,
  roomId,
  onClose,
  onUserAdded,
  sendSystemMessage
}) => {
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (visible && roomId) {
      loadAvailableUsers();
    }
  }, [visible, roomId]);

  useEffect(() => {
    if (searchText) {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchText.toLowerCase()) ||
        (user.nickname && user.nickname.toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchText, users]);

  const loadAvailableUsers = async () => {
    try {
      setLoading(true);
      const userList = await getAvailableUsers(roomId);
      setUsers(userList);
      setFilteredUsers(userList);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (userId: number, username: string) => {
    try {
      const result = await addUserToRoom(roomId, userId);
      message.success(`${username} 已加入聊天室`);
      
      // 发送系统消息到聊天室
      console.log('准备发送系统消息:', { 
        hasSystemMessage: !!result.data?.systemMessage,
        systemMessage: result.data?.systemMessage,
        hasSendFunction: !!sendSystemMessage 
      });
      
      if (result.data?.systemMessage && sendSystemMessage) {
        console.log('调用sendSystemMessage:', result.data.systemMessage);
        sendSystemMessage(result.data.systemMessage);
      }
      
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (error) {
      console.error('添加用户失败:', error);
      message.error('添加用户失败');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  return (
    <Modal
      title="拉同学进入聊天室"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder="搜索用户名或昵称"
          prefix={<SearchOutlined />}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin tip="加载用户列表中..." />
        </div>
      ) : (
        <List
          dataSource={filteredUsers}
          renderItem={(user) => (
            <List.Item
              actions={[
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  size="small"
                  onClick={() => handleAddUser(user.id, user.username)}
                >
                  拉入
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar>{user.username.charAt(0).toUpperCase()}</Avatar>}
                title={user.username}
                description={user.nickname || '暂无昵称'}
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
};