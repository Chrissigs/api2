const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3003;

app.use(bodyParser.json());

app.post('/generate-certified-copy', (req, res) => {
    const { legal_name, tin, nationality, date } = req.body;

    if (!legal_name || !tin) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const doc = new PDFDocument();
    const filename = 'certified_copy.pdf';
    const stream = fs.createWriteStream(filename);

    doc.pipe(stream);

    // Header
    doc.fontSize(25).text('CERTIFIED COPY', { align: 'center' });
    doc.moveDown();

    // Content
    doc.fontSize(12).text(`This document certifies the identity of:`);
    doc.moveDown();
    doc.text(`Legal Name: ${legal_name}`);
    doc.text(`TIN: ${tin}`);
    doc.text(`Nationality: ${nationality}`);
    doc.text(`Date of Issue: ${date || new Date().toISOString().split('T')[0]}`);

    doc.moveDown(2);

    // Stamp
    doc.circle(300, 400, 50)
        .lineWidth(3)
        .strokeColor('red')
        .stroke();

    doc.fontSize(10).fillColor('red')
        .text('OFFICIAL', 275, 390)
        .text('STAMP', 280, 405);

    doc.end();

    stream.on('finish', () => {
        res.json({ status: 'SUCCESS', file: filename });
    });
});

app.listen(PORT, () => {
    console.log(`Paper Generator Service running on port ${PORT}`);
});
