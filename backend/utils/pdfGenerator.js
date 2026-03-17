const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Helper to ensure storage directories exist
 * This prevents "no such file or directory" errors during PDF generation.
 */
const ensureDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * 1. Generates a Premium Membership Certificate (Landscape)
 * Layout optimized for gold-on-navy premium branding.
 */
exports.generateMembershipCertificate = async (memberData, userData) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
        const fileName = `Membership-${memberData._id}.pdf`;
        const certsDir = path.join(__dirname, '../../public/memberships');
        const filePath = path.join(certsDir, fileName);

        ensureDirectory(certsDir);

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Visual Branding: Navy Background & Gold Border
        doc.rect(0, 0, 842, 595).fill('#0f172a'); 
        doc.rect(25, 25, 792, 545).lineWidth(3).stroke('#fbbf24');
        doc.rect(35, 35, 772, 525).lineWidth(1).stroke('#fbbf24');

        doc.fillColor('#fbbf24')
           .fontSize(45)
           .text('CERTIFICATE OF MEMBERSHIP', 0, 110, { align: 'center', characterSpacing: 2 });

        doc.fillColor('#ffffff')
           .fontSize(20)
           .text('This is to officially certify that', 0, 190, { align: 'center' });
        
        doc.fillColor('#fbbf24')
           .fontSize(38)
           .text(userData.name.toUpperCase(), 0, 235, { align: 'center' });
        
        doc.fillColor('#ffffff')
           .fontSize(18)
           .text('is now a recognized Sovereign Member of the', 0, 300, { align: 'center' });
        
        doc.fontSize(26)
           .text('SARVATIRTHAMAYI CLUB', 0, 335, { align: 'center', characterSpacing: 1 });

        // Metadata Section
        doc.fontSize(14)
           .fillColor('#94a3b8')
           .text(`Membership ID: STM-${memberData._id.toString().slice(-12).toUpperCase()}`, 0, 410, { align: 'center' });
        
        doc.text(`Issued on: ${new Date(memberData.start_date).toDateString()}`, 0, 435, { align: 'center' });
        doc.text(`Valid Until: ${new Date(memberData.end_date).toDateString()}`, 0, 460, { align: 'center' });

        doc.fontSize(10)
           .fillColor('#fbbf24')
           .text('A 99-YEAR SPIRITUAL LEGACY', 0, 530, { align: 'center', characterSpacing: 3 });

        doc.end();
        stream.on('finish', () => resolve({ fileName, filePath }));
        stream.on('error', (err) => reject(err));
    });
};

/**
 * 2. Generates a branded PDF ticket for temple bookings (Portrait)
 * Includes instructions and branding for temple assistants.
 */
exports.generateTempleTicket = async (booking) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const fileName = `Ticket-${booking.booking_id}.pdf`;
        const ticketsDir = path.join(__dirname, '../../public/tickets');
        ensureDirectory(ticketsDir);

        const stream = fs.createWriteStream(path.join(ticketsDir, fileName));
        doc.pipe(stream);

        // Header: Purple Brand Color
        doc.rect(0, 0, 612, 120).fill('#7c3aed');
        doc.fillColor('#ffffff').fontSize(24).text('SACRED VISIT TICKET', 50, 40);
        doc.fontSize(11).text('SARVATIRTHAMAYI CLUB - Your Spiritual Assistant', 50, 75);

        // Body Content
        doc.moveDown(6).fillColor('#7c3aed').fontSize(16).text('TEMPLE DETAILS');
        doc.fillColor('#000000').fontSize(14).text(`${booking.temple_id?.name || 'Sacred Temple'}`);
        doc.fontSize(10).fillColor('#64748b').text(`${booking.temple_id?.location || 'India'}`);

        const startY = doc.y + 30;
        doc.fillColor('#1e293b').fontSize(12).text('BOOKING ID:', 50, startY);
        doc.text(booking.booking_id, 150, startY, { bold: true });
        doc.text('DEVOTEE:', 50, startY + 25);
        doc.text(booking.devotees_name, 150, startY + 25);
        doc.text('VISIT DATE:', 320, startY);
        doc.text(new Date(booking.date).toDateString(), 420, startY);

        // Instructions Box
        doc.rect(50, doc.y + 40, 500, 100).lineWidth(1).stroke('#e2e8f0');
        doc.fontSize(11).fillColor('#7c3aed').text('IMPORTANT:', 70, doc.y + 55);
        doc.fontSize(10).fillColor('#475569').text('Present this digital ticket at the help desk for guided assistance.', 70, doc.y + 15);

        doc.fontSize(9).fillColor('#94a3b8').text('This is a system-generated document. No signature required.', 0, 780, { align: 'center' });

        doc.end();
        stream.on('finish', () => resolve(fileName));
        stream.on('error', (err) => reject(err));
    });
};

