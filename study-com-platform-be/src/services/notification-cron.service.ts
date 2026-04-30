import cron from 'node-cron';
import { Op } from 'sequelize';
import RoomReservation from '../models/room-reservation.model';
import StudyRoom from '../models/study-room.model';
import Notification from '../models/notification.model';
import { log } from '../utils/logger';

interface ReminderSent {
  [key: string]: boolean;
}

const remindersSent: ReminderSent = {
  '30min': false,
  '1hour': false,
  '15min_before_end': false
};

export const checkReservationReminders = async () => {
  try {
    const now = new Date();
    
    // 计算时间范围
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const fifteenMinutesBeforeEnd = new Date(now.getTime() + 15 * 60 * 1000);
    
    // 获取需要提醒的预约（开始前30分钟和1小时）
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
      
      // 生成唯一的提醒key
      const reminderKey30min = `${reservationData.id}_30min`;
      const reminderKey1hour = `${reservationData.id}_1hour`;
      
      // 30分钟提醒
      if (minutesUntilStart <= 30 && minutesUntilStart > 0) {
        const existingReminder = await Notification.findOne({
          where: {
            user_id: reservationData.user_id,
            reservation_id: reservationData.id,
            notification_type: 'reservation_start',
            metadata: { reminder_type: '30min' }
          }
        });
        
        if (!existingReminder) {
          await Notification.createReservationReminder(
            reservationData.user_id,
            '自习室预约即将开始',
            `您预约的自习室"${(reservationData as any).StudyRoom?.name || '未知'}"将在30分钟后开始，请准时前往。`,
            reservationData.id,
            'reservation_start',
            {
              reminder_type: '30min',
              minutes_until_start: minutesUntilStart,
              room_name: (reservationData as any).StudyRoom?.name,
              room_location: (reservationData as any).StudyRoom?.location,
              start_time: reservationData.start_time,
              end_time: reservationData.end_time
            }
          );
          log(`[预约提醒] 已发送30分钟提醒: 用户ID ${reservationData.user_id}, 预约ID ${reservationData.id}`);
        }
      }
      
      // 1小时提醒
      if (minutesUntilStart <= 60 && minutesUntilStart > 30) {
        const existingReminder = await Notification.findOne({
          where: {
            user_id: reservationData.user_id,
            reservation_id: reservationData.id,
            notification_type: 'reservation_start',
            metadata: { reminder_type: '1hour' }
          }
        });
        
        if (!existingReminder) {
          await Notification.createReservationReminder(
            reservationData.user_id,
            '自习室预约即将开始',
            `您预约的自习室"${(reservationData as any).StudyRoom?.name || '未知'}"将在1小时后开始，请提前做好准备。`,
            reservationData.id,
            'reservation_start',
            {
              reminder_type: '1hour',
              minutes_until_start: minutesUntilStart,
              room_name: (reservationData as any).StudyRoom?.name,
              room_location: (reservationData as any).StudyRoom?.location,
              start_time: reservationData.start_time,
              end_time: reservationData.end_time
            }
          );
          log(`[预约提醒] 已发送1小时提醒: 用户ID ${reservationData.user_id}, 预约ID ${reservationData.id}`);
        }
      }
    }
    
    // 检查即将结束的预约（结束前15分钟提醒可续期）
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
      
      // 15分钟前提醒可续期
      if (minutesUntilEnd <= 15 && minutesUntilEnd > 0) {
        const existingReminder = await Notification.findOne({
          where: {
            user_id: reservationData.user_id,
            reservation_id: reservationData.id,
            notification_type: 'reservation_renewal'
          }
        });
        
        if (!existingReminder) {
          await Notification.createReservationReminder(
            reservationData.user_id,
            '自习室预约即将结束',
            `您在自习室"${(reservationData as any).StudyRoom?.name || '未知'}"的预约将在${minutesUntilEnd}分钟后结束，如需继续使用可进行续期。`,
            reservationData.id,
            'reservation_renewal',
            {
              reminder_type: '15min_before_end',
              minutes_until_end: minutesUntilEnd,
              room_name: (reservationData as any).StudyRoom?.name,
              room_location: (reservationData as any).StudyRoom?.location,
              start_time: reservationData.start_time,
              end_time: reservationData.end_time,
              current_status: reservationData.status
            }
          );
          log(`[续期提醒] 已发送15分钟前提醒: 用户ID ${reservationData.user_id}, 预约ID ${reservationData.id}`);
        }
      }
    }
    
  } catch (error) {
    log(`[预约提醒任务] 执行失败: ${error}`);
    console.error('预约提醒任务执行失败:', error);
  }
};

export const initNotificationCron = () => {
  // 每分钟执行一次
  const task = cron.schedule('* * * * *', async () => {
    log('[预约提醒任务] 开始执行定时检查...');
    await checkReservationReminders();
  });
  
  log('[预约提醒任务] 已启动，每分钟执行一次');
  
  // 启动时立即执行一次
  checkReservationReminders();
  
  return task;
};

export default initNotificationCron;
