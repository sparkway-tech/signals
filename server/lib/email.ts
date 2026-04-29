import { Resend } from "resend";

let cachedClient: Resend | null = null;

function getClient(): Resend {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing — provision Resend via Vercel Marketplace");
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "signals@sparkway.work";
const APP_URL = process.env.APP_URL ?? "https://signals.sparkway.work";

/**
 * Envoie un email magic link.
 * Le HTML reproduit la palette du design system : porcelain bg, forest CTA,
 * Fraunces serif pour le titre, Inter pour le corps.
 */
export async function sendMagicLinkEmail(to: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/verify?token=${encodeURIComponent(token)}`;
  const html = renderMagicLinkHtml(url);
  const text = `Connecte-toi à Sparkway Signals\n\nClique sur ce lien (valide 15 minutes) :\n${url}\n\nSi tu n'as pas demandé ce lien, ignore cet email.`;

  await getClient().emails.send({
    from: `Sparkway Signals <${FROM}>`,
    to,
    subject: "Ton lien de connexion Sparkway Signals",
    html,
    text,
  });
}

function renderMagicLinkHtml(url: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Sparkway Signals</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#F5F1EA;font-family:'Inter',Arial,sans-serif;color:#1A1A1A;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F1EA;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid rgba(26,26,26,0.10);border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <span style="display:inline-block;width:22px;height:22px;background:#1F3A2E;border-radius:3px;vertical-align:middle;"></span>
              <span style="font-family:'Fraunces',Georgia,serif;font-size:17px;font-weight:500;color:#1A1A1A;letter-spacing:-0.01em;margin-left:8px;">Sparkway <span style="font-style:italic;color:#5A5A5A;font-weight:300;">Signals</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <h1 style="margin:24px 0 12px 0;font-family:'Fraunces',Georgia,serif;font-weight:300;font-size:28px;line-height:1.2;color:#1A1A1A;">Ton lien de connexion</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#5A5A5A;">Clique sur le bouton ci-dessous pour te connecter. Le lien est valide pendant <strong>15 minutes</strong>.</p>
              <a href="${url}" style="display:inline-block;background:#1F3A2E;color:#F5F1EA;text-decoration:none;font-weight:500;font-size:15px;padding:12px 24px;border-radius:8px;">Me connecter</a>
              <p style="margin:24px 0 0 0;font-size:13px;line-height:1.5;color:#A8A29A;">Ou copie ce lien dans ton navigateur :<br /><a href="${url}" style="color:#5A5A5A;word-break:break-all;">${url}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid rgba(26,26,26,0.10);">
              <p style="margin:0;font-size:12px;color:#A8A29A;">Si tu n'as pas demandé ce lien, ignore simplement cet email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
