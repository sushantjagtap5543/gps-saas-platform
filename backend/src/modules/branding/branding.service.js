const db = require("../../models");

exports.getBrandingByDomain = async (domain) => db.Branding.findOne({ where: { domain } });
exports.getBrandingByTenant = async (tenantId) => db.Branding.findOne({ where: { tenant_id: tenantId } });
exports.updateBranding = async (tenantId, data) => {
  const [branding] = await db.Branding.upsert({ tenant_id: tenantId, ...data }, { returning: true });
  return branding;
};