/**
 * 3. Generates a branded Receipt for Ritual Bookings (Portrait)
 * Synced with the Ritual Booking Controller logic.
 */
exports.generateRitualReceipt = async (booking) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const fileName = `RitualReceipt-${booking.booking_id}.pdf`;
        const ritualsDir = path.join(__dirname, '../../public/rituals');
        ensureDirectory(ritualsDir);

        const stream = fs.createWriteStream(path.join(ritualsDir, fileName));
        doc.pipe(stream);

        // Header
        doc.rect(0, 0, 612, 120).fill('#7c3aed');
        doc.fillColor('#ffffff').fontSize(24).text('RITUAL CONFIRMATION', 50, 40);
        doc.fontSize(11).text('SARVATIRTHAMAYI CLUB - Spiritual Facilitation', 50, 75);

        // Body Content
        doc.moveDown(6).fillColor('#7c3aed').fontSize(16).text('RITUAL DETAILS');
        doc.fillColor('#000000').fontSize(14).text(`${booking.ritual_id?.name}`);
        doc.fontSize(11).fillColor('#64748b').text(`At: ${booking.temple_id?.name}, ${booking.temple_id?.city_name || ''}`);
        
        const startY = doc.y + 30;
        doc.fillColor('#1e293b').fontSize(12);
        
        // Left Column
        doc.text('RECEIPT NO:', 50, startY);
        doc.text(booking.booking_id, 150, startY);
        doc.text('DEVOTEE:', 50, startY + 25);
        doc.text(booking.devotees_name, 150, startY + 25);
        doc.text('CONTACT:', 50, startY + 50);
        doc.text(booking.whatsapp_number, 150, startY + 50);

        // Right Column (Date & Status)
        doc.text('DATE:', 350, startY);
        doc.text(new Date(booking.date).toDateString(), 430, startY);
        doc.text('STATUS:', 350, startY + 25);
        doc.text('PAID / CONFIRMED', 430, startY + 25, { characterSpacing: 1 });

        // Total Amount Box
        doc.rect(50, doc.y + 40, 500, 60).fill('#f8fafc');
        doc.fillColor('#1e293b').fontSize(14).text('TOTAL PAID:', 70, doc.y - 40);
        doc.fillColor('#7c3aed').fontSize(20).text(`₹${booking.paid_amount}`, 170, doc.y - 20);

        doc.fontSize(9).fillColor('#94a3b8').text('This document certifies your booking for the aforementioned ritual.', 0, 780, { align: 'center' });

        doc.end();
        stream.on('finish', () => resolve(fileName));
        stream.on('error', (err) => reject(err));
    });
};

/**
 * 4. Generates a Leaflet for Vouchers (Social Media / Printing)
 */
exports.generateVoucherLeaflet = async (voucher) => {
    return new Promise((resolve, reject) => {
        // Square layout for Social Media (Instagram/WhatsApp)
        const doc = new PDFDocument({ size: [500, 500], margin: 0 });
        const fileName = `Shareable-${voucher.code}.pdf`;
        const filePath = path.join(__dirname, '../../public/vouchers', fileName);

        ensureDirectory(path.join(__dirname, '../../public/vouchers'));

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Background
        doc.rect(0, 0, 500, 500).fill('#7c3aed'); // Brand Purple

        // Inner Border
        doc.rect(20, 20, 460, 460).lineWidth(2).stroke('#ffffff');

        // Content
        doc.fillColor('#ffffff')
           .fontSize(20)
           .text('SARVATIRTHAMAYI CLUB', 0, 80, { align: 'center' });

        doc.fontSize(14)
           .text('SPECIAL SPIRITUAL OFFER', 0, 110, { align: 'center', characterSpacing: 2 });

        doc.fontSize(60)
           .text(voucher.discount_type === 'percentage' ? `${voucher.discount_value}% OFF` : `₹${voucher.discount_value} OFF`, 0, 180, { align: 'center', bold: true });

        // Voucher Code Box
        doc.rect(100, 280, 300, 60).fill('#ffffff');
        doc.fillColor('#7c3aed')
           .fontSize(30)
           .text(voucher.code, 100, 295, { align: 'center', characterSpacing: 3 });

        doc.fillColor('#ffffff')
           .fontSize(12)
           .text('Use this code during checkout', 0, 360, { align: 'center' });

        if (voucher.expiry_date) {
            doc.fontSize(10)
               .text(`Valid until: ${new Date(voucher.expiry_date).toDateString()}`, 0, 430, { align: 'center' });
        }

        doc.end();
        stream.on('finish', () => resolve(fileName));
        stream.on('error', (err) => reject(err));
    });
};