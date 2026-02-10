import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createTransport } from "npm:nodemailer@6.9.7";

const SMTP_HOSTNAME = Deno.env.get("SMTP_HOSTNAME");
const SMTP_PORT = Deno.env.get("SMTP_PORT");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
    email: string;
    key: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, key } = await req.json() as EmailRequest;

        if (!SMTP_HOSTNAME || !SMTP_USER || !SMTP_PASSWORD) {
            throw new Error("Missing SMTP configuration environment variables");
        }

        const transporter = createTransport({
            host: SMTP_HOSTNAME,
            port: Number(SMTP_PORT) || 587,
            secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: `"MAVi License" <${SMTP_USER}>`,
            to: email,
            subject: "Your MAVi License Key",
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0078d4;">MAVi License Key</h1>
          <p>Thank you for requesting access to MAVi.</p>
          <p>Here is your license key:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 1.2em; text-align: center; border: 1px solid #ddd;">
            <strong>${key}</strong>
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
            Please copy this key and paste it into the application to unlock access.
          </p>
        </div>
      `,
        });

        return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
