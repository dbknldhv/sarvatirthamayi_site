const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Helper to ensure storage directories exist
 */
const ensureDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * 1. Generates a Premium Membership Certificate (Landscape)
 * @param {Object} memberData - The purchased card details from MongoDB
 * @param {Object} userData - The user document
 */
exports.generateMembershipCertificate = async (memberData, userData) => {
    return new Promise((resolve, reject) => {
        // Landscape layout for a premium certificate feel
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
        const fileName = `Membership-${memberData._id}.pdf`;
        const certsDir = path.join(__dirname, '../../public/memberships');
        const filePath = path.join(certsDir, fileName);

        ensureDirectory(certsDir);

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // --- VISUAL BRANDING ---
        // Dark Navy Background
        doc.rect(0, 0, 842, 595).fill('#0f172a'); 
        // Gold Decorative Border
        doc.rect(25, 25, 792, 545).lineWidth(3).stroke('#fbbf24');
        doc.rect(35, 35, 772, 525).lineWidth(1).stroke('#fbbf24');

        // --- CONTENT ---
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

        // Footer
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
 * @param {Object} booking - The populated booking document
 */
exports.generateTempleTicket = async (booking) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ 
            size: 'A4', 
            margin: 50,
            info: { Title: `Ticket-${booking.booking_id}`, Author: 'STM Club' }
        });

        const fileName = `Ticket-${booking.booking_id}.pdf`;
        const ticketsDir = path.join(__dirname, '../../public/tickets');
        const filePath = path.join(ticketsDir, fileName);

        ensureDirectory(ticketsDir);

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // --- HEADER ---
        doc.rect(0, 0, 612, 120).fill('#7c3aed'); // Purple Brand Color
        
        doc.fillColor('#ffffff')
           .fontSize(24)
           .text('SACRED VISIT TICKET', 50, 40, { characterSpacing: 1 });
        
        doc.fontSize(11)
           .text('SARVATIRTHAMAYI CLUB - Your Spiritual Assistant', 50, 75);

        // --- BODY ---
        doc.fillColor('#1e293b').moveDown(6);

        // Temple Info
        doc.fontSize(16).fillColor('#7c3aed').text('TEMPLE DETAILS');
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#000000').text(`${booking.temple_id?.name || 'Sacred Temple'}`);
        doc.fontSize(10).fillColor('#64748b').text(`${booking.temple_id?.location || 'India'}`);
        
        doc.moveDown(2);

        // Devotee Table
        const startY = doc.y;
        doc.fillColor('#1e293b').fontSize(12);
        
        // Col 1
        doc.text('BOOKING ID:', 50, startY);
        doc.text(booking.booking_id, 150, startY, { bold: true });
        doc.text('DEVOTEE:', 50, startY + 25);
        doc.text(booking.devotees_name, 150, startY + 25);
        
        // Col 2
        doc.text('VISIT DATE:', 320, startY);
        doc.text(new Date(booking.date).toDateString(), 420, startY);
        doc.text('WHATSAPP:', 320, startY + 25);
        doc.text(booking.whatsapp_number, 420, startY + 25);

        doc.moveDown(4);

        // Instructions Box
        doc.rect(50, doc.y, 500, 120).lineWidth(1).stroke('#e2e8f0');
        const boxTop = doc.y + 15;
        doc.fontSize(11).fillColor('#7c3aed').text('IMPORTANT INSTRUCTIONS:', 70, boxTop);
        
        doc.fontSize(10).fillColor('#475569');
        const list = [
            '• Please arrive at the temple 30 minutes prior to your selected slot.',
            '• Present this digital ticket at the "Sarvatirthamayi" help desk.',
            '• Adhere to traditional dress code requirements of the specific temple.',
            '• Your Spiritual Journey Assistant will guide you through the rituals.'
        ];

        list.forEach(item => {
            doc.moveDown(0.5);
            doc.text(item, 70);
        });

        // --- FOOTER ---
        doc.fontSize(9)
           .fillColor('#94a3b8')
           .text('This is a computer-generated document. No physical signature required.', 0, 780, { align: 'center' });

        doc.end();
        stream.on('finish', () => resolve(fileName));
        stream.on('error', (err) => reject(err));
    });
};