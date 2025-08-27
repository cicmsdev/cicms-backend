import * as nodemailer from 'nodemailer';
import { join } from 'path';

interface SendEmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string; //for styled emails
}

// Send email function
export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const emailOptions = {
        from: `"NoReply" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
        attachments: [
            {
                filename: 'logo.png',
                path: join(process.cwd(), 'src', 'emails', 'templates', 'images', 'logo.png'),
                cid: 'cicmslogo'
            }
        ]
        ,
    };

    try {
        await transporter.sendMail(emailOptions);
    } catch (error) {
        throw error;
    }
}