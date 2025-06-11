import sgMail from '@sendgrid/mail';

// Configure SendGrid API key
const apiKey = process.env.SENDGRID_API_KEY;

if (!apiKey) {
  console.warn('SENDGRID_API_KEY not found in environment variables');
} else {
  sgMail.setApiKey(apiKey);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using SendGrid
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content of the email
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  if (!apiKey) {
    console.error('SendGrid API key not configured');
    return false;
  }

  try {
    const msg = {
      to,
      from: 'contact@offmenu.space',
      subject,
      html,
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
} 