const PDFDocument = require('pdfkit');
const fs = require('fs');

async function generateInvoice(invoice) {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(`invoices/${invoice.id}.pdf`));

    doc.fontSize(20).text("GPS TRACKING INVOICE");
    doc.text(`Invoice #: ${invoice.invoice_number}`);
    doc.text(`Amount: ${invoice.amount}`);

    doc.end();
}

module.exports = { generateInvoice };