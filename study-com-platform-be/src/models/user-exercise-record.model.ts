import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface UserExerciseRecordAttributes {
  id: number;
  user_id: number;
  bank_id: number;
  score: number;
  total_score: number;
  start_time: Date;
  submit_time?: Date;
  mode: string;
  status: number;
  created_at: Date;
  updated_at: Date;
}

interface UserExerciseRecordCreationAttributes
  extends Optional<UserExerciseRecordAttributes, "id" | "created_at" | "updated_at" | "score" | "total_score" | "submit_time" | "status"> {}

class UserExerciseRecord
  extends Model<UserExerciseRecordAttributes, UserExerciseRecordCreationAttributes>
  implements UserExerciseRecordAttributes
{
  public id!: number;
  public user_id!: number;
  public bank_id!: number;
  public score!: number;
  public total_score!: number;
  public start_time!: Date;
  public submit_time?: Date;
  public mode!: string;
  public status!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserExerciseRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "用户ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    bank_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "题库ID",
      references: {
        model: "question_banks",
        key: "id",
      },
    },
    score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "得分",
    },
    total_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "总分",
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "开始时间",
    },
    submit_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "提交时间",
    },
    mode: {
      type: DataTypes.ENUM("sequential", "random", "simulation", "intelligent"),
      allowNull: false,
      comment: "练习模式：sequential-顺序, random-随机, simulation-模拟考试, intelligent-智能组卷",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: "状态：0-进行中, 1-已完成, 2-已放弃",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "UserExerciseRecord",
    tableName: "user_exercise_records",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["bank_id"] },
      { fields: ["user_id", "bank_id"] },
      { fields: ["start_time"] },
    ],
  },
);

export default UserExerciseRecord;
