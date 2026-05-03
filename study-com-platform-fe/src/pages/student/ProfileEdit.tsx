import { Form, Row, Col, message } from "antd";
import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import type { RootState } from "../../app/store";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { uploadAvatar } from "../../services/auth";
import { updateAvatar as updateAvatarAction } from "../../features/auth/authSlice";

import Banner from "../../components/student/profile/Banner";
import BasicInfoCard from "../../components/student/profile/BasicInfoCard";
import PasswordCard from "../../components/student/profile/PasswordCard";
import LearningGoals from "../../components/student/profile/LearningGoals";
import CTABanner from "../../components/student/profile/CTABanner";

import "../../styles/profile-edit.css";

interface ProfileFormData {
  nickname: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  avatar: string;
  goalPosts: number;
  goalComments: number;
  goalHotPosts: number;
  goalPoints: number;
}

export default function ProfileEdit() {
  const authState = useAppSelector((state: RootState) => state.auth);
  const { username, nickname, userId, avatar } = authState;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form] = Form.useForm<ProfileFormData>();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(avatar || "");
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsData, setGoalsData] = useState<{
    goalPosts?: number;
    goalComments?: number;
    goalHotPosts?: number;
    goalPoints?: number;
  }>({});

  const defaultFormData: ProfileFormData = {
    nickname: nickname || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    avatar: "",
    goalPosts: 3,
    goalComments: 20,
    goalHotPosts: 1,
    goalPoints: 500
  };

  useEffect(() => {
    if (userId) {
      fetchLearningGoals();
    }
  }, [userId]);

  const fetchLearningGoals = async () => {
    setGoalsLoading(true);
    try {
      const response = await api.get('/learning-goals/me');
      if (response.data.success && response.data.data) {
        const goals = response.data.data;
        const newGoalsData = {
          goalPosts: goals.goal_posts,
          goalComments: goals.goal_comments,
          goalHotPosts: goals.goal_hot_posts,
          goalPoints: goals.goal_points
        };
        setGoalsData(newGoalsData);
        form.setFieldsValue(newGoalsData);
      }
    } catch (error) {
      console.error('获取学习目标失败:', error);
      message.warning('获取学习目标失败，使用默认值');
    } finally {
      setGoalsLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      // 先显示本地预览
      const localPreviewUrl = URL.createObjectURL(file);
      setAvatarUrl(localPreviewUrl);
      
      // 调用上传接口
      const response = await uploadAvatar(file);
      if (response.success && response.data?.avatar) {
        // 上传成功后，使用服务器返回的 URL
        const newAvatarUrl = response.data.avatar;
        setAvatarUrl(newAvatarUrl);
        // 更新 Redux store 中的头像信息
        dispatch(updateAvatarAction(newAvatarUrl));
        message.success('头像上传成功');
      } else {
        throw new Error(response.message || '头像上传失败');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '头像上传失败');
    }
  };

  const onFinish = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      console.log('提交的表单数据:', values);
      
      const goalsResponse = await api.post('/learning-goals/me', {
        goal_posts: values.goalPosts,
        goal_comments: values.goalComments,
        goal_hot_posts: values.goalHotPosts,
        goal_points: values.goalPoints
      });
      
      if (!goalsResponse.data.success) {
        throw new Error(goalsResponse.data.message || '保存学习目标失败');
      }

      if (values.nickname !== nickname) {
        await api.put(`/user/${userId}`, {
          nickname: values.nickname
        });
      }

      if (values.newPassword) {
        await api.put(`/user/${userId}/password`, {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        });
      }

      message.success('个人资料更新成功！');
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 1500);
    } catch (error: unknown) {
      console.error('保存失败:', error);
      if (error instanceof Error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message.error(axiosError.response?.data?.message || error.message || '保存失败，请重试');
      } else {
        message.error('保存失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/student/dashboard');
  };

  return (
    <div className="profile-edit-page">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        <Banner />

        <Form
          form={form}
          layout="vertical"
          initialValues={defaultFormData}
          style={{ maxWidth: 1200, margin: "0 auto" }}
        >
          {goalsLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              borderRadius: 16
            }}>
              <div>加载学习目标中...</div>
            </div>
          )}

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <BasicInfoCard
                avatarUrl={avatarUrl}
                username={username || ""}
                nickname={nickname || ""}
                onAvatarUpload={handleAvatarUpload}
              />
            </Col>

            <Col xs={24} lg={12}>
              <PasswordCard />
            </Col>

            <Col span={24}>
              <LearningGoals initialGoals={goalsData} />
            </Col>

            <Col span={24}>
              <CTABanner
                loading={loading}
                onSave={onFinish}
                onCancel={handleCancel}
              />
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
}
