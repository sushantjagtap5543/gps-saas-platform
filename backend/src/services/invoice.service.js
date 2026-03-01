const PDFDocument = require("pdfkit");
const fs   = require("fs");
const path = require("path");

async function generateInvoice(invoice) {
  const dir = path.join(__dirname, "../../invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return new Promise((resolve, reject) => {
    const doc  = new PDFDocument({ margin: 50 });
    const file = path.join(dir, invoice.id + ".pdf");
    doc.pipe(fs.createWriteStream(file));
    doc.fontSize(22).text("GPS TRACKING INVOICE", { align: "center" });
    doc.moveDown();
    doc.fontSize(12)
      .text("Invoice #: " + invoice.invoice_number)
      .text("Date: " + new Date().toLocaleDateString())
      .text("Customer: " + (invoice.customer_name || "N/A"))
      .text("Plan: " + (invoice.plan_name || "N/A"))
      .text("Amount: Rs. " + ((invoice.amount || 0) / 100).toFixed(2))
      .text("Status: PAID");
    doc.end();
    doc.on("end", () => resolve(file));
    doc.on("error", reject);
  });
}

module.exports = { generateInvoice };
