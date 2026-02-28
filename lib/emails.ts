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
  return `<a href="${href}" style="display:inline-block;background:#1a2744;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;margin-top:24px">${text}</a>`;
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

export function ambassadorApprovedEmail(firstName: string) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      You're now a Tack Room Ambassador! 🎉
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${firstName}, congratulations — your ambassador application has been approved!
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Your profile now displays the Ambassador badge and your listings will be featured in our Ambassador section on the homepage.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Start listing your gear and sharing your profile with your community to make the most of your ambassador status.
    </p>
    <div style="text-align:center">
      ${btn("Go to my dashboard", "https://tackroomshop.com.au/selling")}
    </div>
  `);
}

export function ambassadorDeniedEmail(firstName: string, adminNote?: string | null) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Ambassador application update
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${firstName}, thank you for applying to become a Tack Room Ambassador.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      After reviewing your application, we're unable to approve it at this time.${adminNote ? ` ${adminNote}` : ""}
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      You're still very welcome to buy and sell on The Tack Room — and you can reapply in the future.
    </p>
    <div style="text-align:center">
      ${btn("Browse listings", "https://tackroomshop.com.au/listings")}
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

export function orderConfirmedBuyerEmail({
  buyerName,
  listingTitle,
  sellerName,
  amount,
  orderId,
  pickupMethod,
}: {
  buyerName: string;
  listingTitle: string;
  sellerName: string;
  amount: string;
  orderId: string;
  pickupMethod: "shipping" | "local_pickup";
}) {
  const deliveryText =
    pickupMethod === "local_pickup"
      ? "The seller will be in touch to arrange local pickup. Payment is held securely until pickup is confirmed."
      : "The seller will ship your item shortly and add a tracking number to your order. Payment is held securely until delivery is confirmed.";

  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Order confirmed! 🎉
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${buyerName}, your payment was successful.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666;width:40%">Item</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Amount paid</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${amount}</td>
      </tr>
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Seller</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744">${sellerName}</td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#666;line-height:1.6">
      ${deliveryText}
    </p>
    <div style="text-align:center">
      ${btn("View your order", `https://tackroomshop.com.au/orders/${orderId}`)}
    </div>
  `);
}

export function itemShippedBuyerEmail({
  buyerName,
  listingTitle,
  trackingNumber,
  carrier,
  orderId,
}: {
  buyerName: string;
  listingTitle: string;
  trackingNumber: string;
  carrier: string;
  orderId: string;
}) {
  const carrierLabels: Record<string, string> = {
    auspost: "Australia Post",
    startrack: "StarTrack",
    sendle: "Sendle",
    courier_please: "Courier Please",
    dhl: "DHL",
    tnt: "TNT",
    other: "Other carrier",
  };
  const carrierLabel = carrierLabels[carrier] ?? carrier;

  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Your item is on its way!
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${buyerName}, great news — your order has been shipped.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666;width:40%">Item</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Carrier</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744">${carrierLabel}</td>
      </tr>
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Tracking number</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-family:monospace">${trackingNumber}</td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#666;line-height:1.6">
      Payment is held securely and will be released to the seller once delivery is confirmed.
    </p>
    <div style="text-align:center">
      ${btn("Track your order", `https://tackroomshop.com.au/orders/${orderId}`)}
    </div>
  `);
}

export function itemDeliveredSellerEmail({
  sellerName,
  listingTitle,
  orderId,
}: {
  sellerName: string;
  listingTitle: string;
  orderId: string;
}) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Your item has been delivered!
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, your item <strong>${listingTitle}</strong> has been marked as delivered.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      There is a 48-hour buyer protection window before your payout is released. If no dispute is raised, your funds will be transferred to your account automatically.
    </p>
    <div style="text-align:center">
      ${btn("View order", `https://tackroomshop.com.au/orders/${orderId}`)}
    </div>
  `);
}

export function payoutReleasedSellerEmail({
  sellerName,
  listingTitle,
  amount,
  orderId,
}: {
  sellerName: string;
  listingTitle: string;
  amount: string;
  orderId: string;
}) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Your payout is on its way!
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, your payout for <strong>${listingTitle}</strong> has been released.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666;width:40%">Item</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Payout amount</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${amount}</td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#666;line-height:1.6">
      The funds will arrive in your connected Stripe account within 1–2 business days.
    </p>
    <div style="text-align:center">
      ${btn("View order", `https://tackroomshop.com.au/orders/${orderId}`)}
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

