This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Email Configuration

OffMenu uses SendGrid for transactional email sending. To enable email functionality, you need to:

1. Create a SendGrid account at [sendgrid.com](https://sendgrid.com)
2. Generate an API key in your SendGrid dashboard
3. Add the API key to your environment variables:

```bash
# In your .env.local file
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

### Email Features

The application automatically sends emails for:
- **Event Approvals**: When a venue approves an event request
- **Event Declines**: When a venue declines an event request  
- **Chat Requests**: When someone sends a new chat request to a venue manager
- **Chat Message Notifications**: When someone receives a new message in an ongoing conversation

All emails are sent from `contact@offmenu.space` and use responsive HTML templates.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
