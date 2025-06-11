/**
 * Event Confirmation Approval Email Template
 * @param userName Name of the user whose event was approved
 * @param venueName Name of the venue that approved the event
 * @param eventDate Date of the approved event
 * @returns HTML string for the email
 */
export function getEventConfirmationApprovalTemplate(
  userName: string,
  venueName: string,
  eventDate: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Approved - OffMenu</title>
        <style>
          /* Use web-safe fonts only since we can't guarantee custom font loading in Supabase emails */
          .brand-font {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          
          /* Button styling */
          .cta-button {
            display: inline-block;
            background-color: #273287;
            color: #ffffff;
            padding: 16px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          
          /* Responsive adjustments */
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              margin: 0 !important;
            }
            
            .content-padding {
              padding: 20px !important;
            }
            
            .logo-text {
              font-size: 20px !important;
            }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333333; margin: 0; padding: 0; background-color: #f0f2fa;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f2fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                <!-- Header with Logo -->
                <tr>
                  <td align="center" class="content-padding" style="padding: 40px 40px 20px 40px;">
                    <div style="display: inline-flex; align-items: center; text-decoration: none;">
                      <img src="https://itgvobngquppjrbbibis.supabase.co/storage/v1/object/public/logos//OFFMENU_LOGO.png" alt="OffMenu Logo" class="logo-img" style="width: 54px; height: 54px; vertical-align: middle; " />
                      <span class="logo-text brand-font" style="font-size: 24px; font-weight: 700; color: #3C3C3C; letter-spacing: -0.5px;">OFFMENU</span>
                    </div>
                  </td>
                </tr>
                
                <!-- Welcome Message -->
                <tr>
                  <td align="center" class="content-padding" style="padding: 0 40px 30px 40px;">
                    <h1 class="brand-font" style="font-size: 28px; font-weight: 600; color: #111111; margin: 0; line-height: 1.3;">🎉 Your Event Has Been Approved!</h1>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td class="content-padding" style="padding: 0 40px 40px 40px;">
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #3C3C3C;">
                      Hi ${userName},
                    </p>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #3C3C3C;">
                      Great news! <strong>${venueName}</strong> has approved your event request for <strong>${eventDate}</strong>.
                    </p>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #3C3C3C;">
                      You can now proceed with planning your event. The venue team will be in touch soon to discuss the next steps and finalize the details.
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://offmenu.space/manage" class="cta-button brand-font">
                        View Your Events
                      </a>
                    </div>
                    
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #3C3C3C;">
                      If you have any questions, feel free to reach out to us or contact the venue directly through our chat system.
                    </p>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; color: #3C3C3C;">
                      Looking forward to your successful event!<br>
                      <span style="font-weight: 600;">The OffMenu Team</span>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="content-padding" style="padding: 30px 40px 40px 40px; border-top: 1px solid #E7E0DA;">
                    <p class="brand-font" style="font-size: 14px; color: #666666; margin: 0 0 10px 0; line-height: 1.5;">
                      © 2024 OffMenu. All rights reserved.
                    </p>
                    <p class="brand-font" style="font-size: 12px; color: #999999; margin: 0; line-height: 1.4;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Event Decline Email Template
 * @param userName Name of the user whose event was declined
 * @param venueName Name of the venue that declined the event
 * @returns HTML string for the email
 */
export function getEventDeclineTemplate(
  userName: string,
  venueName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Request Update - OffMenu</title>
        <style>
          /* Use web-safe fonts only since we can't guarantee custom font loading in Supabase emails */
          .brand-font {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          
          /* Button styling */
          .cta-button {
            display: inline-block;
            background-color: #273287;
            color: #ffffff;
            padding: 16px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          
          /* Responsive adjustments */
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              margin: 0 !important;
            }
            
            .content-padding {
              padding: 20px !important;
            }
            
            .logo-text {
              font-size: 20px !important;
            }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333333; margin: 0; padding: 0; background-color: #f0f2fa;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f2fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                <!-- Header with Logo -->
                <tr>
                  <td align="center" class="content-padding" style="padding: 40px 40px 20px 40px;">
                    <div style="display: inline-flex; align-items: center; text-decoration: none;">
                      <img src="https://itgvobngquppjrbbibis.supabase.co/storage/v1/object/public/logos//OFFMENU_LOGO.png" alt="OffMenu Logo" class="logo-img" style="width: 54px; height: 54px; vertical-align: middle; " />
                      <span class="logo-text brand-font" style="font-size: 24px; font-weight: 700; color: #3C3C3C; letter-spacing: -0.5px;">OFFMENU</span>
                    </div>
                  </td>
                </tr>
                
                <!-- Welcome Message -->
                <tr>
                  <td align="center" class="content-padding" style="padding: 0 40px 30px 40px;">
                    <h1 class="brand-font" style="font-size: 28px; font-weight: 600; color: #111111; margin: 0; line-height: 1.3;">Event Request Update</h1>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td class="content-padding" style="padding: 0 40px 40px 40px;">
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #3C3C3C;">
                      Hi ${userName},
                    </p>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #3C3C3C;">
                      Thank you for your interest in hosting an event with <strong>${venueName}</strong>.
                    </p>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #3C3C3C;">
                      Unfortunately, they are not able to accommodate your event request at this time. This could be due to scheduling conflicts, capacity constraints, or other venue-specific considerations.
                    </p>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #3C3C3C;">
                      Don't worry - there are many other amazing venues on OffMenu that might be perfect for your event.
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://offmenu.space/explore" class="cta-button brand-font">
                        Explore Other Venues
                      </a>
                    </div>
                    
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; color: #3C3C3C;">
                      If you have any questions about this decision or need help finding alternative venues, our team is here to help.<br><br>
                      Best regards,<br>
                      <span style="font-weight: 600;">The OffMenu Team</span>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="content-padding" style="padding: 30px 40px 40px 40px; border-top: 1px solid #E7E0DA;">
                    <p class="brand-font" style="font-size: 14px; color: #666666; margin: 0 0 10px 0; line-height: 1.5;">
                      © 2024 OffMenu. All rights reserved.
                    </p>
                    <p class="brand-font" style="font-size: 12px; color: #999999; margin: 0; line-height: 1.4;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Chat Message Request Email Template
 * @param recipientName Name of the person receiving the chat request (venue manager)
 * @param senderName Name of the person who sent the chat request
 * @param venueName Name of the venue
 * @param linkToChat Direct link to the chat conversation
 * @returns HTML string for the email
 */
export function getChatMessageRequestTemplate(
  recipientName: string,
  senderName: string,
  venueName: string,
  linkToChat: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Chat Request - OffMenu</title>
        <style>
          /* Use web-safe fonts only since we can't guarantee custom font loading in Supabase emails */
          .brand-font {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          
          /* Button styling */
          .cta-button {
            display: inline-block;
            background-color: #273287;
            color: #ffffff;
            padding: 16px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          
          /* Highlight box styling */
          .highlight {
            background-color: #f8f9fa;
            padding: 20px;
            border-left: 4px solid #273287;
            margin: 20px 0;
            border-radius: 4px;
          }
          
          /* Responsive adjustments */
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              margin: 0 !important;
            }
            
            .content-padding {
              padding: 20px !important;
            }
            
            .logo-text {
              font-size: 20px !important;
            }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333333; margin: 0; padding: 0; background-color: #f0f2fa;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f2fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                <!-- Header with Logo -->
                <tr>
                  <td align="center" class="content-padding" style="padding: 40px 40px 20px 40px;">
                    <div style="display: inline-flex; align-items: center; text-decoration: none;">
                      <img src="https://itgvobngquppjrbbibis.supabase.co/storage/v1/object/public/logos//OFFMENU_LOGO.png" alt="OffMenu Logo" class="logo-img" style="width: 54px; height: 54px; vertical-align: middle; " />
                      <span class="logo-text brand-font" style="font-size: 24px; font-weight: 700; color: #3C3C3C; letter-spacing: -0.5px;">OFFMENU</span>
                    </div>
                  </td>
                </tr>
                
                <!-- Welcome Message -->
                <tr>
                  <td align="center" class="content-padding" style="padding: 0 40px 30px 40px;">
                    <h1 class="brand-font" style="font-size: 28px; font-weight: 600; color: #111111; margin: 0; line-height: 1.3;">💬 New Chat Request</h1>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td class="content-padding" style="padding: 0 40px 40px 40px;">
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #3C3C3C;">
                      Hi ${recipientName},
                    </p>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #3C3C3C;">
                      You have received a new chat request on OffMenu!
                    </p>
                    <div class="highlight">
                      <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0; color: #3C3C3C;">
                        <strong>${senderName}</strong> is interested in discussing an event at <strong>${venueName}</strong>.
                      </p>
                    </div>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #3C3C3C;">
                      This is a great opportunity to learn more about their event needs and potentially host an amazing experience at your venue.
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${linkToChat}" class="cta-button brand-font">
                        View Chat Request
                      </a>
                    </div>
                    
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; color: #3C3C3C;">
                      Responding promptly to chat requests helps build strong relationships with event organizers and can lead to more bookings for your venue.<br><br>
                      Best regards,<br>
                      <span style="font-weight: 600;">The OffMenu Team</span>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="content-padding" style="padding: 30px 40px 40px 40px; border-top: 1px solid #E7E0DA;">
                    <p class="brand-font" style="font-size: 14px; color: #666666; margin: 0 0 10px 0; line-height: 1.5;">
                      © 2024 OffMenu. All rights reserved.
                    </p>
                    <p class="brand-font" style="font-size: 12px; color: #999999; margin: 0; line-height: 1.4;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Chat Message Notification Email Template
 * @param recipientName Name of the person receiving the message
 * @param senderName Name of the person who sent the message
 * @param messagePreview Preview of the message content (first 100 characters)
 * @param venueName Name of the venue (optional context)
 * @param linkToChat Direct link to the chat conversation
 * @returns HTML string for the email
 */
export function getChatMessageNotificationTemplate(
  recipientName: string,
  senderName: string,
  messagePreview: string,
  venueName: string,
  linkToChat: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Message - OffMenu</title>
        <style>
          /* Use web-safe fonts only since we can't guarantee custom font loading in Supabase emails */
          .brand-font {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          
          /* Button styling */
          .cta-button {
            display: inline-block;
            background-color: #273287;
            color: #ffffff;
            padding: 16px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          
          /* Message preview styling */
          .message-preview {
            background-color: #f8f9fa;
            padding: 20px;
            border-left: 4px solid #273287;
            margin: 20px 0;
            border-radius: 4px;
          }
          
          .sender-info {
            color: #273287;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          /* Responsive adjustments */
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              margin: 0 !important;
            }
            
            .content-padding {
              padding: 20px !important;
            }
            
            .logo-text {
              font-size: 20px !important;
            }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333333; margin: 0; padding: 0; background-color: #f0f2fa;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f2fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                <!-- Header with Logo -->
                <tr>
                  <td align="center" class="content-padding" style="padding: 40px 40px 20px 40px;">
                    <div style="display: inline-flex; align-items: center; text-decoration: none;">
                      <img src="https://itgvobngquppjrbbibis.supabase.co/storage/v1/object/public/logos//OFFMENU_LOGO.png" alt="OffMenu Logo" class="logo-img" style="width: 54px; height: 54px; vertical-align: middle; " />
                      <span class="logo-text brand-font" style="font-size: 24px; font-weight: 700; color: #3C3C3C; letter-spacing: -0.5px;">OFFMENU</span>
                    </div>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td class="content-padding" style="padding: 0 40px 40px 40px;">
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #3C3C3C;">
                      Hi ${recipientName},
                    </p>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #3C3C3C;">
                      You have received a new message from <strong>${senderName}</strong> regarding <strong>${venueName}</strong>.
                    </p>
                    <div class="message-preview">
                      <div class="sender-info brand-font">${senderName} wrote:</div>
                      <p class="brand-font" style="margin: 0; color: #333; font-style: italic; font-size: 16px; line-height: 1.6;">"${messagePreview}${messagePreview.length >= 100 ? '...' : ''}"</p>
                    </div>
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #3C3C3C;">
                      Click the button below to view the full conversation and respond:
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${linkToChat}" class="cta-button brand-font text-white">
                        View Conversation
                      </a>
                    </div>
                    
                    <p class="brand-font" style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; color: #3C3C3C;">
                      Stay connected with your event partners to make great things happen!<br><br>
                      Best regards,<br>
                      <span style="font-weight: 600;">The OffMenu Team</span>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="content-padding" style="padding: 30px 40px 40px 40px; border-top: 1px solid #E7E0DA;">
                    <p class="brand-font" style="font-size: 14px; color: #666666; margin: 0 0 10px 0; line-height: 1.5;">
                      © 2024 OffMenu. All rights reserved.
                    </p>
                    <p class="brand-font" style="font-size: 12px; color: #999999; margin: 0; line-height: 1.4;">
                      This is an automated message. Please do not reply to this email. You can manage your notification preferences in your account settings.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
} 