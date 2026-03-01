const PDFDocument = require("pdfkit");
const fs   = require("fs");
const path = require("path");

async function generateInvoice(invoice) {
  const dir  = path.join(__dirname, "../../invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return new Promise((resolve, reject) => {
    const doc  = new PDFDocument({ margin: 50 });
    const file = path.join(dir, (invoice.id || Date.now()) + ".pdf");
    const stream = fs.createWriteStream(file);
    doc.pipe(stream);

    doc.fontSize(22).text("GPS TRACKING INVOICE", { align: "center" });
    doc.moveDown();
    doc.fontSize(12)
      .text("Invoice #: "  + (invoice.invoice_number || "N/A"))
      .text("Date: "       + new Date().toLocaleDateString())
      .text("Customer: "   + (invoice.customer_name  || "N/A"))
      .text("Plan: "       + (invoice.plan_name      || "N/A"))
      .text("Amount: ₹"    + ((invoice.amount || 0)  / 100).toFixed(2))
      .text("Status: PAID");

    doc.end();
    stream.on("finish", () => resolve(file));
    stream.on("error",  reject);
  });
}

module.exports = { generateInvoice };
