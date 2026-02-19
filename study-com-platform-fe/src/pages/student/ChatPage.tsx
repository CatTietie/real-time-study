import React, { useState, useEffect } from 'react';
import { Card, Layout, Spin, message } from 'antd';
import { ChatContainer } from '../../components/chat/ChatContaner';
import { getChatRooms } from '../../services/chat';
import type { ChatRoom } from '../../types/chat';
import { useAppSelector } from '../../app/hooks';

const { Content } = Layout;

export default function ChatPage() {
  const { user } = useAppSelector(state => state.auth);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        setLoading(true);
        const roomList = await getChatRooms();
        setRooms(roomList);
        if (roomList.length > 0) {
          setCurrentRoomId(roomList[0].id);
        }
      } catch (error) {
        console.error('获取聊天室列表失败:', error);
        message.error('获取聊天室列表失败');
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, []);

  const handleRoomChange = (roomId: number) => {
    setCurrentRoomId(roomId);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="加载聊天室中..." />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <Card 
          title="实时聊天室" 
          style={{ 
            maxWidth: 1200, 
            margin: '0 auto',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {currentRoomId > 0 ? (
            <ChatContainer 
              roomId={currentRoomId}
              onRoomChange={handleRoomChange}
            />
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#666'
            }}>
              <p>暂无可用的聊天室</p>
              <p>请管理员创建聊天室后重试</p>
            </div>
          )}
        </Card>
      </Content>
    </Layout>
  );
}