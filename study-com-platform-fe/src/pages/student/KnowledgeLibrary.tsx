import React, { useState, useEffect } from "react";
import {
  Card, Input, Button, Row, Col, Select, Spin, Empty, Upload,
  Modal, Form, message, Tag, Pagination, Avatar, Tooltip,
} from "antd";
import {
  SearchOutlined, UploadOutlined, InboxOutlined,
  AppstoreOutlined, UnorderedListOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { listDocuments, getCategories, uploadDocument, searchDocuments } from "../../services/knowledgeLibrary";
import CategoryTree from "../../components/knowledge/CategoryTree";
import DocumentCard from "../../components/knowledge/DocumentCard";
import type { KnowledgeDocument, KnowledgeCategory } from "../../types/knowledge-library";

const { Dragger } = Upload;
const { Option } = Select;

const KnowledgeLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm] = Form.useForm();

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (selectedCategory && selectedCategory !== "all") {
        params.category_id = selectedCategory;
      }
      if (fileTypeFilter) params.file_type = fileTypeFilter;
      if (keyword && !searchMode) params.keyword = keyword;

      const res = await listDocuments(params);
      if (res.data.success) {
        setDocuments(res.data.data);
        setTotal(res.data.pagination.total);
      }
    } catch {
      message.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!keyword.trim()) {
      setSearchMode(false);
      fetchDocuments();
      return;
    }
    setLoading(true);
    setSearchMode(true);
    try {
      const res = await searchDocuments({ q: keyword, page, pageSize });
      if (res.data.success) {
        setDocuments(res.data.data);
        setTotal(res.data.pagination.total);
      }
    } catch {
      message.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!searchMode) {
      fetchDocuments();
    }
  }, [page, selectedCategory, fileTypeFilter]);

  const handleUpload = async (values: any) => {
    const { file, title, tags } = values;
    if (!file || file.length === 0) {
      message.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file[0].originFileObj);
      if (title) formData.append("title", title);
      if (tags) formData.append("tags", tags);
      if (selectedCategory && selectedCategory !== "all" && selectedCategory !== "pending") {
        formData.append("category_id", selectedCategory);
      }

      const res = await uploadDocument(formData);
      if (res.data.success) {
        message.success("Upload successful, pending review");
        setUploadModalOpen(false);
        uploadForm.resetFields();
        fetchDocuments();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 120px)" }}>
      {/* Left sidebar - category tree */}
      <Card
        size="small"
        title="Categories"
        style={{ width: 240, flexShrink: 0, overflow: "auto" }}
      >
        <CategoryTree
          categories={categories}
          selectedKey={selectedCategory}
          onSelect={(key) => {
            setSelectedCategory(key);
            setPage(1);
            setSearchMode(false);
          }}
        />
      </Card>

      {/* Right content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Toolbar */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Input.Search
              placeholder="Search documents..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 300 }}
              enterButton={<SearchOutlined />}
              allowClear
              onClear={() => { setSearchMode(false); setKeyword(""); }}
            />
            <Select
              placeholder="File type"
              allowClear
              style={{ width: 120 }}
              value={fileTypeFilter || undefined}
              onChange={(v) => { setFileTypeFilter(v || ""); setPage(1); }}
            >
              <Option value="pdf">PDF</Option>
              <Option value="word">Word</Option>
              <Option value="ppt">PPT</Option>
              <Option value="image">Image</Option>
            </Select>
            <div style={{ flex: 1 }} />
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalOpen(true)}
            >
              Upload
            </Button>
          </div>
        </Card>

        {/* Document grid */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <Spin spinning={loading}>
            {documents.length === 0 && !loading ? (
              <Empty description="No documents" style={{ marginTop: 80 }} />
            ) : (
              <Row gutter={[12, 12]}>
                {documents.map((doc) => (
                  <Col key={doc.id} xs={24} sm={12} lg={8} xl={6}>
                    <DocumentCard
                      document={doc}
                      onClick={() => navigate(`/student/knowledge-library/${doc.id}`)}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </Spin>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onChange={(p) => setPage(p)}
              showTotal={(t) => `Total ${t} documents`}
            />
          </div>
        )}
      </div>

      {/* Upload modal */}
      <Modal
        title="Upload Document"
        open={uploadModalOpen}
        onCancel={() => { setUploadModalOpen(false); uploadForm.resetFields(); }}
        footer={null}
      >
        <Form form={uploadForm} layout="vertical" onFinish={handleUpload}>
          <Form.Item
            name="file"
            label="File"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            rules={[{ required: true, message: "Please select a file" }]}
          >
            <Dragger
              maxCount={1}
              beforeUpload={() => false}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag file to upload</p>
              <p className="ant-upload-hint">PDF, Word, PPT, Image (max 100MB)</p>
            </Dragger>
          </Form.Item>
          <Form.Item name="title" label="Title (optional)">
            <Input placeholder="Leave blank to use filename" />
          </Form.Item>
          <Form.Item name="tags" label="Tags (optional)">
            <Input placeholder="Comma-separated keywords" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={uploading} block>
              Upload
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KnowledgeLibrary;
