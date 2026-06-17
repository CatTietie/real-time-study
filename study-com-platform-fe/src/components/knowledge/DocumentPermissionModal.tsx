import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Table,
  Button,
  Select,
  InputNumber,
  Space,
  Tag,
  message,
  Popconfirm,
  Empty,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  getDocumentPermissions,
  batchSetDocumentPermissions,
} from "../../services/knowledgeLibrary";
import { fetchRoles } from "../../services/admin";
import type {
  DocumentPermissionRecord,
  DocumentPermissionLevel,
} from "../../types/knowledge-library";

interface Props {
  documentId: number;
  open: boolean;
  onClose: () => void;
}

interface RoleOption {
  id: number;
  name: string;
}

const LEVEL_LABELS: Record<DocumentPermissionLevel, string> = {
  view: "仅查看",
  comment: "查看+评论",
  edit: "查看+评论+编辑",
  manage: "完全管理",
};

const LEVEL_COLORS: Record<DocumentPermissionLevel, string> = {
  view: "default",
  comment: "blue",
  edit: "orange",
  manage: "red",
};

const DocumentPermissionModal: React.FC<Props> = ({ documentId, open, onClose }) => {
  const [permissions, setPermissions] = useState<DocumentPermissionRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newTargetType, setNewTargetType] = useState<"all" | "role" | "user">("user");
  const [newTargetId, setNewTargetId] = useState<number | null>(null);
  const [newLevel, setNewLevel] = useState<DocumentPermissionLevel>("view");

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDocumentPermissions(documentId);
      setPermissions(res.data.data || []);
    } catch {
      message.error("加载权限列表失败");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const fetchRolesData = useCallback(async () => {
    try {
      const res = await fetchRoles();
      setRoles(res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPermissions();
      fetchRolesData();
    }
  }, [open, fetchPermissions, fetchRolesData]);

  const handleAdd = () => {
    if (newTargetType !== "all" && !newTargetId) {
      message.warning("请输入目标ID");
      return;
    }

    const exists = permissions.some(
      (p) =>
        p.target_type === newTargetType &&
        (newTargetType === "all" ? true : p.target_id === newTargetId)
    );
    if (exists) {
      message.warning("该目标已存在权限记录，请修改已有记录");
      return;
    }

    const newPerm: DocumentPermissionRecord = {
      id: Date.now(),
      document_id: documentId,
      target_type: newTargetType,
      target_id: newTargetType === "all" ? null : newTargetId,
      permission_level: newLevel,
      granted_by: 0,
      created_at: new Date().toISOString(),
    };

    setPermissions([...permissions, newPerm]);
    setNewTargetId(null);
  };

  const handleRemove = (id: number) => {
    setPermissions(permissions.filter((p) => p.id !== id));
  };

  const handleLevelChange = (id: number, level: DocumentPermissionLevel) => {
    setPermissions(
      permissions.map((p) => (p.id === id ? { ...p, permission_level: level } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = permissions.map((p) => ({
        target_type: p.target_type,
        target_id: p.target_id,
        permission_level: p.permission_level,
      }));
      await batchSetDocumentPermissions(documentId, payload);
      message.success("权限保存成功");
      onClose();
    } catch {
      message.error("保存权限失败");
    } finally {
      setSaving(false);
    }
  };

  const getTargetLabel = (record: DocumentPermissionRecord) => {
    if (record.target_type === "all") return "所有用户";
    if (record.target_type === "role") {
      const role = roles.find((r) => r.id === record.target_id);
      return `角色: ${role?.name || `#${record.target_id}`}`;
    }
    if (record.TargetUser) {
      return `用户: ${record.TargetUser.nickname || record.TargetUser.username}`;
    }
    return `用户 #${record.target_id}`;
  };

  const columns = [
    {
      title: "授权目标",
      key: "target",
      render: (_: any, record: DocumentPermissionRecord) => getTargetLabel(record),
    },
    {
      title: "权限级别",
      key: "level",
      width: 180,
      render: (_: any, record: DocumentPermissionRecord) => (
        <Select
          value={record.permission_level}
          onChange={(val) => handleLevelChange(record.id, val)}
          size="small"
          style={{ width: 140 }}
          options={Object.entries(LEVEL_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 60,
      render: (_: any, record: DocumentPermissionRecord) => (
        <Popconfirm title="确定移除该权限？" onConfirm={() => handleRemove(record.id)}>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title="文档权限管理"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            value={newTargetType}
            onChange={(val) => {
              setNewTargetType(val);
              setNewTargetId(null);
            }}
            style={{ width: 120 }}
            options={[
              { value: "all", label: "所有用户" },
              { value: "role", label: "指定角色" },
              { value: "user", label: "指定用户" },
            ]}
          />
          {newTargetType === "role" && (
            <Select
              value={newTargetId}
              onChange={(val) => setNewTargetId(val)}
              style={{ width: 160 }}
              placeholder="选择角色"
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
            />
          )}
          {newTargetType === "user" && (
            <InputNumber
              value={newTargetId}
              onChange={(val) => setNewTargetId(val)}
              placeholder="用户ID"
              min={1}
              style={{ width: 120 }}
            />
          )}
          <Select
            value={newLevel}
            onChange={(val) => setNewLevel(val)}
            style={{ width: 140 }}
            options={Object.entries(LEVEL_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={permissions}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无权限配置（所有认证用户可查看和评论）" /> }}
      />

      <div style={{ marginTop: 12, color: "#999", fontSize: 12 }}>
        <Tag color="warning">提示</Tag>
        未配置任何权限时，所有登录用户均可查看和评论文档。添加权限后，仅匹配的用户可以访问。
      </div>
    </Modal>
  );
};

export default DocumentPermissionModal;
