import dotenv from "dotenv";
import { sequelize } from "../config/sequelize";
import User from "../models/user.model";
import { hashPassword } from "../utils/password";

dotenv.config();

const seedStudent = async () => {
  await sequelize.authenticate();

  const username = "student_demo";
  const password = "123456";

  const passwordHash = await hashPassword(password);
  const existing = await User.findOne({ where: { username } });
  if (existing) {
    await existing.update({
      password: passwordHash,
      nickname: "学生体验账号",
      role: "student",
      status: 1,
      last_login: new Date(),
    });
    return { created: false, username };
  }

  await User.create({
    username,
    password: passwordHash,
    nickname: "学生体验账号",
    role: "student",
    status: 1,
    points: 20,
    last_login: new Date(),
  });

  return { created: true, username };
};

seedStudent()
  .then((result) => {
    console.log(
      `Student seed completed: ${result.created ? "created" : "exists"} (${result.username})`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("Student seed failed:", error);
    process.exit(1);
  });
