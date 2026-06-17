import IP2Region from "ip2region";

let query: InstanceType<typeof IP2Region> | null = null;

function getQuery(): InstanceType<typeof IP2Region> {
  if (!query) {
    query = new IP2Region({ disableIpv6: false });
  }
  return query;
}

export function resolveProvince(ip: string): string | null {
  try {
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") {
      return null;
    }

    const cleanIp = ip.replace(/^::ffff:/, "");
    const result = getQuery().search(cleanIp);
    if (!result || !result.province) {
      return null;
    }

    return result.province.replace(/省|市|自治区|壮族自治区|回族自治区|维吾尔自治区|特别行政区/, "");
  } catch {
    return null;
  }
}