export function itemDeliveredBuyerEmail({
  buyerName,
  listingTitle,
  disputeWindowEndsAt,
  orderId,
}: {
  buyerName: string;
  listingTitle: string;
  disputeWindowEndsAt: string;
  orderId: string;
}) {
  const deadline = new Date(disputeWindowEndsAt).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Your item has been delivered!
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${buyerName}, <strong>${listingTitle}</strong> has been marked as delivered.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      If there's an issue with your order, you have until <strong>${deadline} AEDT</strong> to raise a dispute. After this window closes, the payment will be automatically released to the seller.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      If everything looks good, no action is needed — the seller will be paid out automatically.
    </p>
    <div style="text-align:center">
      ${btn("View order", `https://tackroomshop.com.au/orders/${orderId}`)}
    </div>
  `);
}

export function newReviewEmail({
  sellerName,
  buyerName,
  listingTitle,
  rating,
  comment,
  profileUrl,
}: {
  sellerName: string;
  buyerName: string;
  listingTitle: string;
  rating: number;
  comment?: string | null;
  profileUrl: string;
}) {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      You received a new review!
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, ${buyerName} left you a review for <strong>${listingTitle}</strong>.
    </p>
    <div style="margin:24px 0;padding:20px 24px;background:#f9f6f0;border-radius:8px;border-left:3px solid #1a2744">
      <p style="margin:0 0 6px;font-size:20px;color:#1a2744;letter-spacing:2px">${stars}</p>
      ${comment ? `<p style="margin:0;font-size:14px;color:#444;line-height:1.6;font-style:italic">"${comment}"</p>` : ""}
    </div>
    <div style="text-align:center">
      ${btn("View your profile", profileUrl)}
    </div>
  `);
}

