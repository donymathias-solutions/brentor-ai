/* ============================================================
   Brentor.ai — mailer.js
   Envio de e-mails transacionais (confirmação de cadastro e
   recuperação de senha) via API HTTP do Resend.

   Sem RESEND_API_KEY configurada o envio fica desligado: as rotas
   continuam respondendo normalmente e o link é escrito no log do
   servidor, o que permite testar o fluxo inteiro antes de existir
   domínio verificado. O link NUNCA volta na resposta HTTP — se
   voltasse, qualquer pessoa poderia redefinir a senha alheia.
   ============================================================ */
const CHAVE = process.env.RESEND_API_KEY || '';
const DE    = process.env.MAIL_FROM || 'Brentor.ai <onboarding@resend.dev>';

const ativo = () => !!CHAVE;

async function enviar(para, assunto, html) {
  if (!ativo()) {
    console.log(`[mailer] (desligado) e-mail para ${para}: ${assunto}`);
    return { enviado: false, motivo: 'sem-chave' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CHAVE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: DE, to: [para], subject: assunto, html }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[mailer] falha ao enviar:', res.status, txt.slice(0, 300));
      return { enviado: false, motivo: 'erro-' + res.status };
    }
    return { enviado: true };
  } catch (e) {
    console.error('[mailer] erro de rede:', e.message);
    return { enviado: false, motivo: 'rede' };
  }
}

/* Layout comum — e-mail é lido em cliente antigo, então nada de CSS
   moderno: tabela, estilo em linha e um link que também é visível como
   texto, para quem bloqueia botões. */
function layout(titulo, texto, rotuloBotao, link, rodape) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 12px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0">
        <tr><td style="padding-bottom:18px;border-bottom:3px solid #1d4ed8">
          <span style="font-size:20px;font-weight:700;color:#1d4ed8">Brentor.ai</span>
        </td></tr>
        <tr><td style="padding-top:26px">
          <h1 style="margin:0 0 14px;font-size:20px;color:#111827">${titulo}</h1>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:#374151">${texto}</p>
          <a href="${link}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;
             padding:13px 26px;border-radius:8px;font-size:15px;font-weight:600">${rotuloBotao}</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b7280">
            Se o botão não funcionar, copie e cole este endereço no navegador:<br>
            <span style="color:#1d4ed8;word-break:break-all">${link}</span>
          </p>
          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#9ca3af">${rodape}</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function emailConfirmacao(nome, link) {
  return {
    assunto: 'Confirme seu e-mail — Brentor.ai',
    html: layout(
      `Olá, ${nome}!`,
      'Falta um passo para ativar sua conta no Brentor.ai. Confirme que este e-mail é seu clicando no botão abaixo.',
      'Confirmar meu e-mail', link,
      'O link vale por 48 horas. Se você não criou uma conta no Brentor.ai, é só ignorar esta mensagem.'),
  };
}

function emailRecuperacao(nome, link) {
  return {
    assunto: 'Redefinir sua senha — Brentor.ai',
    html: layout(
      `Olá, ${nome}!`,
      'Recebemos um pedido para redefinir a senha da sua conta no Brentor.ai. Clique no botão abaixo para escolher uma nova senha.',
      'Criar nova senha', link,
      'O link vale por 1 hora e só pode ser usado uma vez. Se não foi você quem pediu, ignore esta mensagem — sua senha atual continua valendo.'),
  };
}

module.exports = { ativo, enviar, emailConfirmacao, emailRecuperacao };
