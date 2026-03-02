const db = require("../../models");

exports.getBrandingByDomain = async (domain) => {
  if (!domain) return null;
  return db.Branding.findOne({ where: { domain } });
};

exports.getBrandingByTenant = async (tenantId) =>
  db.Branding.findOne({ where: { tenant_id: tenantId } });

exports.updateBranding = async (tenantId, data) => {
  const allowed = ["company_name", "logo_url", "primary_color", "secondary_color", "domain", "support_email"];
  const safe    = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  );
  const [branding] = await db.Branding.upsert(
    { tenant_id: tenantId, ...safe },
    { returning: true }
  );
  return branding;
};
