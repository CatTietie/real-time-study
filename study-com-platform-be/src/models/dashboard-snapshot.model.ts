import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface DashboardSnapshotAttributes {
  id: number;
  snapshot_data: string;
  created_at: Date;
}

interface DashboardSnapshotCreationAttributes
  extends Optional<DashboardSnapshotAttributes, "id" | "created_at"> {}

class DashboardSnapshot
  extends Model<DashboardSnapshotAttributes, DashboardSnapshotCreationAttributes>
  implements DashboardSnapshotAttributes
{
  public id!: number;
  public snapshot_data!: string;
  public created_at!: Date;
}

DashboardSnapshot.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    snapshot_data: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "dashboard_snapshots",
    timestamps: false,
    indexes: [{ fields: ["created_at"] }],
  }
);

export default DashboardSnapshot;
