import { hashPassword } from "../utils/password";
import User from "../models/user.model";
import Post from "../models/post.model";
import Report from "../models/report.model";
import AdminLog from "../models/admin-log.model";
import { ActionTypes } from "../services/admin-log.service";

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomDateWithinDays = (days: number) => {
  const now = Date.now();
  const offset = randomInt(0, days * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
};

export const seedDashboardData = async () => {
  const existingUsers = await User.count();
  const usersToCreate = existingUsers >= 10 ? 0 : 10 - existingUsers;

  if (usersToCreate > 0) {
    const hashed = await hashPassword("123456");
    const newUsers = Array.from({ length: usersToCreate }).map((_, index) => ({
      username: `demo_user_${index + 1}`,
      password: hashed,
      nickname: `演示用户${index + 1}`,
      role: "student" as const,
      points: randomInt(0, 500),
      status: 1,
      last_login: randomDateWithinDays(1),
    }));

    await User.bulkCreate(newUsers);
  }

  const users = await User.findAll({ limit: 20, order: [["id", "ASC"]] });

  if (users.length > 0) {
    const existingPosts = await Post.count();
    const postsToCreate = existingPosts >= 30 ? 0 : 30 - existingPosts;

    if (postsToCreate > 0) {
      const posts = Array.from({ length: postsToCreate }).map((_, index) => {
        const createdAt = randomDateWithinDays(1);
        return {
          user_id: users[randomInt(0, users.length - 1)].id,
          title: `演示帖子标题 ${index + 1}`,
          category: ["经验分享", "学习资料", "提问", "活动"][randomInt(0, 3)],
          tags: JSON.stringify(["demo", "sample"]),
          content: `这是演示帖子内容 ${index + 1}，用于仪表盘统计。`,
          status: [0, 1, 2][randomInt(0, 2)],
          publish_status: 1,
          view_count: randomInt(0, 300),
          like_count: randomInt(0, 80),
          comment_count: randomInt(0, 20),
          is_top: 0,
          edit_count: 0,
          createdAt,
          updatedAt: createdAt,
        };
      });

      await Post.bulkCreate(posts as Array<Partial<Post>>);
    }
  }

  const posts = await Post.findAll({ limit: 50, order: [["id", "ASC"]] });

  if (posts.length > 0 && users.length > 0) {
    const existingReports = await Report.count();
    const reportsToCreate = existingReports >= 15 ? 0 : 15 - existingReports;

    if (reportsToCreate > 0) {
      const reports = Array.from({ length: reportsToCreate }).map(
        (_, index) => {
          const createdAt = randomDateWithinDays(1);
          const handled = Math.random() > 0.5;
          return {
            reporter_id: users[randomInt(0, users.length - 1)].id,
            target_type: "post" as const,
            target_id: posts[randomInt(0, posts.length - 1)].id,
            reason: `演示举报原因 ${index + 1}`,
            status: handled ? 1 : 0,
            handle_result: handled ? "已处理" : undefined,
            handler_admin_id: handled ? users[0].id : undefined,
            handled_at: handled ? createdAt : undefined,
            createdAt,
          };
        },
      );

      await Report.bulkCreate(reports as Array<Partial<Report>>);
    }
  }

  const existingLogs = await AdminLog.count();
  const logsToCreate = existingLogs >= 10 ? 0 : 10 - existingLogs;

  if (logsToCreate > 0 && users.length > 0) {
    const adminId = users[0].id;
    const logs = Array.from({ length: logsToCreate }).map(() => {
      const createdAt = randomDateWithinDays(1);
      const actionPool = [
        ActionTypes.POST_REVIEW,
        ActionTypes.REPORT_HANDLE,
        ActionTypes.USER_BAN,
      ];
      return {
        admin_id: adminId,
        action_type: actionPool[randomInt(0, actionPool.length - 1)],
        target_table: "posts",
        target_id: posts[0]?.id || 1,
        detail: "演示后台操作记录",
        ip_address: "127.0.0.1",
        createdAt,
      };
    });

    await AdminLog.bulkCreate(logs as Array<Partial<AdminLog>>);
  }

  return {
    users: await User.count(),
    posts: await Post.count(),
    reports: await Report.count(),
    adminLogs: await AdminLog.count(),
  };
};
