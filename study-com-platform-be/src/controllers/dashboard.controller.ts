import { Request, Response } from "express";
import { getDashboardStats } from "../services/dashboard.service";

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
};
