const roles = [
  "super_admin",
  "reseller",
  "tenant_admin",
  "manager",
  "viewer",
  "driver"
];

module.exports = async (db) => {
  for (const role of roles) {
    await db.Role.findOrCreate({ where: { name: role } });
  }
};