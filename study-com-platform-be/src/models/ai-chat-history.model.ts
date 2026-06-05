import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize";

class AiChatHistory extends Model {
  public id!: number;
  public user_id!: number;
  public post_id!: number;
  public question!: string;
  public answer!: string;
  public prompt_tokens!: number;
  public completion_tokens!: number;
  public total_tokens!: number;
  public model!: string;
  public feedback!: "helpful" | "unhelpful" | null;
  public sources_json!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AiChatHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    prompt_tokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    completion_tokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_tokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    model: {
      type: DataTypes.STRING(50),
      defaultValue: "deepseek-chat",
    },
    feedback: {
      type: DataTypes.ENUM("helpful", "unhelpful"),
      allowNull: true,
      defaultValue: null,
    },
    sources_json: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: "ai_chat_history",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["user_id", "post_id"] },
      { fields: ["created_at"] },
    ],
  }
);

export default AiChatHistory;
