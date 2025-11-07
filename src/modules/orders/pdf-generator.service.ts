import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { OrderWithInvoiceDetails } from './orders.interface';

@Injectable()
export class PdfGeneratorService {
  async generateInvoicePDF(order: OrderWithInvoiceDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
        });

        // Register Noto Sans font for better Unicode support
        try {
          // Try to load Noto Sans font if available
          const fontPath = this.getNotoSansFontPath();
          if (fontPath && fs.existsSync(fontPath)) {
            doc.registerFont('NotoSans', fontPath);
            doc.font('NotoSans');
          } else {
            // Fallback to Helvetica if Noto Sans not available
            doc.font('Helvetica');
          }
        } catch {
          // Fallback to default font
          doc.font('Helvetica');
        }
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header with Order ID and Status
        doc.fontSize(16).text(`Order #${order.id}`, 50, 40);

        // Status badge (simulated with colored background)
        const statusColor = this.getStatusColor(order.bill.status);
        const statusBgColor = this.getStatusBgColor(order.bill.status);
        const statusPosition = this.getStatusPosition(order.bill.status);

        // Draw status badge background
        doc.rect(470, 42, 80, 20).fill(statusBgColor);
        doc
          .fillColor(statusColor)
          .fontSize(10)
          .text(order.bill.status, statusPosition.x, statusPosition.y)
          .fillColor('black');

        doc
          .fontSize(11)
          .fillColor('#666666')
          .text(
            `Order placed on ${order.createdAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}`,
            50,
            70,
          )
          .fillColor('black');

        let yPosition = 110;

        // Order Summary Section
        this.drawSection(doc, 'Order Summary', yPosition);
        yPosition += 25;

        // Order Summary Content in 2 columns
        doc.fontSize(10);

        // Left column
        doc.fillColor('#666666').text('Order ID:', 60, yPosition);
        doc.fillColor('black').text(order.id, 150, yPosition);

        doc.fillColor('#666666').text('Order Date:', 60, yPosition + 20);
        doc.fillColor('black').text(
          new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          150,
          yPosition + 20,
        );

        // Right column
        doc.fillColor('#666666').text('Total Amount:', 350, yPosition);
        doc
          .fontSize(12)
          .fillColor('#16a34a')
          .text(this.formatCurrency(order.totalPrice), 430, yPosition)
          .fillColor('black')
          .fontSize(10);

        doc.fillColor('#666666').text('Status:', 350, yPosition + 20);
        doc.fillColor('black').text(order.bill.status, 430, yPosition + 20);

        yPosition += 70;

        // Customer Information Section
        this.drawSection(doc, 'Customer Information', yPosition);
        yPosition += 25;

        // Customer info in 2 columns
        doc.fontSize(10);

        // Left column
        doc.fillColor('#666666').text('Name:', 60, yPosition);
        doc.fillColor('black').text(order.user.fullname, 150, yPosition);

        doc.fillColor('#666666').text('Email:', 60, yPosition + 20);
        doc.fillColor('black').text(order.user.email, 150, yPosition + 20);

        // Right column
        doc.fillColor('#666666').text('Phone:', 350, yPosition);
        doc.fillColor('black').text(order.user.phone || 'N/A', 430, yPosition);

        doc.fillColor('#666666').text('Address:', 350, yPosition + 20);
        doc.fillColor('black').text(order.user.address || 'N/A', 430, yPosition + 20);

        yPosition += 50;

        // Order Items Section
        this.drawSection(doc, `Order Items (${order.items.length})`, yPosition);
        yPosition += 25;

        // Draw items
        order.items.forEach((item: any, index: number) => {
          // Draw background rectangle for alternating rows
          if (index % 2 === 0) {
            doc.rect(50, yPosition - 5, 500, 50).fill('#f9fafb');
          }

          doc.fillColor('black');

          // Product name
          doc.fontSize(11).text(item.product.name, 60, yPosition, { width: 300 });

          // Quantity and From info
          doc
            .fontSize(9)
            .fillColor('#666666')
            .text(`Quantity: ${item.quantity} | From: ${item.from}`, 60, yPosition + 15);

          // Seller info if available
          if (item.product.seller) {
            doc.text(`Seller: ${item.product.seller.fullname}`, 60, yPosition + 30);
          }

          // Price (right aligned)
          doc
            .fontSize(11)
            .fillColor('black')
            .text(this.formatCurrency(item.price), 470, yPosition, { align: 'right', width: 70 });

          // Unit price
          const unitPrice = item.price / item.quantity;
          doc
            .fontSize(9)
            .fillColor('#666666')
            .text(`${this.formatCurrency(unitPrice)} each`, 470, yPosition + 15, { align: 'right', width: 70 });

          yPosition += 50;
        });

        yPosition += 20;

        // Payment Information Section
        this.drawSection(doc, 'Payment Information', yPosition);
        yPosition += 25;

        // Payment info in 2 columns
        doc.fontSize(10);

        // Left column
        doc.fillColor('#666666').text('Payment Method:', 60, yPosition);
        doc.fillColor('black').text(order.bill.paymentMethod, 180, yPosition);

        doc.fillColor('#666666').text('Transaction ID:', 60, yPosition + 20);
        doc.fillColor('black').text(order.bill.transactionId || 'N/A', 180, yPosition + 20);

        // Right column
        doc.fillColor('#666666').text('Amount:', 350, yPosition);
        doc.fillColor('black').text(this.formatCurrency(order.bill.amount), 430, yPosition);

        doc.fillColor('#666666').text('Payment Status:', 350, yPosition + 20);
        doc.fillColor('black').text(order.bill.status, 430, yPosition + 20);

        // Note if exists
        if (order.bill.note) {
          yPosition += 70;
          doc.fillColor('#666666').text('Note:', 60, yPosition);
          doc.fillColor('black').text(order.bill.note, 60, yPosition + 15, { width: 480 });
        }

        // Footer
        doc
          .fontSize(9)
          .fillColor('#666666')
          .text('Thank you for your business!', 40, doc.page.height - 60, {
            align: 'center',
            width: doc.page.width - 80,
          });

        doc.end();
      } catch {
        reject(new Error('Failed to generate invoice PDF'));
      }
    });
  }

  private drawSection(doc: PDFKit.PDFDocument, title: string, yPosition: number) {
    // Draw section background
    doc.rect(50, yPosition, 500, 20).fill('#f3f4f6');

    // Section title - centered vertically in the background
    doc
      .fillColor('black')
      .fontSize(12)
      .text(title, 60, yPosition + 2);
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'DONE':
        return '#ffffff'; // white text
      case 'PENDING':
        return '#000000'; // black text
      case 'CANCELLED':
        return '#ffffff'; // white text
      case 'REFUNDED':
        return '#ffffff'; // white text
      case 'FAILED':
        return '#ffffff'; // white text
      default:
        return '#000000'; // black text
    }
  }

  private getStatusBgColor(status: string): string {
    switch (status) {
      case 'DONE':
        return '#16a34a'; // green background
      case 'PENDING':
        return '#fbbf24'; // yellow background
      case 'CANCELLED':
        return '#dc2626'; // red background
      case 'REFUNDED':
        return '#2563eb'; // blue background
      case 'FAILED':
        return '#dc2626'; // red background
      default:
        return '#6b7280'; // gray background
    }
  }

  private getStatusPosition(status: string): { x: number; y: number } {
    // Calculate position based on text length to center the text in the badge
    // Badge is 80px wide, positioned at x=468, so center is at 508
    const badgeWidth = 80;
    const badgeX = 468;
    const badgeY = 45;

    // Approximate character width for fontSize 10 with 0.5 spacing between characters
    const charWidth = 6.5;
    const textWidth = status.length * charWidth;
    const textX = badgeX + (badgeWidth - textWidth) / 2;

    return {
      x: Math.round(textX),
      y: badgeY,
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  private getNotoSansFontPath(): string | null {
    // Common paths where Noto Sans might be installed
    const possiblePaths = [
      // Linux paths
      '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
      '/usr/share/fonts/noto/NotoSans-Regular.ttf',
      '/usr/local/share/fonts/NotoSans-Regular.ttf',

      // macOS paths
      '/System/Library/Fonts/NotoSans-Regular.ttf',
      '/Library/Fonts/NotoSans-Regular.ttf',

      // Windows paths
      'C:\\Windows\\Fonts\\NotoSans-Regular.ttf',

      // Project relative paths (if you download the font)
      path.join(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf'),
      path.join(process.cwd(), 'fonts', 'NotoSans-Regular.ttf'),
      path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'NotoSans-Regular.ttf'),
    ];

    for (const fontPath of possiblePaths) {
      if (fs.existsSync(fontPath)) {
        return fontPath;
      }
    }

    return null;
  }
}
