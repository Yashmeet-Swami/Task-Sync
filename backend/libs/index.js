import ActivityLog from "../models/activity.js";
import logger from "./logger.js";

const recordActivity = async (
  userId,
  action,
  resourceType,
  resourceId,
  details
) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      resourceType,
      resourceId,
      details,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to record activity log");
  }
};

export { recordActivity };