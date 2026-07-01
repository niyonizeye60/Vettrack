// lib/email.js
import nodemailer from 'nodemailer';
import clientPromise from './db';

// Read SMTP settings saved via the superadmin Settings page (system_settings.global),
// without importing lib/actions/superadmin.ts directly (that file is "use server" and
// already imports from this module, so importing it back here would be circular).
const getSavedSmtpSettings = async () => {
  try {
    const client = await clientPromise;
    const db = client.db('ntdm_animal_hospital');
    return await db.collection('system_settings').findOne({ _id: 'global' });
  } catch (error) {
    console.error('Error fetching SMTP settings from database:', error);
    return null;
  }
};

// Create transporter (configure with your email provider)
const createTransporter = async () => {
  const settings = await getSavedSmtpSettings();

  // Only use the DB-saved config once an admin has actually filled in real
  // credentials via Settings -> Email Configuration. The settings document gets
  // auto-seeded with placeholder defaults (smtpHost set, smtpUser/smtpPass empty)
  // the first time that page loads, so an empty user/pass means "not configured yet".
  if (settings?.smtpUser && settings?.smtpPass) {
    return nodemailer.createTransport({
      host: settings.smtpHost || 'smtp.gmail.com',
      port: settings.smtpPort || 587,
      secure: !!settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });
  }

  // Fall back to environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Email credentials not configured (checked database settings and EMAIL_USER/EMAIL_PASSWORD). Emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    // For Gmail with App Password
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // your-email@gmail.com
      pass: process.env.EMAIL_PASSWORD, // your app password (16 characters)
    },
  });
};

