const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const sendContactNotification = async (message) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact Form Message from ${escapeHtml(message.name)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #C9A24A;">New Message from ZYNTRA Website</h2>
          <p><strong>Name:</strong> ${escapeHtml(message.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(message.email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(message.phone) || 'N/A'}</p>
          <p><strong>Subject:</strong> ${escapeHtml(message.subject) || 'N/A'}</p>
          <p><strong>Message:</strong></p>
          <p style="background: #f5f5f5; padding: 16px; border-radius: 8px;">${escapeHtml(message.message)}</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Email error (contact):', err.message)
  }
}

const sendApplicationNotification = async (application) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `New Job Application — ${escapeHtml(application.position)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #C9A24A;">New Job Application</h2>
          <p><strong>Name:</strong> ${escapeHtml(application.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(application.email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(application.phone) || 'N/A'}</p>
          <p><strong>Position:</strong> ${escapeHtml(application.position)}</p>
          <p><strong>CV:</strong> <a href="${escapeHtml(application.cvLink)}">${escapeHtml(application.cvLink)}</a></p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Email error (application):', err.message)
  }
}

module.exports = { sendContactNotification, sendApplicationNotification, escapeHtml }
