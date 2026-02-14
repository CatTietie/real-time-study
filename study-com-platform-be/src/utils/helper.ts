/**
 * 辅助工具函数
 * 包含用户等级计算、时间处理等通用功能
 */

/**
 * 根据积分计算用户等级
 * @param points 积分值
 * @returns 用户等级（1-7级）
 */
export const calculateLevel = (points: number): number => {
  if (points < 100) return 1;
  if (points < 500) return 2;
  if (points < 1000) return 3;
  if (points < 2000) return 4;
  if (points < 5000) return 5;
  if (points < 10000) return 6;
  return 7;
};

/**
 * 获取当天开始时间（00:00:00）
 * @returns 当天开始的Date对象
 */
export const getStartOfDay = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * 获取本周开始时间（周一 00:00:00）
 * @returns 本周周一的Date对象
 */
export const getStartOfWeek = (): Date => {
  const date = new Date();
  // 获取当前星期几（0-6，0表示周日）
  const day = date.getDay();
  // 计算到周一的偏移量（如果是周日则偏移-6天，其他天数偏移 -day + 1 天）
  const offset = day === 0 ? -6 : -day + 1;
  date.setDate(date.getDate() + offset);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * 获取本周结束时间（周日 23:59:59）
 * @returns 本周日的Date对象
 */
export const getEndOfWeek = (): Date => {
  const date = new Date();
  // 获取当前星期几（0-6，0表示周日）
  const day = date.getDay();
  // 计算到周日的偏移量
  const offset = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + offset);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss
 * @param date 日期对象
 * @returns 格式化后的字符串
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 检查日期是否在指定日期范围内
 * @param date 要检查的日期
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 是否在范围内
 */
export const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  return date >= startDate && date <= endDate;
};