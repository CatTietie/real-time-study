import { Request, Response } from "express";
import StudyRoom from "../models/study-room.model";
import User from "../models/user.model";
import RoomRecording from "../models/room-recording.model";
import { getVideoRoomParticipants } from "../services/video-study-room-realtime.service";
import { uploadRecordingToOss } from "../middlewares/upload.middleware";

export const createVideoStudyRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      name,
      description,
      max_participants = 9,
      pomodoro_focus_duration = 25,
      pomodoro_break_duration = 5,
      pomodoro_rounds = 4,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "房间名称不能为空" });
    }

    if (max_participants < 2 || max_participants > 9) {
      return res.status(400).json({ success: false, message: "参与人数需在2-9之间" });
    }

    const room = await StudyRoom.create({
      name: name.trim(),
      description: description || "",
      type: "video",
      capacity: max_participants,
      max_participants,
      owner_id: userId,
      pomodoro_focus_duration,
      pomodoro_break_duration,
      pomodoro_rounds,
      status: "active",
      is_active: true,
    });

    res.status(201).json({
      success: true,
      message: "视频自习室创建成功",
      data: room,
    });
  } catch (error: any) {
    console.error("创建视频自习室失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVideoStudyRooms = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const where: any = { type: "video", is_active: true };
    if (keyword) {
      const { Op } = require("sequelize");
      where.name = { [Op.like]: `%${keyword}%` };
    }

    const { count, rows } = await StudyRoom.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "Owner",
          attributes: ["id", "username", "nickname", "avatar"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: Number(pageSize),
      offset,
    });

    const roomsWithOnline = rows.map((room) => {
      const roomJson: any = room.toJSON();
      const participants = getVideoRoomParticipants(room.id);
      roomJson.online_count = participants.length;
      return roomJson;
    });

    res.json({
      success: true,
      data: roomsWithOnline,
      pagination: {
        total: count,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(count / Number(pageSize)),
      },
    });
  } catch (error: any) {
    console.error("获取视频自习室列表失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVideoStudyRoomDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const room = await StudyRoom.findOne({
      where: { id, type: "video" },
      include: [
        {
          model: User,
          as: "Owner",
          attributes: ["id", "username", "nickname", "avatar"],
        },
      ],
    });

    if (!room) {
      return res.status(404).json({ success: false, message: "房间不存在" });
    }

    const roomJson: any = room.toJSON();
    roomJson.participants = getVideoRoomParticipants(room.id);
    roomJson.online_count = roomJson.participants.length;

    res.json({ success: true, data: roomJson });
  } catch (error: any) {
    console.error("获取视频自习室详情失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const closeVideoStudyRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const room = await StudyRoom.findOne({ where: { id, type: "video" } });
    if (!room) {
      return res.status(404).json({ success: false, message: "房间不存在" });
    }

    if (room.owner_id !== userId) {
      return res.status(403).json({ success: false, message: "仅房主可关闭房间" });
    }

    await room.update({ is_active: false, status: "closed" });

    res.json({ success: true, message: "房间已关闭" });
  } catch (error: any) {
    console.error("关闭视频自习室失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateVideoStudyRoomConfig = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { pomodoro_focus_duration, pomodoro_break_duration, pomodoro_rounds } = req.body;

    const room = await StudyRoom.findOne({ where: { id, type: "video" } });
    if (!room) {
      return res.status(404).json({ success: false, message: "房间不存在" });
    }

    if (room.owner_id !== userId) {
      return res.status(403).json({ success: false, message: "仅房主可修改配置" });
    }

    const updates: any = {};
    if (pomodoro_focus_duration !== undefined) updates.pomodoro_focus_duration = pomodoro_focus_duration;
    if (pomodoro_break_duration !== undefined) updates.pomodoro_break_duration = pomodoro_break_duration;
    if (pomodoro_rounds !== undefined) updates.pomodoro_rounds = pomodoro_rounds;

    await room.update(updates);

    res.json({ success: true, message: "配置更新成功", data: room });
  } catch (error: any) {
    console.error("更新视频自习室配置失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadRecording = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { roomId } = req.params;
    const { title, duration } = req.body;

    const room = await StudyRoom.findOne({ where: { id: roomId, type: "video" } });
    if (!room) {
      return res.status(404).json({ success: false, message: "房间不存在" });
    }

    const fileResult = await uploadRecordingToOss(req);
    if (!fileResult) {
      return res.status(400).json({ success: false, message: "未上传录制文件" });
    }

    const recording = await RoomRecording.create({
      room_id: Number(roomId),
      recorder_user_id: userId,
      title: title || `录制 ${new Date().toLocaleString("zh-CN")}`,
      file_url: fileResult.file_url,
      file_size: fileResult.file_size,
      duration: Number(duration) || 0,
      mime_type: (req as any).file?.mimetype || "video/webm",
      status: "ready",
    });

    res.status(201).json({ success: true, data: recording });
  } catch (error: any) {
    console.error("上传录制文件失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoomRecordings = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const { count, rows } = await RoomRecording.findAndCountAll({
      where: { room_id: roomId, status: "ready" },
      include: [
        {
          model: User,
          as: "Recorder",
          attributes: ["id", "username", "nickname", "avatar"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: Number(pageSize),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(count / Number(pageSize)),
      },
    });
  } catch (error: any) {
    console.error("获取录制列表失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRecording = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { recordingId } = req.params;

    const recording = await RoomRecording.findByPk(recordingId);
    if (!recording) {
      return res.status(404).json({ success: false, message: "录制记录不存在" });
    }

    if (recording.recorder_user_id !== userId) {
      return res.status(403).json({ success: false, message: "仅录制者可删除" });
    }

    await recording.destroy();
    res.json({ success: true, message: "删除成功" });
  } catch (error: any) {
    console.error("删除录制记录失败:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
