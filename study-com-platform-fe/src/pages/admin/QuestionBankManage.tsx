import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  Typography,
  message,
  Popconfirm,
  Upload,
  Alert,
  Divider,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  fetchBanks,
  fetchBankQuestions,
  createBank,
  createQuestion,
  batchImportQuestions,
  updateQuestion,
  deleteQuestion,
  fetchProfessionals,
  fetchCategories,
} from "../../services/questionBank";

const { Title } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;

const typeLabels: Record<number, string> = {
  1: "单选",
  2: "多选",
  3: "判断",
  4: "填空",
  5: "主观",
};

const typeColors: Record<number, string> = {
  1: "blue",
  2: "purple",
  3: "green",
  4: "orange",
  5: "red",
};

const difficultyLabels: Record<number, string> = {
  1: "很简单",
  2: "简单",
  3: "中等",
  4: "较难",
  5: "困难",
};

const difficultyTextMap: Record<string, number> = {
  easy: 1,
  simple: 2,
  medium: 3,
  hard: 4,
  veryhard: 5,
};

const answerPlaceholders: Record<number, string> = {
  1: "请输入 A/B/C/D",
  2: "多选用逗号分隔，如 A,B,C",
  3: "请输入 A（正确）或 B（错误）",
  4: "请输入填空答案",
  5: "请输入参考答案",
};

interface ValidationResult {
  valid: boolean;
  normalized: any[];
  errors: string[];
}

function validateAndNormalize(rawData: any[]): ValidationResult {
  const errors: string[] = [];
  const normalized: any[] = [];

  rawData.forEach((item, index) => {
    const row = index + 1;
    const rowErrors: string[] = [];

    if (item.bankId === undefined && item.bankId !== 0) {
      rowErrors.push("缺少bankId");
    } else if (isNaN(Number(item.bankId))) {
      rowErrors.push("bankId必须为数字");
    }

    const typeNum = Number(item.type);
    if (!item.type) {
      rowErrors.push("缺少type");
    } else if (![1, 2, 3, 4, 5].includes(typeNum)) {
      rowErrors.push(`type值无效: ${item.type}（应为1-5）`);
    }

    const stem = item.stem || item.content;
    if (!stem) {
      rowErrors.push("缺少stem(题干)");
    }

    if (item.answer === undefined || item.answer === null || item.answer === "") {
      rowErrors.push("缺少answer");
    }

    if (item.options !== undefined && item.options !== null && !Array.isArray(item.options)) {
      rowErrors.push("options必须为数组格式");
    }

    let difficultyNum = 3;
    if (item.difficulty !== undefined) {
      if (typeof item.difficulty === "string") {
        const mapped = difficultyTextMap[item.difficulty.toLowerCase()];
        if (!mapped) {
          rowErrors.push(`difficulty值无效: "${item.difficulty}"（应为easy/simple/medium/hard/veryhard或数字1-5）`);
        } else {
          difficultyNum = mapped;
        }
      } else {
        difficultyNum = Number(item.difficulty);
        if (isNaN(difficultyNum) || difficultyNum < 1 || difficultyNum > 5) {
          rowErrors.push(`difficulty值无效: ${item.difficulty}（应为1-5）`);
          difficultyNum = 3;
        }
      }
    }

    if (rowErrors.length > 0) {
      errors.push(`第${row}条: ${rowErrors.join("；")}`);
    }

    const optionsDisplay = Array.isArray(item.options)
      ? item.options.map((opt: any, i: number) => {
          if (typeof opt === "string") return `${String.fromCharCode(65 + i)}.${opt}`;
          if (typeof opt === "object" && opt.text) return `${opt.label || String.fromCharCode(65 + i)}.${opt.text}`;
          return `${String.fromCharCode(65 + i)}.${String(opt)}`;
        })
      : null;

    normalized.push({
      _rowIndex: row,
      _hasError: rowErrors.length > 0,
      _errors: rowErrors,
      bankId: Number(item.bankId) || 0,
      type: typeNum || 0,
      stem: stem || "",
      optionsDisplay,
      optionsRaw: item.options,
      answer: String(item.answer ?? ""),
      score: Number(item.score) || 1,
      difficulty: difficultyNum,
      difficultyRaw: item.difficulty,
      tags: item.tags || "",
      analysis: item.analysis || "",
    });
  });

  return { valid: errors.length === 0, normalized, errors };
}

