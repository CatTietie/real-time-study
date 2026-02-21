import User from "../models/user.model";
import { hashPassword } from "../utils/password";

export const seedAdminUsers = async () => {
  const seedPassword = process.env.ADMIN_SEED_PASSWORD || "123456";
  const admins = [
    { username: "superadmin01", nickname: "超级管理员1", role: "super_admin" },
    { username: "superadmin02", nickname: "超级管理员2", role: "super_admin" },
    { username: "superadmin03", nickname: "超级管理员3", role: "super_admin" },
    { username: "admin01", nickname: "管理员A", role: "admin" },
    { username: "admin02", nickname: "管理员B", role: "admin" },
    { username: "admin03", nickname: "管理员C", role: "admin" },
  ];

  let created = 0;
  let skipped = 0;

  for (const admin of admins) {
    const existing = await User.findOne({
      where: { username: admin.username },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const hashed = await hashPassword(seedPassword);
    await User.create({
      username: admin.username,
      password: hashed,
      nickname: admin.nickname,
      role: admin.role as 'admin' | 'student' | 'super_admin',
      status: 1,
      points: 0,
    });
    created += 1;
  }

  return { created, skipped };
};