export function trackingReminderEmail({
  sellerName,
  listingTitle,
  orderId,
  hoursLeft,
  deadline,
}: {
  sellerName: string;
  listingTitle: string;
  orderId: string;
  hoursLeft: 6 | 2;
  deadline: string;
}) {
  const isFinal = hoursLeft === 2;
  const bannerBg = isFinal ? "#7f1d1d" : "#1a2744";
  const bannerText = isFinal
    ? `⚠️ Final reminder — tracking due in ~2 hours`
    : `Reminder — tracking due in ~6 hours`;
  const urgencyNote = isFinal
    ? `<p style="margin:16px 0 0;font-size:14px;color:#b91c1c;font-weight:600;line-height:1.6">
        If tracking is not submitted before the deadline, the buyer will be offered a full refund and your listing will be reopened.
       </p>`
    : `<p style="margin:16px 0 0;font-size:14px;color:#666;line-height:1.6">
        If tracking is not submitted in time, the buyer will be offered a full refund.
       </p>`;

  return wrapper(`
    <div style="background:${bannerBg};border-radius:6px;padding:14px 20px;margin-bottom:24px">
      <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff">${bannerText}</p>
    </div>
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Don't forget to add your tracking number
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, you still need to submit a tracking number for your recent sale.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666;width:40%">Item</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Deadline</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${deadline} AEDT</td>
      </tr>
    </table>
    ${urgencyNote}
    <p style="margin:16px 0 0;font-size:14px;color:#666;line-height:1.6">
      Open your order in the seller dashboard, enter your tracking number and carrier, then click Save.
    </p>
    <div style="text-align:center">
      ${btn("Add tracking number", `https://tackroomshop.com.au/selling/orders/${orderId}`)}
    </div>
  `);
}

export function leaveReviewBuyerEmail({
  buyerName,
  listingTitle,
  sellerName,
  orderId,
}: {
  buyerName: string;
  listingTitle: string;
  sellerName: string;
  orderId: string;
}) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      How was your order?
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${buyerName}, your order for <strong>${listingTitle}</strong> from ${sellerName} is now complete.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Reviews help other buyers in the community make confident decisions. It only takes a moment — let others know about your experience!
    </p>
    <div style="text-align:center">
      ${btn("Leave a review", `https://tackroomshop.com.au/orders/${orderId}`)}
    </div>
  `);
}

export function trackingDeadlineExpiredSellerEmail({
  sellerName,
  listingTitle,
  orderId,
}: {
  sellerName: string;
  listingTitle: string;
  orderId: string;
}) {
  return wrapper(`
    <div style="background:#7f1d1d;border-radius:6px;padding:14px 20px;margin-bottom:24px">
      <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff">Shipping deadline missed</p>
    </div>
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Your shipping deadline has passed
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, the 3-day shipping deadline for <strong>${listingTitle}</strong> has passed without a tracking number being submitted.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      The order has been flagged and the buyer has been notified that they are eligible for a full refund.
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:#666;line-height:1.6">
      If you have already shipped the item, contact us at <a href="mailto:contact@tackroomshop.com.au" style="color:#4a5e35">contact@tackroomshop.com.au</a> as soon as possible with your tracking details.
    </p>
    <div style="text-align:center">
      ${btn("View order", `https://tackroomshop.com.au/selling/orders/${orderId}`)}
    </div>
  `);
}

export function trackingDeadlineExpiredBuyerEmail({
  buyerName,
  listingTitle,
  orderId,
}: {
  buyerName: string;
  listingTitle: string;
  orderId: string;
}) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Your seller missed the shipping deadline
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${buyerName}, the seller did not submit a tracking number for <strong>${listingTitle}</strong> within the 3-day shipping window.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Your order has been flagged and you are eligible for a full refund. Our team will review the case and process it shortly — you do not need to take any action.
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:#666;line-height:1.6">
      If you have any questions, contact us at <a href="mailto:contact@tackroomshop.com.au" style="color:#4a5e35">contact@tackroomshop.com.au</a>.
    </p>
    <div style="text-align:center">
      ${btn("View order", `https://tackroomshop.com.au/orders/${orderId}`)}
    </div>
  `);
}

export function disputeRefundBuyerEmail({
  buyerName,
  listingTitle,
  amount,
  orderId,
}: {
  buyerName: string;
  listingTitle: string;
  amount: string;
  orderId: string;
}) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Your refund has been approved
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${buyerName}, your dispute for <strong>${listingTitle}</strong> has been reviewed and a refund has been issued.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666;width:40%">Item</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Refund amount</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${amount}</td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#666;line-height:1.6">
      The refund will appear on your original payment method within 5–10 business days depending on your bank.
    </p>
    <div style="text-align:center">
      ${btn("View order", `https://tackroomshop.com.au/orders/${orderId}`)}
    </div>
  `);
}

export function disputeRefundSellerEmail({
  sellerName,
  listingTitle,
  orderId,
}: {
  sellerName: string;
  listingTitle: string;
  orderId: string;
}) {
  return wrapper(`
    <div style="background:#7f1d1d;border-radius:6px;padding:14px 20px;margin-bottom:24px">
      <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff">Dispute outcome: refund issued to buyer</p>
    </div>
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Dispute resolved — refund issued
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, after reviewing the dispute for <strong>${listingTitle}</strong>, we have issued a full refund to the buyer. No payout will be released for this order.
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:#666;line-height:1.6">
      If you believe this decision was made in error, contact us at <a href="mailto:contact@tackroomshop.com.au" style="color:#4a5e35">contact@tackroomshop.com.au</a>.
    </p>
    <div style="text-align:center">
      ${btn("View order", `https://tackroomshop.com.au/selling/orders/${orderId}`)}
    </div>
  `);
}

export function disputeReleasedSellerEmail({
  sellerName,
  listingTitle,
  amount,
  orderId,
}: {
  sellerName: string;
  listingTitle: string;
  amount: string;
  orderId: string;
}) {
  return wrapper(`
    <div style="background:#14532d;border-radius:6px;padding:14px 20px;margin-bottom:24px">
      <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff">Dispute outcome: resolved in your favour</p>
    </div>
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Dispute resolved — payout released
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, after reviewing the dispute for <strong>${listingTitle}</strong>, we have resolved it in your favour and your payout has been released.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666;width:40%">Item</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Payout amount</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${amount}</td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#666;line-height:1.6">
      Funds will arrive in your connected Stripe account within 1–2 business days.
    </p>
    <div style="text-align:center">
      ${btn("View order", `https://tackroomshop.com.au/selling/orders/${orderId}`)}
    </div>
  `);
}

export function stripeOnboardingCompleteEmail(sellerName: string) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      You're ready to start selling! 🎉
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, your Stripe account has been verified and you can now publish listings and receive payouts on The Tack Room.
    </p>
    <ul style="margin:16px 0 0;padding-left:20px;font-size:15px;color:#444;line-height:1.8">
      <li>Create your first listing from your seller dashboard</li>
      <li>Payouts are processed automatically 48 hours after delivery</li>
      <li>A 5% platform fee is deducted at the time of each sale</li>
    </ul>
    <div style="text-align:center">
      ${btn("Go to your dashboard", "https://tackroomshop.com.au/selling")}
    </div>
  `);
}

