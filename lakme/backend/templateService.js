/**
 * Lakmé Salon Premium Email Template Engine
 * Generates luxury-themed responsive HTML for emails.
 */

const createEmailTemplate = ({
  title,
  subtitle = "Premium Beauty Experience",
  body,
  buttonText,
  buttonUrl,
  footerNote = "Thank you for choosing Lakmé Salon."
}) => {
  // Colors & Branding
  const colors = {
    black: "#0F0F0F",
    gold: "#C8A34D",
    cream: "#F8F6F2",
    white: "#FFFFFF",
    text: "#333333",
    muted: "#888888",
    border: "#EEEEEE"
  };

  // Inline CSS for maximum client compatibility
  const containerStyle = `background-color: ${colors.cream}; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;`;
  const cardStyle = `max-width: 600px; margin: 0 auto; background-color: ${colors.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);`;
  const headerStyle = `background-color: ${colors.black}; padding: 45px 20px; text-align: center;`;
  const logoStyle = `color: ${colors.gold}; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; text-transform: uppercase;`;
  const subTitleStyle = `color: ${colors.gold}; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; margin-top: 12px; opacity: 0.8; font-weight: 500;`;
  const contentStyle = `padding: 45px; color: ${colors.text}; line-height: 1.7; font-size: 16px;`;
  const footerStyle = `padding: 40px; text-align: center; color: ${colors.muted}; font-size: 12px; background-color: #fafafa; border-top: 1px solid ${colors.border};`;
  const buttonStyle = `display: inline-block; padding: 18px 36px; background: linear-gradient(135deg, #C8A34D 0%, #A8843C 100%); color: ${colors.white}; text-decoration: none; border-radius: 2px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 30px; font-size: 13px;`;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
        <div style="${containerStyle}">
          <div style="${cardStyle}">
            <!-- Header -->
            <div style="${headerStyle}">
              <h1 style="${logoStyle}">LAKMÉ</h1>
              <div style="${subTitleStyle}">${subtitle}</div>
            </div>
            
            <!-- Body Content -->
            <div style="${contentStyle}">
              <h2 style="font-size: 22px; color: ${colors.black}; margin-top: 0; margin-bottom: 20px; font-weight: 600;">${title}</h2>
              <div style="margin-bottom: 20px;">
                ${body}
              </div>
              
              ${buttonText && buttonUrl ? `
                <div style="text-align: center;">
                  <a href="${buttonUrl}" style="${buttonStyle}">${buttonText}</a>
                </div>
              ` : ''}
            </div>
            
            <!-- Footer -->
            <div style="${footerStyle}">
              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 5px; font-weight: bold; color: ${colors.black};">© Lakmé Salon</p>
                <p style="margin: 0; letter-spacing: 2px; text-transform: uppercase; font-size: 10px;">Premium Beauty Experience</p>
              </div>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ebebeb;">
                <p style="margin: 0 0 10px;">Need Assistance?</p>
                <a href="mailto:support@lakmesalon.com" style="color: ${colors.gold}; text-decoration: none; font-weight: 500;">support@lakmesalon.com</a>
              </div>
              
              <p style="margin-top: 30px; font-style: italic; opacity: 0.7;">${footerNote}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

// OTP Special Box
const createOTPBox = (otp) => `
  <div style="background-color: #0F0F0F; color: #C8A34D; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0;">
    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 15px; opacity: 0.8;">Your Verification Code</div>
    <div style="font-size: 42px; font-weight: bold; letter-spacing: 12px; margin-left: 12px;">${otp}</div>
    <div style="font-size: 12px; margin-top: 15px; opacity: 0.6;">Valid for 5 minutes only</div>
  </div>
`;

// Data Card for Bookings/Payments
const createDataGrid = (items) => `
  <div style="background-color: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 8px; padding: 25px; margin: 25px 0;">
    ${items.map(item => `
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f5f5f5;">
        <span style="color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">${item.label}</span>
        <span style="color: #0F0F0F; font-weight: 600; font-size: 14px; text-align: right;">${item.value}</span>
      </div>
    `).join('')}
  </div>
`;

module.exports = {
  createEmailTemplate,
  createOTPBox,
  createDataGrid
};