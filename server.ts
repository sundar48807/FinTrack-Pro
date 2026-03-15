import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Vonage } from '@vonage/server-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/send-sms', async (req, res) => {
    try {
      const { phone, message } = req.body;
      
      if (!process.env.VONAGE_API_KEY || !process.env.VONAGE_API_SECRET) {
        return res.status(500).json({ error: 'Vonage credentials are not configured in environment variables.' });
      }

      const vonage = new Vonage({
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET
      });
      
      const from = process.env.VONAGE_BRAND_NAME || "FinTrack";
      const to = phone.replace(/[^0-9]/g, ''); // Ensure only numbers are passed to Vonage

      await vonage.sms.send({
        to,
        from,
        text: message
      });

      res.json({ success: true, message: 'SMS sent successfully' });
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ error: error.message || 'Failed to send SMS' });
    }
  });

  app.post('/api/send-pdf-email', async (req, res) => {
    try {
      const { email, reportData } = req.body;

      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(500).json({ error: 'SMTP credentials are not configured in environment variables.' });
      }

      // Generate PDF in memory
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      
      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
      });

      // Add content to PDF
      doc.fontSize(24).text('FinTrack Pro - Financial Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Generated on: ${new Date().toLocaleDateString()}`);
      doc.moveDown();
      doc.fontSize(16).text('Summary', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Total Income: $${reportData.income.toFixed(2)}`);
      doc.text(`Total Expenses: $${reportData.expense.toFixed(2)}`);
      doc.text(`Net Balance: $${(reportData.income - reportData.expense).toFixed(2)}`);
      doc.moveDown();
      doc.fontSize(16).text('Recent Transactions', { underline: true });
      doc.moveDown();
      
      if (reportData.transactions && reportData.transactions.length > 0) {
        reportData.transactions.slice(0, 10).forEach((tx: any) => {
          doc.fontSize(10).text(`${tx.date} - ${tx.category}: $${tx.amount} (${tx.type})`);
        });
      } else {
        doc.fontSize(10).text('No recent transactions.');
      }
      
      doc.end();

      const pdfBuffer = await pdfPromise;

      // Send email
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"FinTrack Pro" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Financial Report',
        text: 'Please find your financial report attached.',
        attachments: [
          {
            filename: 'Financial_Report.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
      console.error('Error sending Email:', error);
      res.status(500).json({ error: error.message || 'Failed to send email' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
