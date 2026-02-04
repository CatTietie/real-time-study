import dotenv from "dotenv";
import { sequelize } from "../config/sequelize";
import Permission from "../models/permission.model";
import { PERMISSION_DEFINITIONS } from "../constants/permissions";

dotenv.config();

const seedPermissions = async () => {
  await sequelize.authenticate();

  const existing = await Permission.findAll({
    where: { code: PERMISSION_DEFINITIONS.map((p) => p.code) },
  });

  const existingCodes = new Set(existing.map((p) => p.code));
  const toCreate = PERMISSION_DEFINITIONS.filter(
    (p) => !existingCodes.has(p.code),
  );

  if (toCreate.length > 0) {
    await Permission.bulkCreate(toCreate);
  }

  return {
    created: toCreate.length,
    skipped: PERMISSION_DEFINITIONS.length - toCreate.length,
  };
};

seedPermissions()
  .then((result) => {
    console.log(
      `Permission seed completed: created=${result.created}, skipped=${result.skipped}`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("Permission seed failed:", error);
    process.exit(1);
  });
