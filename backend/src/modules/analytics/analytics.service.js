const db = require("../../models");

exports.getFleetStats = async (tenantId) => {

  return await db.Analytics.findAll({
    where: { tenant_id: tenantId }
  });
};