import dotenv from "dotenv";
import { sequelize } from "../config/sequelize";
import User from "../models/user.model";
import Post from "../models/post.model";
import { hashPassword } from "../utils/password";

dotenv.config();

const categories = ["学习心得", "问题求助", "经验分享", "聊天交友"];

const seedCommunitySample = async () => {
  await sequelize.authenticate();

  const sampleUsers = [
    { username: "student01", nickname: "学生一号" },
    { username: "student02", nickname: "学生二号" },
    { username: "student03", nickname: "学生三号" },
    { username: "student04", nickname: "学生四号" },
    { username: "student05", nickname: "学生五号" },
  ];

  const existingUsers = await User.findAll({
    where: { username: sampleUsers.map((u) => u.username) },
  });
  const existingUsernames = new Set(existingUsers.map((u) => u.username));

  const passwordHash = await hashPassword("123456");

  const usersToCreate = sampleUsers
    .filter((u) => !existingUsernames.has(u.username))
    .map((u) => ({
      username: u.username,
      password: passwordHash,
      nickname: u.nickname,
      role: "student" as const,
      status: 1,
      points: Math.floor(Math.random() * 200) + 20,
      last_login: new Date(),
    }));

  if (usersToCreate.length) {
    await User.bulkCreate(usersToCreate);
  }

  const users = await User.findAll({
    where: { username: sampleUsers.map((u) => u.username) },
  });

  const existingPosts = await Post.count({
    where: { user_id: users.map((u) => u.id) },
  });

  const postsToCreate = Math.max(0, 10 - existingPosts);
  const posts = Array.from({ length: postsToCreate }).map((_, index) => {
    const user = users[index % users.length];
    const createdAt = new Date(Date.now() - index * 3600 * 1000);
    return {
      user_id: user.id,
      title: `模拟帖子标题 ${index + 1}`,
      category: categories[index % categories.length],
      tags: JSON.stringify(["demo", "sample"]),
      content: `这是模拟帖子内容 ${index + 1}，用于社区展示。`,
      status: 1,
      publish_status: 1,
      view_count: Math.floor(Math.random() * 200),
      like_count: Math.floor(Math.random() * 50),
      comment_count: Math.floor(Math.random() * 20),
      is_top: 0,
      edit_count: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });

  if (posts.length) {
    await Post.bulkCreate(posts as Array<Partial<Post>>);
  }

  return {
    users: users.length,
    posts: posts.length,
  };
};

seedCommunitySample()
  .then((result) => {
    console.log(
      `Community sample seed completed: users=${result.users}, posts=${result.posts}`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("Community sample seed failed:", error);
    process.exit(1);
  });
