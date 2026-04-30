import cron from 'node-cron';
import { Op } from 'sequelize';
import RoomReservation from '../models/room-reservation.model';
import StudyRoom from '../models/study-room.model';
import Notification from '../models/notification.model';
import { log } from '../utils/logger';

interface SentReminderKey {
  [key: string]: boolean;
}

const sentReminders: SentReminderKey = {};

export const checkReservationReminders = async () => {
  try {
    const now = new Date();
    
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const fifteenMinutesBeforeEnd = new Date(now.getTime() + 15 * 60 * 1000);
    
    const reservationsStartingSoon = await RoomReservation.findAll({
      where: {
        status: 'confirmed',
        start_time: {
          [Op.or]: [
            { [Op.between]: [now, thirtyMinutesLater] },
            { [Op.between]: [thirtyMinutesLater, oneHourLater] }
          ]
        }
      },
      include: [{
        model: StudyRoom,
        attributes: ['id', 'name', 'location']
      }]
    });
    
    for (const reservation of reservationsStartingSoon) {
      const reservationData = reservation.toJSON();
      const startTime = new Date(reservationData.start_time);
      const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / (60 * 1000));
      
      if (minutesUntilStart <= 0) continue;
      
      const roomName = (reservationData as any).StudyRoom?.name || '未知';
      const roomLocation = (reservationData as any).StudyRoom?.location;
      
      let reminderType: string;
      let reminderKey: string;
      let message: string;
      
      if (minutesUntilStart <= 30) {
        reminderType = 'start_30min';
        reminderKey = `${reservationData.id}_start_30min`;
        
        if (minutesUntilStart <= 1) {
          message = `您预约的自习室"${roomName}"即将开始，请准时前往。`;
        } else {
          message = `您预约的自习室"${roomName}"将在${minutesUntilStart}分钟后开始，请准时前往。`;
        }
      } else if (minutesUntilStart <= 60) {
        reminderType = 'start_60min';
        reminderKey = `${reservationData.id}_start_60min`;
        
        message = `您预约的自习室"${roomName}"将在${minutesUntilStart}分钟后开始，请提前做好准备。`;
      } else {
        continue;
      }
      
      if (sentReminders[reminderKey]) {
        continue;
      }
      
      const existingReminder = await Notification.findOne({
        where: {
          user_id: reservationData.user_id,
          reservation_id: reservationData.id,
          notification_type: 'reservation_start'
        }
      });
      
      if (existingReminder) {
        const existingMetadata = existingReminder.metadata as any;
        if (existingMetadata?.reminder_type === reminderType) {
          sentReminders[reminderKey] = true;
          continue;
        }
        
        if (minutesUntilStart <= 30 && existingMetadata?.reminder_type === 'start_60min') {
        } else {
          sentReminders[reminderKey] = true;
          continue;
        }
      }
      
      await Notification.createReservationReminder(
        reservationData.user_id,
        '自习室预约即将开始',
        message,
        reservationData.id,
        'reservation_start',
        {
          reminder_type: reminderType,
          minutes_until_start: minutesUntilStart,
          room_name: roomName,
          room_location: roomLocation,
          start_time: reservationData.start_time,
          end_time: reservationData.end_time
        }
      );
      
      sentReminders[reminderKey] = true;
      log(`[预约提醒] 已发送提醒: 用户ID ${reservationData.user_id}, 预约ID ${reservationData.id}, 类型: ${reminderType}, 剩余${minutesUntilStart}分钟`);
    }
    
    const reservationsEndingSoon = await RoomReservation.findAll({
      where: {
        status: { [Op.in]: ['confirmed', 'in_progress'] },
        end_time: {
          [Op.between]: [now, fifteenMinutesBeforeEnd]
        }
      },
      include: [{
        model: StudyRoom,
        attributes: ['id', 'name', 'location']
      }]
    });
    
    for (const reservation of reservationsEndingSoon) {
      const reservationData = reservation.toJSON();
      const endTime = new Date(reservationData.end_time);
      const minutesUntilEnd = Math.floor((endTime.getTime() - now.getTime()) / (60 * 1000));
      
      if (minutesUntilEnd <= 0 || minutesUntilEnd > 15) continue;
      
      const reminderKey = `${reservationData.id}_renewal`;
      
      if (sentReminders[reminderKey]) {
        continue;
      }
      
      const existingReminder = await Notification.findOne({
        where: {
          user_id: reservationData.user_id,
          reservation_id: reservationData.id,
          notification_type: 'reservation_renewal'
        }
      });
      
      if (existingReminder) {
        sentReminders[reminderKey] = true;
        continue;
      }
      
      const roomName = (reservationData as any).StudyRoom?.name || '未知';
      
      await Notification.createReservationReminder(
        reservationData.user_id,
        '自习室预约即将结束',
        `您在自习室"${roomName}"的预约将在${minutesUntilEnd}分钟后结束，如需继续使用可进行续期。`,
        reservationData.id,
        'reservation_renewal',
        {
          reminder_type: 'renewal_15min',
          minutes_until_end: minutesUntilEnd,
          room_name: roomName,
          room_location: (reservationData as any).StudyRoom?.location,
          start_time: reservationData.start_time,
          end_time: reservationData.end_time,
          current_status: reservationData.status
        }
      );
      
      sentReminders[reminderKey] = true;
      log(`[续期提醒] 已发送提醒: 用户ID ${reservationData.user_id}, 预约ID ${reservationData.id}, 剩余${minutesUntilEnd}分钟`);
    }
    
  } catch (error) {
    log(`[预约提醒任务] 执行失败: ${error}`);
    console.error('预约提醒任务执行失败:', error);
  }
};

export const initNotificationCron = () => {
  const task = cron.schedule('* * * * *', async () => {
    log('[预约提醒任务] 开始执行定时检查...');
    await checkReservationReminders();
  });
  
  log('[预约提醒任务] 已启动，每分钟执行一次');
  
  checkReservationReminders();
  
  return task;
};

export default initNotificationCron;