export default function QuestionBankManage() {
  // Bank list & selection
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

  // Bank filter
  const [bankKeyword, setBankKeyword] = useState("");
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [filterCategories, setFilterCategories] = useState<any[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | undefined>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();

  // Create bank modal
  const [createBankModalOpen, setCreateBankModalOpen] = useState(false);
  const [bankForm] = Form.useForm();
  const [bankFormCategories, setBankFormCategories] = useState<any[]>([]);
  const [createBankLoading, setCreateBankLoading] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Question filters
  const [questionKeyword, setQuestionKeyword] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<number | undefined>();
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState<number | undefined>();

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any[] | null>(null);
  const [rawImportData, setRawImportData] = useState<any[] | null>(null);

  // Edit/Create question modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [form] = Form.useForm();
  const questionType = Form.useWatch("type", form);

  // --- Data Loading ---

  useEffect(() => {
    loadProfessionals();
  }, []);

  useEffect(() => {
    loadBanks();
  }, [bankKeyword, selectedCategoryId]);

  useEffect(() => {
    if (selectedProfessionalId) {
      fetchCategories(selectedProfessionalId).then((res) => {
        if (res.success) setFilterCategories(res.data);
      }).catch(() => setFilterCategories([]));
    } else {
      setFilterCategories([]);
      setSelectedCategoryId(undefined);
    }
  }, [selectedProfessionalId]);

  useEffect(() => {
    if (selectedBankId) {
      loadQuestions();
    } else {
      setQuestions([]);
      setTotal(0);
    }
  }, [selectedBankId, page, pageSize, questionKeyword, questionTypeFilter, questionDifficultyFilter]);

  const loadProfessionals = async () => {
    try {
      const res = await fetchProfessionals();
      if (res.success) setProfessionals(res.data);
    } catch {
      /* silent */
    }
  };

  const loadBanks = async () => {
    try {
      const params: any = {};
      if (bankKeyword) params.keyword = bankKeyword;
      if (selectedCategoryId) params.category_id = selectedCategoryId;
      const res = await fetchBanks(Object.keys(params).length > 0 ? params : undefined);
      if (res.success) setBanks(res.data);
    } catch {
      message.error("获取题库列表失败");
    }
  };

  const loadQuestions = async () => {
    if (!selectedBankId) return;
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (questionKeyword) params.keyword = questionKeyword;
      if (questionTypeFilter) params.type = questionTypeFilter;
      if (questionDifficultyFilter) params.difficulty = questionDifficultyFilter;
      const res = await fetchBankQuestions(selectedBankId, params);
      if (res.success) {
        setQuestions(res.data);
        setTotal(res.pagination.total);
      }
    } catch {
      message.error("获取题目列表失败");
    } finally {
      setLoading(false);
    }
  };

  // --- Bank Creation ---

  const handleBankProfessionalChange = async (profId: number) => {
    bankForm.setFieldValue("category_id", undefined);
    setBankFormCategories([]);
    if (profId) {
      try {
        const res = await fetchCategories(profId);
        if (res.success) setBankFormCategories(res.data);
      } catch {
        /* silent */
      }
    }
  };

  const handleCreateBank = async (values: any) => {
    setCreateBankLoading(true);
    try {
      const res = await createBank({
        name: values.name,
        category_id: values.category_id,
        description: values.description,
      });
      if (res.success) {
        message.success("题库创建成功");
        setCreateBankModalOpen(false);
        bankForm.resetFields();
        setBankFormCategories([]);
        loadBanks();
      } else {
        message.error(res.message || "创建失败");
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || "创建题库失败");
    } finally {
      setCreateBankLoading(false);
    }
  };

  // --- Batch Import ---

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.trim()) {
          message.error("文件内容为空");
          return;
        }
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          message.error("JSON文件内容必须为数组格式，如: [{...}, {...}]");
          return;
        }
        if (parsed.length === 0) {
          message.error("JSON数组不能为空");
          return;
        }

        const { valid, normalized, errors } = validateAndNormalize(parsed);
        setPreviewData(normalized);
        setValidationErrors(errors);
        setRawImportData(parsed);

        if (!valid) {
          message.warning(`发现 ${errors.length} 处格式问题，请检查标红行`);
        } else {
          message.success(`成功解析 ${parsed.length} 条题目数据`);
        }
      } catch (err: any) {
        message.error(`JSON解析失败: ${err.message || "请检查文件格式"}`);
      }
    };
    reader.readAsText(file, "utf-8");
    return false;
  };

  const handleBatchImport = async () => {
    if (!rawImportData) return;
    if (validationErrors.length > 0) {
      message.error("存在格式错误，请修正JSON文件后重新上传");
      return;
    }
    setImportLoading(true);
    try {
      const res = await batchImportQuestions(rawImportData);
      if (res.success) {
        message.success(res.message);
        setImportResult(res.data);
        setPreviewData(null);
        setRawImportData(null);
        setValidationErrors([]);
        if (selectedBankId) loadQuestions();
      } else {
        message.error(res.message || "导入失败");
      }
    } catch (err: any) {
      const errData = err?.response?.data;
      if (errData?.errors) {
        setValidationErrors(errData.errors);
        message.error("服务端校验失败，请检查数据");
      } else {
        message.error(errData?.message || "导入失败");
      }
    } finally {
      setImportLoading(false);
    }
  };

  const resetImportModal = () => {
    setPreviewData(null);
    setRawImportData(null);
    setValidationErrors([]);
    setImportResult(null);
  };

  // --- Question CRUD ---

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteQuestion(id);
      if (res.success) {
        message.success("删除成功");
        loadQuestions();
        loadBanks();
      }
    } catch {
      message.error("删除失败");
    }
  };

  const handleEdit = (record: any) => {
    setEditingQuestion(record);
    let options = record.options;
    if (typeof options === "string") {
      try { options = JSON.parse(options); } catch { options = []; }
    }
    form.setFieldsValue({
      type: record.type,
      content: record.content,
      options: Array.isArray(options) ? options.map((o: any) => o.text || o).join("\n") : "",
      answer: record.answer,
      score: record.score,
      difficulty: record.difficulty,
      tags: record.tags,
      analysis: record.analysis,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (values: any) => {
    let options = null;
    if (values.type === 1 || values.type === 2) {
      options = values.options
        ? values.options.split("\n").filter((s: string) => s.trim()).map((text: string, i: number) => ({
            label: String.fromCharCode(65 + i),
            text: text.trim(),
          }))
        : [];
    } else if (values.type === 3) {
      options = [
        { label: "A", text: "正确" },
        { label: "B", text: "错误" },
      ];
    }

    const payload = {
      type: values.type,
      content: values.content,
      options,
      answer: values.answer,
      score: values.score,
      difficulty: values.difficulty,
      tags: values.tags,
      analysis: values.analysis,
    };

    try {
      if (editingQuestion) {
        const res = await updateQuestion(editingQuestion.id, payload);
        if (res.success) {
          message.success("更新成功");
          setEditModalOpen(false);
          loadQuestions();
        }
      } else {
        const res = await createQuestion({ ...payload, bank_id: selectedBankId });
        if (res.success) {
          message.success("创建成功");
          setEditModalOpen(false);
          loadQuestions();
          loadBanks();
        }
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || "操作失败");
    }
  };

  const handleAddQuestion = () => {
    if (!selectedBankId) {
      message.warning("请先选择一个题库");
      return;
    }
    setEditingQuestion(null);
    form.resetFields();
    setEditModalOpen(true);
  };

  // --- Table Columns ---

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    {
      title: "题干",
      dataIndex: "content",
      ellipsis: true,
      render: (text: string) => text?.substring(0, 50) + (text?.length > 50 ? "..." : ""),
    },
    {
      title: "题型",
      dataIndex: "type",
      width: 80,
      render: (t: number) => <Tag color={typeColors[t]}>{typeLabels[t]}</Tag>,
    },
    {
      title: "难度",
      dataIndex: "difficulty",
      width: 80,
      render: (d: number) => difficultyLabels[d] || d,
    },
    { title: "分值", dataIndex: "score", width: 60 },
    { title: "标签", dataIndex: "tags", width: 120, ellipsis: true },
    {
      title: "操作",
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const previewColumns = [
    {
      title: "#",
      dataIndex: "_rowIndex",
      width: 45,
      render: (idx: number, record: any) => (
        <span style={{ color: record._hasError ? "#ff4d4f" : undefined }}>
          {record._hasError ? <CloseCircleOutlined style={{ marginRight: 4 }} /> : null}
          {idx}
        </span>
      ),
    },
    {
      title: "bankId",
      dataIndex: "bankId",
      width: 70,
      render: (v: number) => {
        const bankName = banks.find((b) => b.id === v)?.name;
        return <span title={bankName || `ID:${v}`}>{v}</span>;
      },
    },
    {
      title: "题干",
      dataIndex: "stem",
      ellipsis: true,
      render: (text: string) => text?.substring(0, 40) + (text?.length > 40 ? "..." : ""),
    },
    {
      title: "题型",
      dataIndex: "type",
      width: 65,
      render: (t: number) => typeLabels[t] ? <Tag color={typeColors[t]}>{typeLabels[t]}</Tag> : <Tag color="red">无效</Tag>,
    },
    {
      title: "选项",
      dataIndex: "optionsDisplay",
      width: 180,
      ellipsis: true,
      render: (opts: string[] | null) => opts ? opts.join(" | ") : <span style={{ color: "#999" }}>无选项</span>,
    },
    { title: "答案", dataIndex: "answer", width: 70, ellipsis: true },
    {
      title: "难度",
      dataIndex: "difficulty",
      width: 60,
      render: (d: number) => difficultyLabels[d] || d,
    },
    { title: "分值", dataIndex: "score", width: 50 },
  ];

  const resultColumns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "题干", dataIndex: "content", ellipsis: true },
    {
      title: "题型",
      dataIndex: "type",
      width: 70,
      render: (t: number) => <Tag color={typeColors[t]}>{typeLabels[t]}</Tag>,
    },
    {
      title: "难度",
      dataIndex: "difficulty",
      width: 70,
      render: (d: number) => difficultyLabels[d] || d,
    },
    { title: "分值", dataIndex: "score", width: 60 },
  ];

  // --- Render ---

  return (
    <div>
      <Title level={3}>题库管理</Title>

      {/* Bank filter toolbar */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索题库名称"
            allowClear
            onSearch={(v) => setBankKeyword(v.trim())}
            style={{ width: 200 }}
          />
          <Select
            placeholder="选择专业"
            style={{ width: 160 }}
            allowClear
            value={selectedProfessionalId}
            onChange={(v) => {
              setSelectedProfessionalId(v);
              setSelectedCategoryId(undefined);
            }}
            options={professionals.map((p) => ({ label: p.name, value: p.id }))}
          />
          <Select
            placeholder="选择分类"
            style={{ width: 160 }}
            allowClear
            value={selectedCategoryId}
            onChange={(v) => setSelectedCategoryId(v)}
            options={filterCategories.map((c) => ({ label: c.name, value: c.id }))}
            disabled={!selectedProfessionalId}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateBankModalOpen(true)}>
            新增题库
          </Button>
        </Space>
      </Card>

      {/* Main content */}
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="选择题库"
            style={{ width: 280 }}
            value={selectedBankId}
            onChange={(v) => { setSelectedBankId(v); setPage(1); setQuestionKeyword(""); setQuestionTypeFilter(undefined); setQuestionDifficultyFilter(undefined); }}
            options={banks.map((b) => ({ label: `${b.name} (${b.question_count}题)`, value: b.id }))}
            allowClear
            showSearch
            filterOption={(input, option) => (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddQuestion}>
            新增题目
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => { setImportModalOpen(true); resetImportModal(); }}>
            批量导入
          </Button>
        </Space>

        {/* Question filters */}
        {selectedBankId && (
          <Space style={{ marginBottom: 12, display: "flex" }}>
            <Input.Search
              placeholder="搜索题干关键词"
              allowClear
              onSearch={(v) => { setQuestionKeyword(v.trim()); setPage(1); }}
              style={{ width: 200 }}
            />
            <Select
              placeholder="题型筛选"
              allowClear
              style={{ width: 120 }}
              value={questionTypeFilter}
              options={Object.entries(typeLabels).map(([k, v]) => ({ label: v, value: Number(k) }))}
              onChange={(v) => { setQuestionTypeFilter(v); setPage(1); }}
            />
            <Select
              placeholder="难度筛选"
              allowClear
              style={{ width: 120 }}
              value={questionDifficultyFilter}
              options={Object.entries(difficultyLabels).map(([k, v]) => ({ label: v, value: Number(k) }))}
              onChange={(v) => { setQuestionDifficultyFilter(v); setPage(1); }}
            />
          </Space>
        )}

        <Table
          rowKey="id"
          loading={loading}
          dataSource={questions}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      {/* Create Bank Modal */}
      <Modal
        title="新增题库"
        open={createBankModalOpen}
        onCancel={() => { setCreateBankModalOpen(false); bankForm.resetFields(); setBankFormCategories([]); }}
        onOk={() => bankForm.submit()}
        confirmLoading={createBankLoading}
        width={500}
      >
        <Form form={bankForm} layout="vertical" onFinish={handleCreateBank}>
          <Form.Item name="name" label="题库名称" rules={[{ required: true, message: "请输入题库名称" }]}>
            <Input placeholder="请输入题库名称" maxLength={200} />
          </Form.Item>
          <Form.Item name="professional_id" label="所属专业" rules={[{ required: true, message: "请选择专业" }]}>
            <Select
              placeholder="请选择专业"
              options={professionals.map((p) => ({ label: p.name, value: p.id }))}
              onChange={handleBankProfessionalChange}
            />
          </Form.Item>
          <Form.Item name="category_id" label="所属分类" rules={[{ required: true, message: "请选择分类" }]}>
            <Select
              placeholder="请先选择专业"
              options={bankFormCategories.map((c) => ({ label: c.name, value: c.id }))}
              disabled={bankFormCategories.length === 0}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="题库描述（选填）" maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Batch Import Modal */}
      <Modal
        title="批量导入题目"
        open={importModalOpen}
        width={900}
        onCancel={() => { setImportModalOpen(false); resetImportModal(); }}
        footer={
          importResult
            ? [<Button key="close" type="primary" onClick={() => { setImportModalOpen(false); resetImportModal(); }}>关闭</Button>]
            : previewData
            ? [
                <Button key="back" onClick={resetImportModal}>重新选择文件</Button>,
                <Button
                  key="submit"
                  type="primary"
                  loading={importLoading}
                  disabled={validationErrors.length > 0}
                  onClick={handleBatchImport}
                >
                  {validationErrors.length > 0
                    ? `存在${validationErrors.length}处错误，无法导入`
                    : `确认导入 (${previewData.length}题)`}
                </Button>,
              ]
            : null
        }
      >
        {importResult ? (
          <>
            <Alert
              type="success"
              icon={<CheckCircleOutlined />}
              message={`导入成功！共 ${importResult.length} 道题目已创建`}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              rowKey="id"
              dataSource={importResult}
              columns={resultColumns}
              size="small"
              pagination={false}
              scroll={{ y: 300 }}
            />
          </>
        ) : !previewData ? (
          <>
            <Dragger
              accept=".json"
              showUploadList={false}
              beforeUpload={(file) => handleFileRead(file)}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽 JSON 文件到此区域</p>
              <p className="ant-upload-hint" style={{ whiteSpace: "pre-line", textAlign: "left", padding: "0 24px" }}>
{`格式要求（JSON数组）:
[
  {
    "bankId": 1,        // 必填，题库ID（数字）
    "type": 1,          // 必填，题型：1单选 2多选 3判断 4填空 5主观
    "stem": "题干内容",  // 必填，题目内容
    "options": ["选项A文本", "选项B文本", "选项C文本", "选项D文本"],  // 选择题必填
    "answer": "A",      // 必填，答案（多选用逗号分隔如"A,B"）
    "score": 5,         // 选填，分值（默认1）
    "difficulty": "easy",  // 选填，easy/medium/hard 或数字1-5（默认3）
    "tags": "Java,基础",   // 选填，标签
    "analysis": "解析..."  // 选填，题目解析
  }
]`}
              </p>
            </Dragger>
          </>
        ) : (
          <>
            {validationErrors.length > 0 && (
              <Alert
                type="error"
                message={`数据校验失败（${validationErrors.length}处错误）`}
                description={
                  <ul style={{ margin: 0, paddingLeft: 16, maxHeight: 120, overflow: "auto" }}>
                    {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                }
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
            {validationErrors.length === 0 && (
              <Alert
                type="success"
                message={`数据校验通过，共 ${previewData.length} 条题目准备导入`}
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
            <Table
              rowKey="_rowIndex"
              dataSource={previewData}
              columns={previewColumns}
              size="small"
              pagination={false}
              scroll={{ y: 320 }}
              rowClassName={(record) => record._hasError ? "ant-table-row-error" : ""}
            />
            <style>{`.ant-table-row-error td { background: #fff2f0 !important; }`}</style>
          </>
        )}
      </Modal>

      {/* Edit/Create Question Modal */}
      <Modal
        title={editingQuestion ? "编辑题目" : "新增题目"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="type" label="题型" rules={[{ required: true, message: "请选择题型" }]}>
            <Select
              placeholder="请选择题型"
              options={Object.entries(typeLabels).map(([k, v]) => ({ label: v, value: Number(k) }))}
            />
          </Form.Item>
          <Form.Item name="content" label="题干" rules={[{ required: true, message: "请输入题干" }]}>
            <TextArea rows={3} />
          </Form.Item>

          {/* Dynamic options based on question type */}
          {(questionType === 1 || questionType === 2) && (
            <Form.Item
              name="options"
              label="选项（每行一个选项文本，自动编号A/B/C/D）"
              rules={[{ required: true, message: "请输入选项" }]}
            >
              <TextArea rows={4} placeholder={"选项A的文本内容\n选项B的文本内容\n选项C的文本内容\n选项D的文本内容"} />
            </Form.Item>
          )}
          {questionType === 3 && (
            <Form.Item label="选项">
              <Input value="A.正确  B.错误" disabled />
            </Form.Item>
          )}

          <Form.Item
            name="answer"
            label="答案"
            rules={[{ required: true, message: "请输入答案" }]}
          >
            <Input placeholder={answerPlaceholders[questionType] || "请输入答案"} />
          </Form.Item>
          <Space>
            <Form.Item name="score" label="分值">
              <InputNumber min={1} max={100} />
            </Form.Item>
            <Form.Item name="difficulty" label="难度">
              <Select
                style={{ width: 120 }}
                options={Object.entries(difficultyLabels).map(([k, v]) => ({ label: v, value: Number(k) }))}
              />
            </Form.Item>
          </Space>
          <Form.Item name="tags" label="标签">
            <Input placeholder="如: Java,基础" />
          </Form.Item>
          <Form.Item name="analysis" label="解析">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
