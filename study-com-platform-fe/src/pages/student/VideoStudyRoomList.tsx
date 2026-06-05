import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  Empty,
  Spin,
  message,
  Row,
  Col,
  Avatar,
} from "antd";
import {
  VideoCameraOutlined,
  PlusOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "../../app/hooks";
import { getVideoStudyRooms, createVideoStudyRoom } from "../../services/videoStudyRoom";
import type { VideoStudyRoom, CreateVideoRoomParams } from "../../types/video-study-room";

const VideoStudyRoomList = () => {
  const navigate = useNavigate();
  const { userId } = useAppSelector((state) => state.auth);
  const [rooms, setRooms] = useState<VideoStudyRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await getVideoStudyRooms();
      if (res.success) {
        setRooms(res.data);
      }
    } catch (err: any) {
      message.error(err.message || "获取房间列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreate = async (values: CreateVideoRoomParams) => {
    setCreating(true);
    try {
      const res = await createVideoStudyRoom(values);
      if (res.success) {
        message.success("创建成功");
        setCreateModalOpen(false);
        form.resetFields();
        navigate(`/student/video-study-room/${res.data.id}`);
      }
    } catch (err: any) {
      message.error(err.message || "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (roomId: number) => {
    navigate(`/student/video-study-room/${roomId}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold m-0">视频自习室</h2>
          <p className="text-gray-500 mt-1 mb-0">开启摄像头，与同学一起静默自习</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setCreateModalOpen(true)}
        >
          创建房间
        </Button>
      </div>

      <Spin spinning={loading}>
        {rooms.length === 0 ? (
          <Empty description="暂无视频自习室，快来创建一个吧" />
        ) : (
          <Row gutter={[16, 16]}>
            {rooms.map((room) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={room.id}>
                <Card
                  hoverable
                  onClick={() => handleJoin(room.id)}
                  className="h-full"
                  actions={[
                    <Button type="link" key="join" icon={<VideoCameraOutlined />}>
                      加入
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    avatar={
                      <Avatar
                        src={room.Owner?.avatar}
                        icon={<UserOutlined />}
                        size={40}
                      />
                    }
                    title={
                      <div className="flex items-center gap-2">
                        <span className="truncate">{room.name}</span>
                        {room.owner_id === userId && (
                          <Tag color="blue" className="ml-1">
                            我的
                          </Tag>
                        )}
                      </div>
                    }
                    description={
                      <Space direction="vertical" size={4} className="w-full">
                        <span className="text-gray-400 text-xs">
                          房主: {room.Owner?.nickname || room.Owner?.username || "未知"}
                        </span>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            <TeamOutlined className="mr-1" />
                            {room.online_count || 0}/{room.max_participants}人
                          </span>
                          <span>
                            <ClockCircleOutlined className="mr-1" />
                            {room.pomodoro_focus_duration}分钟
                          </span>
                        </div>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal
        title="创建视频自习室"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            max_participants: 9,
            pomodoro_focus_duration: 25,
            pomodoro_break_duration: 5,
            pomodoro_rounds: 4,
          }}
        >
          <Form.Item
            name="name"
            label="房间名称"
            rules={[{ required: true, message: "请输入房间名称" }]}
          >
            <Input placeholder="例如：期末复习自习室" maxLength={50} />
          </Form.Item>

          <Form.Item name="description" label="房间描述">
            <Input.TextArea placeholder="可选，描述学习主题" rows={2} maxLength={200} />
          </Form.Item>

          <Form.Item name="max_participants" label="最大人数">
            <InputNumber min={2} max={9} className="w-full" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="pomodoro_focus_duration" label="专注(分钟)">
                <Select>
                  <Select.Option value={15}>15</Select.Option>
                  <Select.Option value={25}>25</Select.Option>
                  <Select.Option value={45}>45</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pomodoro_break_duration" label="休息(分钟)">
                <Select>
                  <Select.Option value={5}>5</Select.Option>
                  <Select.Option value={10}>10</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pomodoro_rounds" label="轮数">
                <InputNumber min={1} max={8} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={creating}>
                创建并进入
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default VideoStudyRoomList;
