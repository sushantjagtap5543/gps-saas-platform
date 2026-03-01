const service = require("./branding.service");

exports.getBranding = async (req, res) => {
  const domain = req.headers.host;
  const branding = await service.getBrandingByDomain(domain);
  res.json(branding);
};

exports.updateBranding = async (req, res) => {
  const result = await service.updateBranding(
    req.user.tenant_id,
    req.body
  );
  res.json(result);
};