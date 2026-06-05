import { Avatar, Tooltip, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import type { NoteCollaborator } from "../../types/collaborative-note";
import "./CollaboratorSidebar.css";

interface CollaboratorSidebarProps {
  collaborators: NoteCollaborator[];
}

export default function CollaboratorSidebar({ collaborators }: CollaboratorSidebarProps) {
  const online = collaborators.filter((c) => c.isOnline);
  const offline = collaborators.filter((c) => !c.isOnline);

  return (
    <div className="collaborator-sidebar">
      <div className="collaborator-sidebar-header">
        <Typography.Text strong>在线协作者</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {online.length} 人在线
        </Typography.Text>
      </div>

      <div className="collaborator-list">
        {online.map((user) => (
          <Tooltip key={user.userId} title={user.nickname} placement="right">
            <div className="collaborator-item">
              <div
                className="collaborator-avatar-wrapper online"
                style={{ borderColor: user.color }}
              >
                <Avatar
                  size={36}
                  src={user.avatar}
                  icon={!user.avatar ? <UserOutlined /> : undefined}
                />
                <span className="online-indicator" />
              </div>
              <Typography.Text className="collaborator-name" ellipsis>
                {user.nickname}
              </Typography.Text>
            </div>
          </Tooltip>
        ))}

        {offline.map((user) => (
          <Tooltip key={user.userId} title={`${user.nickname} (已离开)`} placement="right">
            <div className="collaborator-item offline">
              <div className="collaborator-avatar-wrapper">
                <Avatar
                  size={36}
                  src={user.avatar}
                  icon={!user.avatar ? <UserOutlined /> : undefined}
                />
              </div>
              <Typography.Text className="collaborator-name" type="secondary" ellipsis>
                {user.nickname}
              </Typography.Text>
            </div>
          </Tooltip>
        ))}

        {collaborators.length === 0 && (
          <Typography.Text type="secondary" style={{ fontSize: 12, padding: "12px 0" }}>
            暂无其他协作者
          </Typography.Text>
        )}
      </div>
    </div>
  );
}
