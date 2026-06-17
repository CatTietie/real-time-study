import { Op, fn, col, literal } from "sequelize";
import UserLoginLog from "../models/user-login-log.model";
import { resolveProvince } from "../utils/ip2province";

export async function recordLoginLog(userId: number, ip: string): Promise<void> {
  const province = resolveProvince(ip);
  await UserLoginLog.create({ user_id: userId, ip, province });
}

export async function getProvinceHeatmapData(
  hours: number = 24
): Promise<Array<{ name: string; value: number }>> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const results = (await UserLoginLog.findAll({
    attributes: [
      "province",
      [fn("COUNT", fn("DISTINCT", col("user_id"))), "value"],
    ],
    where: {
      province: { [Op.ne]: null },
      created_at: { [Op.gte]: since },
    },
    group: ["province"],
    raw: true,
  })) as unknown as Array<{ province: string; value: number }>;

  return results.map((r) => ({ name: r.province, value: Number(r.value) }));
}