export function accountSuspendedEmail(name: string) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Your account has been suspended
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${name}, your Tack Room account has been suspended following a review of activity that violated our Terms of Service.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      While suspended, you will not be able to log in, list items, or make purchases on the platform.
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:#666;line-height:1.6">
      If you believe this is a mistake, please contact us at <a href="mailto:contact@tackroomshop.com.au" style="color:#4a5e35">contact@tackroomshop.com.au</a> to appeal.
    </p>
  `);
}

export function boostPurchasedEmail({
  sellerName,
  listingTitle,
  slot,
  endsAt,
  listingId,
}: {
  sellerName: string;
  listingTitle: string;
  slot: string;
  endsAt: string;
  listingId: string;
}) {
  const slotLabels: Record<string, string> = {
    homepage: "Homepage — Featured section",
    search_top: "Browse listings — Top of results",
  };
  const slotLabel = slotLabels[slot] ?? slot;

  return wrapper(`
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      Your listing boost is live! ⚡
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, your listing is now featured on The Tack Room.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666;width:40%">Listing</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Placement</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744">${slotLabel}</td>
      </tr>
      <tr style="background:#f9f6f0">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#666">Boost expires</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a2744;font-weight:600">${endsAt} AEDT</td>
      </tr>
    </table>
    <div style="text-align:center">
      ${btn("View your listing", `https://tackroomshop.com.au/listings/${listingId}`)}
    </div>
  `);
}

export function payoutFailedSellerEmail({
  sellerName,
  listingTitle,
  orderId,
}: {
  sellerName: string;
  listingTitle: string;
  orderId: string;
}) {
  return wrapper(`
    <div style="background:#7f1d1d;border-radius:6px;padding:14px 20px;margin-bottom:24px">
      <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff">Payout failed</p>
    </div>
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a2744">
      We couldn't process your payout
    </h1>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      Hi ${sellerName}, we were unable to transfer your payout for <strong>${listingTitle}</strong> to your Stripe account.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6">
      This is usually caused by an issue with your connected bank account or Stripe settings. Please check your Stripe dashboard and ensure your details are up to date.
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:#666;line-height:1.6">
      If you need help, contact us at <a href="mailto:contact@tackroomshop.com.au" style="color:#4a5e35">contact@tackroomshop.com.au</a> quoting order ID: <code style="background:#f3f4f6;padding:2px 6px;border-radius:3px">${orderId}</code>.
    </p>
    <div style="text-align:center">
      ${btn("Check Stripe dashboard", "https://dashboard.stripe.com")}
    </div>
  `);
}
