// 数据库配置文件
import { QueryTypes } from "sequelize";
import { initAssociations } from "../models/associations";
import { sequelize } from "./sequelize";
import { seedAdminUsers } from "../seed/admin.seed";
import { seedDashboardData } from "../seed/dashboard.seed";
import { seedRoles } from "../seed/role.seed";
import { seedQuestionBank } from "../seed/question-bank.seed";

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL connected successfully");

    // 导入所有模型
    const User = require("../models/user.model").default;
    const Post = require("../models/post.model").default;
    const Comment = require("../models/comment.model").default;
    const Report = require("../models/report.model").default;
    const AdminLog = require("../models/admin-log.model").default;
    const PostLike = require("../models/post-like.model").default;
    const SensitiveWord = require("../models/sensitive-word.model").default;
    const PointsLog = require("../models/points-log.model").default;
    const PointsRule = require("../models/points-rule.model").default;
    const Role = require("../models/role.model").default;
    const Permission = require("../models/permission.model").default;
    const UserRole = require("../models/user-role.model").default;
    const RolePermission = require("../models/role-permission.model").default;
    const ContentAudit = require("../models/content-audit.model").default;

    // 题库系统模型
    const Professional = require("../models/professional.model").default;
    const Category = require("../models/category.model").default;
    const QuestionBank = require("../models/question-bank.model").default;
    const Question = require("../models/question.model").default;
    const UserExerciseRecord = require("../models/user-exercise-record.model").default;
    const UserAnswerDetail = require("../models/user-answer-detail.model").default;
    const WrongBook = require("../models/wrong-book.model").default;
    const UserStats = require("../models/user-stats.model").default;
    const QuestionPost = require("../models/question-post.model").default;
    const DailyQuestionAnswer = require("../models/daily-question-answer.model").default;
    const QuestionFeedback = require("../models/question-feedback.model").default;
    const UserTagMastery = require("../models/user-tag-mastery.model").default;
    const CollaborativeNote = require("../models/collaborative-note.model").default;
    const NoteVersion = require("../models/note-version.model").default;
    const NoteComment = require("../models/note-comment.model").default;
    const AiChatHistory = require("../models/ai-chat-history.model").default;
    const UserLoginLog = require("../models/user-login-log.model").default;
    const DashboardSnapshot = require("../models/dashboard-snapshot.model").default;

    // 初始化模型关联关系
    initAssociations();

    // 确保 posts.question_id 字段存在（需在 sync 前添加，否则索引创建会失败）
    const [postsTableExists] = (await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'posts'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ TABLE_NAME: string }>;

    if (postsTableExists) {
      const [questionIdColumn] = (await sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'posts'
           AND COLUMN_NAME = 'question_id'`,
        { type: QueryTypes.SELECT },
      )) as Array<{ COLUMN_NAME: string }>;

      if (!questionIdColumn) {
        await sequelize.query("ALTER TABLE posts ADD COLUMN question_id INT NULL");
      }
    }

    // 确保 user_answer_details 表有批改相关字段（需在 sync 前添加，否则索引创建会失败）
    const [uadTableExists] = (await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user_answer_details'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ TABLE_NAME: string }>;

    if (uadTableExists) {
      const [reviewStatusCol] = (await sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'user_answer_details'
           AND COLUMN_NAME = 'review_status'`,
        { type: QueryTypes.SELECT },
      )) as Array<{ COLUMN_NAME: string }>;

      if (!reviewStatusCol) {
        await sequelize.query("ALTER TABLE user_answer_details ADD COLUMN review_status TINYINT NOT NULL DEFAULT 0");
        await sequelize.query("ALTER TABLE user_answer_details ADD COLUMN review_score INT NULL");
        await sequelize.query("ALTER TABLE user_answer_details ADD COLUMN review_comment TEXT NULL");
        await sequelize.query("ALTER TABLE user_answer_details ADD COLUMN reviewer_id INT NULL");
        await sequelize.query("ALTER TABLE user_answer_details ADD COLUMN reviewed_at DATETIME NULL");
        await sequelize.query("ALTER TABLE user_answer_details ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
        console.log("Added review columns to user_answer_details table (pre-sync)");
      }
    }

    // 确保 user_exercise_records 表的 mode 列包含 intelligent 选项（需在 sync 前修改，否则 ENUM 变更会失败）
    const [uerTableExists] = (await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user_exercise_records'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ TABLE_NAME: string }>;

    if (uerTableExists) {
      const [modeCol] = (await sequelize.query(
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'user_exercise_records'
           AND COLUMN_NAME = 'mode'`,
        { type: QueryTypes.SELECT },
      )) as Array<{ COLUMN_TYPE: string }>;

      if (modeCol && !modeCol.COLUMN_TYPE.includes("intelligent")) {
        await sequelize.query(
          "ALTER TABLE user_exercise_records MODIFY COLUMN mode ENUM('sequential','random','simulation','intelligent') NOT NULL",
        );
        console.log("Added 'intelligent' to user_exercise_records.mode ENUM (pre-sync)");
      }
    }

    // 确保 study_rooms 表有视频自习室相关字段
    const [studyRoomsTableExists] = (await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'study_rooms'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ TABLE_NAME: string }>;

    if (studyRoomsTableExists) {
      const [typeCol] = (await sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'study_rooms'
           AND COLUMN_NAME = 'type'`,
        { type: QueryTypes.SELECT },
      )) as Array<{ COLUMN_NAME: string }>;

      if (!typeCol) {
        await sequelize.query("ALTER TABLE study_rooms ADD COLUMN type ENUM('physical','video') NOT NULL DEFAULT 'physical'");
        await sequelize.query("ALTER TABLE study_rooms ADD COLUMN owner_id INT NULL");
        await sequelize.query("ALTER TABLE study_rooms ADD COLUMN max_participants INT NOT NULL DEFAULT 9");
        await sequelize.query("ALTER TABLE study_rooms ADD COLUMN pomodoro_focus_duration INT NOT NULL DEFAULT 25");
        await sequelize.query("ALTER TABLE study_rooms ADD COLUMN pomodoro_break_duration INT NOT NULL DEFAULT 5");
        await sequelize.query("ALTER TABLE study_rooms ADD COLUMN pomodoro_rounds INT NOT NULL DEFAULT 4");
        await sequelize.query("ALTER TABLE study_rooms ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
        console.log("Added video study room columns to study_rooms table (pre-sync)");
      }
    }

    // 同步数据模型（创建表）
    const shouldAlter = process.env.DB_SYNC_ALTER === "true";
    await sequelize.sync({ alter: shouldAlter });
    console.log("Database tables synchronized");

    // 确保 posts 表有 FULLTEXT 索引（用于 AI 助手 RAG 检索，ngram 解析器支持中文）
    const [postsFtIndex] = (await sequelize.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'posts'
         AND INDEX_NAME = 'ft_posts_title_content'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ INDEX_NAME: string }>;

    if (!postsFtIndex) {
      try {
        await sequelize.query(
          "ALTER TABLE posts ADD FULLTEXT INDEX ft_posts_title_content (title, content) WITH PARSER ngram",
        );
        console.log("Created FULLTEXT index ft_posts_title_content on posts");
      } catch (err: any) {
        if (!err.message?.includes("Duplicate")) {
          console.warn("Failed to create FULLTEXT index on posts:", err.message);
        }
      }
    }

    // 确保 collaborative_notes 表有 FULLTEXT 索引
    const [notesFtIndex] = (await sequelize.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'collaborative_notes'
         AND INDEX_NAME = 'ft_notes_title_content'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ INDEX_NAME: string }>;

    if (!notesFtIndex) {
      try {
        await sequelize.query(
          "ALTER TABLE collaborative_notes ADD FULLTEXT INDEX ft_notes_title_content (title, content_html) WITH PARSER ngram",
        );
        console.log("Created FULLTEXT index ft_notes_title_content on collaborative_notes");
      } catch (err: any) {
        if (!err.message?.includes("Duplicate")) {
          console.warn("Failed to create FULLTEXT index on collaborative_notes:", err.message);
        }
      }
    }

    // 确保 knowledge_documents 表有 FULLTEXT 索引
    const [knowledgeFtIndex] = (await sequelize.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'knowledge_documents'
         AND INDEX_TYPE = 'FULLTEXT'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ INDEX_NAME: string }>;

    if (!knowledgeFtIndex) {
      try {
        await sequelize.query(
          "ALTER TABLE knowledge_documents ADD FULLTEXT INDEX ft_knowledge_documents (title, content_text, tags) WITH PARSER ngram",
        );
        console.log("Created FULLTEXT index ft_knowledge_documents on knowledge_documents");
      } catch (err: any) {
        if (!err.message?.includes("Duplicate")) {
          console.warn("Failed to create FULLTEXT index on knowledge_documents:", err.message);
        }
      }
    }

    // 确保 posts.images 字段存在（避免全量 alter 触发索引数量上限）
    const [imageColumn] = (await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'posts'
         AND COLUMN_NAME = 'images'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ COLUMN_NAME: string }>;

    if (!imageColumn) {
      await sequelize.query("ALTER TABLE posts ADD COLUMN images TEXT NULL");
    }

    // 确保 questions 表有 like_count / dislike_count 字段
    const [likeCol] = (await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'questions'
         AND COLUMN_NAME = 'like_count'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ COLUMN_NAME: string }>;

    if (!likeCol) {
      await sequelize.query("ALTER TABLE questions ADD COLUMN like_count INT NOT NULL DEFAULT 0");
      await sequelize.query("ALTER TABLE questions ADD COLUMN dislike_count INT NOT NULL DEFAULT 0");
      console.log("Added like_count/dislike_count columns to questions table");
    }

    // 可选：初始化管理员账号
    if (process.env.SEED_ADMIN === "true") {
      const result = await seedAdminUsers();
      console.log(
        `Admin seed completed: created=${result.created}, skipped=${result.skipped}`,
      );
    }

    // 初始化默认角色与权限
    const roleResult = await seedRoles();
    console.log(
      `Role seed completed: created=${roleResult.created}, skipped=${roleResult.skipped}`,
    );

    // 可选：初始化仪表盘演示数据
    if (process.env.SEED_DASHBOARD === "true") {
      console.log("Seeding dashboard data...");
      const result = await seedDashboardData();
      console.log(
        `✅ Dashboard seed completed: users=${result.users}, posts=${result.posts}, reports=${result.reports}, adminLogs=${result.adminLogs}`,
      );
    }

    // 初始化题库数据
    if (process.env.SEED_QUESTION_BANK === "true") {
      console.log("Seeding question bank data...");
      const qbResult = await seedQuestionBank();
      console.log(
        `Question bank seed completed: created=${qbResult.created}, skipped=${qbResult.skipped}`,
      );
    }

    return sequelize;
  } catch (error) {
    console.error("MySQL connection failed:", error);
    process.exit(1);
  }
};

export default sequelize;