// Email templates
const getWelcomeEmailTemplate = (name, role) => {
  const roleMessages = {
    farmer: {
      title: "Welcome to NTDM Animal Hospital - Your Animal Care Partner!",
      greeting: "Dear Livestock Owner",
      content: `
        <p>We're excited to welcome you to NTDM Animal Hospital, where we provide innovative solutions for livestock and pet owners.</p>
        <p>As a registered farmer/pet owner, you now have access to:</p>
        <ul style="margin: 15px 0; padding-left: 20px;">
          <li>🐄 Advanced animal tracking and health monitoring</li>
          <li>👨‍⚕️ Expert veterinary consultations</li>
          <li>📊 Comprehensive care management tools</li>
          <li>📱 24/7 access to your animal health records</li>
          <li>🔔 Health alerts and vaccination reminders</li>
        </ul>
        <p>Start by adding your animals to your profile and scheduling your first consultation if needed.</p>
      `
    },
    doctor: {
      title: "Welcome to NTDM Animal Hospital - Veterinary Professional Portal",
      greeting: "Dear Dr.",
      content: `
        <p>Welcome to the NTDM Animal Hospital veterinary platform! We're thrilled to have you join our network of animal care professionals.</p>
        <p>As a registered veterinarian, you can now:</p>
        <ul style="margin: 15px 0; padding-left: 20px;">
          <li>👥 Connect with farmers and pet owners in your area</li>
          <li>📅 Manage your consultation schedule and availability</li>
          <li>🩺 Conduct remote consultations and health assessments</li>
          <li>📋 Access comprehensive animal health records</li>
          <li>💊 Provide treatment recommendations and prescriptions</li>
        </ul>
        <p>Your expertise is valuable to our community. Please ensure your availability schedule is up to date.</p>
      `
    },
    admin: {
      title: "Welcome to NTDM Animal Hospital - Administrator Access",
      greeting: "Dear Administrator",
      content: `
        <p>Welcome to the NTDM Animal Hospital administrative portal.</p>
        <p>You now have full access to manage the platform and support our community of farmers and veterinarians.</p>
        <p>Your administrative privileges include platform oversight, user management, and system monitoring.</p>
      `
    }
  };

  const template = roleMessages[role] || roleMessages.farmer;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          padding: 30px 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0 0 0;
          opacity: 0.9;
          font-size: 14px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .greeting {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .cta-button {
          display: inline-block;
          background: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
        ul li {
          margin: 8px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 NTDM Animal Hospital</h1>
        <p>Track, Consult, and Care for Your Animals</p>
      </div>
      
      <div class="content">
        <div class="greeting">${template.greeting} ${name}!</div>
        
        ${template.content}
        
        <div style="margin: 25px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.vettrack.rw'}/login" class="cta-button">
            Access Your Account
          </a>
        </div>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>The NTDM Animal Hospital Team</strong><br>
          <em>Innovative solutions for comprehensive animal care</em>
        </p>
      </div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} NTDM Animal Hospital. All rights reserved.</p>
        <p>This email was sent because you created an account with us.</p>
        <p>If you didn't create this account, please contact us immediately.</p>
      </div>
    </body>
    </html>
  `;
};

// Send welcome email function
export const sendWelcomeEmail = async (userEmail, userName, userRole) => {
  try {
    const transporter = await createTransporter();
    
    // If no transporter (missing credentials), skip email
    if (!transporter) {
      console.log('Email service not configured. Skipping welcome email.');
      return { success: false, error: 'Email service not configured' };
    }
    
    const template = getWelcomeEmailTemplate(userName, userRole);
    const roleMessages = {
      farmer: "Welcome to NTDM Animal Hospital - Your Animal Care Partner!",
      doctor: "Welcome to NTDM Animal Hospital - Veterinary Professional Portal",
      admin: "Welcome to NTDM Animal Hospital - Administrator Access"
    };
    
    const subject = roleMessages[userRole] || roleMessages.farmer;

    const mailOptions = {
      from: {
        name: 'NTDM Animal Hospital',
        address: process.env.EMAIL_USER
      },
      to: {
        name: userName,
        address: userEmail
      },
      subject: subject,
      html: template,
      // Important headers to avoid spam
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'NTDM Animal Hospital System',
        'Reply-To': process.env.EMAIL_USER,
        'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}?subject=Unsubscribe>`,
        'X-Entity-ID': 'ntdm-animal-hospital',
        'Message-ID': `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@info@vettrack.rw>`
      },
      // Add text version (very important for spam filters)
      text: `
Welcome to NTDM Animal Hospital, ${userName}!

Track, Consult, and Care for Your Animals

Dear ${userRole === 'doctor' ? 'Dr.' : ''} ${userName},

Thank you for joining NTDM Animal Hospital! We provide innovative solutions for livestock and pet owners with advanced tracking, expert consultations, and comprehensive care - all in one place.

${userRole === 'farmer' ? `
As a registered farmer/pet owner, you now have access to:
- Advanced animal tracking and health monitoring
- Expert veterinary consultations  
- Comprehensive care management tools
- 24/7 access to your animal health records
- Health alerts and vaccination reminders

Start by adding your animals to your profile and scheduling your first consultation if needed.
` : userRole === 'doctor' ? `
As a registered veterinarian, you can now:
- Connect with farmers and pet owners in your area
- Manage your consultation schedule and availability
- Conduct remote consultations and health assessments
- Access comprehensive animal health records
- Provide treatment recommendations and prescriptions

Your expertise is valuable to our community. Please ensure your availability schedule is up to date.
` : ''}

Access Your Account: ${process.env.NEXT_PUBLIC_APP_URL || 'https://www.vettrack.rw'}/login

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The NTDM Animal Hospital Team
Innovative solutions for comprehensive animal care

© ${new Date().getFullYear()} NTDM Animal Hospital. All rights reserved.
This email was sent because you created an account with us.
If you didn't create this account, please contact us immediately.

To unsubscribe, reply to this email with "Unsubscribe" in the subject.
      `.trim(),
      // Additional options to improve deliverability
      envelope: {
        from: process.env.EMAIL_USER,
        to: userEmail
      },
    
    
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Send announcement email
export const sendAnnouncementEmail = async (userEmail, userName, announcement) => {
  try {
    console.log(`Attempting to send announcement email to: ${userEmail}`);
    
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('Email service not configured. Skipping announcement email.');
      return { success: false, error: 'Email service not configured' };
    }
    
    console.log('Email transporter created successfully');

    const priorityColors = {
      low: '#10b981',
      normal: '#3b82f6', 
      high: '#f59e0b',
      critical: '#ef4444'
    };

    const typeIcons = {
      general: '📢',
      maintenance: '🔧',
      feature: '✨',
      security: '🔒'
    };

    const template = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>System Announcement - NTDM Animal Hospital</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white; background: ${priorityColors[announcement.priority]}; }
          .type-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; background: #f3f4f6; color: #374151; margin-left: 8px; }
          .announcement-content { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${priorityColors[announcement.priority]}; }
          .footer { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 NTDM Animal Hospital</h1>
          <p>System Announcement</p>
        </div>
        
        <div class="content">
          <div style="margin-bottom: 20px;">
            <span class="priority-badge">${announcement.priority.toUpperCase()}</span>
            <span class="type-badge">${typeIcons[announcement.type]} ${announcement.type.toUpperCase()}</span>
          </div>
          
          <h2 style="color: #1f2937; margin-bottom: 15px;">${announcement.title}</h2>
          
          <div class="announcement-content">
            <p style="margin: 0; white-space: pre-line;">${announcement.content}</p>
          </div>
          
          <p style="margin-top: 25px; color: #6b7280; font-size: 14px;">
            Posted on: ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} NTDM Animal Hospital. All rights reserved.</p>
          <p>This is an automated system announcement.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'NTDM Animal Hospital',
        address: process.env.EMAIL_USER
      },
      to: {
        name: userName,
        address: userEmail
      },
      subject: `${typeIcons[announcement.type]} System Announcement: ${announcement.title}`,
      html: template,
      text: `
NTDM Animal Hospital - System Announcement

Priority: ${announcement.priority.toUpperCase()}
Type: ${announcement.type.toUpperCase()}

${announcement.title}

${announcement.content}

Posted on: ${new Date().toLocaleDateString()}

© ${new Date().getFullYear()} NTDM Animal Hospital. All rights reserved.
      `.trim()
    };

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${userEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending announcement email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (userEmail, userName, rawToken) => {
  try {
    const transporter = await createTransporter();

    if (!transporter) {
      console.log('Email service not configured. Skipping password reset email.');
      return { success: false, error: 'Email service not configured' };
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.vettrack.rw'}/reset-password?token=${rawToken}`;

    const template = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - NTDM Animal Hospital</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .reset-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .security-note { background: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 20px; font-size: 13px; color: #6b7280; border-left: 4px solid #f59e0b; }
          .footer { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 NTDM Animal Hospital</h1>
          <p>Reset Your Password</p>
        </div>
        <div class="content">
          <h2>Hello ${userName}!</h2>
          <p>We received a request to reset the password for your NTDM Animal Hospital account. Click the button below to choose a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="reset-button">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
          <p>This password reset link will expire in 1 hour.</p>
          <div class="security-note">
            If you did not request this, you can safely ignore this email and your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} NTDM Animal Hospital. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'NTDM Animal Hospital',
        address: process.env.EMAIL_USER
      },
      to: {
        name: userName,
        address: userEmail
      },
      subject: 'Reset Your Password - NTDM Animal Hospital',
      html: template,
      text: `
Reset Your Password - NTDM Animal Hospital

Hello ${userName}!

We received a request to reset the password for your NTDM Animal Hospital account.

Reset your password using this link: ${resetUrl}

This password reset link will expire in 1 hour.

If you did not request this, you can safely ignore this email and your password will remain unchanged.

© ${new Date().getFullYear()} NTDM Animal Hospital. All rights reserved.
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send chat missed-message digest email
export const sendChatDigestEmail = async (userEmail, userName, items, totalCount) => {
  try {
    const transporter = await createTransporter();

    if (!transporter) {
      console.log('Email service not configured. Skipping chat digest email.');
      return { success: false, error: 'Email service not configured' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.vettrack.rw';

    const itemsHtml = items.map(item => `
      <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
        <p style="margin: 0; font-weight: bold; color: #1f2937;">${item.title}</p>
        <p style="margin: 4px 0 0 0; color: #4b5563;">${item.message}</p>
      </div>
    `).join('');

    const template = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You have new messages - NTDM Animal Hospital</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 NTDM Animal Hospital</h1>
          <p>You have ${totalCount} unread message${totalCount > 1 ? 's' : ''}</p>
        </div>
        <div class="content">
          <h2 style="color: #1f2937;">Hello ${userName}!</h2>
          <p>You have unread messages waiting for you while you were away:</p>
          ${itemsHtml}
          <div style="text-align: center;">
            <a href="${appUrl}/login" class="cta-button">Open Messages</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} NTDM Animal Hospital. All rights reserved.</p>
          <p>You're receiving this because you have unread chat messages.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'NTDM Animal Hospital',
        address: process.env.EMAIL_USER
      },
      to: {
        name: userName,
        address: userEmail
      },
      subject: `💬 You have ${totalCount} unread message${totalCount > 1 ? 's' : ''} - NTDM Animal Hospital`,
      html: template,
      text: `
You have ${totalCount} unread message${totalCount > 1 ? 's' : ''} - NTDM Animal Hospital

Hello ${userName}!

You have unread messages waiting for you while you were away:

${items.map(item => `${item.title}: ${item.message}`).join('\n')}

Open Messages: ${appUrl}/login

© ${new Date().getFullYear()} NTDM Animal Hospital. All rights reserved.
      `.trim()
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Chat digest email sent successfully to ${userEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending chat digest email:', error);
    return { success: false, error: error.message };
  }
};

// Send booking notification email to the configured admin inbox
export const sendBookingNotificationEmail = async (bookingData) => {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      console.log('Email service not configured. Skipping booking notification email.');
      return { success: false, error: 'Email service not configured' };
    }

    const settings = await getSavedSmtpSettings();
    // Use the admin-configured booking recipient, fall back to the SMTP sender account
    const recipient = settings?.bookingNotificationEmail || process.env.EMAIL_USER;
    if (!recipient) {
      return { success: false, error: 'No booking notification recipient configured' };
    }

    const fromAddress = settings?.smtpUser || process.env.EMAIL_USER;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🐾 New Booking Consultation</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">NTDM Animal Hospital</p>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Booking Details</h2>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #667eea; margin-top: 0;">Client Information</h3>
            <p><strong>Name:</strong> ${bookingData.name}</p>
            <p><strong>Phone:</strong> ${bookingData.phone}</p>
            ${bookingData.email ? `<p><strong>Email:</strong> ${bookingData.email}</p>` : ''}
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #667eea; margin-top: 0;">Service Information</h3>
            <p><strong>Service:</strong> ${bookingData.serviceLabel}</p>
            <p><strong>Animal Type:</strong> ${bookingData.animalType}</p>
            <p><strong>Number of Animals:</strong> ${bookingData.animalCount}</p>
            ${bookingData.description ? `<p><strong>Description:</strong> ${bookingData.description}</p>` : ''}
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #667eea; margin-top: 0;">Appointment Schedule</h3>
            <p><strong>Date:</strong> ${bookingData.date}</p>
            <p><strong>Time:</strong> ${bookingData.timeSlot}</p>
            <p><strong>WhatsApp Confirmation:</strong> ${bookingData.whatsappConfirm ? 'Yes' : 'No'}</p>
          </div>

          <div style="background: #e8f2ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #333;"><strong>📅 Next Steps:</strong> Please confirm this appointment and contact the client to finalize the booking details.</p>
          </div>
        </div>

        <div style="background: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 14px;">NTDM Animal Hospital - Professional Veterinary Care</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">Booking submitted at: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: { name: 'NTDM Animal Hospital', address: fromAddress },
      to: recipient,
      subject: `🐾 New Booking: ${bookingData.name} - ${bookingData.serviceLabel}`,
      html: emailContent,
      text: `
New Booking Consultation - NTDM Animal Hospital

Client: ${bookingData.name}
Phone: ${bookingData.phone}
${bookingData.email ? `Email: ${bookingData.email}` : ''}

Service: ${bookingData.serviceLabel}
Animal Type: ${bookingData.animalType}
Number of Animals: ${bookingData.animalCount}
${bookingData.description ? `Description: ${bookingData.description}` : ''}

Date: ${bookingData.date}
Time: ${bookingData.timeSlot}
WhatsApp Confirmation: ${bookingData.whatsappConfirm ? 'Yes' : 'No'}

Submitted at: ${new Date().toLocaleString()}
      `.trim(),
    });

    console.log('Booking notification email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending booking notification email:', error);
    return { success: false, error: error.message };
  }
};

// Optional: Send email verification (for future use)
export const sendVerificationEmail = async (userEmail, userName, verificationToken) => {
  try {
    const transporter = await createTransporter();
    
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.vettrack.rw'}/verify-email?token=${verificationToken}`;
    
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .verify-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 NTDM Animal Hospital</h1>
          <p>Verify Your Email Address</p>
        </div>
        <div class="content">
          <h2>Hello ${userName}!</h2>
          <p>Thank you for registering with NTDM Animal Hospital. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
          <p>This verification link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} NTDM Animal Hospital. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'NTDM Animal Hospital',
        address: process.env.EMAIL_USER
      },
      to: userEmail,
      subject: 'Verify your email - NTDM Animal Hospital',
      html: template
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};