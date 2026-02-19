import React from 'react';
import { Card, List, Avatar, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface OnlineUsersProps {
  roomId: number;
}

export const OnlineUsers: React.FC<OnlineUsersProps> = ({ roomId }) => {
  // 模拟在线用户数据
  const onlineUsers = [
    { id: 1, username: '张三', isOnline: true },
    { id: 2, username: '李四', isOnline: true },
    { id: 3, username: '王五', isOnline: false },
  ];

  return (
    <Card 
      title="在线用户" 
      size="small"
      style={{ marginTop: '16px' }}
    >
      <List
        dataSource={onlineUsers}
        renderItem={(user) => (
          <List.Item style={{ padding: '8px 0' }}>
            <List.Item.Meta
              avatar={<Avatar icon={<UserOutlined />} />}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{user.username}</span>
                  {user.isOnline && (
                    <Tag color="green">在线</Tag>
                  )}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};