import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Spin, message } from 'antd';
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

    const currentRoom = useMemo(() => {
        return rooms.find(r => r.id === currentRoomId);
    }, [rooms, currentRoomId]);

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
        <Layout style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' 
        }}>
            <Content
                style={{
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh'
                }}
            >
                {currentRoomId > 0 ? (
                    <ChatContainer
                        roomId={currentRoomId}
                        onRoomChange={handleRoomChange}
                        currentRoom={currentRoom}
                    />
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 40px',
                        color: '#666',
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        margin: '20px'
                    }}>
                        <p style={{ fontSize: '18px', marginBottom: '12px', color: '#4a5568' }}>暂无可用的聊天室</p>
                        <p style={{ color: '#718096' }}>请管理员创建聊天室后重试</p>
                    </div>
                )}
            </Content>
        </Layout>
    );
}