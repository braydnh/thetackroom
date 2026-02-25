const base = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9f6f0;
  margin: 0;
  padding: 0;
`;

function wrapper(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f0;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <!-- Header -->
        <tr><td style="background:#1a2744;border-radius:8px 8px 0 0;padding:28px 40px;text-align:center">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#f9f6f0;letter-spacing:0.5px">
            The Tack Room
          </span>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;border-radius:0 0 8px 8px">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#999">
            © The Tack Room · <a href="https://tackroomshop.com.au" style="color:#999">tackroomshop.com.au</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#4a5e35;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;margin-top:24px">${text}</a>`;
}

export function welcomeEmail(firstName: string) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Welcome to The Tack Room, ${firstName}!
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      You're now part of Australia's equestrian marketplace. Browse thousands of listings, connect with fellow riders, and buy or sell with confidence.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Here's what you can do on The Tack Room:
    </p>
    <ul style="margin:12px 0 0;padding-left:20px;font-size:15px;color:#444;line-height:1.8">
      <li>Browse and buy gear from trusted sellers</li>
      <li>List your own tack and equipment for sale</li>
      <li>Message sellers directly</li>
    </ul>
    <div style="text-align:center">
      ${btn("Browse Listings", "https://tackroomshop.com.au/browse")}
    </div>
  `);
}

export function newMessageEmail({
  recipientName,
  senderName,
  messagePreview,
  conversationId,
}: {
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      New message from ${senderName}
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${recipientName}, you have a new message on The Tack Room.
    </p>
    <div style="margin:24px 0;background:#f9f6f0;border-left:3px solid #4a5e35;padding:16px 20px;border-radius:0 6px 6px 0">
      <p style="margin:0;font-size:14px;color:#555;font-style:italic">"${messagePreview}"</p>
    </div>
    <div style="text-align:center">
      ${btn("Reply to message", `https://tackroomshop.com.au/messages/${conversationId}`)}
    </div>
  `);
}

export function newOrderEmail({
  sellerName,
  buyerName,
  listingTitle,
  amount,
  orderId,
}: {
  sellerName: string;
  buyerName: string;
  listingTitle: string;
  amount: string;
  orderId: string;
}) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      You've made a sale! 🎉
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, great news — ${buyerName} has purchased your listing.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666;width:40%">Item</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Sale price</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${amount}</td>
      </tr>
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Buyer</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744">${buyerName}</td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#666;line-height:1.6">
      Please ship the item promptly and add your tracking number in your dashboard.
    </p>
    <div style="text-align:center">
      ${btn("View order", `https://tackroomshop.com.au/selling/orders/${orderId}`)}
    </div>
  `);
}
