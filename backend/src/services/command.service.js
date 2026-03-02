const redis  = require("../config/redis");
const db     = require("../models");
const logger = require("../utils/logger");

const COMMAND_QUEUE_KEY = "cmd:queue";

/**
 * Queue a command with safety checks
 */
exports.sendCommand = async ({ deviceId, commandName, issuedBy, otpVerified = false }) => {
  // Check global kill-switch
  const ignCtrl = await db.SystemControl.findOne({ where: { key: "IGNITION_COMMANDS_ENABLED" } });
  if (ignCtrl && ignCtrl.value === "false" && ["IGNITION_OFF","IGNITION_ON"].includes(commandName)) {
    throw new Error("Ignition commands are globally disabled by admin");
  }

  const device = await db.Device.findByPk(deviceId, {
    include: [{ model: db.DeviceModel, as: "model" }]
  });
  if (!device) throw new Error("Device not found");
  if (device.status === "SUSPENDED") throw new Error("Device is suspended");

  const template = await db.DeviceCommandTemplate.findOne({
    where: { command_name: commandName, model_id: device.model_id }
  });
  if (!template) throw new Error(`Command ${commandName} not supported for this device model`);
  if (template.requires_otp && !otpVerified) throw new Error("OTP verification required for this command");

  // Speed check for ignition cut
  const liveData = await db.GpsLive.findOne({ where: { device_id: deviceId } });
  if (template.min_speed > 0 && liveData && liveData.speed > template.min_speed) {
    throw new Error(`Cannot execute: vehicle speed ${liveData.speed} km/h exceeds limit ${template.min_speed} km/h`);
  }
  if (template.requires_ignition_off && liveData && liveData.ignition) {
    throw new Error("Cannot execute: vehicle ignition must be OFF first");
  }

  // Cooldown check
  const recentCmd = await db.CommandQueue.findOne({
    where: { device_id: deviceId, command_text: commandName, status: { [require("sequelize").Op.in]: ["PENDING","SENT","SUCCESS"] } },
    order: [["createdAt","DESC"]]
  });
  if (recentCmd && template.cooldown_sec > 0) {
    const elapsed = (Date.now() - new Date(recentCmd.createdAt).getTime()) / 1000;
    if (elapsed < template.cooldown_sec) {
      throw new Error(`Cooldown: wait ${Math.ceil(template.cooldown_sec - elapsed)} more seconds`);
    }
  }

  const cmd = await db.CommandQueue.create({
    device_id:    deviceId,
    template_id:  template.id,
    issued_by:    issuedBy,
    command_text: template.command_hex || commandName,
    otp_verified: otpVerified,
    status:       "PENDING",
    max_retries:  3
  });

  // Push to Redis queue for TCP server
  if (redis.client) {
    await redis.client.rPush(COMMAND_QUEUE_KEY, JSON.stringify({
      cmdId:     cmd.id,
      imei:      device.imei,
      command:   template.command_hex || commandName,
      deviceId, commandName
    }));
  }

  logger.info(`[CMD] Queued: ${commandName} → IMEI:${device.imei} by user:${issuedBy}`);
  return cmd;
};

/**
 * Mark command result from TCP server ACK
 */
exports.handleAck = async (cmdId, success, errorMsg = null) => {
  const cmd = await db.CommandQueue.findByPk(cmdId);
  if (!cmd) return;
  await cmd.update({
    status: success ? "SUCCESS" : "FAILED",
    ack_at: new Date(),
    completed_at: new Date(),
    error_msg: errorMsg
  });
  logger.info(`[CMD] ACK: ${cmdId} → ${success ? "SUCCESS" : "FAILED"}`);
};

/**
 * Retry failed commands (called by cron)
 */
exports.retryPending = async () => {
  const { Op } = require("sequelize");
  const cutoff  = new Date(Date.now() - 5 * 60000); // 5 min timeout
  const pending = await db.CommandQueue.findAll({
    where: {
      status: "SENT",
      sent_at: { [Op.lt]: cutoff }
    }
  });
  for (const cmd of pending) {
    if (cmd.retry_count >= cmd.max_retries) {
      await cmd.update({ status: "TIMEOUT" });
      logger.warn(`[CMD] Timeout: ${cmd.id}`);
    } else {
      await cmd.update({ status: "PENDING", retry_count: cmd.retry_count + 1 });
      if (redis.client) {
        const device = await db.Device.findByPk(cmd.device_id);
        await redis.client.rPush(COMMAND_QUEUE_KEY, JSON.stringify({
          cmdId: cmd.id, imei: device?.imei, command: cmd.command_text, retry: true
        }));
      }
    }
  }
};
