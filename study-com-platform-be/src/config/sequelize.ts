// Sequelize 实例集中导出，避免循环依赖
import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  process.env.DB_NAME || "study_platform",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "root",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    timezone: "+08:00", // 设置为中国时区
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      charset: "utf8mb4",
      dateStrings: true,
      typeCast: true,
    },
  },
);

export default sequelize;
